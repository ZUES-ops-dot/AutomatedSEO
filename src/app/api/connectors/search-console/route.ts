import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { getSearchSignalStatus, syncSearchSignals, type SearchSignalInput } from "@/features/seo/server/search-signals";
import { parseJsonBody, searchSignalPostSchema } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, { namespace: "api-search-console-get", max: 90, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  try {
    return NextResponse.json(await getSearchSignalStatus());
  } catch (error) {
    return catchToJsonError(error, "Failed to load search signal status.");
  }
}

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-search-console-post", max: 20, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, searchSignalPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data as SearchSignalInput;
    const result = await syncSearchSignals(body);
    await appendAuditEvent({
      action: "api.searchConsole.sync",
      detail: { provider: body.provider, rowLimit: body.rowLimit }
    });
    return NextResponse.json(result);
  } catch (error) {
    return catchToJsonError(error, "Failed to sync search signals.");
  }
}
