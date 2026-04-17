import { describe, expect, it } from "vitest";

import { normalizeTargetBlogUrl, searchBlogPages } from "@/features/seo/server/blog-link-pack";
import type { SitePage } from "@/features/seo/types";

function makePage(overrides: Partial<SitePage>): SitePage {
  return {
    id: "page-1",
    url: "https://blogs.qubic.org/post-one",
    site: "blog",
    title: "Post One",
    h1: "Post One",
    metaDescription: "",
    canonicalUrl: "https://blogs.qubic.org/post-one",
    statusCode: 200,
    headings: [],
    internalLinks: [],
    internalLinkDetails: [],
    contentText: "alpha beta",
    contentExcerpt: "alpha beta",
    contentChunks: ["alpha beta"],
    wordCount: 2,
    issues: [],
    contentHash: "x",
    crawlDepth: 0,
    rendered: false,
    lastCrawled: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("blog link pack helpers", () => {
  it("normalizes host and trims invalid urls", () => {
    expect(normalizeTargetBlogUrl("blogs.qubic.org/post-a")).toBe("https://blogs.qubic.org/post-a");
    expect(normalizeTargetBlogUrl("   ")).toBe("");
  });

  it("searches by title and URL and sorts by crawl time", () => {
    const pages = [
      makePage({ id: "a", title: "Wallet Guide", lastCrawled: "2026-01-01T00:00:00.000Z" }),
      makePage({
        id: "b",
        title: "Developer Update",
        url: "https://blogs.qubic.org/dev-update",
        lastCrawled: "2026-01-02T00:00:00.000Z"
      })
    ];
    const results = searchBlogPages(pages, "dev");
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("b");
  });
});
