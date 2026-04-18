/** Central limits for SEO persistence and crawling (avoid magic numbers in call sites). */

export const STORAGE_LIMITS = {
  maxSearchPerformanceRows: 500,
  maxInternalLinkAudits: 50,
  maxPageSpeedSnapshots: 500,
  maxSourceEvents: 500,
  maxLinkSuggestions: 500,
  maxPerformanceSnapshots: 1000,
  maxJobSchedules: 100,
  maxOutcomes: 1_000
} as const;

export const VIEW_LIMITS = {
  dashboardIdeasFromOpportunities: 6,
  dashboardIdeasPreview: 3,
  studioBriefsPreview: 2,
  studioDraftsPreview: 2,
  ideaEvidenceSnippets: 4,
  jobRunsPreview: 8,
  pageAttentionTechnical: 3,
  pageAttentionMorningscore: 4,
  pageAttentionPageSpeed: 2,
  pageAttentionTotal: 10
} as const;

export const CRAWL_LIMITS = {
  defaultMaxPages: 20,
  pageIdSlugMaxLength: 96
} as const;

export const SLUG_LIMITS = {
  opportunitySlug: 72,
  internalLinkSlug: 80,
  contentEngineSlug: 64,
  monitoringSlug: 80
} as const;

/** Outbound HTTP defaults (connectors, LLM, crawlers). */
export const HTTP_CLIENT = {
  defaultTimeoutMs: 30_000,
  /** Longer reads for PageSpeed / heavy JSON APIs. */
  slowApiTimeoutMs: 60_000,
  /** Anthropic can exceed 30s under load. */
  llmTimeoutMs: 120_000
} as const;
