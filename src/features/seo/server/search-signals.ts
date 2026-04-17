import { createSign } from "crypto";

import { opportunities } from "@/features/seo/data/demo-data";
import { appEnv } from "@/features/seo/server/env";
import { getLatestConnectorRun, getSearchPerformanceRows, saveConnectorRun, saveSearchPerformanceRows } from "@/features/seo/server/storage";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { ConnectorRun, SearchPerformanceRow, SearchSignalProvider } from "@/features/seo/types";

const googleScope = "https://www.googleapis.com/auth/webmasters.readonly";

type SearchDimension = "query" | "page" | "country" | "device";

export interface SearchSignalInput {
  provider?: SearchSignalProvider;
  property?: string;
  startDate?: string;
  endDate?: string;
  rowLimit?: number;
  dimensions?: SearchDimension[];
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

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, number | string>) {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${body}`);
  signer.end();
  const signature = signer.sign(appEnv.searchConsolePrivateKey, "base64url");
  return `${header}.${body}.${signature}`;
}

function getIsoDateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function getAvailableProviders(): SearchSignalProvider[] {
  const providers: SearchSignalProvider[] = ["manual_csv", "demo_seed"];

  if (appEnv.searchConsoleClientEmail.length > 0 && appEnv.searchConsolePrivateKey.length > 0) {
    providers.unshift("google_search_console");
  }

  return providers;
}

function resolveProvider(input: SearchSignalInput): SearchSignalProvider {
  if (input.provider === "manual_csv") {
    return input.manualRows && input.manualRows.length > 0 ? "manual_csv" : "demo_seed";
  }

  if (input.provider === "google_search_console") {
    return getAvailableProviders().includes("google_search_console") ? "google_search_console" : "demo_seed";
  }

  if (input.provider === "demo_seed") {
    return "demo_seed";
  }

  if (input.manualRows && input.manualRows.length > 0) {
    return "manual_csv";
  }

  return getAvailableProviders().includes("google_search_console") ? "google_search_console" : "demo_seed";
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
  return `run-search-console-${provider}-${Date.now()}`;
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

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: appEnv.searchConsoleClientEmail,
    scope: googleScope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  });

  const response = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) {
    throw new Error(`Google OAuth failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
  };

  if (!payload.access_token) {
    throw new Error("Google OAuth did not return an access token.");
  }

  return payload.access_token;
}

async function fetchGoogleSearchConsoleRows(input: SearchSignalInput, runId: string): Promise<SearchPerformanceRow[]> {
  const property = input.property ?? appEnv.searchConsoleProperty;
  const startDate = input.startDate ?? getIsoDateDaysAgo(28);
  const endDate = input.endDate ?? getIsoDateDaysAgo(1);
  const rowLimit = input.rowLimit ?? 25;
  const dimensions = input.dimensions ?? ["query", "page"];
  const accessToken = await getGoogleAccessToken();
  const capturedAt = new Date().toISOString();

  const response = await fetchWithTimeout(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit,
        dataState: "all"
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Search Console query failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    rows?: Array<{
      keys?: string[];
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    }>;
  };

  return (payload.rows ?? []).map((row, index) => {
    const keys = row.keys ?? [];
    const getKey = (dimension: SearchDimension) => {
      const dimensionIndex = dimensions.indexOf(dimension);
      return dimensionIndex >= 0 ? keys[dimensionIndex] ?? "" : "";
    };
    const query = getKey("query") || `untitled-query-${index + 1}`;
    const page = getKey("page") || appEnv.primarySiteUrl;

    return {
      id: buildRowId("google_search_console", query, page, capturedAt),
      provider: "google_search_console",
      query,
      page,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
      country: getKey("country") || undefined,
      device: getKey("device") || undefined,
      sourceRunId: runId,
      capturedAt
    };
  });
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

export async function getSearchSignalStatus(): Promise<SearchSignalStatus> {
  const availableProviders = getAvailableProviders();
  const lastRun = await getLatestConnectorRun("search-console");
  const storedRows = await getSearchPerformanceRows();

  return {
    configured: availableProviders.includes("google_search_console"),
    property: appEnv.searchConsoleProperty,
    preferredProvider: availableProviders.includes("google_search_console") ? "google_search_console" : "manual_csv",
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
    const rows =
      provider === "google_search_console"
        ? await fetchGoogleSearchConsoleRows(input, provisionalRunId)
        : provider === "manual_csv"
          ? normalizeManualRows(input, provisionalRunId)
          : buildDemoRows(provisionalRunId);

    const run = buildConnectorRun(
      provider,
      provider === "google_search_console" ? "success" : "fallback",
      provider === "google_search_console"
        ? `Fetched ${rows.length} Search Console rows for ${input.property ?? appEnv.searchConsoleProperty}.`
        : provider === "manual_csv"
          ? `Stored ${rows.length} manual search performance rows as a flexible fallback.`
          : `Stored ${rows.length} seeded search performance rows because live Search Console access is unavailable.`,
      rows.length,
      startedAt,
      {
        property: input.property ?? appEnv.searchConsoleProperty,
        startDate: input.startDate ?? getIsoDateDaysAgo(28),
        endDate: input.endDate ?? getIsoDateDaysAgo(1)
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
