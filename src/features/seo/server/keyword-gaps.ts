/**
 * Keyword gap analyzer
 * --------------------
 * Identifies search queries where the site has opportunity but isn't capturing
 * traffic. Two complementary analyses:
 *
 *  1. Ranking gaps — queries where the site already appears (has impressions)
 *     but ranks poorly (position > 20). These are refresh opportunities.
 *
 *  2. Topic gaps — AI-suggested related keywords the site should target
 *     based on an input topic. Uses the existing site-page inventory to
 *     exclude keywords already well-covered.
 */

import { HTTP_CLIENT } from "@/features/seo/server/seo-constants";
import { appEnv } from "@/features/seo/server/env";
import { getSearchPerformanceRows, getSitePages } from "@/features/seo/server/storage";
import { logSeoEvent } from "@/lib/seo-log";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export interface RankingGap {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  opportunityScore: number;
  reason: string;
}

export interface TopicGap {
  keyword: string;
  intent: "informational" | "transactional" | "navigational" | "comparison";
  suggestedAngle: string;
  estimatedDifficulty: "low" | "medium" | "high";
  reason: string;
}

export interface KeywordGapReport {
  rankingGaps: RankingGap[];
  topicGaps: TopicGap[];
  totalSearchRowsAnalyzed: number;
  provider: "anthropic" | "deterministic";
  generatedAt: string;
}

/**
 * Score ranking gaps: high impressions + poor position = high opportunity.
 * Returns up to `limit` sorted by opportunity score.
 */
function computeRankingGaps(
  rows: Array<{
    query: string;
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>,
  limit = 20
): RankingGap[] {
  const candidates = rows.filter((row) => row.impressions >= 20 && row.position > 10);

  return candidates
    .map((row) => {
      // Score = f(impressions, position, CTR deficit)
      // Higher impressions and worse position = higher opportunity
      const impressionFactor = Math.log10(row.impressions + 1) * 25;
      const positionPenalty = Math.max(0, row.position - 10) * 2;
      const ctrDeficit = Math.max(0, 0.08 - row.ctr) * 200;
      const opportunityScore = Math.round(impressionFactor + positionPenalty + ctrDeficit);

      let reason: string;
      if (row.position > 30) {
        reason = `Ranking #${Math.round(row.position)} for "${row.query}" with ${row.impressions} impressions — strong signal but weak capture.`;
      } else if (row.ctr < 0.04) {
        reason = `CTR ${(row.ctr * 100).toFixed(1)}% at position ${Math.round(row.position)} — title/meta likely underperforming.`;
      } else {
        reason = `Position ${Math.round(row.position)} for "${row.query}" — room to move into top 10 with refresh.`;
      }

      return {
        query: row.query,
        page: row.page,
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr,
        position: row.position,
        opportunityScore,
        reason
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, limit);
}

async function callAnthropicForTopicGaps(
  topic: string,
  existingPageTitles: string[]
): Promise<TopicGap[] | null> {
  if (!appEnv.anthropicApiKey) {
    return null;
  }

  const systemPrompt =
    "You are an SEO keyword researcher for the Qubic blockchain ecosystem. " +
    "You identify search terms, long-tail keywords, and content topics that an existing site is NOT covering well. " +
    "Your suggestions should be specific, realistic, and reflect actual search behavior. " +
    "Return ONLY valid JSON — no prose, no markdown fences, no comments.";

  const userPrompt = JSON.stringify(
    {
      task: "Identify keyword gaps around a topic.",
      topic,
      siteContext: "Qubic.org and docs.qubic.org — a feeless, tick-based L1 with useful-proof-of-work (repurposes mining for AI training).",
      existingCoverage: existingPageTitles.slice(0, 40),
      instructions: [
        "Suggest 8-12 specific search terms/topics that are adjacent to the input topic but appear NOT to be covered in existingCoverage.",
        "Focus on operator-level, developer-level, and investor-level queries — not generic marketing terms.",
        "For each, infer the user intent (informational / transactional / navigational / comparison).",
        "Propose a specific angle that positions Qubic as the authoritative source.",
        "Estimate difficulty — low (long-tail, specific), medium (moderate competition), high (broad, competitive)."
      ],
      requiredShape: {
        keywords: [
          {
            keyword: "string",
            intent: "informational | transactional | navigational | comparison",
            suggestedAngle: "string",
            estimatedDifficulty: "low | medium | high",
            reason: "string"
          }
        ]
      }
    },
    null,
    2
  );

  try {
    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": appEnv.anthropicApiKey
        },
        body: JSON.stringify({
          model: appEnv.anthropicModel,
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }]
        })
      },
      HTTP_CLIENT.llmTimeoutMs
    );

    if (!response.ok) {
      throw new Error(`Anthropic request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };

    const text =
      data.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("\n")
        .trim() ?? "";

    const trimmed = text.trim();
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1];
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)?.[0];

    let parsed: { keywords?: Array<{ keyword?: string; intent?: string; suggestedAngle?: string; estimatedDifficulty?: string; reason?: string }> } | null = null;
    for (const candidate of [trimmed, fencedMatch, jsonMatch]) {
      if (!candidate) continue;
      try {
        parsed = JSON.parse(candidate);
        break;
      } catch {
        continue;
      }
    }

    if (!parsed?.keywords) {
      return null;
    }

    return parsed.keywords
      .filter((item) => item.keyword?.trim())
      .map((item) => ({
        keyword: item.keyword!.trim(),
        intent: (["informational", "transactional", "navigational", "comparison"].includes(item.intent ?? "")
          ? item.intent
          : "informational") as TopicGap["intent"],
        suggestedAngle: item.suggestedAngle?.trim() ?? "",
        estimatedDifficulty: (["low", "medium", "high"].includes(item.estimatedDifficulty ?? "")
          ? item.estimatedDifficulty
          : "medium") as TopicGap["estimatedDifficulty"],
        reason: item.reason?.trim() ?? ""
      }));
  } catch (error) {
    logSeoEvent("warn", "Anthropic keyword-gap call failed; using deterministic fallback.", {
      topic,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

function buildDeterministicTopicGaps(topic: string): TopicGap[] {
  const templates: Array<{ template: string; intent: TopicGap["intent"]; difficulty: TopicGap["estimatedDifficulty"] }> = [
    { template: `how to use ${topic} on Qubic`, intent: "informational", difficulty: "low" },
    { template: `${topic} vs Ethereum smart contracts`, intent: "comparison", difficulty: "medium" },
    { template: `${topic} tutorial for developers`, intent: "informational", difficulty: "low" },
    { template: `${topic} performance benchmarks`, intent: "informational", difficulty: "medium" },
    { template: `best practices for ${topic}`, intent: "informational", difficulty: "low" },
    { template: `${topic} security considerations`, intent: "informational", difficulty: "low" },
    { template: `troubleshooting ${topic} issues`, intent: "informational", difficulty: "low" },
    { template: `${topic} integration guide`, intent: "informational", difficulty: "medium" }
  ];

  return templates.map(({ template, intent, difficulty }) => ({
    keyword: template,
    intent,
    estimatedDifficulty: difficulty,
    suggestedAngle: `Provide operator-level, source-grounded coverage of ${template} anchored in Qubic docs and first-party references.`,
    reason: `Long-tail variant of "${topic}" likely to have focused search intent but lower competition.`
  }));
}

export interface AnalyzeKeywordGapsInput {
  topic?: string;
  rankingLimit?: number;
}

/**
 * Run the full keyword-gap analysis.
 *  - Always returns ranking gaps (uses search performance rows).
 *  - Optionally returns AI-suggested topic gaps if a topic is supplied.
 */
export async function analyzeKeywordGaps(input: AnalyzeKeywordGapsInput = {}): Promise<KeywordGapReport> {
  const rows = await getSearchPerformanceRows();
  const rankingGaps = computeRankingGaps(rows, input.rankingLimit ?? 20);

  let topicGaps: TopicGap[] = [];
  let provider: "anthropic" | "deterministic" = "deterministic";

  if (input.topic && input.topic.trim().length > 0) {
    const sitePages = await getSitePages();
    const existingTitles = sitePages
      .map((page) => page.title || page.h1 || page.url)
      .filter(Boolean);

    const anthropicResult = await callAnthropicForTopicGaps(input.topic.trim(), existingTitles);
    if (anthropicResult && anthropicResult.length > 0) {
      topicGaps = anthropicResult;
      provider = "anthropic";
    } else {
      topicGaps = buildDeterministicTopicGaps(input.topic.trim());
    }
  }

  return {
    rankingGaps,
    topicGaps,
    totalSearchRowsAnalyzed: rows.length,
    provider,
    generatedAt: new Date().toISOString()
  };
}
