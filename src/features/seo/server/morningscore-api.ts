import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const MS_BASE = "https://api.morningscore.io";

/** Morningscore allows ~2 req/s; stay under that between chained calls. */
export const MORNINGSCORE_REQUEST_GAP_MS = 550;

/** Avoid repeated `GET /v1/domains` when many modules resolve the domain in one request (e.g. dashboard). */
const RESOLVED_DOMAIN_ID_TTL_MS = 120_000;

type ResolvedDomainCacheEntry = { domainId: string; expiresAt: number };

const resolvedDomainIdCache = new Map<string, ResolvedDomainCacheEntry>();
/** Deduplicates concurrent cold-miss callers so only one `GET /v1/domains` is in flight per cache key. */
const resolvedDomainIdInflight = new Map<string, Promise<string>>();

function resolvedDomainIdCacheKey(apiKey: string, primarySiteUrl: string) {
  return `${apiKey}::${primarySiteUrl}`;
}

/** For tests or forced refresh after Morningscore domain list changes. */
export function clearMorningscoreResolvedDomainIdCache() {
  resolvedDomainIdCache.clear();
}

export async function sleepMs(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export type MorningscoreDomainListItem = {
  global_domain_identifier: string;
  domain: string;
  global_company_identifier: string;
  hl: string;
  gl: string;
};

export type MorningscoreDomainDetails = {
  global_domain_identifier: string;
  domain: string;
  global_company_identifier: string;
  hl: string;
  gl: string;
  score: number | null;
  keywords: number | null;
  traffic: number | null;
  currency: string;
  metrics: {
    link_score: number | null;
    refdomains: number | null;
    domain_rating: number | null;
  };
};

export type MorningscoreKeywordV2Item = {
  kw: string;
  gl: string;
  hl: string;
  position: number | null;
  sv: number | null;
  cpc: number | null;
  est_traffic: number | null;
  traffic_value: number | null;
  landing_page: string | null;
  full_landing_page: string | null;
  geotarget?: { country_code?: string | null } | null;
};

export type MorningscoreKeywordsV2Response = {
  total: number;
  page: number;
  data: MorningscoreKeywordV2Item[];
};

export type MorningscoreOverallHealth = {
  prev_score: number;
  score: number;
  crawl_status: string;
  crawled_at: string;
  pages_count: number;
};

async function morningscoreJson<T>(path: string, apiKey: string, init: RequestInit = {}): Promise<T> {
  const response = await fetchWithTimeout(
    `${MS_BASE}${path}`,
    {
      ...init,
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
        ...init.headers
      }
    },
    45_000
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Morningscore ${path} failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json() as Promise<T>;
}

export async function listMorningscoreDomains(apiKey: string): Promise<MorningscoreDomainListItem[]> {
  return morningscoreJson<MorningscoreDomainListItem[]>("/v1/domains", apiKey);
}

export function resolveDomainIdFromHostname(domains: MorningscoreDomainListItem[], hostname: string): string | null {
  const target = hostname.replace(/^www\./i, "").toLowerCase();
  const match = domains.find((item) => item.domain.replace(/^www\./i, "").toLowerCase() === target);
  return match?.global_domain_identifier ?? null;
}

export async function getMorningscoreDomainDetails(apiKey: string, domainId: string): Promise<MorningscoreDomainDetails> {
  return morningscoreJson<MorningscoreDomainDetails>(`/v1/domains/${encodeURIComponent(domainId)}`, apiKey);
}

export async function getMorningscoreOverallHealth(apiKey: string, domainId: string): Promise<MorningscoreOverallHealth> {
  return morningscoreJson<MorningscoreOverallHealth>(`/v1/${encodeURIComponent(domainId)}/overall`, apiKey);
}

export async function resolveMorningscoreDomainId(apiKey: string, explicitDomainId: string, primarySiteUrl: string): Promise<string> {
  if (explicitDomainId.trim().length > 0) {
    return explicitDomainId.trim();
  }

  const now = Date.now();
  const cacheKey = resolvedDomainIdCacheKey(apiKey, primarySiteUrl);
  const cached = resolvedDomainIdCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.domainId;
  }

  const pending = resolvedDomainIdInflight.get(cacheKey);
  if (pending) {
    return pending;
  }

  const resolution = (async () => {
    const hostname = new URL(primarySiteUrl).hostname;
    const domains = await listMorningscoreDomains(apiKey);
    await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);
    const resolved = resolveDomainIdFromHostname(domains, hostname);
    if (!resolved) {
      throw new Error(
        `No Morningscore domain matches ${hostname}. Set MORNINGSCORE_DOMAIN_ID or add the site in Morningscore.`
      );
    }

    const ts = Date.now();
    resolvedDomainIdCache.set(cacheKey, { domainId: resolved, expiresAt: ts + RESOLVED_DOMAIN_ID_TTL_MS });

    if (resolvedDomainIdCache.size > 64) {
      for (const [key, entry] of resolvedDomainIdCache) {
        if (entry.expiresAt <= ts) {
          resolvedDomainIdCache.delete(key);
        }
      }
    }

    return resolved;
  })().finally(() => {
    resolvedDomainIdInflight.delete(cacheKey);
  });

  resolvedDomainIdInflight.set(cacheKey, resolution);
  return resolution;
}

export async function fetchMorningscoreKeywordPages(
  apiKey: string,
  domainId: string,
  options: { maxRows: number; perPage: number }
): Promise<MorningscoreKeywordV2Item[]> {
  const collected: MorningscoreKeywordV2Item[] = [];
  let page = 1;

  while (collected.length < options.maxRows) {
    const path =
      `/v1/${encodeURIComponent(domainId)}/keywords-v2?` +
      new URLSearchParams({
        "pagination.page": String(page),
        "pagination.per_page": String(Math.min(options.perPage, 1000)),
        "sort.by": "est_traffic",
        "sort.direction": "desc"
      }).toString();

    const payload = await morningscoreJson<MorningscoreKeywordsV2Response>(path, apiKey);
    const batch = payload.data ?? [];
    if (batch.length === 0) {
      break;
    }
    collected.push(...batch);
    // `payload.total` is advisory -- Morningscore sometimes omits it. Only exit when the
    // page was not full (last page) or when `total` is a real number we've reached.
    const totalKnown = typeof payload.total === "number" && payload.total > 0;
    if (batch.length < options.perPage || (totalKnown && collected.length >= payload.total)) {
      break;
    }
    page += 1;
    await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);
  }

  return collected.slice(0, options.maxRows);
}

export type MorningscorePageRow = {
  path?: string | null;
  path_full?: string | null;
  issues_unresolved?: number | null;
  issues_resolved?: number | null;
  issues_num?: number | null;
  tasks_unresolved?: number | null;
  tasks_unresolved_impact?: number | null;
  tasks_resolved?: number | null;
};

export type MorningscorePagesListResponse = {
  total: number;
  page: number;
  per_page: number;
  data: MorningscorePageRow[];
};

export async function fetchMorningscorePagesPage(
  apiKey: string,
  domainId: string,
  page: number,
  perPage: number
): Promise<MorningscorePagesListResponse> {
  const path =
    `/v1/${encodeURIComponent(domainId)}/pages?` +
    new URLSearchParams({
      "pagination.page": String(page),
      "pagination.per_page": String(Math.min(perPage, 100))
    }).toString();

  return morningscoreJson<MorningscorePagesListResponse>(path, apiKey);
}

export type MorningscoreIssueRow = {
  issue_identifier?: string | null;
  validator?: string;
  category?: string;
  resolved?: boolean;
  page?: { path?: string; path_full?: string };
};

export type MorningscoreIssuesListResponse = {
  total: number;
  page: number;
  per_page: number;
  data: MorningscoreIssueRow[];
};

/** `filter.issue_type` is required by the Morningscore API. */
export async function fetchMorningscoreIssuesPage(
  apiKey: string,
  domainId: string,
  issueType: string,
  options: { page: number; perPage: number; resolvedOnly?: boolean }
): Promise<MorningscoreIssuesListResponse> {
  const params = new URLSearchParams({
    "filter.issue_type": issueType,
    "pagination.page": String(options.page),
    "pagination.per_page": String(Math.min(options.perPage, 100)),
    soft_limit: "2000"
  });
  if (options.resolvedOnly === true) {
    params.set("filter.resolved", "true");
  } else if (options.resolvedOnly === false) {
    params.set("filter.resolved", "false");
  }

  const path = `/v1/${encodeURIComponent(domainId)}/issues?${params.toString()}`;
  return morningscoreJson<MorningscoreIssuesListResponse>(path, apiKey);
}

export type MorningscoreBacklinkRow = {
  link: string;
  strength?: number | null;
  date?: string | null;
};

export type MorningscoreBacklinksResponse = {
  total: number;
  page: number;
  per_page: number;
  data: MorningscoreBacklinkRow[];
};

export async function fetchMorningscoreBacklinksPage(
  apiKey: string,
  domainId: string,
  page: number,
  perPage: number,
  kind: "all" | "new" | "lost" = "all"
): Promise<MorningscoreBacklinksResponse> {
  const path =
    `/v1/${encodeURIComponent(domainId)}/backlinks?` +
    new URLSearchParams({
      "pagination.page": String(page),
      "pagination.per_page": String(Math.min(perPage, 100)),
      kind
    }).toString();

  return morningscoreJson<MorningscoreBacklinksResponse>(path, apiKey);
}
