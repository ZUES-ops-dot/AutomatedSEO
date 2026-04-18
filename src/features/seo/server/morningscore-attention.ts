import { appEnv } from "@/features/seo/server/env";
import {
  fetchMorningscoreIssuesPage,
  fetchMorningscorePagesPage,
  MORNINGSCORE_REQUEST_GAP_MS,
  resolveMorningscoreDomainId,
  sleepMs
} from "@/features/seo/server/morningscore-api";
import type { PageAttentionItem } from "@/features/seo/types";
import { logSeoEvent } from "@/lib/seo-log";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function resolveUrl(pathFull: string | undefined, path: string | undefined): string {
  if (pathFull && /^https?:\/\//i.test(pathFull)) {
    return pathFull;
  }
  const p = path?.startsWith("/") ? path : `/${path ?? ""}`;
  try {
    return new URL(p, appEnv.primarySiteUrl).href;
  } catch {
    return appEnv.primarySiteUrl;
  }
}

/**
 * Dashboard "pages needing attention" from Morningscore crawl pages + sample of `/issues` rows.
 */
export async function getMorningscoreAttentionItems(): Promise<PageAttentionItem[]> {
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

    const pagesPayload = await fetchMorningscorePagesPage(appEnv.morningscoreApiKey, domainId, 1, 40);
    await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);

    const issuesPayload = await fetchMorningscoreIssuesPage(
      appEnv.morningscoreApiKey,
      domainId,
      "page_load_speed",
      { page: 1, perPage: 10, resolvedOnly: false }
    );

    const items: PageAttentionItem[] = [];
    const seen = new Set<string>();

    const pageRows = [...(pagesPayload.data ?? [])].sort(
      (left, right) => (right.issues_unresolved ?? 0) - (left.issues_unresolved ?? 0)
    );

    for (const row of pageRows.slice(0, 5)) {
      const url = resolveUrl(row.path_full ?? undefined, row.path ?? undefined);
      if (seen.has(url)) {
        continue;
      }
      seen.add(url);
      const n = row.issues_unresolved ?? 0;
      items.push({
        id: `ms-attn-page-${slugify(url)}`,
        url,
        issue:
          n > 0
            ? `${n} unresolved onsite issues (Morningscore crawl)`
            : "Onsite crawl: review tasks for this URL",
        priority: n > 10 ? "high" : n > 3 ? "medium" : "low",
        affectedMetric: "Onsite SEO health",
        recommendation: "Use Morningscore tasks / AI fixes for this page, then re-crawl."
      });
    }

    for (const row of issuesPayload.data ?? []) {
      const url = resolveUrl(row.page?.path_full, row.page?.path);
      if (seen.has(url)) {
        continue;
      }
      seen.add(url);
      const label = row.issue_identifier ?? row.validator ?? "page_speed";
      items.push({
        id: `ms-attn-issue-${slugify(url)}-${slugify(label)}`,
        url,
        issue: `${row.category ?? "Onsite"}: ${label}`,
        priority: "high",
        affectedMetric: "Page speed / experience",
        recommendation: "Resolve this validator in Morningscore; onsite AI may suggest a concrete fix."
      });
      if (items.length >= 8) {
        break;
      }
    }

    return items.slice(0, 8);
  } catch (error) {
    logSeoEvent("warn", "Morningscore attention items failed.", { error: String(error) });
    return [];
  }
}
