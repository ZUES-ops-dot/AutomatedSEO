import { describe, expect, it, vi } from "vitest";

function makeRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: { get: vi.fn().mockReturnValue(null) }
  };
}

describe("api/blog-links/docx route", () => {
  it("returns 400 when target page cannot be resolved", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/blog-link-pack", () => ({
      buildBlogLinkPack: vi.fn().mockResolvedValue({
        target: null,
        suggestions: [],
        message: "No page found."
      })
    }));
    vi.doMock("@/features/seo/server/blog-link-docx", () => ({
      buildBlogLinkDocxBuffer: vi.fn()
    }));

    const route = await import("@/app/api/blog-links/docx/route");
    const response = await route.POST(makeRequest({ targetUrl: "https://blogs.qubic.org/a" }) as never);
    expect(response.status).toBe(400);
  });

  it("returns DOCX with attachment headers on success", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      requireApiAuthorization: vi.fn().mockReturnValue(null)
    }));
    vi.doMock("@/features/seo/server/blog-link-pack", () => ({
      buildBlogLinkPack: vi.fn().mockResolvedValue({
        target: {
          id: "page-1",
          title: "Wallet Guide",
          h1: "Wallet Guide",
          url: "https://blogs.qubic.org/wallet-guide",
          site: "blog",
          metaDescription: "",
          canonicalUrl: "https://blogs.qubic.org/wallet-guide",
          statusCode: 200,
          headings: [],
          internalLinks: [],
          internalLinkDetails: [],
          contentText: "text",
          contentExcerpt: "text",
          contentChunks: ["text"],
          wordCount: 1,
          issues: [],
          contentHash: "x",
          crawlDepth: 0,
          rendered: false,
          lastCrawled: "2026-01-01T00:00:00.000Z"
        },
        suggestions: []
      })
    }));
    vi.doMock("@/features/seo/server/blog-link-docx", () => ({
      buildBlogLinkDocxBuffer: vi.fn().mockResolvedValue(Buffer.from("docx-bytes"))
    }));

    const route = await import("@/app/api/blog-links/docx/route");
    const response = await route.POST(makeRequest({ targetUrl: "https://blogs.qubic.org/wallet-guide" }) as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/vnd.openxmlformats-officedocument");
    expect(response.headers.get("Content-Disposition")).toContain("wallet-guide");
  });
});
