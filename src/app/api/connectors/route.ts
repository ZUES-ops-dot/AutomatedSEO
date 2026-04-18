import { NextRequest, NextResponse } from "next/server";

import { getConnectorCatalog, getConnectorSummary } from "@/features/seo/server/connectors";
import { getEnvironmentOverview, getStartupConfigReport } from "@/features/seo/server/env";
import { getSearchSignalStatus } from "@/features/seo/server/search-signals";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, { namespace: "api-connectors-get", max: 90, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  try {
    return NextResponse.json({
      groups: getConnectorCatalog(),
      summary: getConnectorSummary(),
      environment: getEnvironmentOverview(),
      startupConfig: getStartupConfigReport(),
      detailsRedacted: false,
      searchSignals: await getSearchSignalStatus()
    });
  } catch (error) {
    return catchToJsonError(error, "Failed to load connectors.");
  }
}
