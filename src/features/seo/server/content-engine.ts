import { contentBriefs, contentIdeas, drafts, opportunities } from "@/features/seo/data/demo-data";
import { getConnectorRuntimeById } from "@/features/seo/server/connectors";
import { appEnv } from "@/features/seo/server/env";
import { HTTP_CLIENT } from "@/features/seo/server/seo-constants";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { logSeoEvent } from "@/lib/seo-log";
import { getStoredBriefById, getStoredDraftById, getStoredOpportunities } from "@/features/seo/server/storage";
import type {
  ContentBrief,
  ContentQualityReport,
  DraftDocument,
  GeneratedBriefResult,
  GeneratedDraftResult,
  GenerationProvider,
  Opportunity,
  SourcePack,
  SourcePackSource
} from "@/features/seo/types";

export interface ContentEngineInput {
  topic?: string;
  opportunityId?: string;
  briefId?: string;
  draftId?: string;
  provider?: GenerationProvider["provider"];
}

interface BriefModelOutput {
  title: string;
  format: string;
  objective: string;
  audience: string;
  outline: string[];
  sources: string[];
  reviewFlags: string[];
}

interface DraftModelOutput {
  title: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  reviewFlags: string[];
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
}

const connectorBySourceType: Record<string, string[]> = {
  search_console: ["search-console"],
  docs_crawl: ["docs-crawl"],
  internal_link_graph: ["site-crawl"],
  community_signal: ["rss-watch", "gdelt"],
  gdelt: ["gdelt"],
  site_crawl: ["site-crawl"],
  keyword_import: ["csv-imports"],
  search_gap_review: ["search-console"],
  ecosystem_page_changes: ["rss-watch", "site-crawl"]
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function findOpportunity(input: ContentEngineInput): Opportunity {
  if (input.opportunityId) {
    const direct = opportunities.find((item) => item.id === input.opportunityId);
    if (direct) {
      return direct;
    }
  }

  if (input.briefId) {
    const brief = contentBriefs.find((item) => item.id === input.briefId);
    if (brief) {
      return findOpportunity({ opportunityId: brief.supportingOpportunityId });
    }
  }

  if (input.draftId) {
    const draft = drafts.find((item) => item.id === input.draftId);
    if (draft) {
      return findOpportunity({ opportunityId: draft.supportingOpportunityId });
    }
  }

  const topicSearch = input.topic?.trim();
  if (topicSearch) {
    const normalizedTopic = topicSearch.toLowerCase();
    const byTopic = opportunities.find(
      (item) =>
        item.title.toLowerCase().includes(normalizedTopic) ||
        item.cluster.toLowerCase().includes(normalizedTopic) ||
        item.primaryQuery.toLowerCase().includes(normalizedTopic)
    );

    if (byTopic) {
      return byTopic;
    }
  }

  return opportunities[0];
}

async function resolveOpportunity(input: ContentEngineInput): Promise<Opportunity> {
  const fromSeeded = findOpportunity(input);
  if (
    !input.opportunityId ||
    fromSeeded.id === input.opportunityId ||
    opportunities.some((item) => item.id === input.opportunityId)
  ) {
    return fromSeeded;
  }

  const stored = await getStoredOpportunities();
  const direct = stored.find((item) => item.id === input.opportunityId);
  if (direct) {
    return direct;
  }

  const normalizedTopic = input.topic?.trim().toLowerCase();
  if (normalizedTopic) {
    const byTopic = stored.find(
      (item) =>
        item.title.toLowerCase().includes(normalizedTopic) ||
        item.cluster.toLowerCase().includes(normalizedTopic) ||
        item.primaryQuery.toLowerCase().includes(normalizedTopic)
    );
    if (byTopic) {
      return byTopic;
    }
  }

  return fromSeeded;
}

function findIdeaForOpportunity(opportunityId: string) {
  return contentIdeas.find((item) => item.relatedOpportunityId === opportunityId) ?? null;
}

function findBriefForOpportunity(opportunityId: string, briefId?: string) {
  if (briefId) {
    const direct = contentBriefs.find((item) => item.id === briefId);
    if (direct) {
      return direct;
    }
  }

  return contentBriefs.find((item) => item.supportingOpportunityId === opportunityId) ?? null;
}

function findDraftForOpportunity(opportunityId: string, draftId?: string) {
  if (draftId) {
    const direct = drafts.find((item) => item.id === draftId);
    if (direct) {
      return direct;
    }
  }

  return drafts.find((item) => item.supportingOpportunityId === opportunityId) ?? null;
}

function connectorSourcesForOpportunity(opportunity: Opportunity): SourcePackSource[] {
  const connectorIds = uniqueValues(
    opportunity.sourceTypes.flatMap((sourceType) => connectorBySourceType[sourceType] ?? [])
  );

  return connectorIds
    .map((connectorId) => getConnectorRuntimeById(connectorId))
    .filter((connector): connector is NonNullable<typeof connector> => connector !== null)
    .map((connector) => ({
      id: connector.id,
      type: "connector",
      title: connector.name,
      summary: connector.description,
      evidence: connector.outputs
    }));
}

export async function buildSourcePack(input: ContentEngineInput): Promise<SourcePack> {
  const storedBrief = input.briefId ? await getStoredBriefById(input.briefId) : null;
  const storedDraft = input.draftId ? await getStoredDraftById(input.draftId) : null;
  const opportunity = await resolveOpportunity({
    ...input,
    opportunityId:
      input.opportunityId ?? storedBrief?.supportingOpportunityId ?? storedDraft?.supportingOpportunityId
  });
  const idea = findIdeaForOpportunity(opportunity.id);
  const brief = storedBrief ?? findBriefForOpportunity(opportunity.id, input.briefId);
  const draft = storedDraft ?? findDraftForOpportunity(opportunity.id, input.draftId);

  const sources: SourcePackSource[] = [
    {
      id: opportunity.id,
      type: "opportunity",
      title: opportunity.title,
      summary: opportunity.reason,
      evidence: opportunity.evidence
    },
    ...(idea
      ? [
          {
            id: idea.id,
            type: "idea" as const,
            title: idea.title,
            summary: idea.angle,
            evidence: idea.sources
          }
        ]
      : []),
    ...(brief
      ? [
          {
            id: brief.id,
            type: "brief" as const,
            title: brief.title,
            summary: brief.objective,
            evidence: brief.sources
          }
        ]
      : []),
    ...(draft
      ? [
          {
            id: draft.id,
            type: "draft" as const,
            title: draft.title,
            summary: draft.summary,
            evidence: draft.sources
          }
        ]
      : []),
    ...connectorSourcesForOpportunity(opportunity)
  ];

  const citations = uniqueValues([
    ...opportunity.evidence,
    ...(idea?.sources ?? []),
    ...(brief?.sources ?? []),
    ...(draft?.sources ?? []),
    ...sources.flatMap((source) => source.evidence)
  ]);

  const reviewChecklist = uniqueValues([
    "[HUMAN REQUIRED: verify all factual Qubic claims against official docs or RPC data]",
    "[HUMAN REQUIRED: confirm final internal-link targets before publishing]",
    ...(brief?.reviewFlags ?? []),
    ...(draft?.reviewFlags ?? [])
  ]);

  return {
    id: `source-pack-${slugify(opportunity.id)}`,
    topic: idea?.title ?? opportunity.title,
    angle: idea?.angle ?? opportunity.reason,
    objective: brief?.objective ?? `Support ${opportunity.cluster} with a grounded ${opportunity.pageType} asset.`,
    primaryQuery: opportunity.primaryQuery,
    targetUrls: opportunity.affectedUrls,
    supportingOpportunityId: opportunity.id,
    sources,
    citations,
    reviewChecklist,
    generatedAt: new Date().toISOString()
  };
}

function resolveProvider(preferred?: GenerationProvider["provider"]): GenerationProvider {
  if (preferred === "anthropic" && appEnv.anthropicApiKey.length > 0) {
    return {
      provider: "anthropic",
      model: appEnv.anthropicModel,
      live: true
    };
  }

  if (appEnv.anthropicApiKey.length > 0) {
    return {
      provider: "anthropic",
      model: appEnv.anthropicModel,
      live: true
    };
  }

  return {
    provider: "deterministic",
    model: "local-template",
    live: false
  };
}

function buildDeterministicBrief(sourcePack: SourcePack): ContentBrief {
  const sections = sourcePack.sources
    .slice(0, 4)
    .map((source) => `Translate ${source.title.toLowerCase()} into a reviewable section with source-backed claims.`);

  return {
    id: `brief-${slugify(sourcePack.supportingOpportunityId)}`,
    title: sourcePack.topic,
    format: sourcePack.targetUrls.length > 1 ? "Relevant blog" : "Support page",
    objective: sourcePack.objective,
    audience: "People evaluating or using Qubic who need accurate, source-backed guidance.",
    supportingOpportunityId: sourcePack.supportingOpportunityId,
    outline: [
      `Open with the operator angle behind \"${sourcePack.primaryQuery}\".`,
      ...sections,
      "Close with concrete next steps and cluster-aware internal links."
    ],
    sources: sourcePack.citations.slice(0, 6),
    reviewFlags: sourcePack.reviewChecklist
  };
}

function buildDeterministicDraft(sourcePack: SourcePack, brief: ContentBrief): DraftDocument {
  const sections = brief.outline.slice(0, 4).map((item, index) => ({
    heading: index === 0 ? "Why this topic matters now" : `Section ${index + 1}`,
    paragraphs: [
      `${item} This section should stay anchored to the evidence in the source pack rather than generic crypto language. Explain what changed recently, who the guidance is for, and what practical decision the reader should make after reading this section. Keep claims concrete and tie each claim to one of the supplied citations before moving to the next recommendation.`,
      `Use ${sourcePack.primaryQuery} naturally while linking back to ${sourcePack.targetUrls[0] ?? appEnv.primarySiteUrl} and adjacent canonical pages. Call out one implementation detail, one risk if readers ignore the recommendation, and one short checklist item so editors can verify technical accuracy during human review.`,
      `Close with a short transition that connects this section to the wider ${sourcePack.topic} cluster. Mention where this page fits relative to existing docs or landing pages, and include a reminder that any unresolved factual statement must be replaced with verified first-party wording before publication.`
    ]
  }));

  return {
    id: `draft-${slugify(sourcePack.supportingOpportunityId)}`,
    title: brief.title,
    status: "review_required",
    supportingOpportunityId: sourcePack.supportingOpportunityId,
    summary: `${brief.objective} The draft is intentionally grounded in the current source pack for editorial review.`,
    metaTitle: `${brief.title} | ${appEnv.appName}`.slice(0, 60),
    metaDescription: `Review a grounded draft for ${sourcePack.primaryQuery} with first-party Qubic context and clear next steps.`.slice(0, 155),
    sources: brief.sources,
    reviewFlags: brief.reviewFlags,
    sections
  };
}

async function callAnthropic(system: string, prompt: string) {
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
        max_tokens: 1400,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    },
    HTTP_CLIENT.llmTimeoutMs
  );

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };

  const text =
    data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    throw new Error("Anthropic returned an empty response.");
  }

  return text;
}

function extractJsonBlock<T>(value: string) {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const jsonMatch = trimmed.match(/\{[\s\S]*\}$/)?.[0];

  for (const candidate of [trimmed, fencedMatch, jsonMatch]) {
    if (!candidate) {
      continue;
    }

    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  return null;
}

async function requestJsonGeneration<T>(
  provider: GenerationProvider,
  system: string,
  prompt: string,
  fallback: T
) {
  if (provider.provider === "deterministic") {
    return fallback;
  }

  try {
    const text = await callAnthropic(system, prompt);
    return extractJsonBlock<T>(text) ?? fallback;
  } catch (error) {
    logSeoEvent("warn", "JSON generation request failed; using deterministic fallback.", {
      provider: provider.provider,
      error: error instanceof Error ? error.message : String(error)
    });
    return fallback;
  }
}

function normalizeBriefOutput(output: BriefModelOutput, sourcePack: SourcePack, fallback: ContentBrief): ContentBrief {
  return {
    id: fallback.id,
    title: output.title?.trim() || fallback.title,
    format: output.format?.trim() || fallback.format,
    objective: output.objective?.trim() || fallback.objective,
    audience: output.audience?.trim() || fallback.audience,
    supportingOpportunityId: sourcePack.supportingOpportunityId,
    outline: output.outline?.filter(Boolean)?.slice(0, 8) ?? fallback.outline,
    sources: uniqueValues([...(output.sources ?? []), ...fallback.sources]).slice(0, 8),
    reviewFlags: uniqueValues([...(output.reviewFlags ?? []), ...fallback.reviewFlags])
  };
}

function normalizeDraftOutput(output: DraftModelOutput, sourcePack: SourcePack, fallback: DraftDocument): DraftDocument {
  return {
    id: fallback.id,
    title: output.title?.trim() || fallback.title,
    status: "review_required",
    supportingOpportunityId: sourcePack.supportingOpportunityId,
    summary: output.summary?.trim() || fallback.summary,
    metaTitle: output.metaTitle?.trim() || fallback.metaTitle,
    metaDescription: output.metaDescription?.trim() || fallback.metaDescription,
    sources: fallback.sources,
    reviewFlags: uniqueValues([...(output.reviewFlags ?? []), ...fallback.reviewFlags]),
    sections:
      output.sections?.length > 0
        ? output.sections
            .filter((section) => section.heading?.trim() && section.paragraphs?.length > 0)
            .slice(0, 6)
        : fallback.sections
  };
}

const defaultQualityReport: ContentQualityReport = {
  score: 0,
  passed: false,
  blockers: [],
  checks: []
};

export function getContentEngineStatus() {
  const provider = resolveProvider();

  return {
    provider,
    anthropicConfigured: appEnv.anthropicApiKey.length > 0,
    primarySiteUrl: appEnv.primarySiteUrl,
    docsSiteUrl: appEnv.docsSiteUrl,
    qubicRpcBaseUrl: appEnv.qubicRpcBaseUrl
  };
}

export async function generateBriefFromSourcePack(
  sourcePack: SourcePack,
  preferredProvider?: GenerationProvider["provider"]
): Promise<GeneratedBriefResult> {
  const provider = resolveProvider(preferredProvider);
  const fallback = buildDeterministicBrief(sourcePack);

  const output = await requestJsonGeneration<BriefModelOutput>(
    provider,
    "You generate structured SEO content briefs for the Qubic website. Only use evidence already present in the supplied source pack. Return JSON only.",
    JSON.stringify(
      {
        task: "Create a structured content brief.",
        sourcePack,
        requiredShape: {
          title: "string",
          format: "string",
          objective: "string",
          audience: "string",
          outline: ["string"],
          sources: ["string"],
          reviewFlags: ["string"]
        }
      },
      null,
      2
    ),
    {
      title: fallback.title,
      format: fallback.format,
      objective: fallback.objective,
      audience: fallback.audience,
      outline: fallback.outline,
      sources: fallback.sources,
      reviewFlags: fallback.reviewFlags
    }
  );

  return {
    brief: normalizeBriefOutput(output, sourcePack, fallback),
    sourcePack,
    provider,
    qualityReport: defaultQualityReport
  };
}

export async function generateBrief(input: ContentEngineInput): Promise<GeneratedBriefResult> {
  const sourcePack = await buildSourcePack(input);
  return generateBriefFromSourcePack(sourcePack, input.provider);
}

export async function generateDraftFromSourcePack(
  sourcePack: SourcePack,
  preferredProvider?: GenerationProvider["provider"]
): Promise<GeneratedDraftResult> {
  const provider = resolveProvider(preferredProvider);
  const baseBrief = buildDeterministicBrief(sourcePack);
  const fallback = buildDeterministicDraft(sourcePack, baseBrief);

  const output = await requestJsonGeneration<DraftModelOutput>(
    provider,
    "You generate grounded website/blog drafts for Qubic. Only use evidence already present in the supplied source pack and brief. Return JSON only.",
    JSON.stringify(
      {
        task: "Create a review-ready draft.",
        sourcePack,
        brief: baseBrief,
        requiredShape: {
          title: "string",
          summary: "string",
          metaTitle: "string",
          metaDescription: "string",
          reviewFlags: ["string"],
          sections: [
            {
              heading: "string",
              paragraphs: ["string"]
            }
          ]
        }
      },
      null,
      2
    ),
    {
      title: fallback.title,
      summary: fallback.summary,
      metaTitle: fallback.metaTitle,
      metaDescription: fallback.metaDescription,
      reviewFlags: fallback.reviewFlags,
      sections: fallback.sections
    }
  );

  return {
    draft: normalizeDraftOutput(output, sourcePack, fallback),
    sourcePack,
    provider,
    qualityReport: defaultQualityReport
  };
}
