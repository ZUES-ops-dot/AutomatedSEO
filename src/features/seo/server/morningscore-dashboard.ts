import { appEnv } from "@/features/seo/server/env";
import {
  getMorningscoreDomainDetails,
  getMorningscoreOverallHealth,
  MORNINGSCORE_REQUEST_GAP_MS,
  resolveMorningscoreDomainId,
  sleepMs
} from "@/features/seo/server/morningscore-api";
import type { DashboardMetric } from "@/features/seo/types";

/**
 * Live Morningscore KPIs for the dashboard (Morningscore value, keywords, Linkscore, Healthscore).
 * Returns an empty array when the API key is missing or the request fails.
 */
export async function getMorningscoreDashboardMetrics(): Promise<DashboardMetric[]> {
  if (!appEnv.morningscoreApiKey) {
    return [];
  }

  try {
    const domainId = await resolveMorningscoreDomainId(
      appEnv.morningscoreApiKey,
      appEnv.morningscoreDomainId,
      appEnv.primarySiteUrl
    );
    await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);

    const details = await getMorningscoreDomainDetails(appEnv.morningscoreApiKey, domainId);
    await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);
    const health = await getMorningscoreOverallHealth(appEnv.morningscoreApiKey, domainId);

    const metrics: DashboardMetric[] = [];

    if (details.score != null) {
      metrics.push({
        id: "metric-ms-morningscore",
        label: "Morningscore",
        value: String(Math.round(details.score)),
        delta:
          details.traffic != null && details.currency
            ? `Traffic value ${details.traffic} ${details.currency}`
            : "Visibility score",
        tone: "accent"
      });
    }

    if (details.keywords != null) {
      metrics.push({
        id: "metric-ms-keywords",
        label: "Keywords ranking",
        value: String(details.keywords),
        delta: "Top 20 & broader (per Morningscore)",
        tone: "success"
      });
    }

    if (details.metrics?.link_score != null) {
      metrics.push({
        id: "metric-ms-linkscore",
        label: "Linkscore",
        value: String(Math.round(details.metrics.link_score)),
        delta:
          details.metrics.refdomains != null ? `${Math.round(details.metrics.refdomains)} ref. domains` : "Link profile strength",
        tone: "success"
      });
    }

    metrics.push({
      id: "metric-ms-health",
      label: "Healthscore",
      value: String(Math.round(health.score)),
      delta: `${health.pages_count} pages in crawl`,
      tone: health.score >= 70 ? "success" : "warning"
    });

    return metrics.slice(0, 6);
  } catch {
    return [];
  }
}
