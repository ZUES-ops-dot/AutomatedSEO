import { NextRequest, NextResponse } from "next/server";

import { getConnectorSummary } from "@/features/seo/server/connectors";
import { getContentEngineStatus } from "@/features/seo/server/content-engine";
import { pingDatabase } from "@/features/seo/server/database";
import { pingRedis } from "@/lib/redis";
import { getPlaywrightRuntimeHealth } from "@/features/seo/server/runtime-health";
import { getEnvironmentOverview, getStartupConfigReport } from "@/features/seo/server/env";
import { getSystemQuickStatsData } from "@/features/seo/server/views";
import { isApiAuthorized } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authorized = isApiAuthorized(request);
    const [database, redis, playwright] = await Promise.all([pingDatabase(), pingRedis(), getPlaywrightRuntimeHealth()]);

    return NextResponse.json({
      status: database.ok ? "ok" : "degraded",
      app: "qubic-seo-autopilot",
      stats: await getSystemQuickStatsData(),
      connectors: getConnectorSummary(),
      database,
      redis,
      playwright,
      warnings: playwright.ok
        ? []
        : ["Playwright chromium is unavailable; rendered crawling may fall back to static fetch."],
      environment: authorized ? getEnvironmentOverview() : undefined,
      startupConfig: authorized ? getStartupConfigReport() : undefined,
      detailsRedacted: !authorized,
      contentEngine: getContentEngineStatus()
    });
  } catch (error) {
    return catchToJsonError(error, "Health check failed.");
  }
}
// TODO: add uptime check for Redis and Postgres

