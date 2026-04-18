import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { buildWorkflowSourcePack, type PersistedContentInput } from "@/features/seo/server/content-workflows";
import { parseJsonBody, sourcePackPostSchema } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

function getInputFromSearchParams(request: NextRequest): PersistedContentInput {
  const { searchParams } = request.nextUrl;

  return {
    topic: searchParams.get("topic") ?? undefined,
    opportunityId: searchParams.get("opportunityId") ?? undefined,
    briefId: searchParams.get("briefId") ?? undefined,
    draftId: searchParams.get("draftId") ?? undefined,
    sourcePackId: searchParams.get("sourcePackId") ?? undefined,
    provider: (searchParams.get("provider") as PersistedContentInput["provider"] | null) ?? undefined
  };
}

function getPersistFlag(request: NextRequest) {
  return request.nextUrl.searchParams.get("persist") === "true";
}

export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, { namespace: "api-source-pack-get", max: 90, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  try {
    return NextResponse.json(
      await buildWorkflowSourcePack(getInputFromSearchParams(request), { persist: getPersistFlag(request) })
    );
  } catch (error) {
    return catchToJsonError(error, "Failed to build source pack.");
  }
}

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-source-pack-post", max: 25, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, sourcePackPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data as PersistedContentInput & { persist?: boolean };
    const pack = await buildWorkflowSourcePack(body, { persist: body.persist ?? true });
    await appendAuditEvent({
      action: "api.sourcePack.build",
      detail: { persist: body.persist ?? true, topic: body.topic }
    });
    return NextResponse.json(pack);
  } catch (error) {
    return catchToJsonError(error, "Failed to build source pack.");
  }
}
