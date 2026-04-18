import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { generateLongFormArticle } from "@/features/seo/server/long-form-generator";
import { longFormPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-long-form-post", max: 12, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, longFormPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data;
    const article = await generateLongFormArticle({
      topic: body.topic.trim(),
      primaryKeyword: body.primaryKeyword?.trim() || undefined,
      targetWordCount: body.targetWordCount && body.targetWordCount > 0 ? Math.min(Math.max(body.targetWordCount, 500), 6000) : 2500,
      audience: body.audience?.trim() || undefined,
      angle: body.angle?.trim() || undefined
    });

    await appendAuditEvent({
      action: "api.longForm.generate",
      detail: {
        topic: body.topic,
        wordCount: article.wordCount,
        internalLinkCount: article.internalLinkCount,
        provider: article.provider
      }
    });

    return NextResponse.json({ article });
  } catch (error) {
    return catchToJsonError(error, "Failed to generate article.");
  }
}
