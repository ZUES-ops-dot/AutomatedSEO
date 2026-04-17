import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const task = cleanups.pop();
    if (task) {
      await task();
    }
  }
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("rss connector integration", () => {
  it("persists feed events in isolated storage directory", async () => {
    vi.resetModules();
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "seo-rss-"));
    cleanups.push(async () => rm(tempDir, { recursive: true, force: true }));
    vi.stubEnv("SEO_DATA_DIR", tempDir);
    vi.stubEnv("RSS_FEED_URLS", "https://example.com/feed.xml");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | RequestInfo) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://example.com/feed.xml") {
          return new Response(
            `<?xml version="1.0"?>
            <rss><channel>
              <item>
                <title>Qubic Weekly Update</title>
                <description>Fresh ecosystem recap</description>
                <link>https://blogs.qubic.org/weekly</link>
                <pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate>
              </item>
            </channel></rss>`,
            { status: 200 }
          );
        }
        return new Response("not found", { status: 404 });
      })
    );

    const { syncRssFeeds } = await import("@/features/seo/server/live-connectors");
    const { getSourceEvents } = await import("@/features/seo/server/storage");

    const result = await syncRssFeeds();
    expect(result.run.status).toBe("success");

    const storedEvents = await getSourceEvents("rss-watch");
    expect(storedEvents.length).toBeGreaterThan(0);
    expect(storedEvents[0]?.title.toLowerCase()).toContain("qubic");
  });
});
