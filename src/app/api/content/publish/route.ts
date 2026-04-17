import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { publishDraft } from "@/features/seo/server/publishing";
import { contentPublishPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-content-publish", max: 20, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, contentPublishPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data;
    const result = await publishDraft(body.draftId, body.target);
    await appendAuditEvent({ action: "api.content.publish", detail: { draftId: body.draftId, target: body.target } });
    return NextResponse.json(result);
  } catch (error) {
    return catchToJsonError(error, "Failed to publish draft.");
  }
}
