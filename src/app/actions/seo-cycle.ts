"use server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { runSeoJob } from "@/features/seo/server/jobs";
import type { JobName } from "@/features/seo/server/jobs";

export type CycleFindings = {
  job: string;
  crawl?: { pagesCrawled: number; issues: number };
  internalLinks?: { suggestions: number; orphanPages: number };
  searchSignals?: { provider: string; rows: number };
  pageSpeed?: { snapshots: number };
  rss?: { events: number };
  gdelt?: { events: number };
  opportunities?: { candidates: number; topBand: string };
  monitoring?: { checkpoints: number };
};

export type RunCycleResult =
  | { ok: true; findings: CycleFindings }
  | { ok: false; error: string };

export async function runFullSeoCycleAction(): Promise<RunCycleResult> {
  try {
    const result = await runSeoJob("full-cycle");
    await appendAuditEvent({
      action: "action.seoCycle.runFull",
      detail: { job: result.job }
    });

    // Extract useful findings from the full-cycle result to show the user
    const r = result.result as {
      crawl?: { pages?: unknown[]; issueCount?: number };
      internalLinks?: { suggestionCount?: number; orphanPages?: unknown[]; orphanCount?: number };
      searchSignals?: { provider?: string; rows?: unknown[] };
      pageSpeed?: { snapshots?: unknown[] };
      rss?: { events?: unknown[] };
      gdelt?: { events?: unknown[] };
      opportunities?: { opportunities?: Array<{ priorityBand?: string }> };
      monitoring?: { checkpoints?: unknown[] };
    };

    const findings: CycleFindings = { job: result.job };
    if (r.crawl) {
      findings.crawl = {
        pagesCrawled: Array.isArray(r.crawl.pages) ? r.crawl.pages.length : 0,
        issues: typeof r.crawl.issueCount === "number" ? r.crawl.issueCount : 0
      };
    }
    if (r.internalLinks) {
      findings.internalLinks = {
        suggestions: typeof r.internalLinks.suggestionCount === "number" ? r.internalLinks.suggestionCount : 0,
        orphanPages: typeof r.internalLinks.orphanCount === "number"
          ? r.internalLinks.orphanCount
          : Array.isArray(r.internalLinks.orphanPages)
            ? r.internalLinks.orphanPages.length
            : 0
      };
    }
    if (r.searchSignals) {
      findings.searchSignals = {
        provider: r.searchSignals.provider ?? "unknown",
        rows: Array.isArray(r.searchSignals.rows) ? r.searchSignals.rows.length : 0
      };
    }
    if (r.pageSpeed) {
      findings.pageSpeed = {
        snapshots: Array.isArray(r.pageSpeed.snapshots) ? r.pageSpeed.snapshots.length : 0
      };
    }
    if (r.rss) {
      findings.rss = { events: Array.isArray(r.rss.events) ? r.rss.events.length : 0 };
    }
    if (r.gdelt) {
      findings.gdelt = { events: Array.isArray(r.gdelt.events) ? r.gdelt.events.length : 0 };
    }
    if (r.opportunities?.opportunities) {
      const ops = r.opportunities.opportunities;
      findings.opportunities = {
        candidates: ops.length,
        topBand: ops[0]?.priorityBand ?? "none"
      };
    }
    if (r.monitoring) {
      findings.monitoring = {
        checkpoints: Array.isArray(r.monitoring.checkpoints) ? r.monitoring.checkpoints.length : 0
      };
    }

    return { ok: true, findings };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Full cycle failed."
    };
  }
}

export type RunJobResult =
  | { ok: true; job: string; message: string }
  | { ok: false; error: string };

export async function runSeoJobAction(job: JobName): Promise<RunJobResult> {
  try {
    const result = await runSeoJob(job);
    await appendAuditEvent({
      action: "action.seoJob.run",
      detail: { job }
    });

    const messages: Record<JobName, string> = {
      crawl: "Crawl completed — site pages updated.",
      "internal-links": "Internal-link audit refreshed.",
      "search-signals": "Search signal rows refreshed.",
      pagespeed: "Morningscore onsite snapshots refreshed.",
      rss: "RSS feeds synced.",
      gdelt: "GDELT events synced.",
      opportunities: "Opportunities regenerated.",
      "monitor-content": "Content monitoring updated.",
      "full-cycle": "Full cycle executed."
    };

    return { ok: true, job: result.job, message: messages[job] ?? "Job completed." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : `${job} failed.`
    };
  }
}
