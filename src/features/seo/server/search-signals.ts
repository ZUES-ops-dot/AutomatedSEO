import { opportunities } from "@/features/seo/data/demo-data";
import { appEnv } from "@/features/seo/server/env";
import {
  fetchMorningscoreKeywordPages,
  resolveMorningscoreDomainId,
  sleepMs,
  MORNINGSCORE_REQUEST_GAP_MS
} from "@/features/seo/server/morningscore-api";
import { getLatestConnectorRun, getSearchPerformanceRows, saveConnectorRun, saveSearchPerformanceRows } from "@/features/seo/server/storage";
import type { ConnectorRun, SearchPerformanceRow, SearchSignalProvider } from "@/features/seo/types";

export interface SearchSignalInput {
  provider?: SearchSignalProvider;
  /** Morningscore `global_domain_identifier` (optional if domain matches `PRIMARY_SITE_URL`). */
  property?: string;
  startDate?: string;
  endDate?: string;
  rowLimit?: number;
  dimensions?: string[];
  manualRows?: Array<{
    query: string;
    page: string;
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
    country?: string;
    device?: string;
  }>;
}

export interface SearchSignalStatus {
  configured: boolean;
  /** Morningscore domain id when resolved, or empty. */
  property: string;
  preferredProvider: SearchSignalProvider;
  availableProviders: SearchSignalProvider[];
  lastRun: ConnectorRun | null;
  storedRowCount: number;
}

export interface SearchSignalSyncResult {
  requestedProvider: SearchSignalProvider | null;
  provider: SearchSignalProvider;
  rows: SearchPerformanceRow[];
  run: ConnectorRun;
  availableProviders: SearchSignalProvider[];
}

function buildRowId(provider: SearchSignalProvider, query: string, page: string, capturedAt: string) {
  const slug = `${provider}-${query}-${page}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${slug}-${capturedAt.slice(0, 10)}`;
}

function buildRunId(provider: SearchSignalProvider) {
  return `run-search-signals-${provider}-${Date.now()}`;
}

function buildConnectorRun(
  provider: SearchSignalProvider,
  status: ConnectorRun["status"],
  detail: string,
  recordCount: number,
  startedAt: string,
  metadata: ConnectorRun["metadata"] = {}
): ConnectorRun {
  return {
    id: buildRunId(provider),
    connectorId: "search-console",
    provider,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    detail,
    recordCount,
    metadata
  };
}

function getAvailableProviders(): SearchSignalProvider[] {
  const providers: SearchSignalProvider[] = ["manual_csv", "demo_seed"];

  if (appEnv.morningscoreApiKey.length > 0) {
    providers.unshift("morningscore");
  }

  return providers;
}

function resolveProvider(input: SearchSignalInput): SearchSignalProvider {
  if (input.provider === "manual_csv") {
    return input.manualRows && input.manualRows.length > 0 ? "manual_csv" : "demo_seed";
  }

  if (input.provider === "morningscore") {
    return getAvailableProviders().includes("morningscore") ? "morningscore" : "demo_seed";
  }

  if (input.provider === "demo_seed") {
    return "demo_seed";
  }

  if (input.manualRows && input.manualRows.length > 0) {
    return "manual_csv";
  }

  return getAvailableProviders().includes("morningscore") ? "morningscore" : "demo_seed";
}

function normalizeManualRows(input: SearchSignalInput, runId: string): SearchPerformanceRow[] {
  const capturedAt = new Date().toISOString();

  return (input.manualRows ?? []).map((row, index) => {
    const impressions = row.impressions ?? 0;
    const clicks = row.clicks ?? 0;
    const derivedCtr = impressions > 0 ? clicks / impressions : 0;
    const query = row.query || `manual-query-${index + 1}`;
    const page = row.page || appEnv.primarySiteUrl;

    return {
      id: buildRowId("manual_csv", query, page, capturedAt),
      provider: "manual_csv",
      query,
      page,
      clicks,
      impressions,
      ctr: row.ctr ?? derivedCtr,
      position: row.position ?? 0,
      country: row.country,
      device: row.device,
      sourceRunId: runId,
      capturedAt
    };
  });
}

function buildDemoRows(runId: string): SearchPerformanceRow[] {
  const capturedAt = new Date().toISOString();

  return opportunities.slice(0, 8).map((opportunity, index) => ({
    id: buildRowId("demo_seed", opportunity.primaryQuery, opportunity.affectedUrls[0] ?? appEnv.primarySiteUrl, capturedAt),
    provider: "demo_seed",
    query: opportunity.primaryQuery,
    page: opportunity.affectedUrls[0] ?? appEnv.primarySiteUrl,
    clicks: Math.max(4, Math.round(opportunity.score / 8) - index),
    impressions: Math.max(25, Math.round(opportunity.score * 1.6)),
    ctr: Math.max(0.02, Math.min(0.3, opportunity.confidenceScore / 350)),
    position: Math.max(1, Math.round((120 - opportunity.score) / 6)),
    sourceRunId: runId,
    capturedAt
  }));
}

/**
 * Map Morningscore keyword rows into the app's SearchPerformanceRow shape.
 * Uses search volume (`sv`) as impressions and estimated traffic (`est_traffic`) as clicks (CTR derived).
 */
async function fetchMorningscoreRows(
  input: SearchSignalInput,
  runId: string
): Promise<{ rows: SearchPerformanceRow[]; domainId: string }> {
  const apiKey = appEnv.morningscoreApiKey;
  if (!apiKey) {
    throw new Error("Morningscore API key is not configured.");
  }

  const domainId = await resolveMorningscoreDomainId(apiKey, input.property ?? appEnv.morningscoreDomainId, appEnv.primarySiteUrl);
  await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);

  const maxRows = Math.min(Math.max(input.rowLimit ?? 500, 1), 5000);
  const keywords = await fetchMorningscoreKeywordPages(apiKey, domainId, {
    maxRows,
    perPage: Math.min(200, maxRows)
  });

  const capturedAt = new Date().toISOString();

  const rows = keywords.map((row, index) => {
    const page = row.full_landing_page ?? row.landing_page ?? appEnv.primarySiteUrl;
    const query = row.kw?.trim() || `keyword-${index + 1}`;
    const impressions = Math.max(0, Math.round(row.sv ?? 0));
    const clicks = Math.max(0, Math.round(row.est_traffic ?? 0));
    const ctr = impressions > 0 ? Math.min(1, clicks / impressions) : 0;
    const position = row.position ?? 100;

    return {
      id: buildRowId("morningscore", query, page, capturedAt),
      provider: "morningscore" as const,
      query,
      page,
      clicks,
      impressions,
      ctr,
      position,
      country: row.geotarget?.country_code ?? row.gl ?? undefined,
      sourceRunId: runId,
      capturedAt
    };
  });

  return { rows, domainId };
}

/** Probe connectivity (used for status when domain id is not set). */
async function tryResolveDomainLabel(): Promise<string> {
  if (!appEnv.morningscoreApiKey) {
    return "";
  }
  try {
    const id = await resolveMorningscoreDomainId(
      appEnv.morningscoreApiKey,
      appEnv.morningscoreDomainId,
      appEnv.primarySiteUrl
    );
    return id;
  } catch {
    return appEnv.morningscoreDomainId || "";
  }
}

export async function getSearchSignalStatus(): Promise<SearchSignalStatus> {
  const availableProviders = getAvailableProviders();
  const lastRun = await getLatestConnectorRun("search-console");
  const storedRows = await getSearchPerformanceRows();
  const resolvedDomain = await tryResolveDomainLabel();

  return {
    configured: availableProviders.includes("morningscore"),
    property: resolvedDomain || appEnv.morningscoreDomainId || appEnv.primarySiteUrl,
    preferredProvider: availableProviders.includes("morningscore") ? "morningscore" : "manual_csv",
    availableProviders,
    lastRun,
    storedRowCount: storedRows.length
  };
}

export async function syncSearchSignals(input: SearchSignalInput = {}): Promise<SearchSignalSyncResult> {
  const startedAt = new Date().toISOString();
  const requestedProvider = input.provider ?? null;
  const provider = resolveProvider(input);
  const availableProviders = getAvailableProviders();

  try {
    const provisionalRunId = buildRunId(provider);
    const morningscoreBundle =
      provider === "morningscore" ? await fetchMorningscoreRows(input, provisionalRunId) : null;
    const rows =
      provider === "morningscore"
        ? morningscoreBundle!.rows
        : provider === "manual_csv"
          ? normalizeManualRows(input, provisionalRunId)
          : buildDemoRows(provisionalRunId);

    const run = buildConnectorRun(
      provider,
      provider === "morningscore" ? "success" : "fallback",
      provider === "morningscore"
        ? `Fetched ${rows.length} Morningscore keyword rows (traffic + rankings).`
        : provider === "manual_csv"
          ? `Stored ${rows.length} manual search performance rows as a flexible fallback.`
          : `Stored ${rows.length} seeded search performance rows because live Morningscore access is unavailable.`,
      rows.length,
      startedAt,
      {
        ...(morningscoreBundle?.domainId ? { domainId: morningscoreBundle.domainId } : {}),
        primarySite: appEnv.primarySiteUrl,
        rowLimit: input.rowLimit ?? 500
      }
    );

    const persistedRows = rows.map((row) => ({
      ...row,
      sourceRunId: run.id
    }));

    await saveSearchPerformanceRows(persistedRows);
    await saveConnectorRun(run);

    return {
      requestedProvider,
      provider,
      rows: persistedRows,
      run,
      availableProviders
    };
  } catch (error) {
    const fallbackProvider: SearchSignalProvider = input.manualRows && input.manualRows.length > 0 ? "manual_csv" : "demo_seed";
    const fallbackRun = buildConnectorRun(
      fallbackProvider,
      "fallback",
      error instanceof Error
        ? `${error.message} Falling back to ${fallbackProvider === "manual_csv" ? "manual rows" : "seeded demo rows"}.`
        : `Connector fallback engaged using ${fallbackProvider}.`,
      0,
      startedAt,
      {
        requestedProvider: requestedProvider ?? "auto"
      }
    );

    const fallbackRows =
      fallbackProvider === "manual_csv" ? normalizeManualRows(input, fallbackRun.id) : buildDemoRows(fallbackRun.id);
    const persistedRows = fallbackRows.map((row) => ({
      ...row,
      sourceRunId: fallbackRun.id
    }));
    const finalizedRun = {
      ...fallbackRun,
      recordCount: persistedRows.length
    };

    await saveSearchPerformanceRows(persistedRows);
    await saveConnectorRun(finalizedRun);

    return {
      requestedProvider,
      provider: fallbackProvider,
      rows: persistedRows,
      run: finalizedRun,
      availableProviders
    };
  }
}
