import type { Opportunity, OpportunityAction, OpportunityCandidate, PriorityBand } from "@/features/seo/types";

const weights = {
  businessRelevance: 0.2,
  demandSignal: 0.15,
  ctrGap: 0.15,
  freshnessNeed: 0.1,
  uniquenessPotential: 0.15,
  enrichmentAvailable: 0.1,
  internalLinkSupport: 0.1,
  cannibalizationRisk: -0.15,
  difficultyGap: -0.1
};

export function computeWeightedScore(candidate: OpportunityCandidate) {
  const rawScore =
    candidate.businessRelevance * weights.businessRelevance +
    candidate.demandSignal * weights.demandSignal +
    candidate.ctrGap * weights.ctrGap +
    candidate.freshnessNeed * weights.freshnessNeed +
    candidate.uniquenessPotential * weights.uniquenessPotential +
    candidate.enrichmentAvailable * weights.enrichmentAvailable +
    candidate.internalLinkSupport * weights.internalLinkSupport +
    candidate.cannibalizationRisk * weights.cannibalizationRisk +
    candidate.difficultyGap * weights.difficultyGap;

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

export function decideAction(candidate: OpportunityCandidate): OpportunityAction {
  if (
    candidate.demandTooWeak ||
    candidate.competitionTooStrong ||
    candidate.limitedUniqueValue ||
    candidate.offStrategy
  ) {
    return "skip";
  }

  if (candidate.overlappingPages && candidate.strongerCanonicalExists) {
    return "merge";
  }

  if (
    candidate.existingPageTargetsIntent &&
    (candidate.rankingButUnderperforming || candidate.ctrWeak || candidate.staleOrMissingSubtopics)
  ) {
    return "refresh";
  }

  if (
    candidate.risingTopic &&
    candidate.commentaryAddsValue &&
    candidate.firstPartyContextAvailable
  ) {
    return "new_relevant_blog";
  }

  if (
    candidate.repeatedIntent &&
    candidate.noCurrentPageMapsCleanly &&
    (candidate.evergreenBetterThanBlog || candidate.supportsPriorityCluster)
  ) {
    return "new_support_page";
  }

  if (candidate.repeatedIntent && candidate.noCurrentPageMapsCleanly) {
    return "new_support_page";
  }

  return "skip";
}

export function getPriorityBand(score: number): PriorityBand {
  if (score >= 80) {
    return "do_now";
  }

  if (score >= 65) {
    return "queue";
  }

  if (score >= 50) {
    return "backlog";
  }

  return "deferred";
}

export function computeConfidenceScore(candidate: OpportunityCandidate) {
  const positiveSignals =
    (candidate.uniquenessPotential +
      candidate.enrichmentAvailable +
      candidate.businessRelevance +
      candidate.demandSignal) /
    4;

  const drag = (candidate.cannibalizationRisk + candidate.difficultyGap) / 5;

  return Math.max(0, Math.min(100, Math.round(positiveSignals - drag)));
}

export function enrichOpportunity(candidate: OpportunityCandidate): Opportunity {
  const score = computeWeightedScore(candidate);

  return {
    ...candidate,
    recommendedAction: decideAction(candidate),
    score,
    confidenceScore: computeConfidenceScore(candidate),
    priorityBand: getPriorityBand(score)
  };
}
