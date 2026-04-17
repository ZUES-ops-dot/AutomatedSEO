"use server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { buildLongFormDocx, generateLongFormArticle, type LongFormArticle } from "@/features/seo/server/long-form-generator";

export type GenerateLongFormResult =
  | { ok: true; article: LongFormArticle }
  | { ok: false; error: string };

export async function generateLongFormArticleAction(input: {
  topic: string;
  primaryKeyword?: string;
  targetWordCount?: number;
  audience?: string;
  angle?: string;
}): Promise<GenerateLongFormResult> {
  if (typeof input.topic !== "string" || input.topic.trim().length === 0) {
    return { ok: false, error: "Topic is required." };
  }

  try {
    const article = await generateLongFormArticle({
      topic: input.topic.trim(),
      primaryKeyword: input.primaryKeyword?.trim() || undefined,
      targetWordCount: input.targetWordCount && input.targetWordCount > 0 ? Math.min(Math.max(input.targetWordCount, 500), 6000) : 2500,
      audience: input.audience?.trim() || undefined,
      angle: input.angle?.trim() || undefined
    });

    await appendAuditEvent({
      action: "action.longForm.generate",
      detail: {
        topic: input.topic,
        wordCount: article.wordCount,
        internalLinkCount: article.internalLinkCount,
        provider: article.provider
      }
    });

    return { ok: true, article };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to generate article."
    };
  }
}

export type DownloadLongFormDocxResult =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string };

function safeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "qubic-article"
  );
}

export async function downloadLongFormDocxAction(article: LongFormArticle): Promise<DownloadLongFormDocxResult> {
  if (!article || !article.title) {
    return { ok: false, error: "Article is required." };
  }

  try {
    const buffer = await buildLongFormDocx(article);
    const filename = `${safeFilename(article.title)}.docx`;

    await appendAuditEvent({
      action: "action.longForm.docx",
      detail: { title: article.title, wordCount: article.wordCount }
    });

    return {
      ok: true,
      filename,
      base64: Buffer.from(buffer).toString("base64")
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to generate DOCX."
    };
  }
}
