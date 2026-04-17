import { mkdir, writeFile } from "fs/promises";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const cleanup: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanup.length > 0) {
    const next = cleanup.pop();
    if (next) {
      await next();
    }
  }
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function jobSchedulesPath(dataRoot: string) {
  return path.join(dataRoot, "seo-runtime", "jobSchedules.json");
}

const pastDue = "2020-01-01T00:00:00.000Z";

function threePastDueSchedules() {
  return [
    {
      id: "schedule-crawl",
      job: "crawl",
      cadence: "Every 24 hours",
      intervalMinutes: 24 * 60,
      enabled: true,
      lastRunAt: null,
      nextRunAt: pastDue,
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
      nextRunAt: pastDue,
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
      nextRunAt: pastDue,
      lastStatus: null,
      detail: "Refresh outcome checkpoints."
    }
  ];
}

describe("runDueScheduledJobs", () => {
  it(
    "runs due jobs, sets lastRunAt and recomputes nextRunAt after lastRunAt changes (runSeoJob mocked)",
    async () => {
    vi.resetModules();
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "seo-run-due-"));
    cleanup.push(async () => rm(tempDir, { recursive: true, force: true }));
    vi.stubEnv("SEO_DATA_DIR", tempDir);
    await mkdir(path.join(tempDir, "seo-runtime"), { recursive: true });
    await writeFile(jobSchedulesPath(tempDir), JSON.stringify(threePastDueSchedules()), "utf8");

    const runSeoJob = vi.fn().mockResolvedValue({ job: "mock", result: {} });
    vi.doMock("@/features/seo/server/jobs", () => ({
      runSeoJob
    }));

    const { runDueScheduledJobs } = await import("@/features/seo/server/scheduler");
    const { getJobSchedules } = await import("@/features/seo/server/storage");

    const referenceFarFuture = "2099-12-31T23:59:59.999Z";
    const result = await runDueScheduledJobs(referenceFarFuture);

    expect(runSeoJob).toHaveBeenCalledTimes(3);
    const jobsRun = runSeoJob.mock.calls.map((call) => call[0]).sort();
    expect(jobsRun).toEqual(["crawl", "monitor-content", "opportunities"]);

    expect(result.ran).toHaveLength(3);
    expect(result.ran.every((r) => r.status === "success")).toBe(true);

    const stored = await getJobSchedules();
    expect(stored).toHaveLength(3);

    for (const schedule of stored) {
      expect(schedule.lastRunAt).not.toBeNull();
      expect(schedule.lastStatus).toBe("success");
      expect(schedule.nextRunAt).not.toBeNull();
      const lastMs = Date.parse(schedule.lastRunAt!);
      const nextMs = Date.parse(schedule.nextRunAt!);
      expect(nextMs).toBeGreaterThan(lastMs);
      const intervalMs = schedule.intervalMinutes * 60 * 1000;
      expect(Math.abs(nextMs - (lastMs + intervalMs))).toBeLessThan(5_000);
    }

    expect(result.schedules.map((s) => s.id).sort()).toEqual([
      "schedule-crawl",
      "schedule-monitoring",
      "schedule-opportunities"
    ]);
    },
    15_000
  );

  it(
    "records error path when runSeoJob rejects",
    async () => {
    vi.resetModules();
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "seo-run-due-err-"));
    cleanup.push(async () => rm(tempDir, { recursive: true, force: true }));
    vi.stubEnv("SEO_DATA_DIR", tempDir);
    await mkdir(path.join(tempDir, "seo-runtime"), { recursive: true });
    await writeFile(
      jobSchedulesPath(tempDir),
      JSON.stringify([
        {
          id: "schedule-crawl",
          job: "crawl",
          cadence: "Every 24 hours",
          intervalMinutes: 60,
          enabled: true,
          lastRunAt: null,
          nextRunAt: pastDue,
          lastStatus: null,
          detail: "x"
        },
        {
          id: "schedule-opportunities",
          job: "opportunities",
          cadence: "Every 24 hours",
          intervalMinutes: 24 * 60,
          enabled: false,
          lastRunAt: null,
          nextRunAt: pastDue,
          lastStatus: null,
          detail: "skipped"
        },
        {
          id: "schedule-monitoring",
          job: "monitor-content",
          cadence: "Every 24 hours",
          intervalMinutes: 24 * 60,
          enabled: false,
          lastRunAt: null,
          nextRunAt: pastDue,
          lastStatus: null,
          detail: "skipped"
        }
      ]),
      "utf8"
    );

    const runSeoJob = vi.fn().mockRejectedValue(new Error("crawl failed"));
    vi.doMock("@/features/seo/server/jobs", () => ({
      runSeoJob
    }));

    const { runDueScheduledJobs } = await import("@/features/seo/server/scheduler");
    const { getJobSchedules } = await import("@/features/seo/server/storage");

    const result = await runDueScheduledJobs("2099-12-31T23:59:59.999Z");

    expect(runSeoJob).toHaveBeenCalledTimes(1);
    expect(runSeoJob).toHaveBeenCalledWith("crawl");
    expect(result.ran).toHaveLength(1);
    expect(result.ran[0]?.status).toBe("error");
    expect(result.ran[0]?.detail).toContain("crawl failed");

    const crawl = (await getJobSchedules()).find((s) => s.id === "schedule-crawl");
    expect(crawl?.lastStatus).toBe("error");
    expect(crawl?.lastRunAt).not.toBeNull();
    expect(crawl?.nextRunAt).not.toBeNull();
    },
    15_000
  );
});
