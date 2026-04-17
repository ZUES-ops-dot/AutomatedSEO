import {
  buildSourcePack,
  generateBriefFromSourcePack,
  generateDraftFromSourcePack,
  type ContentEngineInput
} from "@/features/seo/server/content-engine";
import {
  getContentStudioData,
  getSearchPerformanceRows,
  getStoredBriefById,
  getStoredDraftById,
  getStoredOpportunities,
  getStoredSourcePackById,
  saveBrief,
  saveDraft,
  saveSourcePack
} from "@/features/seo/server/storage";
import {
  evaluateBriefQuality,
  evaluateDraftQuality,
  type DuplicateCheckContext,
  QualityGateError
} from "@/features/seo/server/quality-gates";
import type {
  ContentBrief,
  DraftDocument,
  GeneratedBriefResult,
  GeneratedDraftResult,
  SearchPerformanceRow,
  SourcePack,
  SourcePackSource
} from "@/features/seo/types";

export interface PersistedContentInput extends ContentEngineInput {
  sourcePackId?: string;
}

interface WorkflowOptions {
  persist?: boolean;
  enforceQualityGates?: boolean;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildSearchSignalEvidence(row: SearchPerformanceRow) {
  return [
    `Provider: ${row.provider}`,
    `Page: ${row.page}`,
    `Clicks: ${row.clicks}`,
    `Impressions: ${row.impressions}`,
    `CTR: ${(row.ctr * 100).toFixed(2)}%`,
    `Average position: ${row.position.toFixed(1)}`,
    `Captured: ${row.capturedAt}`
  ];
}

function toSearchSignalSource(row: SearchPerformanceRow): SourcePackSource {
  return {
    id: row.id,
    type: "search_signal",
    title: `Search signal: ${row.query}`,
    summary: `Observed performance for ${row.query} on ${row.page}.`,
    evidence: buildSearchSignalEvidence(row)
  };
}

function pickMatchingSearchSignals(sourcePack: SourcePack, rows: SearchPerformanceRow[]) {
  const primaryQuery = sourcePack.primaryQuery.trim().toLowerCase();
  if (!primaryQuery) {
    return rows.filter((row) => sourcePack.targetUrls.includes(row.page)).slice(0, 5);
  }

  return rows
    .filter((row) => {
      const query = row.query.toLowerCase();
      return query.includes(primaryQuery) || primaryQuery.includes(query) || sourcePack.targetUrls.includes(row.page);
    })
    .slice(0, 5);
}

function enrichSourcePack(baseSourcePack: SourcePack, matchedRows: SearchPerformanceRow[]): SourcePack {
  if (matchedRows.length === 0) {
    return baseSourcePack;
  }

  const signalSources = matchedRows.map(toSearchSignalSource);

  return {
    ...baseSourcePack,
    sources: [...baseSourcePack.sources, ...signalSources],
    citations: uniqueValues([
      ...baseSourcePack.citations,
      ...matchedRows.map((row) => `${row.query} -> ${row.page}`)
    ]),
    reviewChecklist: uniqueValues([
      ...baseSourcePack.reviewChecklist,
      "[HUMAN REQUIRED: confirm that query-to-page matches still reflect current site intent]"
    ]),
    generatedAt: new Date().toISOString()
  };
}

async function buildDuplicateContext(): Promise<DuplicateCheckContext> {
  const [opportunities, rows] = await Promise.all([getStoredOpportunities(), getSearchPerformanceRows()]);
  return {
    opportunityTitles: opportunities.map((item) => item.title),
    searchQueries: rows.map((item) => item.query)
  };
}

function addArtifactSource(
  sourcePack: SourcePack,
  artifact: ContentBrief | DraftDocument | null,
  type: "brief" | "draft"
) {
  if (!artifact || sourcePack.sources.some((source) => source.id === artifact.id)) {
    return sourcePack;
  }

  return {
    ...sourcePack,
    sources: [
      ...sourcePack.sources,
      {
        id: artifact.id,
        type,
        title: artifact.title,
        summary: "objective" in artifact ? artifact.objective : artifact.summary,
        evidence: artifact.sources
      }
    ],
    citations: uniqueValues([...sourcePack.citations, ...artifact.sources]),
    reviewChecklist:
      "reviewFlags" in artifact
        ? uniqueValues([...sourcePack.reviewChecklist, ...artifact.reviewFlags])
        : sourcePack.reviewChecklist
  };
}

async function resolveBaseSourcePack(input: PersistedContentInput) {
  if (input.sourcePackId) {
    const storedSourcePack = await getStoredSourcePackById(input.sourcePackId);
    if (storedSourcePack) {
      return storedSourcePack;
    }
  }

  const storedBrief = input.briefId ? await getStoredBriefById(input.briefId) : null;
  const storedDraft = input.draftId ? await getStoredDraftById(input.draftId) : null;
  const normalizedInput: ContentEngineInput = {
    ...input,
    opportunityId:
      input.opportunityId ?? storedBrief?.supportingOpportunityId ?? storedDraft?.supportingOpportunityId,
    briefId: storedBrief ? undefined : input.briefId,
    draftId: storedDraft ? undefined : input.draftId
  };

  const baseSourcePack = await buildSourcePack(normalizedInput);
  return addArtifactSource(addArtifactSource(baseSourcePack, storedBrief, "brief"), storedDraft, "draft");
}

export async function buildWorkflowSourcePack(input: PersistedContentInput, options: WorkflowOptions = {}) {
  const baseSourcePack = await resolveBaseSourcePack(input);
  const storedRows = await getSearchPerformanceRows();
  const enrichedSourcePack = enrichSourcePack(baseSourcePack, pickMatchingSearchSignals(baseSourcePack, storedRows));

  if (options.persist ?? true) {
    await saveSourcePack(enrichedSourcePack);
  }

  return enrichedSourcePack;
}

export async function generateAndPersistBrief(
  input: PersistedContentInput,
  options: WorkflowOptions = {}
): Promise<GeneratedBriefResult> {
  const sourcePack = await buildWorkflowSourcePack(input, options);
  const result = await generateBriefFromSourcePack(sourcePack, input.provider);
  const [studio, duplicateContext] = await Promise.all([getContentStudioData(), buildDuplicateContext()]);
  const qualityReport = evaluateBriefQuality(result.brief, sourcePack, studio.drafts, duplicateContext);
  if ((options.enforceQualityGates ?? true) && !qualityReport.passed) {
    throw new QualityGateError("Brief failed quality gates.", qualityReport);
  }

  if (options.persist ?? true) {
    await saveBrief(result.brief);
  }

  return {
    ...result,
    qualityReport
  };
}

export async function generateAndPersistDraft(
  input: PersistedContentInput,
  options: WorkflowOptions = {}
): Promise<GeneratedDraftResult> {
  const sourcePack = await buildWorkflowSourcePack(input, options);
  const result = await generateDraftFromSourcePack(sourcePack, input.provider);
  const [studio, duplicateContext] = await Promise.all([getContentStudioData(), buildDuplicateContext()]);
  const qualityReport = evaluateDraftQuality(result.draft, sourcePack, studio.drafts, duplicateContext);
  if ((options.enforceQualityGates ?? true) && !qualityReport.passed) {
    throw new QualityGateError("Draft failed quality gates.", qualityReport);
  }

  if (options.persist ?? true) {
    await saveDraft(result.draft);
  }

  return {
    ...result,
    qualityReport
  };
}
