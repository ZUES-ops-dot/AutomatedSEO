import { describe, expect, it, vi } from "vitest";

describe("content engine source pack resolution", () => {
  it("uses stored opportunity when id is not in seeded demo data", async () => {
    vi.resetModules();
    vi.doMock("@/features/seo/server/storage", () => ({
      getStoredOpportunities: vi.fn().mockResolvedValue([
        {
          id: "opp-custom-1",
          title: "Custom stored opportunity",
          cluster: "wallet onboarding",
          primaryQuery: "custom query",
          affectedUrls: ["https://blogs.qubic.org/custom"],
          pageType: "blog",
          reason: "Stored reason",
          evidence: ["Stored evidence"],
          sourceTypes: ["search_console"],
          businessRelevance: 80,
          demandSignal: 70,
          ctrGap: 60,
          freshnessNeed: 50,
          uniquenessPotential: 75,
          enrichmentAvailable: 70,
          internalLinkSupport: 55,
          cannibalizationRisk: 15,
          difficultyGap: 40,
          existingPageTargetsIntent: true,
          rankingButUnderperforming: false,
          ctrWeak: false,
          staleOrMissingSubtopics: false,
          repeatedIntent: false,
          noCurrentPageMapsCleanly: false,
          evergreenBetterThanBlog: false,
          supportsPriorityCluster: true,
          risingTopic: false,
          commentaryAddsValue: false,
          firstPartyContextAvailable: true,
          overlappingPages: false,
          strongerCanonicalExists: false,
          demandTooWeak: false,
          competitionTooStrong: false,
          limitedUniqueValue: false,
          offStrategy: false,
          status: "new",
          lastUpdated: "2026-01-01T00:00:00.000Z",
          recommendedAction: "refresh",
          score: 77,
          confidenceScore: 80,
          priorityBand: "queue"
        }
      ]),
      getStoredBriefById: vi.fn().mockResolvedValue(null),
      getStoredDraftById: vi.fn().mockResolvedValue(null)
    }));

    const { buildSourcePack } = await import("@/features/seo/server/content-engine");
    const pack = await buildSourcePack({ opportunityId: "opp-custom-1" });
    expect(pack.supportingOpportunityId).toBe("opp-custom-1");
    expect(pack.primaryQuery).toBe("custom query");
  });
});
