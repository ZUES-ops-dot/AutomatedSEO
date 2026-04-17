import { NextRequest, NextResponse } from "next/server";

import { getDashboardData } from "@/features/seo/server/views";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, { namespace: "api-dashboard-get", max: 90, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  try {
    return NextResponse.json(await getDashboardData());
  } catch (error) {
    return catchToJsonError(error, "Failed to load dashboard.");
  }
}
