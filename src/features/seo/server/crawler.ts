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

async function fetchSitemapUrls(baseUrl: string) {
  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/sitemap.xml`, {
      headers: {
        "user-agent": `${appEnv.appName} crawler`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const matches = xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi);

    return Array.from(matches)
      .map((match) => normalizeUrl(match[1].trim()))
      .filter((url) => isInternalUrl(url, baseUrl))
      .slice(0, defaultMaxPages * 2);
  } catch (error) {
    logSeoEvent("warn", "Sitemap fetch failed.", { baseUrl, error: String(error) });
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
  const snapshot = await extractPageSnapshot(url, baseUrl, site === "primary", {
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
  let renderedSession: RenderedExtractionSession | null = null;

  try {
    renderedSession = site === "primary" ? await createRenderedExtractionSession() : null;
    const discoveredSitemapUrls = await fetchSitemapUrls(baseUrl);
    const queue = Array.from(
      new Set([normalizeUrl(baseUrl), ...(seedUrls ?? []).map(normalizeUrl), ...discoveredSitemapUrls])
    )
      .slice(0, Math.max(maxPages, defaultMaxPages))
      .map((url) => ({ url, depth: url === normalizeUrl(baseUrl) ? 0 : 1 }));
    const visited = new Set<string>();
    const pages: SitePage[] = [];

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

      try {
        const page = await buildSitePage(site, nextUrl, baseUrl, nextEntry.depth, renderedSession);
        pages.push(page);

        for (const link of page.internalLinks) {
          if (!visited.has(link) && queue.length < maxPages * 3) {
            queue.push({ url: link, depth: nextEntry.depth + 1 });
          }
        }
      } catch (error) {
        logSeoEvent("warn", "Page crawl failed; skipping URL.", { url: nextUrl, error: String(error) });
        continue;
      }
    }

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
