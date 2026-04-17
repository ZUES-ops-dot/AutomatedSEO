import { describe, expect, it, vi } from "vitest";

describe("publishing behavior", () => {
  it("always exports local markdown", async () => {
    vi.resetModules();
    vi.doMock("@/features/seo/server/env", () => ({
      appEnv: {
        appName: "Test",
        primarySiteUrl: "https://qubic.org"
      }
    }));
    vi.doMock("@/features/seo/server/link-engine", () => ({
      buildLinkPlanForDraft: vi.fn().mockResolvedValue([])
    }));
    vi.doMock("@/features/seo/server/storage", () => ({
      getContentActionByDraftId: vi.fn().mockResolvedValue(null),
      getLatestSourcePackForOpportunity: vi.fn().mockResolvedValue(null),
      getSearchPerformanceRows: vi.fn().mockResolvedValue([]),
      getStoredDraftById: vi.fn().mockResolvedValue({
        id: "draft-1",
        title: "Draft title",
        status: "review_required",
        supportingOpportunityId: "opp-1",
        summary: "summary",
        metaTitle: "meta",
        metaDescription: "desc",
        sources: [],
        reviewFlags: [],
        sections: [{ heading: "h", paragraphs: ["p"] }]
      }),
      saveConnectorRun: vi.fn().mockResolvedValue(undefined),
      saveContentAction: vi.fn().mockResolvedValue(undefined),
      savePerformanceSnapshots: vi.fn().mockResolvedValue(undefined)
    }));

    const { publishDraft } = await import("@/features/seo/server/publishing");
    const result = await publishDraft("draft-1", "local_markdown");
    expect(result.action.publishTarget).toBe("local_markdown");
  });
});
