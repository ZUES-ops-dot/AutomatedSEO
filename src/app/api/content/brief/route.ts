import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { generateAndPersistBrief, type PersistedContentInput } from "@/features/seo/server/content-workflows";
import { QualityGateError } from "@/features/seo/server/quality-gates";
import { contentBriefPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-content-brief", max: 25, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, contentBriefPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data as PersistedContentInput & { persist?: boolean; enforceQualityGates?: boolean };
    const result = await generateAndPersistBrief(body, {
      persist: body.persist ?? true,
      enforceQualityGates: body.enforceQualityGates ?? true
    });
    await appendAuditEvent({
      action: "api.content.brief",
      detail: { briefId: result.brief.id, opportunityId: body.opportunityId }
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QualityGateError) {
      return NextResponse.json(
        {
          error: error.message,
          qualityReport: error.report
        },
        { status: 422 }
      );
    }
    return catchToJsonError(error, "Failed to generate brief.");
  }
}
