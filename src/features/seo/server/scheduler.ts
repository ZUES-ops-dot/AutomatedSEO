import { runFullCycleJob, runSeoJob, type JobName } from "@/features/seo/server/jobs";
import { getJobSchedules, saveJobSchedules } from "@/features/seo/server/storage";
import type { JobSchedule } from "@/features/seo/types";
import { logSeoEvent } from "@/lib/seo-log";

const defaultSchedules: JobSchedule[] = [
  {
    id: "schedule-crawl",
    job: "crawl",
    cadence: "Every 24 hours",
    intervalMinutes: 24 * 60,
    enabled: true,
    lastRunAt: null,
    nextRunAt: null,
    lastStatus: null,
    detail: "Keep crawl data fresh."
  },
  {
    id: "schedule-opportunities",
    job: "opportunities",
    cadence: "Every 24 hours",
    intervalMinutes: 24 * 60,
    enabled: true,
    lastRunAt: null,
    nextRunAt: null,
    lastStatus: null,
    detail: "Recompute opportunity queue daily."
  },
  {
    id: "schedule-monitoring",
    job: "monitor-content",
    cadence: "Every 24 hours",
    intervalMinutes: 24 * 60,
    enabled: true,
    lastRunAt: null,
    nextRunAt: null,
    lastStatus: null,
    detail: "Refresh outcome checkpoints."
  }
];

function normalizeSchedule(schedule: JobSchedule): JobSchedule {
  const now = Date.now();
  const lastRunMs = schedule.lastRunAt ? Date.parse(schedule.lastRunAt) : null;
  const intervalMs = schedule.intervalMinutes * 60 * 1000;
  const existingNextMs = schedule.nextRunAt ? Date.parse(schedule.nextRunAt) : NaN;
  const hasPersistedNext = !Number.isNaN(existingNextMs);

  if (!schedule.enabled || schedule.intervalMinutes <= 0) {
    return {
      ...schedule,
      nextRunAt: null
    };
  }

  if (lastRunMs === null && hasPersistedNext) {
    return {
      ...schedule,
      nextRunAt: schedule.nextRunAt
    };
  }

  const nextRunAt = new Date((lastRunMs ?? now) + intervalMs).toISOString();

  return {
    ...schedule,
    nextRunAt
  };
}

function isValidJob(value: string): value is JobName {
  return [
    "crawl",
    "internal-links",
    "search-signals",
    "pagespeed",
    "rss",
    "gdelt",
    "opportunities",
    "monitor-content",
    "full-cycle"
  ].includes(value);
}

function mergeSchedules(stored: JobSchedule[]) {
  const byId = new Map(stored.map((item) => [item.id, item]));
  const merged = defaultSchedules.map((seeded) => {
    const override = byId.get(seeded.id);
    return normalizeSchedule({ ...seeded, ...(override ?? {}) });
  });

  const custom = stored
    .filter((item) => !merged.some((schedule) => schedule.id === item.id))
    .map((item) => normalizeSchedule(item));

  return [...merged, ...custom];
}

function schedulesDiffer(left: JobSchedule[], right: JobSchedule[]) {
  if (left.length !== right.length) {
    return true;
  }

  const rightById = new Map(right.map((item) => [item.id, item]));
  for (const item of left) {
    const candidate = rightById.get(item.id);
    if (!candidate) {
      return true;
    }
    if (JSON.stringify(item) !== JSON.stringify(candidate)) {
      return true;
    }
  }

  return false;
}

export async function listJobSchedules() {
  const stored = await getJobSchedules();
  const merged = mergeSchedules(stored);

  if (schedulesDiffer(stored, merged)) {
    await saveJobSchedules(merged);
  }

  return merged;
}

export async function updateJobSchedule(
  id: string,
  patch: Partial<Pick<JobSchedule, "enabled" | "intervalMinutes" | "cadence" | "detail">>
) {
  const schedules = await listJobSchedules();
  const target = schedules.find((schedule) => schedule.id === id);
  if (!target) {
    return null;
  }

  const updated = normalizeSchedule({
    ...target,
    ...patch
  });

  const next = schedules.map((schedule) => (schedule.id === id ? updated : schedule));
  await saveJobSchedules(next);
  return updated;
}

export async function runDueScheduledJobs(referenceIso = new Date().toISOString()) {
  const schedules = await listJobSchedules();
  const referenceMs = Date.parse(referenceIso);
  const ran: Array<{ scheduleId: string; job: JobName; status: string; detail: string }> = [];
  const nextSchedules = [...schedules];

  for (const schedule of schedules) {
    if (!schedule.enabled || !isValidJob(schedule.job)) {
      continue;
    }

    const dueMs = schedule.nextRunAt ? Date.parse(schedule.nextRunAt) : 0;
    if (dueMs > referenceMs) {
      continue;
    }

    try {
      if (schedule.job === "full-cycle") {
        void runFullCycleJob().catch((error: unknown) => {
          logSeoEvent("error", "Scheduled full-cycle job failed.", { error: String(error) });
        });
        ran.push({
          scheduleId: schedule.id,
          job: schedule.job,
          status: "started",
          detail: "Started full-cycle in the background (scheduler)."
        });
      } else {
        await runSeoJob(schedule.job);
        ran.push({
          scheduleId: schedule.id,
          job: schedule.job,
          status: "success",
          detail: `Ran ${schedule.job} from scheduler.`
        });
      }
      const updated = normalizeSchedule({
        ...schedule,
        lastRunAt: new Date().toISOString(),
        lastStatus: schedule.job === "full-cycle" ? "started" : "success"
      });
      const index = nextSchedules.findIndex((item) => item.id === schedule.id);
      if (index >= 0) {
        nextSchedules[index] = updated;
      }
    } catch (error) {
      ran.push({
        scheduleId: schedule.id,
        job: schedule.job,
        status: "error",
        detail: error instanceof Error ? error.message : "Failed to run scheduled job."
      });
      const updated = normalizeSchedule({
        ...schedule,
        lastRunAt: new Date().toISOString(),
        lastStatus: "error"
      });
      const index = nextSchedules.findIndex((item) => item.id === schedule.id);
      if (index >= 0) {
        nextSchedules[index] = updated;
      }
    }
  }

  await saveJobSchedules(nextSchedules);
  return {
    ran,
    schedules: nextSchedules
  };
}
