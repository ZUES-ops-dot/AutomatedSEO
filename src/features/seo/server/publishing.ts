import { mkdir, readFile, writeFile } from "fs/promises";

import { buildLinkPlanForDraft } from "@/features/seo/server/link-engine";
import { appEnv } from "@/features/seo/server/env";
import { getDataPath } from "@/features/seo/server/runtime-paths";
import {
  getContentActionByDraftId,
  getLatestSourcePackForOpportunity,
  getSearchPerformanceRows,
  getStoredDraftById,
  saveConnectorRun,
  saveContentAction,
  savePerformanceSnapshots
} from "@/features/seo/server/storage";
import type { ConnectorRun, ContentAction, ContentPublishTarget, DraftDocument, PerformanceSnapshot, SearchPerformanceRow, SourcePack } from "@/features/seo/types";

const exportDirectory = getDataPath("exports");

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function inferPublishTarget(_requested?: ContentPublishTarget): ContentPublishTarget {
  return "local_markdown";
}

function inferTargetUrls(draft: DraftDocument, sourcePack: SourcePack | null) {
  const derivedSlug = slugify(draft.title);

  if (sourcePack?.targetUrls && sourcePack.targetUrls.length > 0) {
    const specificUrls = sourcePack.targetUrls.filter(
      (url) => !/https:\/\/[^/]+\/?$/i.test(url) && !/docs\.qubic\.org\/?$/i.test(url)
    );

    if (specificUrls.length > 0) {
      return specificUrls;
    }
  }

  const looksLikeBlog = /update|roundup|blog|release|launch|week/i.test(draft.title);
  return [looksLikeBlog ? `${appEnv.primarySiteUrl}/blog-grid/${derivedSlug}` : `${appEnv.primarySiteUrl}/${derivedSlug}`];
}

function buildFrontmatter(draft: DraftDocument, targetUrls: string[]) {
  const slug = slugify(draft.title);
  const lines = [
    "---",
    `title: \"${draft.title.replace(/\"/g, "'")}\"`,
    `slug: \"${slug}\"`,
    `metaTitle: \"${draft.metaTitle.replace(/\"/g, "'")}\"`,
    `metaDescription: \"${draft.metaDescription.replace(/\"/g, "'")}\"`,
    `publishedAt: \"${new Date().toISOString()}\"`,
    `targetUrls: [${targetUrls.map((url) => `\"${url}\"`).join(", ")}]`,
    "---"
  ];

  return lines.join("\n");
}

function buildMarkdownBody(draft: DraftDocument) {
  const sections = draft.sections
    .map((section) => `## ${section.heading}\n\n${section.paragraphs.join("\n\n")}`)
    .join("\n\n");

  const reviewFlags = draft.reviewFlags.length > 0 ? `\n\n## Human review flags\n\n${draft.reviewFlags.map((flag) => `- ${flag}`).join("\n")}` : "";
  const sources = draft.sources.length > 0 ? `\n\n## Sources\n\n${draft.sources.map((source) => `- ${source}`).join("\n")}` : "";

  return `${sections}${reviewFlags}${sources}`.trim();
}

async function writeLocalMarkdown(slug: string, content: string) {
  await mkdir(exportDirectory, { recursive: true });
  const filePath = getDataPath("exports", `${slug}.md`);
  await writeFile(filePath, content, "utf8");
  return filePath;
}

function buildAggregatedSnapshot(actionId: string, url: string, rows: SearchPerformanceRow[], kind: PerformanceSnapshot["kind"]): PerformanceSnapshot {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const weightedPosition = rows.reduce((sum, row) => sum + row.position * Math.max(row.impressions, 1), 0);
  const totalWeight = rows.reduce((sum, row) => sum + Math.max(row.impressions, 1), 0);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const position = totalWeight > 0 ? weightedPosition / totalWeight : 0;
  const capturedAt = new Date().toISOString();

  return {
    id: `snapshot-${actionId}-${slugify(url)}-${kind}-${capturedAt.slice(0, 10)}`,
    actionId,
    url,
    impressions,
    clicks,
    ctr,
    position,
    kind,
    capturedAt
  };
}

function buildRun(status: ConnectorRun["status"], detail: string, recordCount: number, startedAt: string, metadata: ConnectorRun["metadata"]): ConnectorRun {
  return {
    id: `publish-run-${Date.now()}`,
    connectorId: "content-publish",
    provider: "publish",
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    detail,
    recordCount,
    metadata
  };
}

export async function publishDraft(draftId: string, requestedTarget?: ContentPublishTarget) {
  const startedAt = new Date().toISOString();
  const draft = await getStoredDraftById(draftId);

  if (!draft) {
    const run = buildRun("error", `Draft ${draftId} was not found.`, 0, startedAt, { draftId });
    await saveConnectorRun(run);
    throw new Error(`Draft ${draftId} was not found.`);
  }

  const sourcePack = await getLatestSourcePackForOpportunity(draft.supportingOpportunityId);
  const publishTarget = inferPublishTarget(requestedTarget);
  const slug = slugify(draft.title);
  const targetUrls = inferTargetUrls(draft, sourcePack);
  const markdown = `${buildFrontmatter(draft, targetUrls)}\n\n${buildMarkdownBody(draft)}`;
  const linkSuggestions = await buildLinkPlanForDraft(draft.id);
  const actionId = `content-action-${slug}-${draft.id}`;
  const rows = await getSearchPerformanceRows();
  const baselineSnapshots = targetUrls.map((url) =>
    buildAggregatedSnapshot(
      actionId,
      url,
      rows.filter((row) => row.page === url),
      "baseline"
    )
  );

  await savePerformanceSnapshots(baselineSnapshots);

  let markdownPath: string | undefined;
  let detail = `Exported ${draft.title} for review.`;
  markdownPath = await writeLocalMarkdown(slug, markdown);
  detail = `Exported ${draft.title} to ${markdownPath}.`;

  const existingAction = await getContentActionByDraftId(draft.id);
  const action: ContentAction = {
    id: existingAction?.id ?? actionId,
    draftId: draft.id,
    title: draft.title,
    slug,
    publishTarget,
    status: "draft_exported",
    targetUrls,
    markdownPath,
    detail,
    createdAt: existingAction?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    baselineSnapshotIds: baselineSnapshots.map((snapshot) => snapshot.id),
    latestSnapshotIds: existingAction?.latestSnapshotIds ?? [],
    linkSuggestionIds: linkSuggestions.map((suggestion) => suggestion.id)
  };

  await saveContentAction(action);

  const run = buildRun(
    "success",
    detail,
    1,
    startedAt,
    {
      draftId,
      publishTarget,
      targetUrlCount: targetUrls.length
    }
  );

  await saveConnectorRun(run);

  return {
    action,
    linkSuggestions,
    baselineSnapshots,
    markdown
  };
}

export async function getPublishedMarkdown(draftId: string) {
  const action = await getContentActionByDraftId(draftId);
  if (!action?.markdownPath) {
    return null;
  }

  return readFile(action.markdownPath, "utf8");
}
