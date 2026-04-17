import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { buildBlogLinkPack, searchBlogPages } from "@/features/seo/server/blog-link-pack";
import { appEnv } from "@/features/seo/server/env";
import { getSitePages } from "@/features/seo/server/storage";
import { blogLinkPackPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, { namespace: "api-blog-links-get", max: 90, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const blogPages = await getSitePages("blog");
    const pages = searchBlogPages(blogPages, q);

    return NextResponse.json({
      blogSiteUrl: appEnv.blogSiteUrl,
      count: blogPages.length,
      pages: pages.map((p) => ({
        id: p.id,
        url: p.url,
        title: p.title,
        h1: p.h1,
        lastCrawled: p.lastCrawled,
        wordCount: p.wordCount
      }))
    });
  } catch (error) {
    return catchToJsonError(error, "Failed to search blog pages.");
  }
}

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-blog-links-post", max: 20, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, blogLinkPackPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data;

    const targetUrl = typeof body.targetUrl === "string" ? body.targetUrl : "";
    const pack = await buildBlogLinkPack(targetUrl, {
      recrawl: body.recrawl ?? false,
      maxPages: body.maxPages
    });

    await appendAuditEvent({
      action: "api.blogLinks.buildPack",
      detail: { hasTarget: Boolean(pack.target) }
    });

    return NextResponse.json({
      blogSiteUrl: appEnv.blogSiteUrl,
      ...pack,
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
    });
  } catch (error) {
    return catchToJsonError(error, "Failed to build blog link pack.");
  }
}
