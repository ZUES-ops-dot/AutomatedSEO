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

async function loadStorage() {
  vi.resetModules();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "seo-storage-hardening-"));
  cleanup.push(async () => rm(tempDir, { recursive: true, force: true }));
  vi.stubEnv("SEO_DATA_DIR", tempDir);
  return import("@/features/seo/server/storage");
}

describe("storage hardening", () => {
  it("merges job schedule writes instead of replacing all schedules", async () => {
    const storage = await loadStorage();

    await storage.saveJobSchedules([
      {
        id: "schedule-a",
        job: "crawl",
        cadence: "Every 60 minutes",
        intervalMinutes: 60,
        enabled: true,
        lastRunAt: null,
        nextRunAt: null,
        lastStatus: null,
        detail: "A"
      },
      {
        id: "schedule-b",
        job: "opportunities",
        cadence: "Every 120 minutes",
        intervalMinutes: 120,
        enabled: true,
        lastRunAt: null,
        nextRunAt: null,
        lastStatus: null,
        detail: "B"
      }
    ]);

    await storage.saveJobSchedules([
      {
        id: "schedule-a",
        job: "crawl",
        cadence: "Every 30 minutes",
        intervalMinutes: 30,
        enabled: true,
        lastRunAt: "2026-04-13T00:00:00.000Z",
        nextRunAt: null,
        lastStatus: "success",
        detail: "A updated"
      }
    ]);

    const schedules = await storage.getJobSchedules();
    expect(schedules.map((item) => item.id).sort()).toEqual(["schedule-a", "schedule-b"]);
    expect(schedules.find((item) => item.id === "schedule-a")?.intervalMinutes).toBe(30);
    expect(schedules.find((item) => item.id === "schedule-b")?.intervalMinutes).toBe(120);
  });

  it("normalizes schedules and enforces retention cap", async () => {
    const storage = await loadStorage();
    const schedules = Array.from({ length: 120 }, (_, index) => ({
      id: `schedule-${index}`,
      job: "crawl",
      cadence: "",
      intervalMinutes: index % 2 === 0 ? 0 : 15,
      enabled: true,
      lastRunAt: "invalid-date",
      nextRunAt: null,
      lastStatus: "unexpected" as unknown as null,
      detail: ""
    }));

    const saved = await storage.saveJobSchedules(schedules);
    const stored = await storage.getJobSchedules();

    expect(saved.length).toBe(120);
    expect(stored.length).toBe(100);
    const sample = stored[0];
    expect(sample.intervalMinutes).toBeGreaterThan(0);
    expect(sample.nextRunAt).not.toBeNull();
    expect(sample.lastStatus).toBeNull();
  });

  it("validates array inputs for new save functions", async () => {
    const storage = await loadStorage();

    await expect(storage.saveJobSchedules("bad-input" as unknown as never)).rejects.toThrow("schedules must be an array");
    await expect(storage.saveOpportunityOutcomes("bad-input" as unknown as never)).rejects.toThrow(
      "outcomes must be an array"
    );
  });

  it("dedupes and caps opportunity outcomes", async () => {
    const storage = await loadStorage();

    const outcomes = Array.from({ length: 1005 }, (_, index) => ({
      id: `outcome-${index}`,
      actionId: `action-${index}`,
      opportunityId: `opportunity-${index}`,
      title: `Outcome ${index}`,
      predictedScore: 80,
      baselineCtr: 0.02,
      latestCtr: 0.03,
      baselinePosition: 9,
      latestPosition: 7,
      ctrDelta: 0.01,
      positionDelta: 2,
      outcomeScore: 22,
      outcome: "positive" as const,
      capturedAt: new Date(Date.now() + index * 1000).toISOString()
    }));

    outcomes[1004] = {
      ...outcomes[1004],
      id: "outcome-5"
    };

    await storage.saveOpportunityOutcomes([
      ...outcomes,
      {
        id: "",
        actionId: "action-invalid",
        opportunityId: "opportunity-invalid",
        title: "Invalid",
        predictedScore: 0,
        baselineCtr: 0,
        latestCtr: 0,
        baselinePosition: 0,
        latestPosition: 0,
        ctrDelta: 0,
        positionDelta: 0,
        outcomeScore: 0,
        outcome: "insufficient_data",
        capturedAt: "not-a-date"
      }
    ]);

    const stored = await storage.getOpportunityOutcomes();
    expect(stored.length).toBe(1000);
    expect(stored.filter((item) => item.id === "outcome-5").length).toBe(1);
    expect(stored.every((item) => item.id.length > 0)).toBe(true);
  });
});
