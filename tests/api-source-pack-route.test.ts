import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

function makeGetRequest(url: string) {
  return {
    nextUrl: new URL(url),
    headers: { get: vi.fn().mockReturnValue(null) }
  };
}

function makePostRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: { get: vi.fn().mockReturnValue(null) },
    nextUrl: new URL("https://example.com")
  };
}

describe("api/content/source-pack route", () => {
  it("requires auth for GET", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi
        .fn()
        .mockReturnValue(NextResponse.json({ error: "Unauthorized." }, { status: 401 }))
    }));
    vi.doMock("@/features/seo/server/content-workflows", () => ({
      buildWorkflowSourcePack: vi.fn()
    }));

    const route = await import("@/app/api/content/source-pack/route");
    const response = await route.GET(
      makeGetRequest("https://example.com/api/content/source-pack?persist=true") as never
    );
    expect(response.status).toBe(401);
  });

  it("parses search params and forwards persist flag on GET", async () => {
    vi.resetModules();
    const buildWorkflowSourcePack = vi.fn().mockResolvedValue({ id: "sp-1" });
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/content-workflows", () => ({
      buildWorkflowSourcePack
    }));

    const route = await import("@/app/api/content/source-pack/route");
    const response = await route.GET(
      makeGetRequest("https://example.com/api/content/source-pack?topic=wallet&persist=false") as never
    );
    expect(response.status).toBe(200);
    expect(buildWorkflowSourcePack).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "wallet" }),
      { persist: false }
    );
  });

  it("defaults persist=true on POST", async () => {
    vi.resetModules();
    const buildWorkflowSourcePack = vi.fn().mockResolvedValue({ id: "sp-2" });
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/content-workflows", () => ({
      buildWorkflowSourcePack
    }));

    const route = await import("@/app/api/content/source-pack/route");
    const response = await route.POST(makePostRequest({ topic: "docs" }) as never);
    expect(response.status).toBe(200);
    expect(buildWorkflowSourcePack).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "docs" }),
      { persist: true }
    );
  });
});
