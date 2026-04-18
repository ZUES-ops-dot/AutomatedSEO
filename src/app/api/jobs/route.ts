import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";

import { appendAuditEventFromRequest } from "@/features/seo/server/audit-log";
import { runFullCycleJob, runSeoJob, type JobName } from "@/features/seo/server/jobs";
import { listJobSchedules, runDueScheduledJobs, updateJobSchedule } from "@/features/seo/server/scheduler";
import { getConnectorRuns } from "@/features/seo/server/storage";
import { jobPatchSchema, jobPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError, jsonError } from "@/lib/api-error";
import { rememberIdempotentResponse, takeIdempotentResponse } from "@/lib/idempotency";
import { enqueueSeoJob, isSeoJobQueueAvailable, SEO_JOBS_QUEUE_NAME } from "@/lib/queue/seo-jobs-queue";
import { rateLimitResponse } from "@/lib/rate-limit";
import { logSeoEvent } from "@/lib/seo-log";

export const runtime = "nodejs";

/** Allows long-running synchronous jobs when the host supports extended execution. Full-cycle uses `after()` instead. */
export const maxDuration = 800;

const validJobs: JobName[] = [
  "crawl",
  "internal-links",
  "search-signals",
  "pagespeed",
  "rss",
  "gdelt",
  "opportunities",
  "monitor-content",
  "full-cycle"
];

function idempotencyKey(request: NextRequest) {
  return request.headers.get("idempotency-key")?.trim() || request.headers.get("Idempotency-Key")?.trim() || undefined;
}

export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, { namespace: "api-jobs-get", max: 120, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const [recentRuns, schedules] = await Promise.all([getConnectorRuns(), listJobSchedules()]);

  return NextResponse.json({
    jobs: validJobs,
    recentRuns,
    schedules,
    recentRunsRedacted: false
  });
}

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-jobs-post", max: 30, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const idem = idempotencyKey(request);
  const cached = takeIdempotentResponse(idem);
  if (cached) {
    return NextResponse.json(cached.body, { status: cached.status });
  }

  const parsed = await parseJsonBody(request, jobPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data;

  try {
    if (body.runDue) {
      const payload = await runDueScheduledJobs();
      rememberIdempotentResponse(idem, 200, payload);
      await appendAuditEventFromRequest(request, {
        action: "api.jobs.runDue",
        detail: { ranCount: payload.ran?.length ?? 0 }
      });
      return NextResponse.json(payload);
    }

    if (!body.job || !validJobs.includes(body.job as JobName)) {
      return NextResponse.json({ error: `job must be one of: ${validJobs.join(", ")}` }, { status: 400 });
    }

    if (isSeoJobQueueAvailable()) {
      try {
        const bullJob = await enqueueSeoJob(body.job as JobName, { idempotencyKey: idem });
        const responseBody = {
          mode: "queued" as const,
          queue: SEO_JOBS_QUEUE_NAME,
          jobId: String(bullJob.id),
          job: body.job as JobName,
          message: "Job accepted by BullMQ. Ensure a worker process is running (`npm run worker:seo`)."
        };
        rememberIdempotentResponse(idem, 202, responseBody);
        await appendAuditEventFromRequest(request, {
          action: "api.jobs.queued",
          detail: { job: body.job, bullJobId: String(bullJob.id) }
        });
        return NextResponse.json(responseBody, { status: 202 });
      } catch (queueError) {
        logSeoEvent("warn", "Queue enqueue failed; falling back to inline execution.", {
          error: String(queueError)
        });
      }
    }

    if (body.job === "full-cycle") {
      const responseBody = {
        accepted: true,
        mode: "background" as const,
        job: "full-cycle" as const,
        message:
          "Full cycle is executing after this response. Monitor connector runs and schedules for completion."
      };
      rememberIdempotentResponse(idem, 202, responseBody);
      await appendAuditEventFromRequest(request, { action: "api.jobs.fullCycle", detail: { mode: "background" } });
      after(() => {
        void runFullCycleJob().catch((error: unknown) => {
          logSeoEvent("error", "Background full-cycle job failed.", { error: String(error) });
        });
      });
      return NextResponse.json(responseBody, { status: 202 });
    }

    const payload = await runSeoJob(body.job as JobName);
    rememberIdempotentResponse(idem, 200, payload);
    await appendAuditEventFromRequest(request, { action: "api.jobs.run", detail: { job: body.job } });
    return NextResponse.json(payload);
  } catch (error) {
    return catchToJsonError(error, "Failed to run job.");
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-jobs-patch", max: 40, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, jobPatchSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data;

  try {
    const updated = await updateJobSchedule(body.id, {
      enabled: body.enabled,
      intervalMinutes: body.intervalMinutes,
      cadence: body.cadence,
      detail: body.detail
    });

    if (!updated) {
      return jsonError(`Schedule ${body.id} not found.`, 404);
    }

    await appendAuditEventFromRequest(request, { action: "api.jobs.patchSchedule", detail: { id: body.id } });
    return NextResponse.json(updated);
  } catch (error) {
    return catchToJsonError(error, "Failed to update schedule.");
  }
}
