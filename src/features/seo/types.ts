/** Logical tenant for rate limits, domain events, and future namespaced storage. Default single-tenant deployments use `"default"`. */
export type TenantId = string;

/** Future: wrap persisted entities when storage is partitioned by `tenantId`. */
export type TenantScoped<T> = { tenantId: TenantId; value: T };

export type OpportunityAction = "refresh" | "new_support_page" | "new_relevant_blog" | "merge" | "skip";

/** Low-score band; named `deferred` to avoid clashing with the `skip` recommended action. */
export type PriorityBand = "do_now" | "queue" | "backlog" | "deferred";

export type OpportunityStatus =
  | "new"
  | "approved"
  | "in_review"
  | "drafting"
  | "snoozed"
  | "dismissed";

export type ConnectorState = "connected" | "attention" | "planned";

export type ConnectorGroup =
  | "site_intelligence"
  | "google_signals"
  | "qubic_sources"
  | "community_signals"
  | "ai_generation"
  | "local_ai";

export interface OpportunityCandidate {
  id: string;
  title: string;
  cluster: string;
  primaryQuery: string;
  affectedUrls: string[];
  pageType: "docs" | "blog" | "landing" | "ecosystem";
  reason: string;
  evidence: string[];
  sourceTypes: string[];
  businessRelevance: number;
  demandSignal: number;
  ctrGap: number;
  freshnessNeed: number;
  uniquenessPotential: number;
  enrichmentAvailable: number;
  internalLinkSupport: number;
  cannibalizationRisk: number;
  difficultyGap: number;
  existingPageTargetsIntent: boolean;
  rankingButUnderperforming: boolean;
  ctrWeak: boolean;
  staleOrMissingSubtopics: boolean;
  repeatedIntent: boolean;
  noCurrentPageMapsCleanly: boolean;
  evergreenBetterThanBlog: boolean;
  supportsPriorityCluster: boolean;
  risingTopic: boolean;
  commentaryAddsValue: boolean;
  firstPartyContextAvailable: boolean;
  overlappingPages: boolean;
  strongerCanonicalExists: boolean;
  demandTooWeak: boolean;
  competitionTooStrong: boolean;
  limitedUniqueValue: boolean;
  offStrategy: boolean;
  status: OpportunityStatus;
  lastUpdated: string;
}

export interface Opportunity extends OpportunityCandidate {
  recommendedAction: OpportunityAction;
  score: number;
  confidenceScore: number;
  priorityBand: PriorityBand;
}

export interface Connector {
  id: string;
  name: string;
  group: ConnectorGroup;
  description: string;
  cadence: string;
  status: ConnectorState;
  healthScore: number;
  auth: string;
  outputs: string[];
  envKeys: string[];
}

export interface ConnectorRuntime extends Connector {
  configured: boolean;
  configuredKeyCount: number;
  missingEnvKeys: string[];
  setupHint: string;
}

export interface ConnectorGroupView {
  group: ConnectorGroup;
  label: string;
  items: ConnectorRuntime[];
}

export interface ConnectorSummary {
  total: number;
  configured: number;
  connected: number;
  attention: number;
  planned: number;
  deploymentTarget: "local" | "railway";
}

export interface JobRun {
  id: string;
  name: string;
  cadence: string;
  status: "healthy" | "warning" | "paused";
  lastRun: string;
  nextRun: string;
  detail: string;
}

export interface PageAttentionItem {
  id: string;
  url: string;
  issue: string;
  priority: "high" | "medium" | "low";
  affectedMetric: string;
  recommendation: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  angle: string;
  freshness: string;
  relatedOpportunityId: string;
  sources: string[];
  clusterRole: string;
}

export interface ContentBrief {
  id: string;
  title: string;
  format: string;
  objective: string;
  audience: string;
  supportingOpportunityId: string;
  outline: string[];
  sources: string[];
  reviewFlags: string[];
}

export interface DraftSection {
  heading: string;
  paragraphs: string[];
}

export interface DraftDocument {
  id: string;
  title: string;
  status: "review_required" | "ready_for_editor";
  supportingOpportunityId: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  sources: string[];
  reviewFlags: string[];
  sections: DraftSection[];
}

export interface SourcePackSource {
  id: string;
  type: "opportunity" | "idea" | "brief" | "draft" | "connector" | "search_signal";
  title: string;
  summary: string;
  evidence: string[];
}

export interface SourcePack {
  id: string;
  topic: string;
  angle: string;
  objective: string;
  primaryQuery: string;
  targetUrls: string[];
  supportingOpportunityId: string;
  sources: SourcePackSource[];
  citations: string[];
  reviewChecklist: string[];
  generatedAt: string;
}

export interface GenerationProvider {
  provider: "anthropic" | "ollama" | "deterministic";
  model: string;
  live: boolean;
}

export type SiteScope = "primary" | "docs" | "blog";

export interface PageLinkReference {
  targetUrl: string;
  anchorText: string;
  context: string;
}

export interface SitePage {
  id: string;
  url: string;
  site: SiteScope;
  title: string;
  h1: string;
  metaDescription: string;
  canonicalUrl: string;
  statusCode: number;
  headings: string[];
  internalLinks: string[];
  internalLinkDetails: PageLinkReference[];
  contentText: string;
  contentExcerpt: string;
  contentChunks: string[];
  wordCount: number;
  issues: string[];
  contentHash: string;
  crawlDepth: number;
  rendered: boolean;
  lastCrawled: string;
}

export interface PageSpeedSnapshot {
  id: string;
  url: string;
  strategy: "mobile" | "desktop";
  performanceScore: number;
  largestContentfulPaint: number | null;
  cumulativeLayoutShift: number | null;
  interactionToNextPaint: number | null;
  firstContentfulPaint: number | null;
  capturedAt: string;
  sourceRunId?: string;
}

export interface SourceEvent {
  id: string;
  connectorId: string;
  kind: "github_release" | "rss_item" | "gdelt_article";
  title: string;
  summary: string;
  url: string;
  tags: string[];
  score: number;
  publishedAt: string;
  capturedAt: string;
}

export interface LinkSuggestion {
  id: string;
  draftId: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  reason: string;
  score: number;
  createdAt: string;
}

export interface InternalLinkAuditSuggestion {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  targetUrl: string;
  targetTitle: string;
  anchorText: string;
  placement: string;
  reason: string;
  impact: "high" | "medium" | "low";
  score: number;
  topicalSimilarity: number;
  sourceAuthority: number;
  targetNeed: number;
  targetInboundLinks: number;
  targetDepth: number;
  createdAt: string;
}

export interface InternalLinkAuditOrphan {
  id: string;
  url: string;
  title: string;
  site: SiteScope;
  inboundLinks: number;
  depth: number;
  reason: string;
  impact: "high" | "medium" | "low";
}

export interface InternalLinkAuditCluster {
  id: string;
  label: string;
  pageUrls: string[];
  pageTitles: string[];
  internalLinksWithinCluster: number;
  reason: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
}

export interface InternalLinkAudit {
  id: string;
  createdAt: string;
  scannedPages: number;
  renderedPages: number;
  suggestions: InternalLinkAuditSuggestion[];
  orphanPages: InternalLinkAuditOrphan[];
  weakClusters: InternalLinkAuditCluster[];
}

export interface PerformanceSnapshot {
  id: string;
  actionId: string;
  url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  kind: "baseline" | "checkpoint";
  capturedAt: string;
}

export interface OpportunityOutcome {
  id: string;
  actionId: string;
  opportunityId: string;
  title: string;
  predictedScore: number;
  baselineCtr: number;
  latestCtr: number;
  baselinePosition: number;
  latestPosition: number;
  ctrDelta: number;
  positionDelta: number;
  outcomeScore: number;
  outcome: "positive" | "neutral" | "negative" | "insufficient_data";
  capturedAt: string;
}

export interface ContentQualityCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  score: number;
  detail: string;
}

export interface ContentQualityReport {
  score: number;
  passed: boolean;
  blockers: string[];
  checks: ContentQualityCheck[];
}

export interface JobSchedule {
  id: string;
  job: string;
  cadence: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: "success" | "error" | "fallback" | null;
  detail: string;
}

export type ContentPublishTarget = "local_markdown";

export type ContentActionStatus = "draft_exported" | "published" | "monitoring" | "error";

export interface ContentAction {
  id: string;
  draftId: string;
  title: string;
  slug: string;
  publishTarget: ContentPublishTarget;
  status: ContentActionStatus;
  targetUrls: string[];
  markdownPath?: string;
  publicationUrl?: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
  baselineSnapshotIds: string[];
  latestSnapshotIds: string[];
  linkSuggestionIds: string[];
}

export interface GeneratedBriefResult {
  brief: ContentBrief;
  sourcePack: SourcePack;
  provider: GenerationProvider;
  qualityReport: ContentQualityReport;
}

export interface GeneratedDraftResult {
  draft: DraftDocument;
  sourcePack: SourcePack;
  provider: GenerationProvider;
  qualityReport: ContentQualityReport;
}

export type SearchSignalProvider = "google_search_console" | "manual_csv" | "demo_seed";

export interface SearchPerformanceRow {
  id: string;
  provider: SearchSignalProvider;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  country?: string;
  device?: string;
  sourceRunId?: string;
  capturedAt: string;
}

export type ConnectorRunStatus = "success" | "error" | "fallback";

export type ConnectorRunProvider =
  | SearchSignalProvider
  | GenerationProvider["provider"]
  | "system"
  | "site_crawl"
  | "internal_link_audit"
  | "pagespeed"
  | "github"
  | "rss"
  | "gdelt"
  | "opportunity_engine"
  | "publish";

export interface ConnectorRun {
  id: string;
  connectorId: string;
  provider: ConnectorRunProvider;
  status: ConnectorRunStatus;
  startedAt: string;
  finishedAt: string;
  detail: string;
  recordCount: number;
  metadata: Record<string, string | number | boolean | null>;
}

export interface ContentStudioData {
  ideas: ContentIdea[];
  briefs: ContentBrief[];
  drafts: DraftDocument[];
  sourcePacks: SourcePack[];
  actions: ContentAction[];
  linkSuggestions: LinkSuggestion[];
  performanceSnapshots: PerformanceSnapshot[];
}

export interface SeoPersistenceState {
  sourcePacks: SourcePack[];
  briefs: ContentBrief[];
  drafts: DraftDocument[];
  connectorRuns: ConnectorRun[];
  searchPerformanceRows: SearchPerformanceRow[];
  opportunities: Opportunity[];
  pages: SitePage[];
  internalLinkAudits: InternalLinkAudit[];
  pageSpeedSnapshots: PageSpeedSnapshot[];
  sourceEvents: SourceEvent[];
  linkSuggestions: LinkSuggestion[];
  performanceSnapshots: PerformanceSnapshot[];
  opportunityOutcomes: OpportunityOutcome[];
  contentActions: ContentAction[];
  jobSchedules: JobSchedule[];
}

export interface SystemQuickStats {
  opportunityCount: number;
  reviewCount: number;
  connectorCount: number;
  totalConnectors: number;
}

export type ImportTemplateId = "keywords" | "urls" | "content_calendar" | "internal_links";

export interface ImportTemplate {
  id: ImportTemplateId;
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  sampleRows: Array<Record<string, string>>;
}

export interface ValidationIssue {
  row: number;
  message: string;
  severity: "error" | "warning";
}

export interface ParsedImportPreview {
  template: ImportTemplate | null;
  detectedTemplateId: ImportTemplateId | "custom";
  totalRows: number;
  validRows: number;
  invalidRows: number;
  headers: string[];
  issues: ValidationIssue[];
  preview: Array<Record<string, string>>;
}

export interface TrendSeries {
  label: string;
  values: number[];
  direction: "up" | "down";
  suffix?: string;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: "accent" | "success" | "warning" | "danger";
}
