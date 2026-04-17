import { crawlConfiguredSites } from "@/features/seo/server/crawler";
import { getSitePages, saveConnectorRun, saveInternalLinkAudit } from "@/features/seo/server/storage";
import type {
  ConnectorRun,
  InternalLinkAudit,
  InternalLinkAuditCluster,
  InternalLinkAuditOrphan,
  InternalLinkAuditSuggestion,
  SitePage
} from "@/features/seo/types";

interface InternalLinkAuditOptions {
  persist?: boolean;
  recrawl?: boolean;
  crawlIfMissing?: boolean;
  maxPages?: number;
  maxSuggestions?: number;
  maxOrphans?: number;
  maxClusters?: number;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

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

function isRootLike(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname === "/";
  } catch {
    return false;
  }
}

function buildTopicText(page: SitePage) {
  return [page.title, page.h1, page.headings.join(" "), page.contentExcerpt].filter(Boolean).join(" ");
}

function pickAnchorText(target: SitePage) {
  const candidate = [target.h1, target.headings[1], target.title].find((value) => typeof value === "string" && value.trim().length > 0) ?? target.url;
  const cleaned = candidate.replace(/[|:•]+.*$/, "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "this related page";
  }
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
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
  return clamp((Math.max(0, 4 - Math.min(inboundLinks, 4)) * 18) + page.crawlDepth * 10 + (page.issues.length > 0 ? 12 : 0) + (page.internalLinks.length === 0 ? 8 : 0));
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

function selectPlacement(source: SitePage, target: SitePage) {
  const targetTopic = buildTopicText(target);
  const chunks = source.contentChunks.length > 0 ? source.contentChunks : [source.contentExcerpt || source.contentText].filter(Boolean);
  const ranked = chunks
    .map((chunk, index) => ({
      index,
      chunk,
      score: similarityScore(chunk, targetTopic)
    }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];

  if (!best || best.chunk.length === 0) {
    return "Near the first descriptive paragraph of the source page.";
  }

  return `Paragraph ${best.index + 1} near \"${best.chunk.slice(0, 140)}${best.chunk.length > 140 ? "…" : ""}\"`;
}

function buildReason(source: SitePage, target: SitePage, inboundLinks: number, topicalSimilarity: number) {
  const underlinked = inboundLinks <= 1 ? "is currently underlinked" : `only has ${inboundLinks} internal links pointing to it`;
  const relationship =
    source.site === target.site
      ? "within the same site section"
      : source.site === "blog" || target.site === "blog"
        ? "between the blog and other Qubic properties"
        : "across the main/docs experience";
  return `${target.title || target.url} ${underlinked}, and ${source.title || source.url} has strong topical overlap ${relationship} (${Math.round(topicalSimilarity * 100)}% lexical match).`;
}

function collectSuggestions(pages: SitePage[], inboundCounts: Map<string, number>, maxSuggestions: number) {
  const bySource: InternalLinkAuditSuggestion[] = [];
  const now = new Date().toISOString();

  for (const source of pages) {
    const sourceTopic = buildTopicText(source);
    if (!sourceTopic || source.wordCount < 80) {
      continue;
    }

    const sourceAuthority = buildAuthority(source, inboundCounts.get(source.url) ?? 0);
    const candidates = pages
      .filter((target) => target.url !== source.url)
      .filter((target) => !source.internalLinks.includes(target.url))
      .map((target) => {
        const topicalSimilarity = similarityScore(sourceTopic, buildTopicText(target));
        const targetInboundLinks = inboundCounts.get(target.url) ?? 0;
        const targetNeed = buildTargetNeed(target, targetInboundLinks);
        const score = clamp(topicalSimilarity * 55 + sourceAuthority * 0.18 + targetNeed * 0.42 + (target.site !== source.site ? 4 : 0));

        return {
          target,
          topicalSimilarity,
          targetInboundLinks,
          targetNeed,
          score
        };
      })
      .filter((candidate) => candidate.topicalSimilarity >= 0.16)
      .filter((candidate) => candidate.score >= 60)
      .sort((left, right) => right.score - left.score)
      .slice(0, 2)
      .map((candidate) => ({
        id: `audit-link-${slugify(source.url)}-${slugify(candidate.target.url)}`,
        sourceUrl: source.url,
        sourceTitle: source.title,
        targetUrl: candidate.target.url,
        targetTitle: candidate.target.title,
        anchorText: pickAnchorText(candidate.target),
        placement: selectPlacement(source, candidate.target),
        reason: buildReason(source, candidate.target, candidate.targetInboundLinks, candidate.topicalSimilarity),
        impact: inferImpact(candidate.score),
        score: candidate.score,
        topicalSimilarity: Number(candidate.topicalSimilarity.toFixed(3)),
        sourceAuthority,
        targetNeed: candidate.targetNeed,
        targetInboundLinks: candidate.targetInboundLinks,
        targetDepth: candidate.target.crawlDepth,
        createdAt: now
      } satisfies InternalLinkAuditSuggestion));

    bySource.push(...candidates);
  }

  return bySource
    .sort((left, right) => right.score - left.score)
    .slice(0, maxSuggestions);
}

function collectOrphans(pages: SitePage[], inboundCounts: Map<string, number>, maxOrphans: number) {
  return pages
    .filter((page) => !isRootLike(page.url))
    .map((page) => {
      const inboundLinks = inboundCounts.get(page.url) ?? 0;
      const weaklyLinked = inboundLinks === 0 || (inboundLinks === 1 && page.crawlDepth >= 2);
      return {
        page,
        inboundLinks,
        weaklyLinked
      };
    })
    .filter((item) => item.weaklyLinked)
    .sort((left, right) => (right.page.crawlDepth * 10 - right.inboundLinks * 12) - (left.page.crawlDepth * 10 - left.inboundLinks * 12))
    .slice(0, maxOrphans)
    .map(({ page, inboundLinks }) => ({
      id: `audit-orphan-${slugify(page.url)}`,
      url: page.url,
      title: page.title,
      site: page.site,
      inboundLinks,
      depth: page.crawlDepth,
      reason: inboundLinks === 0 ? "No crawled pages currently link to this URL." : "Only one weak internal path reaches this deeper page.",
      impact: inboundLinks === 0 && page.crawlDepth >= 2 ? "high" : inboundLinks === 0 ? "medium" : "low"
    } satisfies InternalLinkAuditOrphan));
}

function findCommonLabel(pages: SitePage[]) {
  const frequency = new Map<string, number>();
  for (const page of pages) {
    for (const term of new Set(splitTerms(`${page.title} ${page.h1} ${page.headings.join(" ")}`))) {
      frequency.set(term, (frequency.get(term) ?? 0) + 1);
    }
  }

  const common = Array.from(frequency.entries())
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([term]) => term);

  return common.length > 0 ? common.join(" / ") : pages.map((page) => page.title).filter(Boolean)[0] ?? "related cluster";
}

function collectWeakClusters(pages: SitePage[], maxClusters: number) {
  const components: SitePage[][] = [];
  const visited = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const left of pages) {
    const related: string[] = [];
    for (const right of pages) {
      if (left.url === right.url) {
        continue;
      }
      const similarity = similarityScore(buildTopicText(left), buildTopicText(right));
      if (similarity >= 0.28) {
        related.push(right.url);
      }
    }
    adjacency.set(left.url, related);
  }

  for (const page of pages) {
    if (visited.has(page.url)) {
      continue;
    }
    const stack = [page.url];
    const componentUrls = new Set<string>();
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);
      componentUrls.add(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }

    const componentPages = pages.filter((candidate) => componentUrls.has(candidate.url));
    if (componentPages.length >= 2) {
      components.push(componentPages);
    }
  }

  return components
    .map((component) => {
      const urls = new Set(component.map((page) => page.url));
      const internalLinksWithinCluster = component.reduce((sum, page) => sum + page.internalLinks.filter((link) => urls.has(link)).length, 0);
      const expectedMinimum = Math.max(component.length - 1, 1);
      return {
        component,
        internalLinksWithinCluster,
        expectedMinimum
      };
    })
    .filter((item) => item.internalLinksWithinCluster < item.expectedMinimum)
    .sort((left, right) => (right.component.length - right.internalLinksWithinCluster) - (left.component.length - left.internalLinksWithinCluster))
    .slice(0, maxClusters)
    .map(({ component, internalLinksWithinCluster, expectedMinimum }) => ({
      id: `audit-cluster-${slugify(component.map((page) => page.url).join("-"))}`,
      label: findCommonLabel(component),
      pageUrls: component.map((page) => page.url),
      pageTitles: component.map((page) => page.title),
      internalLinksWithinCluster,
      reason: `${component.length} related pages appear to share a topic cluster, but only ${internalLinksWithinCluster} links connect them (expected at least ${expectedMinimum}).`,
      recommendation: "Add contextual cross-links between the strongest overview page and the deeper supporting pages in this cluster.",
      impact: component.length >= 3 ? "high" : "medium"
    } satisfies InternalLinkAuditCluster));
}

function buildRun(status: ConnectorRun["status"], detail: string, audit: InternalLinkAudit, startedAt: string): ConnectorRun {
  return {
    id: `internal-link-audit-run-${Date.now()}`,
    connectorId: "internal-link-audit",
    provider: "internal_link_audit",
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    detail,
    recordCount: audit.suggestions.length,
    metadata: {
      scannedPages: audit.scannedPages,
      renderedPages: audit.renderedPages,
      orphanPages: audit.orphanPages.length,
      weakClusters: audit.weakClusters.length
    }
  };
}

export async function buildInternalLinkAudit(options: InternalLinkAuditOptions = {}) {
  const startedAt = new Date().toISOString();
  const maxSuggestions = options.maxSuggestions ?? 30;
  const maxOrphans = options.maxOrphans ?? 12;
  const maxClusters = options.maxClusters ?? 8;
  const crawlIfMissing = options.crawlIfMissing ?? true;

  if (options.recrawl) {
    await crawlConfiguredSites({ maxPages: options.maxPages });
  }

  let pages = await getSitePages();
  if (pages.length === 0 && crawlIfMissing) {
    await crawlConfiguredSites({ maxPages: options.maxPages });
    pages = await getSitePages();
  }

  const filteredPages = pages.filter((page) => page.statusCode >= 200 && page.statusCode < 400 && (page.contentText.length > 0 || page.headings.length > 0));
  const inboundCounts = buildInboundCounts(filteredPages);
  const audit: InternalLinkAudit = {
    id: `internal-link-audit-${Date.now()}`,
    createdAt: new Date().toISOString(),
    scannedPages: filteredPages.length,
    renderedPages: filteredPages.filter((page) => page.rendered).length,
    suggestions: collectSuggestions(filteredPages, inboundCounts, maxSuggestions),
    orphanPages: collectOrphans(filteredPages, inboundCounts, maxOrphans),
    weakClusters: collectWeakClusters(filteredPages, maxClusters)
  };

  if (options.persist ?? true) {
    await saveInternalLinkAudit(audit);
  }

  const run = buildRun(
    audit.suggestions.length > 0 || audit.orphanPages.length > 0 || audit.weakClusters.length > 0 ? "success" : "fallback",
    audit.scannedPages > 0
      ? `Built internal-link audit across ${audit.scannedPages} pages with ${audit.suggestions.length} suggestions.`
      : "No crawled pages were available to audit.",
    audit,
    startedAt
  );
  await saveConnectorRun(run);

  return audit;
}
