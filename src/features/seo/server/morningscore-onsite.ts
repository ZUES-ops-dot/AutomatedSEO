import { appEnv } from "@/features/seo/server/env";
import {
  fetchMorningscorePagesPage,
  type MorningscorePageRow,
  MORNINGSCORE_REQUEST_GAP_MS,
  resolveMorningscoreDomainId,
  sleepMs
} from "@/features/seo/server/morningscore-api";
import { saveConnectorRun, savePageSpeedSnapshots } from "@/features/seo/server/storage";
import type { ConnectorRun, PageSpeedSnapshot } from "@/features/seo/types";
import { logSeoEvent } from "@/lib/seo-log";

interface OnsiteInput {
  strategy?: PageSpeedSnapshot["strategy"];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildRun(
  status: ConnectorRun["status"],
  detail: string,
  recordCount: number,
  startedAt: string,
  metadata: ConnectorRun["metadata"] = {}
): ConnectorRun {
  return {
    id: `pagespeed-run-${Date.now()}`,
    connectorId: "pagespeed",
    provider: "morningscore",
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    detail,
    recordCount,
    metadata
  };
}

function resolvePageUrl(row: MorningscorePageRow): string {
  if (row.path_full && /^https?:\/\//i.test(row.path_full)) {
    return row.path_full;
  }
  const path = row.path?.startsWith("/") ? row.path : `/${row.path ?? ""}`;
  try {
    return new URL(path, appEnv.primarySiteUrl).href;
  } catch {
    return appEnv.primarySiteUrl;
  }
}

/** Map onsite task/issue weight to a 0–100 score compatible with dashboard thresholds. */
function performanceScoreFromRow(row: MorningscorePageRow): number {
  const impact =
    row.tasks_unresolved_impact ??
    (row.issues_unresolved ?? 0) * 4 + (row.tasks_unresolved ?? 0) * 2 + (row.issues_num ?? 0);
  return Math.max(0, Math.min(100, Math.round(100 - Math.min(Number(impact) || 0, 90))));
}

/**
 * Replaces Google PageSpeed Insights: pulls Morningscore crawl pages and derives a synthetic
 * performance score from unresolved issues/tasks (includes page-speed-related validators).
 */
export async function syncMorningscoreOnsiteSnapshots(input: OnsiteInput = {}) {
  const startedAt = new Date().toISOString();
  const strategy = input.strategy ?? "mobile";

  if (!appEnv.morningscoreApiKey) {
    const run = buildRun(
      "error",
      "Morningscore API key is missing; onsite snapshots were not fetched.",
      0,
      startedAt,
      { strategy, source: "morningscore" }
    );
    await saveConnectorRun(run);
    return { snapshots: [] as PageSpeedSnapshot[], run };
  }

  try {
    const domainId = await resolveMorningscoreDomainId(
      appEnv.morningscoreApiKey,
      appEnv.morningscoreDomainId,
      appEnv.primarySiteUrl
    );
    await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);

    const first = await fetchMorningscorePagesPage(appEnv.morningscoreApiKey, domainId, 1, 50);
    await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);

    let rows = [...(first.data ?? [])];
    if (rows.length > 0 && first.total > rows.length) {
      const second = await fetchMorningscorePagesPage(appEnv.morningscoreApiKey, domainId, 2, 50);
      rows = rows.concat(second.data ?? []);
    }

    const sorted = [...rows]
      .sort((left, right) => (right.issues_unresolved ?? 0) - (left.issues_unresolved ?? 0))
      .slice(0, 12);

    const capturedAt = new Date().toISOString();
    const snapshots: PageSpeedSnapshot[] = sorted.map((row, index) => {
      const url = resolvePageUrl(row);
      return {
        id: `ms-onsite-${strategy}-${slugify(url)}-${capturedAt.slice(0, 10)}-${index}`,
        url,
        strategy,
        performanceScore: performanceScoreFromRow(row),
        largestContentfulPaint: null,
        cumulativeLayoutShift: null,
        interactionToNextPaint: null,
        firstContentfulPaint: null,
        capturedAt
      };
    });

    await savePageSpeedSnapshots(snapshots);

    const run = buildRun(
      snapshots.length > 0 ? "success" : "fallback",
      snapshots.length > 0
        ? `Stored ${snapshots.length} Morningscore onsite page scores (derived from crawl issues/tasks).`
        : "Morningscore returned no indexed pages for this domain yet.",
      snapshots.length,
      startedAt,
      { strategy, domainId, source: "morningscore", pageTotal: first.total }
    );
    await saveConnectorRun(run);

    return { snapshots, run };
  } catch (error) {
    logSeoEvent("warn", "Morningscore onsite snapshot sync failed.", {
      error: error instanceof Error ? error.message : String(error)
    });
    const run = buildRun(
      "error",
      error instanceof Error ? error.message : "Morningscore onsite sync failed.",
      0,
      startedAt,
      { strategy, source: "morningscore" }
    );
    await saveConnectorRun(run);
    return { snapshots: [] as PageSpeedSnapshot[], run };
  }
}
