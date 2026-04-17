import { normalizeUrl } from "@/features/seo/server/crawl-extractor";
import { crawlConfiguredSites } from "@/features/seo/server/crawler";
import { getSitePages } from "@/features/seo/server/storage";
import type { InternalLinkAuditSuggestion, SitePage } from "@/features/seo/types";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function splitTerms(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function similarityScore(left: string, right: string) {
  const leftTerms = new Set(splitTerms(left));
  const rightTerms = new Set(splitTerms(right));
  if (leftTerms.size === 0 || rightTerms.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftTerms.forEach((term) => {
    if (rightTerms.has(term)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftTerms.size, rightTerms.size);
}

function buildTopicText(page: SitePage) {
  return [page.title, page.h1, page.headings.join(" "), page.contentExcerpt].filter(Boolean).join(" ");
}

function pickAnchorText(targetPage: SitePage) {
  const candidate =
    [targetPage.h1, targetPage.headings[1], targetPage.title].find((value) => typeof value === "string" && value.trim().length > 0) ??
    targetPage.url;
  const cleaned = candidate.replace(/[|:•]+.*$/, "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "this related page";
  }
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function selectPlacement(source: SitePage, targetPage: SitePage) {
  const targetTopic = buildTopicText(targetPage);
  const chunks =
    source.contentChunks.length > 0 ? source.contentChunks : [source.contentExcerpt || source.contentText].filter(Boolean);
  const ranked = chunks
    .map((chunk, index) => ({
      index,
      chunk,
      score: similarityScore(chunk, targetTopic)
    }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];

  if (!best || best.chunk.length === 0) {
    return "Near the first descriptive paragraph of the post.";
  }

  return `Paragraph ${best.index + 1} near \"${best.chunk.slice(0, 140)}${best.chunk.length > 140 ? "…" : ""}\"`;
}

function buildInboundCounts(pages: SitePage[]) {
  const knownUrls = new Set(pages.map((page) => page.url));
  const counts = new Map<string, number>(pages.map((page) => [page.url, 0]));

  for (const page of pages) {
    for (const link of page.internalLinks) {
      if (knownUrls.has(link)) {
        counts.set(link, (counts.get(link) ?? 0) + 1);
      }
    }
  }

  return counts;
}

function buildAuthority(page: SitePage, inboundLinks: number) {
  return clamp(
    inboundLinks * 14 +
      Math.min(page.wordCount, 1200) / 18 +
      Math.min(page.internalLinks.length, 24) * 1.5 +
      (page.site === "docs" || page.site === "blog" ? 8 : 0)
  );
}

function buildTargetNeed(page: SitePage, inboundLinks: number) {
  return clamp(
    (Math.max(0, 4 - Math.min(inboundLinks, 4)) * 18) +
      page.crawlDepth * 10 +
      (page.issues.length > 0 ? 12 : 0) +
      (page.internalLinks.length === 0 ? 8 : 0)
  );
}

function inferImpact(score: number): "high" | "medium" | "low" {
  if (score >= 80) {
    return "high";
  }
  if (score >= 65) {
    return "medium";
  }
  return "low";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildReason(source: SitePage, targetPage: SitePage, inboundLinks: number, topicalSimilarity: number) {
  const underlinked =
    inboundLinks <= 1 ? "is currently underlinked" : `only has ${inboundLinks} internal links pointing to it`;
  const relationship =
    source.site === targetPage.site
      ? "within the same site section"
      : source.site === "blog" || targetPage.site === "blog"
        ? "between the blog and other Qubic properties"
        : "across the main/docs experience";
  return `${targetPage.title || targetPage.url} ${underlinked}, and ${source.title || source.url} has topical overlap ${relationship} (${Math.round(topicalSimilarity * 100)}% lexical match).`;
}

function alreadyReferencedInText(source: SitePage, targetUrl: string) {
  let path = "";
  try {
    path = new URL(targetUrl).pathname;
  } catch {
    return false;
  }
  if (path.length > 4 && source.contentText.toLowerCase().includes(path.toLowerCase())) {
    return true;
  }
  return false;
}

export function normalizeTargetBlogUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return normalizeUrl(u.toString());
  } catch {
    return "";
  }
}

export async function ensureBlogPagesIndexed(options: { recrawl?: boolean; maxPages?: number; seedUrls?: string[] }) {
  if (options.recrawl) {
    await crawlConfiguredSites({ site: "blog", maxPages: options.maxPages ?? 48, seedUrls: options.seedUrls });
    return;
  }
  const existing = await getSitePages("blog");
  if (existing.length === 0) {
    await crawlConfiguredSites({ site: "blog", maxPages: options.maxPages ?? 48, seedUrls: options.seedUrls });
  }
}

export interface BlogLinkPackResult {
  target: SitePage | null;
  suggestions: InternalLinkAuditSuggestion[];
  blogPagesScanned: number;
  crossSiteSuggestions: number;
  message?: string;
}

export async function buildBlogLinkPack(
  targetUrlRaw: string,
  options: { recrawl?: boolean; maxPages?: number } = {}
): Promise<BlogLinkPackResult> {
  const normalized = normalizeTargetBlogUrl(targetUrlRaw);
  const seedUrls = normalized ? [normalized] : undefined;

  await ensureBlogPagesIndexed({ ...options, seedUrls });

  if (!normalized) {
    return { target: null, suggestions: [], blogPagesScanned: 0, crossSiteSuggestions: 0, message: "Enter a valid blog URL." };
  }

  const allPages = await getSitePages();
  const blogPages = allPages.filter((p) => p.site === "blog");
  const target = blogPages.find((p) => normalizeUrl(p.url) === normalized) ?? null;

  if (!target) {
    return {
      target: null,
      suggestions: [],
      blogPagesScanned: blogPages.length,
      crossSiteSuggestions: 0,
      message:
        "That URL is not in the blog crawl yet. Enable “Recrawl blog” and try again, or confirm the post is reachable on blogs.qubic.org."
    };
  }

  const inboundCounts = buildInboundCounts(allPages);
  const sourceTopic = buildTopicText(target);
  if (!sourceTopic || target.wordCount < 40) {
    return {
      target,
      suggestions: [],
      blogPagesScanned: blogPages.length,
      crossSiteSuggestions: 0,
      message: "This post has very little extracted text. Try recrawling or check that the page exposes readable copy."
    };
  }

  const sourceAuthority = buildAuthority(target, inboundCounts.get(target.url) ?? 0);
  const now = new Date().toISOString();

  const blogScored = blogPages
    .filter((t) => t.url !== target.url)
    .filter((t) => !target.internalLinks.includes(t.url))
    .map((t) => {
      const topicalSimilarity = similarityScore(sourceTopic, buildTopicText(t));
      const targetInboundLinks = inboundCounts.get(t.url) ?? 0;
      const targetNeed = buildTargetNeed(t, targetInboundLinks);
      const score = clamp(topicalSimilarity * 55 + sourceAuthority * 0.18 + targetNeed * 0.42);
      return { page: t, topicalSimilarity, targetInboundLinks, targetNeed, score };
    })
    .filter((c) => c.topicalSimilarity >= 0.14)
    .filter((c) => c.score >= 55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const crossScored = allPages
    .filter((t) => t.site === "primary" || t.site === "docs")
    .filter((t) => !alreadyReferencedInText(target, t.url))
    .filter((t) => {
      try {
        const host = new URL(t.url).hostname;
        return host === "qubic.org" || host === "docs.qubic.org" || host.endsWith(".qubic.org");
      } catch {
        return false;
      }
    })
    .map((t) => {
      const topicalSimilarity = similarityScore(sourceTopic, buildTopicText(t));
      const targetInboundLinks = inboundCounts.get(t.url) ?? 0;
      const targetNeed = buildTargetNeed(t, targetInboundLinks);
      const score = clamp(topicalSimilarity * 48 + sourceAuthority * 0.15 + targetNeed * 0.35 + 6);
      return { page: t, topicalSimilarity, targetInboundLinks, targetNeed, score };
    })
    .filter((c) => c.topicalSimilarity >= 0.12)
    .filter((c) => c.score >= 52)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const merged = [...blogScored, ...crossScored].sort((a, b) => b.score - a.score).slice(0, 24);

  const suggestions: InternalLinkAuditSuggestion[] = merged.map((row) => ({
    id: `blog-link-${slugify(target.url)}-${slugify(row.page.url)}`,
    sourceUrl: target.url,
    sourceTitle: target.title,
    targetUrl: row.page.url,
    targetTitle: row.page.title,
    anchorText: pickAnchorText(row.page),
    placement: selectPlacement(target, row.page),
    reason: buildReason(target, row.page, row.targetInboundLinks, row.topicalSimilarity),
    impact: inferImpact(row.score),
    score: row.score,
    topicalSimilarity: Number(row.topicalSimilarity.toFixed(3)),
    sourceAuthority,
    targetNeed: row.targetNeed,
    targetInboundLinks: row.targetInboundLinks,
    targetDepth: row.page.crawlDepth,
    createdAt: now
  }));

  const crossSiteSuggestions = suggestions.filter((s) => {
    const p = allPages.find((x) => x.url === s.targetUrl);
    return Boolean(p && p.site !== "blog");
  }).length;

  return {
    target,
    suggestions,
    blogPagesScanned: blogPages.length,
    crossSiteSuggestions
  };
}

export function searchBlogPages(pages: SitePage[], query: string) {
  if (!query.trim()) {
    return [...pages].sort((a, b) => b.lastCrawled.localeCompare(a.lastCrawled)).slice(0, 40);
  }
  const q = query.trim().toLowerCase();
  return pages
    .filter((p) => {
      const hay = `${p.title} ${p.url} ${p.h1}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.lastCrawled.localeCompare(a.lastCrawled))
    .slice(0, 40);
}
