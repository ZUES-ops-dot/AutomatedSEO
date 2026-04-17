import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { buildInternalLinkAudit } from "@/features/seo/server/internal-links";
import { getLatestInternalLinkAudit } from "@/features/seo/server/storage";
import { internalLinksPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, { namespace: "api-internal-links-get", max: 90, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  try {
    const latest = await getLatestInternalLinkAudit();
    return NextResponse.json({
      audit: latest,
      hasAudit: Boolean(latest)
    });
  } catch (error) {
    return catchToJsonError(error, "Failed to load internal link audit.");
  }
}

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-internal-links-post", max: 15, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, internalLinksPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data;

    const audit = await buildInternalLinkAudit({
      persist: true,
      recrawl: body.recrawl ?? false,
      crawlIfMissing: true,
      maxPages: body.maxPages,
      maxSuggestions: body.maxSuggestions
    });

    await appendAuditEvent({
      action: "api.internalLinks.build",
      detail: { recrawl: body.recrawl ?? false, scannedPages: audit.scannedPages }
    });

    return NextResponse.json(audit);
  } catch (error) {
    return catchToJsonError(error, "Failed to build internal link audit.");
  }
}
