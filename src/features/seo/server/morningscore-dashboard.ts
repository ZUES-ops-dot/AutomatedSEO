import { appEnv } from "@/features/seo/server/env";
import {
  getMorningscoreDomainDetails,
  getMorningscoreOverallHealth,
  MORNINGSCORE_REQUEST_GAP_MS,
  resolveMorningscoreDomainId,
  sleepMs
} from "@/features/seo/server/morningscore-api";
import type { DashboardMetric } from "@/features/seo/types";
import { logSeoEvent } from "@/lib/seo-log";

/**
 * Live Morningscore KPIs for the dashboard (Morningscore value, keywords, Linkscore, Healthscore).
 * Returns an empty array when the API key is missing or core requests fail.
 */
export async function getMorningscoreDashboardMetrics(): Promise<DashboardMetric[]> {
  if (!appEnv.morningscoreApiKey) {
    logSeoEvent("warn", "Morningscore API key not configured; set MORNINGSCORE_API_KEY on the server (Railway Variables for the web service).", {
      deployment: process.env.RAILWAY_ENVIRONMENT_NAME ? "railway" : "local",
      primarySiteUrl: appEnv.primarySiteUrl
    });
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

    const metrics: DashboardMetric[] = [];

    const trafficFormatter =
      details.currency && typeof details.traffic === "number"
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: details.currency,
            maximumFractionDigits: 0
          })
        : null;

    if (details.score != null && Number.isFinite(details.score)) {
      metrics.push({
        id: "metric-ms-morningscore",
        label: "Morningscore",
        value: String(Math.round(details.score)),
        delta:
          trafficFormatter && typeof details.traffic === "number"
            ? `Traffic value ${trafficFormatter.format(details.traffic)}`
            : "Visibility score",
        tone: "accent"
      });
    }

    if (details.keywords != null && Number.isFinite(details.keywords)) {
      metrics.push({
        id: "metric-ms-keywords",
        label: "Keywords ranking",
        value: String(Math.round(details.keywords)),
        delta: "Top 20 & broader (per Morningscore)",
        tone: "success"
      });
    }

    if (details.metrics?.link_score != null && Number.isFinite(details.metrics.link_score)) {
      metrics.push({
        id: "metric-ms-linkscore",
        label: "Linkscore",
        value: String(Math.round(details.metrics.link_score)),
        delta:
          details.metrics.refdomains != null ? `${Math.round(details.metrics.refdomains)} ref. domains` : "Link profile strength",
        tone: "success"
      });
    }

    if (details.metrics?.domain_rating != null && Number.isFinite(details.metrics.domain_rating)) {
      metrics.push({
        id: "metric-ms-domain-rating",
        label: "Domain rating",
        value: String(Math.round(details.metrics.domain_rating)),
        delta: "Authority estimate (per Morningscore)",
        tone: "accent"
      });
    }

    try {
      await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);
      const health = await getMorningscoreOverallHealth(appEnv.morningscoreApiKey, domainId);
      if (Number.isFinite(health.score)) {
        const pagesCount =
          typeof health.pages_count === "number" && Number.isFinite(health.pages_count)
            ? Math.max(0, Math.round(health.pages_count))
            : 0;
        const prev = typeof health.prev_score === "number" && Number.isFinite(health.prev_score) ? health.prev_score : null;
        const diff = prev != null ? Math.round(health.score - prev) : null;
        const diffLabel = diff == null ? null : diff > 0 ? `+${diff}` : String(diff);
        const healthTone: "success" | "warning" | "danger" =
          health.score >= 80 ? "success" : health.score >= 60 ? "warning" : "danger";
        metrics.push({
          id: "metric-ms-health",
          label: "Healthscore",
          value: String(Math.round(health.score)),
          delta: diffLabel != null ? `${diffLabel} vs previous crawl • ${pagesCount} pages` : `${pagesCount} pages in crawl`,
          tone: healthTone
        });
      }
    } catch (error) {
      logSeoEvent("warn", "Morningscore overall health request failed; other KPIs still shown if present.", {
        error: String(error)
      });
    }

    return metrics.slice(0, 6);
  } catch (error) {
    logSeoEvent("error", "Morningscore dashboard metrics failed.", { error: String(error) });
    return [];
  }
}
