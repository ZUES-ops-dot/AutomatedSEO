import { mkdtemp, readFile, rm } from "fs/promises";
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

describe("backend integration flow", () => {
  it(
    "runs crawl -> opportunities -> content -> publish using temp storage",
    async () => {
    vi.resetModules();
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "seo-flow-"));
    cleanup.push(async () => rm(tempDir, { recursive: true, force: true }));
    vi.stubEnv("SEO_DATA_DIR", tempDir);

    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith("/sitemap.xml")) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <urlset>
            <url><loc>https://blogs.qubic.org/post-a</loc></url>
            <url><loc>https://blogs.qubic.org/post-b</loc></url>
          </urlset>`,
          { status: 200 }
        );
      }

      if (url === "https://blogs.qubic.org/post-a") {
        return new Response(
          `<html><head><title>Qubic Wallet Guide</title><meta name="description" content="Wallet guide" /></head>
           <body><h1>Qubic Wallet Guide</h1><p>This guide explains wallet setup, backup and recovery steps for Qubic users with practical details and examples.</p>
           <a href="/post-b">Related post</a></body></html>`,
          { status: 200 }
        );
      }

      if (url === "https://blogs.qubic.org/post-b") {
        return new Response(
          `<html><head><title>Qubic Ecosystem Update</title><meta name="description" content="Ecosystem update" /></head>
           <body><h1>Qubic Ecosystem Update</h1><p>Weekly ecosystem and developer update with references to docs, releases and roadmap highlights.</p>
           <a href="/post-a">Wallet guide</a></body></html>`,
          { status: 200 }
        );
      }

      return new Response("<html><body><h1>Not found</h1></body></html>", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { crawlConfiguredSites } = await import("@/features/seo/server/crawler");
    const { generateOpportunityFeed } = await import("@/features/seo/server/opportunity-engine");
    const { generateAndPersistDraft } = await import("@/features/seo/server/content-workflows");
    const { publishDraft } = await import("@/features/seo/server/publishing");
    const { saveSearchPerformanceRows, saveSourceEvents } = await import("@/features/seo/server/storage");

    const crawled = await crawlConfiguredSites({ site: "blog", maxPages: 2 });
    expect(crawled[0]?.pages.length).toBeGreaterThan(0);

    await saveSearchPerformanceRows([
      {
        id: "search-1",
        provider: "manual_csv",
        query: "qubic wallet guide",
        page: "https://blogs.qubic.org/post-a",
        clicks: 12,
        impressions: 160,
        ctr: 12 / 160,
        position: 6.2,
        capturedAt: new Date().toISOString()
      }
    ]);
    await saveSourceEvents([
      {
        id: "event-1",
        connectorId: "rss-watch",
        kind: "rss_item",
        title: "Qubic ecosystem digest",
        summary: "Weekly digest from official feed",
        url: "https://blogs.qubic.org/post-b",
        tags: ["ecosystem"],
        score: 74,
        publishedAt: new Date().toISOString(),
        capturedAt: new Date().toISOString()
      }
    ]);

    const opportunityResult = await generateOpportunityFeed({ persist: true, recordRun: false });
    expect(opportunityResult.opportunities.length).toBeGreaterThan(0);

    const draftResult = await generateAndPersistDraft(
      { opportunityId: opportunityResult.opportunities[0]?.id, provider: "deterministic" },
      { persist: true }
    );
    const publishResult = await publishDraft(draftResult.draft.id, "local_markdown");

    expect(publishResult.action.publishTarget).toBe("local_markdown");
    expect(publishResult.action.markdownPath).toBeDefined();
    expect(publishResult.action.markdownPath?.startsWith(tempDir)).toBe(true);

    const markdown = await readFile(publishResult.action.markdownPath!, "utf8");
    expect(markdown).toContain("##");
    },
    15_000
  );
});
