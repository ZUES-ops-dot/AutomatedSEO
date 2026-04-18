import { mkdir, readFile, writeFile } from "fs/promises";
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

async function setupTempDataDir() {
  vi.resetModules();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "seo-scheduler-list-"));
  cleanup.push(async () => rm(tempDir, { recursive: true, force: true }));
  vi.stubEnv("SEO_DATA_DIR", tempDir);
  return tempDir;
}

function jobSchedulesFilePath(dataRoot: string) {
  return path.join(dataRoot, "seo-runtime", "jobSchedules.json");
}

describe("listJobSchedules persistence", () => {
  it(
    "persists default schedules when storage is empty",
    async () => {
    const tempDir = await setupTempDataDir();
    const { listJobSchedules } = await import("@/features/seo/server/scheduler");
    const { getJobSchedules } = await import("@/features/seo/server/storage");

    const merged = await listJobSchedules();
    expect(merged.map((s) => s.id).sort()).toEqual([
      "schedule-crawl",
      "schedule-monitoring",
      "schedule-opportunities",
      "schedule-pagespeed",
      "schedule-search-signals"
    ]);
    expect(merged.every((s) => s.nextRunAt !== null)).toBe(true);

    const stored = await getJobSchedules();
    expect(stored.length).toBe(5);
    expect(stored.map((s) => s.id).sort()).toEqual(merged.map((s) => s.id).sort());

    const raw = await readFile(jobSchedulesFilePath(tempDir), "utf8");
    expect(raw.length).toBeGreaterThan(10);
    },
    15_000
  );

  it(
    "persists when stored row count is lower than merged (seed missing defaults)",
    async () => {
    const tempDir = await setupTempDataDir();
    await mkdir(path.join(tempDir, "seo-runtime"), { recursive: true });
    await writeFile(
      jobSchedulesFilePath(tempDir),
      JSON.stringify([
        {
          id: "schedule-crawl",
          job: "crawl",
          cadence: "Every 24 hours",
          intervalMinutes: 1440,
          enabled: true,
          lastRunAt: null,
          nextRunAt: null,
          lastStatus: null,
          detail: "Keep crawl data fresh."
        }
      ]),
      "utf8"
    );

    const { listJobSchedules } = await import("@/features/seo/server/scheduler");
    const { getJobSchedules } = await import("@/features/seo/server/storage");

    const merged = await listJobSchedules();
    expect(merged.length).toBe(5);
    const stored = await getJobSchedules();
    expect(stored.length).toBe(5);
    expect(new Set(stored.map((s) => s.id)).size).toBe(5);
    },
    15_000
  );

  it(
    "persists when length matches but structure differs (e.g. missing nextRunAt)",
    async () => {
    const tempDir = await setupTempDataDir();
    await mkdir(path.join(tempDir, "seo-runtime"), { recursive: true });
    const threeWithNullNext = [
      {
        id: "schedule-crawl",
        job: "crawl",
        cadence: "Every 24 hours",
        intervalMinutes: 1440,
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
        intervalMinutes: 1440,
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
        intervalMinutes: 1440,
        enabled: true,
        lastRunAt: null,
        nextRunAt: null,
        lastStatus: null,
        detail: "Refresh outcome checkpoints."
      }
    ];
    await writeFile(jobSchedulesFilePath(tempDir), JSON.stringify(threeWithNullNext), "utf8");

    const { listJobSchedules } = await import("@/features/seo/server/scheduler");
    const { getJobSchedules } = await import("@/features/seo/server/storage");

    const merged = await listJobSchedules();
    expect(merged.length).toBe(5);
    expect(merged.every((s) => s.nextRunAt !== null)).toBe(true);

    const stored = await getJobSchedules();
    expect(stored.length).toBe(5);
    expect(stored.every((s) => s.nextRunAt !== null)).toBe(true);
    },
    15_000
  );

  it(
    "does not call saveJobSchedules again once stored matches merged (no nextRunAt churn)",
    async () => {
    const tempDir = await setupTempDataDir();
    const storage = await import("@/features/seo/server/storage");
    const saveSpy = vi.spyOn(storage, "saveJobSchedules");
    const { listJobSchedules } = await import("@/features/seo/server/scheduler");

    await listJobSchedules();
    const callsAfterFirst = saveSpy.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThanOrEqual(1);

    await listJobSchedules();
    expect(saveSpy.mock.calls.length).toBe(callsAfterFirst);

    const schedules = await storage.getJobSchedules();
    expect(schedules.map((s) => s.id).sort()).toEqual([
      "schedule-crawl",
      "schedule-monitoring",
      "schedule-opportunities",
      "schedule-pagespeed",
      "schedule-search-signals"
    ]);

    const raw = await readFile(jobSchedulesFilePath(tempDir), "utf8");
    expect(JSON.parse(raw).length).toBe(5);
    },
    15_000
  );
});
