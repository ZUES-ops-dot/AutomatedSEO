import { contentIdeas as seededIdeas, trendSeries as seededTrendSeries } from "@/features/seo/data/demo-data";
import { getConnectorCatalog, getConnectorSummary } from "@/features/seo/server/connectors";
import { getCachedIdeasIfValid, setIdeasCache } from "@/features/seo/server/idea-cache";
import { listJobSchedules } from "@/features/seo/server/scheduler";
import { VIEW_LIMITS } from "@/features/seo/server/seo-constants";
import {
  getContentStudioData,
  getConnectorRuns,
  getOpportunityOutcomes,
  getPageSpeedSnapshots,
  getSearchPerformanceRows,
  getSitePages
} from "@/features/seo/server/storage";
import { getReadableOpportunities } from "@/features/seo/server/opportunity-engine";
import type {
  ContentIdea,
  DashboardMetric,
  JobRun,
  Opportunity,
  PageAttentionItem,
  SystemQuickStats,
  TrendSeries
} from "@/features/seo/types";

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveIdeasFromOpportunities(opportunities: Opportunity[]): ContentIdea[] {
  const generated = opportunities.slice(0, VIEW_LIMITS.dashboardIdeasFromOpportunities).map((opportunity) => ({
    id: `idea-${opportunity.id}`,
    title:
      opportunity.recommendedAction === "refresh"
        ? `Refresh plan: ${opportunity.title}`
        : opportunity.recommendedAction === "new_support_page"
          ? `Support asset: ${opportunity.title}`
          : `Relevant blog: ${opportunity.title}`,
    angle: opportunity.reason,
    freshness: opportunity.lastUpdated,
    relatedOpportunityId: opportunity.id,
    sources: opportunity.evidence.slice(0, VIEW_LIMITS.ideaEvidenceSnippets),
    clusterRole: `Support the ${opportunity.cluster} cluster via ${titleCase(opportunity.recommendedAction)}.`
  }));

  return generated.length > 0 ? generated : seededIdeas;
}

async function deriveIdeas(): Promise<ContentIdea[]> {
  const cached = getCachedIdeasIfValid();
  if (cached) {
    return cached;
  }
  const opportunities = await getReadableOpportunities();
  const ideas = deriveIdeasFromOpportunities(opportunities);
  setIdeasCache(ideas);
  return ideas;
}

function buildTrendSeries(values: Array<{ date: string; impressions: number; clicks: number }>): TrendSeries[] {
  if (values.length === 0) {
    return seededTrendSeries;
  }

  const recent = values.slice(-7);
  const impressionValues = recent.map((item) => item.impressions);
  const clickValues = recent.map((item) => item.clicks);
  const ratioValues = recent.map((item) => (item.impressions > 0 ? Math.round((item.clicks / item.impressions) * 100) : 0));

  return [
    {
      label: "Impressions",
      values: impressionValues,
      direction: impressionValues[impressionValues.length - 1] >= impressionValues[0] ? "up" : "down"
    },
    {
      label: "Clicks",
      values: clickValues,
      direction: clickValues[clickValues.length - 1] >= clickValues[0] ? "up" : "down"
    },
    {
      label: "CTR",
      values: ratioValues,
      direction: ratioValues[ratioValues.length - 1] >= ratioValues[0] ? "up" : "down",
      suffix: "%"
    }
  ];
}

function groupSearchRowsByDay(rows: Awaited<ReturnType<typeof getSearchPerformanceRows>>) {
  const grouped = new Map<string, { impressions: number; clicks: number }>();

  for (const row of rows) {
    const key = row.capturedAt.slice(0, 10);
    const current = grouped.get(key) ?? { impressions: 0, clicks: 0 };
    grouped.set(key, {
      impressions: current.impressions + row.impressions,
      clicks: current.clicks + row.clicks
    });
  }

  return Array.from(grouped.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, values]) => ({ date, ...values }));
}

function toJobRuns(runs: Awaited<ReturnType<typeof getConnectorRuns>>): JobRun[] {
  return runs.slice(0, VIEW_LIMITS.jobRunsPreview).map((run) => ({
    id: run.id,
    name: `${titleCase(run.connectorId)} job`,
    cadence: String(run.metadata.cadence ?? "On demand"),
    status: run.status === "success" ? "healthy" : run.status === "fallback" ? "warning" : "paused",
    lastRun: run.finishedAt,
    nextRun: run.status === "error" ? "Needs retry" : "Awaiting next trigger",
    detail: run.detail
  }));
}

function buildPageAttention(
  pages: Awaited<ReturnType<typeof getSitePages>>,
  pageSpeedSnapshots: Awaited<ReturnType<typeof getPageSpeedSnapshots>>
): PageAttentionItem[] {
  const pageIssues = pages
    .filter((page) => page.issues.length > 0)
    .slice(0, VIEW_LIMITS.pageAttentionTechnical)
    .map((page) => ({
      id: `attention-${page.id}`,
      url: page.url,
      issue: page.issues[0],
      priority: page.issues.some((issue) => /missing title|canonical|thin/i.test(issue)) ? "high" : "medium",
      affectedMetric: "Technical SEO coverage",
      recommendation: `Review ${page.url} for crawl/indexation and content-depth improvements.`
    })) as PageAttentionItem[];

  const performanceIssues = pageSpeedSnapshots
    .filter((snapshot) => snapshot.performanceScore < 65)
    .slice(0, VIEW_LIMITS.pageAttentionPageSpeed)
    .map((snapshot) => ({
      id: `attention-pagespeed-${snapshot.id}`,
      url: snapshot.url,
      issue: `${snapshot.strategy} performance score is ${snapshot.performanceScore}.`,
      priority: snapshot.performanceScore < 40 ? "high" : "medium",
      affectedMetric: "Core Web Vitals",
      recommendation: "Review render-blocking resources, image weight, and layout stability on this page."
    })) as PageAttentionItem[];

  return [...pageIssues, ...performanceIssues].slice(0, VIEW_LIMITS.pageAttentionTotal);
}

export async function getSuggestionsData() {
  return getReadableOpportunities();
}

export async function getContentStudioViewData() {
  const [studio, ideas] = await Promise.all([getContentStudioData(), deriveIdeas()]);
  return { ...studio, ideas };
}

export async function getSystemQuickStatsData(): Promise<SystemQuickStats> {
  const [opportunities, studio] = await Promise.all([getSuggestionsData(), getContentStudioData()]);
  const connectorSummary = getConnectorSummary();

  return {
    opportunityCount: opportunities.filter((item) => item.recommendedAction !== "skip").length,
    reviewCount: studio.drafts.filter((item) => item.status === "review_required").length,
    connectorCount: connectorSummary.connected,
    totalConnectors: connectorSummary.total
  };
}

export async function getDashboardData() {
  const [
    opportunities,
    studio,
    searchRows,
    connectorRuns,
    pages,
    pageSpeedSnapshots,
    outcomes,
    schedules
  ] = await Promise.all([
    getReadableOpportunities(),
    getContentStudioData(),
    getSearchPerformanceRows(),
    getConnectorRuns(),
    getSitePages(),
    getPageSpeedSnapshots(),
    getOpportunityOutcomes(),
    listJobSchedules()
  ]);

  const ideas = deriveIdeasFromOpportunities(opportunities);
  const connectorGroups = getConnectorCatalog();
  const runtimeConnectors = connectorGroups.flatMap((group) => group.items);
  const topOpportunity = opportunities.find((item) => item.recommendedAction !== "skip") ?? opportunities[0];
  const doNow = opportunities.filter((item) => item.priorityBand === "do_now");
  const doNowAction = doNow[0] ?? topOpportunity;
  const activeQueue = opportunities.filter((item) => ["new", "approved", "in_review", "drafting"].includes(item.status));
  const positiveOutcomes = outcomes.filter((item) => item.outcome === "positive").length;
  const evaluatedOutcomes = outcomes.filter((item) => item.outcome !== "insufficient_data").length;
  const winRate = evaluatedOutcomes > 0 ? Math.round((positiveOutcomes / evaluatedOutcomes) * 100) : 0;
  const connectorHealth =
    runtimeConnectors.length > 0
      ? Math.round(runtimeConnectors.reduce((sum, connector) => sum + connector.healthScore, 0) / runtimeConnectors.length)
      : 0;
  const metrics: DashboardMetric[] = [
    {
      id: "metric-opportunities",
      label: "Actionable opportunities",
      value: String(opportunities.filter((item) => item.recommendedAction !== "skip").length),
      delta: `${doNow.length} ready now`,
      tone: "accent"
    },
    {
      id: "metric-pages",
      label: "Tracked pages",
      value: String(pages.length),
      delta: `${pages.filter((page) => page.issues.length > 0).length} with issues`,
      tone: pages.some((page) => page.issues.length > 0) ? "warning" : "success"
    },
    {
      id: "metric-drafts",
      label: "Review queue",
      value: String(studio.drafts.filter((item) => item.status === "review_required").length),
      delta: `${studio.actions.length} published/monitoring`,
      tone: "success"
    },
    {
      id: "metric-validation",
      label: "Validated opportunities",
      value: String(evaluatedOutcomes),
      delta: `${winRate}% positive outcome rate`,
      tone: winRate >= 50 ? "success" : "warning"
    }
  ];

  return {
    metrics,
    trendSeries: buildTrendSeries(groupSearchRowsByDay(searchRows)),
    topOpportunity,
    doNowAction,
    doNow,
    activeQueue,
    connectorHealth,
    connectors: runtimeConnectors,
    jobs: toJobRuns(connectorRuns),
    schedules,
    pagesNeedingAttention: buildPageAttention(pages, pageSpeedSnapshots),
    ideas: ideas.slice(0, VIEW_LIMITS.dashboardIdeasPreview),
    briefs: studio.briefs.slice(0, VIEW_LIMITS.studioBriefsPreview),
    drafts: studio.drafts.slice(0, VIEW_LIMITS.studioDraftsPreview)
  };
}
