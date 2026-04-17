import { describe, expect, it, vi } from "vitest";

function makeRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: { get: vi.fn().mockReturnValue(null) }
  };
}

describe("api/content/publish route", () => {
  it("returns 400 when draftId is missing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/publishing", () => ({
      publishDraft: vi.fn()
    }));

    const route = await import("@/app/api/content/publish/route");
    const response = await route.POST(makeRequest({}) as never);
    expect(response.status).toBe(400);
  });

  it("forwards target and returns publish result", async () => {
    vi.resetModules();
    const publishDraft = vi.fn().mockResolvedValue({
      action: { id: "action-1" },
      linkSuggestions: [],
      baselineSnapshots: []
    });
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/publishing", () => ({
      publishDraft
    }));

    const route = await import("@/app/api/content/publish/route");
    const response = await route.POST(
      makeRequest({ draftId: "draft-1", target: "local_markdown" }) as never
    );
    const payload = (await response.json()) as { action: { id: string } };
    expect(response.status).toBe(200);
    expect(publishDraft).toHaveBeenCalledWith("draft-1", "local_markdown");
    expect(payload.action.id).toBe("action-1");
  });
});
