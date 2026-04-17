import {
  contentBriefs,
  contentIdeas,
  dashboardMetrics,
  drafts,
  jobRuns,
  opportunities,
  pagesNeedingAttention,
  trendSeries
} from "@/features/seo/data/demo-data";
import { getConnectorCatalog, getConnectorSummary } from "@/features/seo/server/connectors";

export function getDashboardView() {
  const connectorGroups = getConnectorCatalog();
  const runtimeConnectors = connectorGroups.flatMap((group) => group.items);
  const topOpportunity = opportunities.find((item) => item.recommendedAction !== "skip") ?? opportunities[0];
  const doNow = opportunities.filter((item) => item.priorityBand === "do_now");
  const activeQueue = opportunities.filter(
    (item) => item.status === "new" || item.status === "in_review" || item.status === "drafting"
  );
  const connectorHealth = Math.round(
    runtimeConnectors.reduce((sum, connector) => sum + connector.healthScore, 0) / runtimeConnectors.length
  );

  return {
    metrics: dashboardMetrics,
    trendSeries,
    topOpportunity,
    doNow,
    activeQueue,
    connectorHealth,
    connectors: runtimeConnectors,
    jobs: jobRuns,
    pagesNeedingAttention,
    ideas: contentIdeas.slice(0, 3),
    briefs: contentBriefs.slice(0, 2),
    drafts: drafts.slice(0, 2)
  };
}

export function getSuggestionsView() {
  return opportunities;
}

export function getContentStudioView() {
  return {
    ideas: contentIdeas,
    briefs: contentBriefs,
    drafts
  };
}

export function getConnectorsView() {
  return getConnectorCatalog();
}

export function getSystemQuickStats() {
  const connectorSummary = getConnectorSummary();

  return {
    opportunityCount: opportunities.filter((item) => item.recommendedAction !== "skip").length,
    reviewCount: drafts.filter((item) => item.status === "review_required").length,
    connectorCount: connectorSummary.connected,
    totalConnectors: connectorSummary.total
  };
}
