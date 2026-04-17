import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

function makeRequest(body: unknown = {}) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: vi.fn().mockReturnValue(null)
    }
  };
}

describe("api/jobs route", () => {
  it("returns auth error when authorization fails", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      isApiAuthorized: vi.fn().mockReturnValue(false),
      requireApiAuthorization: vi.fn().mockReturnValue(NextResponse.json({ error: "Unauthorized." }, { status: 401 }))
    }));
    vi.doMock("@/features/seo/server/env", () => ({
      appEnv: { jobSecret: "x" }
    }));
    vi.doMock("@/features/seo/server/jobs", () => ({
      runSeoJob: vi.fn()
    }));
    vi.doMock("@/features/seo/server/storage", () => ({
      getConnectorRuns: vi.fn().mockResolvedValue([])
    }));

    const route = await import("@/app/api/jobs/route");
    const response = await route.POST(makeRequest({ job: "crawl" }) as never);
    expect(response.status).toBe(401);
  });

  it("validates job name on POST", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      isApiAuthorized: vi.fn().mockReturnValue(true),
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/env", () => ({
      appEnv: { jobSecret: "x" }
    }));
    vi.doMock("@/features/seo/server/jobs", () => ({
      runSeoJob: vi.fn()
    }));
    vi.doMock("@/features/seo/server/storage", () => ({
      getConnectorRuns: vi.fn().mockResolvedValue([])
    }));

    const route = await import("@/app/api/jobs/route");
    const response = await route.POST(makeRequest({ job: "invalid-job" }) as never);
    const payload = (await response.json()) as { error: string };
    expect(response.status).toBe(400);
    expect(payload.error).toContain("job must be one of");
  });
});
