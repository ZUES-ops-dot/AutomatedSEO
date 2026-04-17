import { describe, expect, it, vi } from "vitest";

function makeRequest(body: unknown = {}) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: { get: vi.fn().mockReturnValue(null) }
  };
}

describe("api/suggestions route", () => {
  it("returns 400 when PATCH payload is incomplete", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/opportunity-engine", () => ({
      generateOpportunityFeed: vi.fn()
    }));
    vi.doMock("@/features/seo/server/storage", () => ({
      updateStoredOpportunityStatus: vi.fn()
    }));
    vi.doMock("@/features/seo/server/views", () => ({
      getSuggestionsData: vi.fn().mockResolvedValue({})
    }));

    const route = await import("@/app/api/suggestions/route");
    const response = await route.PATCH(makeRequest({ id: "" }) as never);
    expect(response.status).toBe(400);
  });

  it("returns 404 when PATCH target is missing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/opportunity-engine", () => ({
      generateOpportunityFeed: vi.fn()
    }));
    vi.doMock("@/features/seo/server/storage", () => ({
      updateStoredOpportunityStatus: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock("@/features/seo/server/views", () => ({
      getSuggestionsData: vi.fn().mockResolvedValue({})
    }));

    const route = await import("@/app/api/suggestions/route");
    const response = await route.PATCH(
      makeRequest({ id: "opp-404", status: "approved" }) as never
    );
    expect(response.status).toBe(404);
  });

  it("returns data on GET", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/opportunity-engine", () => ({
      generateOpportunityFeed: vi.fn()
    }));
    vi.doMock("@/features/seo/server/storage", () => ({
      updateStoredOpportunityStatus: vi.fn()
    }));
    vi.doMock("@/features/seo/server/views", () => ({
      getSuggestionsData: vi.fn().mockResolvedValue({ opportunities: [{ id: "x" }] })
    }));

    const route = await import("@/app/api/suggestions/route");
    const response = await route.GET({ headers: { get: () => null } } as never);
    const payload = (await response.json()) as { opportunities: Array<{ id: string }> };
    expect(response.status).toBe(200);
    expect(payload.opportunities[0]?.id).toBe("x");
  });
});
