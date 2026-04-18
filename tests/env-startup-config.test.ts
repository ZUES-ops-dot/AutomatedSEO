import { describe, expect, it, vi } from "vitest";

describe("startup config report", () => {
  it("marks railway mode unhealthy when JOB_SECRET is missing", async () => {
    vi.resetModules();
    vi.stubEnv("RAILWAY_ENVIRONMENT_NAME", "prod");
    vi.stubEnv("JOB_SECRET", "");
    const env = await import("@/features/seo/server/env");
    const report = env.getStartupConfigReport();
    expect(report.required.healthy).toBe(false);
    expect(report.required.missing).toContain("JOB_SECRET");
    vi.unstubAllEnvs();
  });

  it("reports operational mode when required keys exist", async () => {
    vi.resetModules();
    vi.stubEnv("RAILWAY_ENVIRONMENT_NAME", "prod");
    vi.stubEnv("JOB_SECRET", "secret-value");
    vi.stubEnv("MORNINGSCORE_API_KEY", "k");
    const env = await import("@/features/seo/server/env");
    const report = env.getStartupConfigReport();
    expect(report.mode).toBe("operational");
    expect(report.optional.configured).toBeGreaterThan(0);
    vi.unstubAllEnvs();
  });
});
