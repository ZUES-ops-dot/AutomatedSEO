"use server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { analyzeKeywordGaps, type KeywordGapReport } from "@/features/seo/server/keyword-gaps";

export type KeywordGapResult =
  | { ok: true; report: KeywordGapReport }
  | { ok: false; error: string };

export async function analyzeKeywordGapsAction(input: {
  topic?: string;
  rankingLimit?: number;
}): Promise<KeywordGapResult> {
  try {
    const report = await analyzeKeywordGaps({
      topic: input.topic?.trim() || undefined,
      rankingLimit: input.rankingLimit && input.rankingLimit > 0 ? Math.min(input.rankingLimit, 100) : 20
    });

    await appendAuditEvent({
      action: "action.keywordGaps.analyze",
      detail: {
        topic: input.topic ?? null,
        rankingGaps: report.rankingGaps.length,
        topicGaps: report.topicGaps.length,
        provider: report.provider
      }
    });

    return { ok: true, report };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to analyze keyword gaps."
    };
  }
}
