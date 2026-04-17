import type { ContentBrief, ContentQualityCheck, ContentQualityReport, DraftDocument, SourcePack } from "@/features/seo/types";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function splitWords(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function uniqueTerms(value: string) {
  return Array.from(new Set(splitWords(value).filter((term) => term.length > 2)));
}

function similarity(left: string, right: string) {
  const leftTerms = new Set(uniqueTerms(left));
  const rightTerms = new Set(uniqueTerms(right));
  if (leftTerms.size === 0 || rightTerms.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftTerms.forEach((term) => {
    if (rightTerms.has(term)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftTerms.size, rightTerms.size);
}

function estimateSyllables(word: string) {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.length <= 3) {
    return 1;
  }
  const withoutSilentE = normalized.replace(/e$/, "");
  const groups = withoutSilentE.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

function computeReadability(content: string) {
  const sentences = content.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  const words = splitWords(content);
  if (words.length === 0 || sentences.length === 0) {
    return 0;
  }

  const syllables = words.reduce((sum, word) => sum + estimateSyllables(word), 0);
  const flesch = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  return clamp(flesch);
}

function finalizeReport(checks: ContentQualityCheck[]): ContentQualityReport {
  const score = clamp(
    checks.reduce((sum, check) => sum + check.score, 0) / Math.max(checks.length, 1)
  );
  const blockers = checks.filter((check) => check.status === "fail").map((check) => check.label);
  return {
    score,
    passed: blockers.length === 0 && score >= 70,
    blockers,
    checks
  };
}

export type DuplicateCheckContext = {
  opportunityTitles?: string[];
  searchQueries?: string[];
};

function findCorpusDuplicate(candidate: string, lines: string[] | undefined, threshold: number) {
  if (!lines?.length) {
    return null;
  }
  return lines.find((line) => line.trim().length > 0 && similarity(candidate, line) >= threshold) ?? null;
}

export function evaluateBriefQuality(
  brief: ContentBrief,
  sourcePack: SourcePack,
  existingDrafts: DraftDocument[],
  context?: DuplicateCheckContext
) {
  const candidate = `${brief.title} ${brief.objective}`;
  const duplicateDraft = existingDrafts.find(
    (draft) =>
      draft.supportingOpportunityId !== brief.supportingOpportunityId &&
      similarity(`${draft.title} ${draft.summary}`, candidate) >= 0.75
  );
  const duplicateOpportunity =
    !duplicateDraft && context?.opportunityTitles
      ? findCorpusDuplicate(candidate, context.opportunityTitles, 0.72)
      : null;
  const duplicateQuery =
    !duplicateDraft && !duplicateOpportunity && context?.searchQueries
      ? findCorpusDuplicate(candidate, context.searchQueries.map((q) => `query ${q}`), 0.7)
      : null;
  const duplicate =
    duplicateDraft ??
    (duplicateOpportunity ? { title: duplicateOpportunity } : duplicateQuery ? { title: duplicateQuery } : null);
  const outlineCount = brief.outline.length;
  const reviewFlagCount = brief.reviewFlags.length;
  const sourceCount = brief.sources.length;

  const checks: ContentQualityCheck[] = [
    {
      id: "brief-outline-depth",
      label: "Outline depth",
      status: outlineCount >= 4 ? "pass" : outlineCount >= 3 ? "warn" : "fail",
      score: outlineCount >= 4 ? 90 : outlineCount >= 3 ? 70 : 45,
      detail: `Brief has ${outlineCount} outline sections (target: 4+).`
    },
    {
      id: "brief-source-coverage",
      label: "Source coverage",
      status: sourceCount >= 3 ? "pass" : sourceCount >= 2 ? "warn" : "fail",
      score: sourceCount >= 3 ? 92 : sourceCount >= 2 ? 70 : 40,
      detail: `Brief references ${sourceCount} sources (target: 3+).`
    },
    {
      id: "brief-review-safeguards",
      label: "Review safeguards",
      status: reviewFlagCount >= 2 ? "pass" : "warn",
      score: reviewFlagCount >= 2 ? 85 : 65,
      detail: `Brief has ${reviewFlagCount} review flags (target: 2+).`
    },
    {
      id: "brief-duplicate-topic",
      label: "Duplicate topic detection",
      status: duplicate ? "fail" : "pass",
      score: duplicate ? 25 : 92,
      detail: duplicate
        ? duplicateDraft
          ? `Similar draft already exists: "${duplicate.title}".`
          : `Topic overlaps existing opportunity or search corpus: "${duplicate.title}".`
        : "No strongly similar existing draft was detected."
    },
    {
      id: "brief-query-alignment",
      label: "Primary query alignment",
      status: brief.title.toLowerCase().includes(sourcePack.primaryQuery.toLowerCase()) ? "pass" : "warn",
      score: brief.title.toLowerCase().includes(sourcePack.primaryQuery.toLowerCase()) ? 90 : 68,
      detail: "Checks whether title clearly matches the source-pack primary query."
    }
  ];

  return finalizeReport(checks);
}

export function evaluateDraftQuality(
  draft: DraftDocument,
  sourcePack: SourcePack,
  existingDrafts: DraftDocument[],
  context?: DuplicateCheckContext
) {
  const allParagraphs = draft.sections.flatMap((section) => section.paragraphs);
  const content = allParagraphs.join(" ");
  const wordCount = splitWords(content).length;
  const readability = computeReadability(content);
  const queryTerms = uniqueTerms(sourcePack.primaryQuery);
  const contentTerms = splitWords(content);
  const queryMatches =
    queryTerms.length > 0
      ? contentTerms.filter((term) => queryTerms.includes(term)).length
      : 0;
  const queryDensity = contentTerms.length > 0 ? queryMatches / contentTerms.length : 0;
  const draftFingerprint = `${draft.title} ${draft.summary} ${content}`;
  const duplicateDraft = existingDrafts.find(
    (existing) =>
      existing.id !== draft.id &&
      existing.supportingOpportunityId !== draft.supportingOpportunityId &&
      similarity(
        `${existing.title} ${existing.summary} ${existing.sections.flatMap((section) => section.paragraphs).join(" ")}`,
        draftFingerprint
      ) >= 0.78
  );
  const duplicateOpportunity =
    !duplicateDraft && context?.opportunityTitles
      ? findCorpusDuplicate(draftFingerprint, context.opportunityTitles, 0.76)
      : null;
  const duplicateQuery =
    !duplicateDraft && !duplicateOpportunity && context?.searchQueries
      ? findCorpusDuplicate(draftFingerprint, context.searchQueries.map((q) => `query ${q}`), 0.74)
      : null;
  const duplicate =
    duplicateDraft ??
    (duplicateOpportunity ? { title: duplicateOpportunity, id: "corpus" } : duplicateQuery ? { title: duplicateQuery, id: "corpus" } : null);

  const checks: ContentQualityCheck[] = [
    {
      id: "draft-length",
      label: "Minimum content length",
      status: wordCount >= 300 ? "pass" : wordCount >= 240 ? "warn" : "fail",
      score: wordCount >= 300 ? 92 : wordCount >= 240 ? 70 : 35,
      detail: `Draft has ${wordCount} words (target: 300+).`
    },
    {
      id: "draft-heading-depth",
      label: "Section coverage",
      status: draft.sections.length >= 3 ? "pass" : "fail",
      score: draft.sections.length >= 3 ? 90 : 45,
      detail: `Draft has ${draft.sections.length} sections (target: 3+).`
    },
    {
      id: "draft-readability",
      label: "Readability window",
      status: readability >= 50 && readability <= 75 ? "pass" : readability >= 42 && readability <= 82 ? "warn" : "fail",
      score: readability >= 50 && readability <= 75 ? 88 : readability >= 42 && readability <= 82 ? 68 : 38,
      detail: `Estimated Flesch score: ${readability} (target: 50-75).`
    },
    {
      id: "draft-keyword-density",
      label: "Keyword density guardrail",
      status: queryDensity <= 0.04 ? "pass" : queryDensity <= 0.06 ? "warn" : "fail",
      score: queryDensity <= 0.04 ? 90 : queryDensity <= 0.06 ? 65 : 35,
      detail: `Primary query-term density: ${(queryDensity * 100).toFixed(2)}% (target: <=4%).`
    },
    {
      id: "draft-duplicate-topic",
      label: "Duplicate content detection",
      status: duplicate ? "fail" : "pass",
      score: duplicate ? 20 : 92,
      detail: duplicate
        ? duplicateDraft
          ? `Potential overlap with existing draft "${duplicate.title}".`
          : `Potential overlap with opportunity/search corpus: "${duplicate.title}".`
        : "No high-overlap draft detected."
    }
  ];

  return finalizeReport(checks);
}

export class QualityGateError extends Error {
  report: ContentQualityReport;

  constructor(message: string, report: ContentQualityReport) {
    super(message);
    this.name = "QualityGateError";
    this.report = report;
  }
}
