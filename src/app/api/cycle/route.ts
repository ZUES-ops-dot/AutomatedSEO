import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { runFullCycleJob } from "@/features/seo/server/jobs";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-cycle-post", max: 8, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  try {
    const result = await runFullCycleJob();
    await appendAuditEvent({
      action: "api.cycle.run",
      detail: { job: result.job }
    });

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

    const findings: {
      job: string;
      crawl?: { pagesCrawled: number; issues: number };
      internalLinks?: { suggestions: number; orphanPages: number };
      searchSignals?: { provider: string; rows: number };
      pageSpeed?: { snapshots: number };
      rss?: { events: number };
      gdelt?: { events: number };
      opportunities?: { candidates: number; topBand: string };
      monitoring?: { checkpoints: number };
    } = { job: result.job };

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

    return NextResponse.json({ findings });
  } catch (error) {
    return catchToJsonError(error, "Full cycle failed.");
  }
}
