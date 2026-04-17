import {
  getContentActions,
  getPerformanceSnapshots,
  getSearchPerformanceRows,
  getStoredDraftsByIds,
  getStoredOpportunities,
  saveConnectorRun,
  saveContentActionsBatch,
  saveOpportunityOutcomes,
  savePerformanceSnapshots
} from "@/features/seo/server/storage";
import type { ConnectorRun, ContentAction, OpportunityOutcome, PerformanceSnapshot, SearchPerformanceRow } from "@/features/seo/types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildAggregatedSnapshot(actionId: string, url: string, rows: SearchPerformanceRow[]): PerformanceSnapshot {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const weightedPosition = rows.reduce((sum, row) => sum + row.position * Math.max(row.impressions, 1), 0);
  const totalWeight = rows.reduce((sum, row) => sum + Math.max(row.impressions, 1), 0);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const position = totalWeight > 0 ? weightedPosition / totalWeight : 0;
  const capturedAt = new Date().toISOString();

  return {
    id: `snapshot-${actionId}-${slugify(url)}-checkpoint-${capturedAt.slice(0, 10)}`,
    actionId,
    url,
    impressions,
    clicks,
    ctr,
    position,
    kind: "checkpoint",
    capturedAt
  };
}

function buildRun(status: ConnectorRun["status"], detail: string, recordCount: number, startedAt: string): ConnectorRun {
  return {
    id: `monitor-run-${Date.now()}`,
    connectorId: "content-monitor",
    provider: "system",
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    detail,
    recordCount,
    metadata: {}
  };
}

function summarizeOutcome(
  action: ContentAction,
  opportunityId: string,
  predictedScore: number,
  baseline: PerformanceSnapshot[],
  checkpoints: PerformanceSnapshot[]
): OpportunityOutcome {
  const baselineCtr =
    baseline.length > 0 ? baseline.reduce((sum, snapshot) => sum + snapshot.ctr, 0) / baseline.length : 0;
  const latestCtr =
    checkpoints.length > 0 ? checkpoints.reduce((sum, snapshot) => sum + snapshot.ctr, 0) / checkpoints.length : 0;
  const baselinePosition =
    baseline.length > 0 ? baseline.reduce((sum, snapshot) => sum + snapshot.position, 0) / baseline.length : 0;
  const latestPosition =
    checkpoints.length > 0 ? checkpoints.reduce((sum, snapshot) => sum + snapshot.position, 0) / checkpoints.length : 0;
  const ctrDelta = latestCtr - baselineCtr;
  const positionDelta = baselinePosition - latestPosition;
  const outcomeScore =
    baseline.length > 0 && checkpoints.length > 0
      ? Math.round(Math.max(-100, Math.min(100, ctrDelta * 800 + positionDelta * 4)))
      : 0;

  return {
    id: `outcome-${action.id}-${new Date().toISOString().slice(0, 10)}`,
    actionId: action.id,
    opportunityId,
    title: action.title,
    predictedScore,
    baselineCtr,
    latestCtr,
    baselinePosition,
    latestPosition,
    ctrDelta,
    positionDelta,
    outcomeScore,
    outcome:
      baseline.length === 0 || checkpoints.length === 0
        ? "insufficient_data"
        : outcomeScore >= 10
          ? "positive"
          : outcomeScore <= -10
            ? "negative"
            : "neutral",
    capturedAt: new Date().toISOString()
  };
}

export async function syncContentPerformanceReview() {
  const startedAt = new Date().toISOString();
  const actions = await getContentActions();
  const rows = await getSearchPerformanceRows();
  const nextActions: ContentAction[] = [];
  const snapshots: PerformanceSnapshot[] = [];
  const outcomes: OpportunityOutcome[] = [];
  const opportunities = await getStoredOpportunities();
  const opportunityScoreById = new Map(opportunities.map((item) => [item.id, item.score]));
  const existingSnapshots = await getPerformanceSnapshots();
  const snapshotsByAction = new Map<string, PerformanceSnapshot[]>();
  for (const snapshot of existingSnapshots) {
    const list = snapshotsByAction.get(snapshot.actionId) ?? [];
    list.push(snapshot);
    snapshotsByAction.set(snapshot.actionId, list);
  }

  const draftById = await getStoredDraftsByIds(actions.map((action) => action.draftId));

  for (const action of actions) {
    const actionSnapshots = action.targetUrls.map((url) =>
      buildAggregatedSnapshot(
        action.id,
        url,
        rows.filter((row) => row.page === url)
      )
    );

    snapshots.push(...actionSnapshots);
    nextActions.push({
      ...action,
      status: action.status === "error" ? action.status : "monitoring",
      latestSnapshotIds: actionSnapshots.map((snapshot) => snapshot.id),
      updatedAt: new Date().toISOString(),
      detail: `Monitoring ${action.targetUrls.length} URLs for ${action.title}.`
    });

    const allActionSnapshots = snapshotsByAction.get(action.id) ?? [];
    const baselineSnapshots = allActionSnapshots.filter((snapshot) => snapshot.kind === "baseline");
    const checkpointSnapshots = [...allActionSnapshots.filter((snapshot) => snapshot.kind === "checkpoint"), ...actionSnapshots];
    const draft = draftById.get(action.draftId) ?? null;
    outcomes.push(
      summarizeOutcome(
        action,
        draft?.supportingOpportunityId ?? action.draftId,
        opportunityScoreById.get(draft?.supportingOpportunityId ?? "") ?? 0,
        baselineSnapshots,
        checkpointSnapshots
      )
    );
  }

  await savePerformanceSnapshots(snapshots);
  await saveOpportunityOutcomes(outcomes);
  await saveContentActionsBatch(nextActions);

  const run = buildRun(
    nextActions.length > 0 ? "success" : "fallback",
    nextActions.length > 0
      ? `Tracked performance checkpoints for ${nextActions.length} published/exported content actions.`
      : "No content actions were available for monitoring yet.",
    snapshots.length,
    startedAt
  );

  await saveConnectorRun(run);

  return {
    actions: nextActions,
    snapshots,
    outcomes,
    run
  };
}
