import { appEnv } from "@/features/seo/server/env";
import { createRenderedExtractionSession, extractPageSnapshot, isInternalUrl, normalizeUrl, type RenderedExtractionSession } from "@/features/seo/server/crawl-extractor";
import { CRAWL_LIMITS } from "@/features/seo/server/seo-constants";
import { saveConnectorRun, saveSitePages } from "@/features/seo/server/storage";
import type { ConnectorRun, SitePage, SiteScope } from "@/features/seo/types";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { logSeoEvent } from "@/lib/seo-log";

const defaultMaxPages = CRAWL_LIMITS.defaultMaxPages;

export interface CrawlInput {
  site?: SiteScope;
  maxPages?: number;
  seedUrls?: string[];
}

export interface CrawlResult {
  pages: SitePage[];
  run: ConnectorRun;
}

function buildPageId(site: SiteScope, url: string) {
  const slug = normalizeUrl(url)
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CRAWL_LIMITS.pageIdSlugMaxLength);

  return `page-${site}-${slug}`;
}

function getBaseUrl(site: SiteScope) {
  if (site === "docs") {
    return appEnv.docsSiteUrl;
  }
  if (site === "blog") {
    return appEnv.blogSiteUrl;
  }
  return appEnv.primarySiteUrl;
}

function buildIssues(page: Pick<SitePage, "title" | "h1" | "metaDescription" | "canonicalUrl" | "headings" | "wordCount" | "url" | "internalLinks">) {
  const issues: string[] = [];

  if (!page.title) {
    issues.push("Missing title tag.");
  }

  if (!page.h1) {
    issues.push("Missing H1.");
  }

  if (!page.metaDescription) {
    issues.push("Missing meta description.");
  }

  if (!page.canonicalUrl) {
    issues.push("Missing canonical URL.");
  } else if (normalizeUrl(page.canonicalUrl) !== normalizeUrl(page.url)) {
    issues.push("Canonical URL differs from crawled URL.");
  }

  if (page.headings.length === 0) {
    issues.push("No H1-H3 headings were detected.");
  }

  if (page.wordCount > 0 && page.wordCount < 180) {
    issues.push("Thin content signal: low visible word count.");
  }

  if (page.internalLinks.length === 0) {
    issues.push("No internal links found on page.");
  }

  return issues;
}

// Use a modern Chrome UA. Many CDNs (Framer, Cloudflare) serve trimmed
// responses or 403 for unknown UAs. We still identify via an accept-encoding
// header in logs and respect robots.txt intent.
const CRAWLER_USER_AGENT =
  "Mozilla/5.0 (compatible; QubicSEOAutopilot/1.0; +https://qubic.org) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchSitemapUrls(baseUrl: string, pathFilter?: string) {
  const sitemapUrl = `${baseUrl.replace(/\/$/, "")}/sitemap.xml`;
  try {
    const response = await fetchWithTimeout(sitemapUrl, {
      headers: {
        "user-agent": CRAWLER_USER_AGENT,
        accept: "application/xml,text/xml,*/*;q=0.8"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      logSeoEvent("warn", "Sitemap fetch returned non-OK status.", {
        sitemapUrl,
        status: response.status,
        statusText: response.statusText
      });
      return [];
    }

    const xml = await response.text();
    const matches = xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi);

    const all = Array.from(matches)
      .map((match) => normalizeUrl(match[1].trim()))
      .filter((url) => isInternalUrl(url, baseUrl));

    const filtered = pathFilter
      ? all.filter((url) => {
          try {
            return new URL(url).pathname.startsWith(pathFilter);
          } catch {
            return false;
          }
        })
      : all;

    logSeoEvent("info", "Sitemap fetched successfully.", {
      sitemapUrl,
      totalUrls: all.length,
      filteredUrls: filtered.length,
      pathFilter: pathFilter ?? null
    });

    return filtered.slice(0, defaultMaxPages * 2);
  } catch (error) {
    logSeoEvent("warn", "Sitemap fetch failed.", {
      sitemapUrl,
      error: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error && "cause" in error ? String((error as Error & { cause?: unknown }).cause) : undefined
    });
    return [];
  }
}

async function buildSitePage(
  site: SiteScope,
  url: string,
  baseUrl: string,
  crawlDepth: number,
  renderedSession?: RenderedExtractionSession | null
): Promise<SitePage> {
  // Blog (qubic.org/blog-detail/*) is served by Framer and is client-rendered,
  // so static HTML has almost no content/links. Prefer headless rendering for
  // blog scope too; docs site serves static HTML and does not need it.
  const preferRendered = site === "primary" || site === "blog";
  const snapshot = await extractPageSnapshot(url, baseUrl, preferRendered, {
    renderedSession
  });
  const draftPage = {
    id: buildPageId(site, url),
    url,
    site,
    title: snapshot.title,
    h1: snapshot.h1,
    metaDescription: snapshot.metaDescription,
    canonicalUrl: snapshot.canonicalUrl,
    statusCode: snapshot.statusCode,
    headings: snapshot.headings,
    internalLinks: snapshot.internalLinks,
    internalLinkDetails: snapshot.internalLinkDetails,
    contentText: snapshot.contentText,
    contentExcerpt: snapshot.contentExcerpt,
    contentChunks: snapshot.contentChunks,
    wordCount: snapshot.wordCount,
    issues: [],
    contentHash: snapshot.contentHash,
    crawlDepth,
    rendered: snapshot.rendered,
    lastCrawled: new Date().toISOString()
  } satisfies SitePage;

  return {
    ...draftPage,
    issues: buildIssues(draftPage)
  };
}

function buildRun(connectorId: string, status: ConnectorRun["status"], detail: string, recordCount: number, startedAt: string, metadata: ConnectorRun["metadata"]): ConnectorRun {
  return {
    id: `${connectorId}-run-${Date.now()}`,
    connectorId,
    provider: "site_crawl",
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    detail,
    recordCount,
    metadata
  };
}

async function crawlSingleSite(site: SiteScope, maxPages: number, seedUrls?: string[]): Promise<CrawlResult> {
  const startedAt = new Date().toISOString();
  const baseUrl = getBaseUrl(site);
  const connectorId =
    site === "docs" ? "docs-crawl" : site === "blog" ? "blog-crawl" : "site-crawl";
  const pathFilter = site === "blog" ? appEnv.blogUrlPathPrefix : undefined;
  let renderedSession: RenderedExtractionSession | null = null;

  const matchesPathFilter = (url: string) => {
    if (!pathFilter) return true;
    try {
      return new URL(url).pathname.startsWith(pathFilter);
    } catch {
      return false;
    }
  };

  logSeoEvent("info", "Crawl starting.", { site, baseUrl, maxPages, pathFilter: pathFilter ?? null });

  try {
    renderedSession =
      site === "primary" || site === "blog" ? await createRenderedExtractionSession() : null;
    const discoveredSitemapUrls = await fetchSitemapUrls(baseUrl, pathFilter);

    // For blog scope: if sitemap yielded any filtered URLs, use those as seeds
    // rather than the bare root (which likely won't match pathFilter).
    const seedPool = [
      ...(pathFilter && discoveredSitemapUrls.length === 0 ? [normalizeUrl(baseUrl)] : []),
      ...(pathFilter ? [] : [normalizeUrl(baseUrl)]),
      ...(seedUrls ?? []).map(normalizeUrl),
      ...discoveredSitemapUrls
    ];

    const queue = Array.from(new Set(seedPool))
      .slice(0, Math.max(maxPages, defaultMaxPages))
      .map((url) => ({ url, depth: url === normalizeUrl(baseUrl) ? 0 : 1 }));

    const visited = new Set<string>();
    const pages: SitePage[] = [];
    let skipCount = 0;
    const skipSamples: Array<{ url: string; error: string }> = [];

    while (queue.length > 0 && pages.length < maxPages) {
      const nextEntry = queue.shift();
      const nextUrl = nextEntry?.url;
      if (!nextUrl || visited.has(nextUrl)) {
        continue;
      }

      visited.add(nextUrl);

      if (!isInternalUrl(nextUrl, baseUrl)) {
        continue;
      }

      // Enforce path filter for blog scope. Don't drop the entry URL itself
      // if it's the only seed (e.g. blog index / landing page).
      if (pathFilter && !matchesPathFilter(nextUrl) && pages.length > 0) {
        continue;
      }

      try {
        const page = await buildSitePage(site, nextUrl, baseUrl, nextEntry.depth, renderedSession);
        pages.push(page);

        for (const link of page.internalLinks) {
          if (visited.has(link) || queue.length >= maxPages * 3) continue;
          if (pathFilter && !matchesPathFilter(link)) continue;
          queue.push({ url: link, depth: nextEntry.depth + 1 });
        }
      } catch (error) {
        skipCount++;
        const errMsg = error instanceof Error ? error.message : String(error);
        if (skipSamples.length < 5) {
          skipSamples.push({ url: nextUrl, error: errMsg });
        }
        logSeoEvent("warn", "Page crawl failed; skipping URL.", { url: nextUrl, error: errMsg });
        continue;
      }
    }

    logSeoEvent("info", "Crawl completed.", {
      site,
      baseUrl,
      pagesCrawled: pages.length,
      pagesSkipped: skipCount,
      sitemapUrlsFound: discoveredSitemapUrls.length,
      skipSamples
    });

    await saveSitePages(pages);

    const run = buildRun(
      connectorId,
      "success",
      `Crawled ${pages.length} ${
        site === "docs" ? "docs" : site === "blog" ? "blog" : "primary-site"
      } pages for inventory and link analysis.`,
      pages.length,
      startedAt,
      {
        site,
        baseUrl,
        maxPages,
        rendered: site === "primary"
      }
    );

    await saveConnectorRun(run);

    return {
      pages,
      run
    };
  } catch (error) {
    const run = buildRun(
      connectorId,
      "error",
      error instanceof Error ? error.message : `Failed to crawl ${baseUrl}.`,
      0,
      startedAt,
      {
        site,
        baseUrl,
        maxPages
      }
    );

    await saveConnectorRun(run);

    return {
      pages: [],
      run
    };
  } finally {
    await renderedSession?.close().catch(() => undefined);
  }
}

export async function crawlConfiguredSites(input: CrawlInput = {}) {
  const maxPages = input.maxPages ?? defaultMaxPages;

  if (input.site) {
    return [await crawlSingleSite(input.site, maxPages, input.seedUrls)];
  }

  return [
    await crawlSingleSite("primary", maxPages, input.seedUrls),
    await crawlSingleSite("docs", maxPages, input.seedUrls),
    await crawlSingleSite("blog", maxPages, input.seedUrls)
  ];
}
