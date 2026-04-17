import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { buildBlogLinkDocxBuffer } from "@/features/seo/server/blog-link-docx";
import { buildBlogLinkPack } from "@/features/seo/server/blog-link-pack";
import { blogLinkPackPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

function safeFilename(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "blog-link-pack"
  );
}

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-blog-links-docx", max: 15, windowMs: 60_000 });
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

    if (!pack.target) {
      return NextResponse.json(
        { error: pack.message ?? "No blog page found for that URL." },
        { status: 400 }
      );
    }

    const buffer = await buildBlogLinkDocxBuffer(pack.target, pack.suggestions);
    const name = safeFilename(pack.target.title || pack.target.h1 || "blog-post");

    await appendAuditEvent({ action: "api.blogLinks.docx", detail: { title: pack.target.title } });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}-links.docx"`
      }
    });
  } catch (error) {
    return catchToJsonError(error, "Failed to generate DOCX.");
  }
}
