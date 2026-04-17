import { NextRequest, NextResponse } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { generateAndPersistBrief } from "@/features/seo/server/content-workflows";
import { getReadableOpportunities } from "@/features/seo/server/opportunity-engine";
import { contentClusterPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError, jsonError } from "@/lib/api-error";
import { mapWithConcurrency } from "@/lib/promise-pool";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const CLUSTER_BRIEF_CONCURRENCY = 3;

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-content-cluster", max: 10, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, contentClusterPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const body = parsed.data;

    const opportunities = await getReadableOpportunities();
    const fallbackCluster =
      opportunities.find((item) => item.priorityBand === "do_now" && item.recommendedAction !== "skip")?.cluster ??
      opportunities.find((item) => item.recommendedAction !== "skip")?.cluster;
    const cluster = (body.cluster?.trim() || fallbackCluster || "").toLowerCase();
    if (!cluster) {
      return jsonError("No cluster is available for generation.", 400);
    }

    const limit = Math.max(1, Math.min(10, body.limit ?? 4));
    const selected = opportunities
      .filter(
        (item) =>
          item.cluster.toLowerCase() === cluster &&
          item.recommendedAction !== "skip" &&
          item.status !== "dismissed"
      )
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);

    const generated: Array<{ opportunityId: string; briefId: string; score: number; qualityScore: number }> = [];
    const failed: Array<{ opportunityId: string; title: string; error: string }> = [];

    const settled = await mapWithConcurrency(selected, CLUSTER_BRIEF_CONCURRENCY, (opportunity) =>
      generateAndPersistBrief(
        {
          opportunityId: opportunity.id,
          provider: body.provider
        },
        {
          persist: body.persist ?? true,
          enforceQualityGates: body.enforceQualityGates ?? true
        }
      )
    );

    settled.forEach((result, index) => {
      const opportunity = selected[index]!;
      if (result.status === "fulfilled") {
        const value = result.value;
        generated.push({
          opportunityId: opportunity.id,
          briefId: value.brief.id,
          score: opportunity.score,
          qualityScore: value.qualityReport.score
        });
        return;
      }
      failed.push({
        opportunityId: opportunity.id,
        title: opportunity.title,
        error: result.reason instanceof Error ? result.reason.message : "Generation failed."
      });
    });

    await appendAuditEvent({
      action: "api.content.cluster",
      detail: { cluster, selected: selected.length, generated: generated.length, failed: failed.length }
    });

    return NextResponse.json({
      cluster,
      selected: selected.length,
      generated,
      failed
    });
  } catch (error) {
    return catchToJsonError(error, "Failed to generate cluster briefs.");
  }
}
