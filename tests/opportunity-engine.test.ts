import { describe, expect, it } from "vitest";

import { buildRefreshCandidate, buildSupportCandidate } from "@/features/seo/server/opportunity-engine";
import type { SearchPerformanceRow } from "@/features/seo/types";

function makeRow(overrides: Partial<SearchPerformanceRow>): SearchPerformanceRow {
  return {
    id: "row-1",
    provider: "demo_seed",
    query: "qubic wallet setup",
    page: "https://qubic.org/wallet",
    clicks: 10,
    impressions: 100,
    ctr: 0.1,
    position: 7.5,
    capturedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("opportunity-engine guards", () => {
  it("buildRefreshCandidate does not throw on malformed URL", () => {
    const row = makeRow({ page: "not-a-valid-url" });
    const candidate = buildRefreshCandidate(row, null);
    expect(candidate.title).toContain("not-a-valid-url");
  });

  it("buildSupportCandidate keys off highest impression row", () => {
    const rows = [
      makeRow({ id: "a", query: "qubic faq", impressions: 20, page: "https://qubic.org/faq" }),
      makeRow({ id: "b", query: "qubic wallet setup", impressions: 200, page: "https://qubic.org/" })
    ];

    const candidate = buildSupportCandidate(rows);
    expect(candidate).not.toBeNull();
    expect(candidate?.primaryQuery).toBe("qubic wallet setup");
    expect(candidate?.id).toContain("qubic-wallet-setup");
  });
});
