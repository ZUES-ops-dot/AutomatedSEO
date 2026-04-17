import { appEnv } from "@/features/seo/server/env";
import { HTTP_CLIENT } from "@/features/seo/server/seo-constants";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { logSeoEvent } from "@/lib/seo-log";
import {
  getSearchPerformanceRows,
  getSitePages,
  saveConnectorRun,
  savePageSpeedSnapshots,
  saveSourceEvents
} from "@/features/seo/server/storage";
import type { ConnectorRun, ConnectorRunProvider, PageSpeedSnapshot, SourceEvent } from "@/features/seo/types";

interface PageSpeedInput {
  strategy?: PageSpeedSnapshot["strategy"];
  urls?: string[];
}

interface GitHubInput {
  repo?: string;
}

interface RssInput {
  feedUrls?: string[];
}

interface GdeltInput {
  query?: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function buildRun(
  connectorId: string,
  provider: ConnectorRunProvider,
  status: ConnectorRun["status"],
  detail: string,
  recordCount: number,
  startedAt: string,
  metadata: ConnectorRun["metadata"] = {}
): ConnectorRun {
  return {
    id: `${connectorId}-run-${Date.now()}`,
    connectorId,
    provider,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    detail,
    recordCount,
    metadata
  };
}

async function resolvePriorityUrls() {
  const rows = await getSearchPerformanceRows();
  const rowUrls = rows.map((row) => row.page).filter(Boolean);
  const pages = await getSitePages();
  const pageUrls = pages.map((page) => page.url);

  return uniqueValues([...rowUrls, ...pageUrls]).slice(0, 8);
}

export async function syncPageSpeed(input: PageSpeedInput = {}) {
  const startedAt = new Date().toISOString();
  const strategy = input.strategy ?? "mobile";

  if (!appEnv.googleApiKey) {
    const run = buildRun(
      "pagespeed",
      "pagespeed",
      "error",
      "Google API key is missing, so PageSpeed snapshots could not be fetched.",
      0,
      startedAt,
      { strategy }
    );

    await saveConnectorRun(run);
    return {
      snapshots: [] as PageSpeedSnapshot[],
      run
    };
  }

  const urls = input.urls && input.urls.length > 0 ? uniqueValues(input.urls) : await resolvePriorityUrls();
  const snapshots: PageSpeedSnapshot[] = [];

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${appEnv.googleApiKey}`,
        { cache: "no-store" },
        HTTP_CLIENT.slowApiTimeoutMs
      );

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as {
        lighthouseResult?: {
          categories?: { performance?: { score?: number } };
          audits?: Record<string, { numericValue?: number }>;
        };
      };

      const audits = payload.lighthouseResult?.audits ?? {};
      const capturedAt = new Date().toISOString();

      snapshots.push({
        id: `pagespeed-${strategy}-${slugify(url)}-${capturedAt.slice(0, 10)}`,
        url,
        strategy,
        performanceScore: Math.round((payload.lighthouseResult?.categories?.performance?.score ?? 0) * 100),
        largestContentfulPaint: audits["largest-contentful-paint"]?.numericValue ?? null,
        cumulativeLayoutShift: audits["cumulative-layout-shift"]?.numericValue ?? null,
        interactionToNextPaint: audits["interaction-to-next-paint"]?.numericValue ?? null,
        firstContentfulPaint: audits["first-contentful-paint"]?.numericValue ?? null,
        capturedAt
      });
    } catch (error) {
      logSeoEvent("warn", "PageSpeed snapshot fetch failed for URL.", {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
      continue;
    }
  }

  await savePageSpeedSnapshots(snapshots);

  const run = buildRun(
    "pagespeed",
    "pagespeed",
    snapshots.length > 0 ? "success" : "error",
    snapshots.length > 0
      ? `Stored ${snapshots.length} PageSpeed snapshots for priority URLs.`
      : "PageSpeed did not return any usable snapshots.",
    snapshots.length,
    startedAt,
    { strategy, urlCount: urls.length }
  );

  await saveConnectorRun(run);

  return {
    snapshots,
    run
  };
}

export async function syncGitHubEvents(input: GitHubInput = {}) {
  const startedAt = new Date().toISOString();
  const repo = input.repo ?? process.env.GITHUB_REPO ?? "qubic/core";
  const githubToken = process.env.GITHUB_TOKEN?.trim() ?? "";

  try {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${repo}/releases?per_page=10`, {
      headers: githubToken
        ? {
            authorization: `Bearer ${githubToken}`,
            "user-agent": appEnv.appName
          }
        : {
            "user-agent": appEnv.appName
          },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`GitHub releases request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as Array<{
      id: number;
      name?: string;
      tag_name?: string;
      body?: string;
      html_url?: string;
      published_at?: string;
    }>;

    const capturedAt = new Date().toISOString();
    const events: SourceEvent[] = payload.map((release) => ({
      id: `github-release-${release.id}`,
      connectorId: "github",
      kind: "github_release",
      title: release.name || release.tag_name || `Release ${release.id}`,
      summary: normalizeWhitespace((release.body ?? "").slice(0, 280)) || `Release activity detected for ${repo}.`,
      url: release.html_url ?? `https://github.com/${repo}/releases`,
      tags: [repo, "github", "release"],
      score: 70,
      publishedAt: release.published_at ?? capturedAt,
      capturedAt
    }));

    await saveSourceEvents(events);

    const run = buildRun(
      "github",
      "github",
      "success",
      `Stored ${events.length} GitHub release events from ${repo}.`,
      events.length,
      startedAt,
      { repo }
    );

    await saveConnectorRun(run);

    return {
      events,
      run
    };
  } catch (error) {
    const run = buildRun(
      "github",
      "github",
      "error",
      error instanceof Error ? error.message : `Failed to fetch GitHub events for ${repo}.`,
      0,
      startedAt,
      { repo }
    );

    await saveConnectorRun(run);

    return {
      events: [] as SourceEvent[],
      run
    };
  }
}

function extractFeedEntries(xml: string) {
  const itemBlocks = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match) => match[1]);
  const entryBlocks = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)).map((match) => match[1]);
  return [...itemBlocks, ...entryBlocks].slice(0, 12);
}

function extractXmlValue(block: string, tag: string) {
  const direct = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (direct?.[1]) {
    return normalizeWhitespace(decodeHtml(direct[1].replace(/<[^>]+>/g, " ")));
  }

  const attr = block.match(new RegExp(`<${tag}[^>]+href=["']([^"']+)["'][^>]*\/?>`, "i"));
  return attr?.[1]?.trim() ?? "";
}

export async function syncRssFeeds(input: RssInput = {}) {
  const startedAt = new Date().toISOString();
  const feedUrls = input.feedUrls && input.feedUrls.length > 0 ? input.feedUrls : appEnv.rssFeedUrls;

  if (feedUrls.length === 0) {
    const run = buildRun("rss-watch", "rss", "error", "No RSS feed URLs are configured.", 0, startedAt);
    await saveConnectorRun(run);
    return {
      events: [] as SourceEvent[],
      run
    };
  }

  const capturedAt = new Date().toISOString();
  const events: SourceEvent[] = [];

  for (const feedUrl of feedUrls) {
    try {
      const response = await fetchWithTimeout(feedUrl, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const xml = await response.text();
      const entries = extractFeedEntries(xml);

      for (const entry of entries) {
        const title = extractXmlValue(entry, "title");
        const summary =
          extractXmlValue(entry, "description") || extractXmlValue(entry, "summary") || extractXmlValue(entry, "content");
        const url = extractXmlValue(entry, "link") || feedUrl;
        const publishedAt =
          extractXmlValue(entry, "pubDate") || extractXmlValue(entry, "updated") || extractXmlValue(entry, "published") || capturedAt;

        if (!title) {
          continue;
        }

        events.push({
          id: `rss-${slugify(feedUrl)}-${slugify(title)}`,
          connectorId: "rss-watch",
          kind: "rss_item",
          title,
          summary: summary.slice(0, 280),
          url,
          tags: ["rss", new URL(feedUrl).hostname],
          score: 64,
          publishedAt,
          capturedAt
        });
      }
    } catch (error) {
      logSeoEvent("warn", "RSS feed sync failed.", {
        feedUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      continue;
    }
  }

  await saveSourceEvents(events);

  const run = buildRun(
    "rss-watch",
    "rss",
    events.length > 0 ? "success" : "error",
    events.length > 0 ? `Stored ${events.length} RSS items across ${feedUrls.length} feeds.` : "No RSS items were captured.",
    events.length,
    startedAt,
    { feedCount: feedUrls.length }
  );

  await saveConnectorRun(run);

  return {
    events,
    run
  };
}

export async function syncGdeltArticles(input: GdeltInput = {}) {
  const startedAt = new Date().toISOString();
  const query = input.query ?? appEnv.gdeltQuery;

  try {
    const response = await fetchWithTimeout(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&sort=datedesc&maxrecords=10`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`GDELT request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      articles?: Array<{
        title?: string;
        seendate?: string;
        socialimage?: string;
        domain?: string;
        url?: string;
      }>;
    };

    const capturedAt = new Date().toISOString();
    const events: SourceEvent[] = (payload.articles ?? []).map((article, index) => ({
      id: `gdelt-${slugify(article.url ?? article.title ?? String(index))}`,
      connectorId: "gdelt",
      kind: "gdelt_article",
      title: article.title ?? `GDELT article ${index + 1}`,
      summary: article.domain ? `News mention captured from ${article.domain}.` : "News mention captured from GDELT.",
      url: article.url ?? article.socialimage ?? appEnv.primarySiteUrl,
      tags: uniqueValues(["gdelt", article.domain ?? "news", "freshness"]),
      score: 58,
      publishedAt: article.seendate ?? capturedAt,
      capturedAt
    }));

    await saveSourceEvents(events);

    const run = buildRun(
      "gdelt",
      "gdelt",
      "success",
      `Stored ${events.length} GDELT article signals for ${query}.`,
      events.length,
      startedAt,
      { query }
    );

    await saveConnectorRun(run);

    return {
      events,
      run
    };
  } catch (error) {
    const run = buildRun(
      "gdelt",
      "gdelt",
      "error",
      error instanceof Error ? error.message : `Failed to fetch GDELT articles for ${query}.`,
      0,
      startedAt,
      { query }
    );

    await saveConnectorRun(run);

    return {
      events: [] as SourceEvent[],
      run
    };
  }
}
