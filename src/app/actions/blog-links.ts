"use server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { buildBlogLinkDocxBuffer } from "@/features/seo/server/blog-link-docx";
import { buildBlogLinkPack } from "@/features/seo/server/blog-link-pack";
import { appEnv } from "@/features/seo/server/env";

export type BlogLinkSuggestion = {
  id: string;
  targetUrl: string;
  targetTitle: string;
  anchorText: string;
  placement: string;
  reason: string;
  impact: "high" | "medium" | "low";
  score: number;
};

export type BuildBlogLinkPackResult =
  | {
      ok: true;
      suggestions: BlogLinkSuggestion[];
      blogPagesScanned: number;
      crossSiteSuggestions: number;
      blogSiteUrl: string;
      message: string | null;
      target: {
        id: string;
        url: string;
        title: string;
        h1: string;
        wordCount: number;
        lastCrawled: string;
      } | null;
    }
  | { ok: false; error: string };

export async function buildBlogLinkPackAction(
  targetUrl: string,
  options: { recrawl?: boolean; maxPages?: number } = {}
): Promise<BuildBlogLinkPackResult> {
  if (typeof targetUrl !== "string" || targetUrl.trim().length === 0) {
    return { ok: false, error: "Target URL is required." };
  }

  try {
    const pack = await buildBlogLinkPack(targetUrl.trim(), {
      recrawl: options.recrawl ?? false,
      maxPages: options.maxPages ?? 48
    });

    await appendAuditEvent({
      action: "action.blogLinks.buildPack",
      detail: { hasTarget: Boolean(pack.target) }
    });

    return {
      ok: true,
      suggestions: pack.suggestions,
      blogPagesScanned: pack.blogPagesScanned,
      crossSiteSuggestions: pack.crossSiteSuggestions,
      blogSiteUrl: appEnv.blogSiteUrl,
      message: pack.message ?? null,
      target: pack.target
        ? {
            id: pack.target.id,
            url: pack.target.url,
            title: pack.target.title,
            h1: pack.target.h1,
            wordCount: pack.target.wordCount,
            lastCrawled: pack.target.lastCrawled
          }
        : null
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to build blog link pack."
    };
  }
}

function safeFilename(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "blog-link-pack"
  );
}

export type DownloadBlogLinkDocxResult =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string };

export async function downloadBlogLinkDocxAction(
  targetUrl: string,
  options: { recrawl?: boolean; maxPages?: number } = {}
): Promise<DownloadBlogLinkDocxResult> {
  if (typeof targetUrl !== "string" || targetUrl.trim().length === 0) {
    return { ok: false, error: "Target URL is required." };
  }

  try {
    const pack = await buildBlogLinkPack(targetUrl.trim(), {
      recrawl: options.recrawl ?? false,
      maxPages: options.maxPages ?? 48
    });

    if (!pack.target) {
      return { ok: false, error: pack.message ?? "No blog page found for that URL." };
    }

    const buffer = await buildBlogLinkDocxBuffer(pack.target, pack.suggestions);
    const name = safeFilename(pack.target.title || pack.target.h1 || "blog-post");

    await appendAuditEvent({
      action: "action.blogLinks.docx",
      detail: { title: pack.target.title }
    });

    return {
      ok: true,
      filename: `${name}-links.docx`,
      base64: Buffer.from(buffer).toString("base64")
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to generate DOCX."
    };
  }
}
