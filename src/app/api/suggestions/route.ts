import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { generateOpportunityFeed } from "@/features/seo/server/opportunity-engine";
import { updateStoredOpportunityStatus } from "@/features/seo/server/storage";
import { getSuggestionsData } from "@/features/seo/server/views";
import { parseJsonBody, suggestionPatchSchema } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError, jsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, { namespace: "api-suggestions-get", max: 90, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  try {
    return NextResponse.json(await getSuggestionsData());
  } catch (error) {
    return catchToJsonError(error, "Failed to load suggestions.");
  }
}

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-suggestions-post", max: 20, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  try {
    const payload = await generateOpportunityFeed({ persist: true });
    await appendAuditEvent({ action: "api.suggestions.regenerate", detail: {} });
    return NextResponse.json(payload);
  } catch (error) {
    return catchToJsonError(error, "Failed to regenerate opportunities.");
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-suggestions-patch", max: 40, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, suggestionPatchSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data;

    const updated = await updateStoredOpportunityStatus(body.id, body.status);
    if (!updated) {
      return jsonError(`Opportunity ${body.id} was not found.`, 404);
    }

    await appendAuditEvent({
      action: "api.suggestions.patch",
      detail: { id: body.id, status: body.status }
    });
    return NextResponse.json(updated);
  } catch (error) {
    return catchToJsonError(error, "Failed to update opportunity.");
  }
}
