import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { analyzeKeywordGaps } from "@/features/seo/server/keyword-gaps";
import { keywordGapPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-keyword-gaps-post", max: 20, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, keywordGapPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data;
    const report = await analyzeKeywordGaps({
      topic: body.topic?.trim() || undefined,
      rankingLimit: body.rankingLimit && body.rankingLimit > 0 ? Math.min(body.rankingLimit, 100) : 20
    });

    await appendAuditEvent({
      action: "api.keywordGaps.analyze",
      detail: {
        topic: body.topic ?? null,
        rankingGaps: report.rankingGaps.length,
        topicGaps: report.topicGaps.length,
        provider: report.provider
      }
    });

    return NextResponse.json({ report });
  } catch (error) {
    return catchToJsonError(error, "Failed to analyze keyword gaps.");
  }
}
