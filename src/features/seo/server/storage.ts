import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { contentBriefs, contentIdeas, drafts } from "@/features/seo/data/demo-data";
import { logSeoEvent } from "@/lib/seo-log";
import {
  readCollectionRowJson,
  readCollectionStatesFromDatabase,
  readStateFromDatabase,
  runLockedCollectionMutation,
  SEO_COLLECTION_ROW_PREFIX,
  upsertCollectionRowJson,
  writeCollectionStateToDatabase
} from "@/features/seo/server/database";
import { clearIdeasCache } from "@/features/seo/server/idea-cache";
import { STORAGE_LIMITS } from "@/features/seo/server/seo-constants";
import { getDataPath, getDataRootDirectory } from "@/features/seo/server/runtime-paths";
import type {
  ContentAction,
  ContentBrief,
  ContentStudioData,
  ConnectorRun,
  DraftDocument,
  InternalLinkAudit,
  JobSchedule,
  LinkSuggestion,
  OpportunityOutcome,
  Opportunity,
  PageSpeedSnapshot,
  PerformanceSnapshot,
  SearchPerformanceRow,
  SeoPersistenceState,
  SitePage,
  SourceEvent,
  SourcePack
} from "@/features/seo/types";

const storageDirectory = getDataRootDirectory();
const storageFilePath = getDataPath("seo-runtime.json");
const collectionStorageDirectory = getDataPath("seo-runtime");
const MAX_OUTCOMES_TO_RETAIN = STORAGE_LIMITS.maxOutcomes;
const MAX_JOB_SCHEDULES_TO_RETAIN = STORAGE_LIMITS.maxJobSchedules;

const defaultState: SeoPersistenceState = {
  sourcePacks: [],
  briefs: [],
  drafts: [],
  connectorRuns: [],
  searchPerformanceRows: [],
  opportunities: [],
  pages: [],
  internalLinkAudits: [],
  pageSpeedSnapshots: [],
  sourceEvents: [],
  linkSuggestions: [],
  performanceSnapshots: [],
  opportunityOutcomes: [],
  contentActions: [],
  jobSchedules: []
};

const persistenceKeys = Object.keys(defaultState) as Array<keyof SeoPersistenceState>;

/** Slice after sort. Full collection is still loaded from persistence; use for API paging and smaller views. */
export type CollectionReadOptions = {
  offset?: number;
  limit?: number;
};

function sliceSortedPage<T>(sorted: T[], options?: CollectionReadOptions) {
  const off = Math.max(0, options?.offset ?? 0);
  if (options?.limit === undefined) {
    return sorted.slice(off);
  }
  return sorted.slice(off, off + Math.max(0, options.limit));
}

function sortByTimestamp<T>(items: T[], getTimestamp: (item: T) => string) {
  return [...items].sort((left, right) => {
    const leftValue = Date.parse(getTimestamp(left));
    const rightValue = Date.parse(getTimestamp(right));
    return rightValue - leftValue;
  });
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  return [item, ...items.filter((existing) => existing.id !== item.id)];
}

function mergeById<T extends { id: string }>(seeded: T[], persisted: T[]) {
  return [...persisted, ...seeded.filter((item) => !persisted.some((stored) => stored.id === item.id))];
}

function setCollection<K extends keyof SeoPersistenceState>(state: SeoPersistenceState, key: K, value: SeoPersistenceState[K]) {
  state[key] = value;
}

function assertArrayInput(value: unknown, name: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array.`);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeValidDate(value: unknown) {
  if (!isNonEmptyString(value)) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function normalizeOpportunityOutcome(outcome: OpportunityOutcome): OpportunityOutcome | null {
  if (!isNonEmptyString(outcome.id) || !isNonEmptyString(outcome.actionId) || !isNonEmptyString(outcome.opportunityId)) {
    return null;
  }

  const capturedAt = normalizeValidDate(outcome.capturedAt);
  if (!capturedAt) {
    return null;
  }

  return {
    ...outcome,
    id: outcome.id.trim(),
    actionId: outcome.actionId.trim(),
    opportunityId: outcome.opportunityId.trim(),
    title: typeof outcome.title === "string" ? outcome.title : "",
    capturedAt
  };
}

function normalizeJobSchedule(
  schedule: JobSchedule,
  options?: { existing?: JobSchedule | undefined; nowMs?: number }
): JobSchedule | null {
  if (!isNonEmptyString(schedule.id) || !isNonEmptyString(schedule.job)) {
    return null;
  }

  const intervalMinutes =
    typeof schedule.intervalMinutes === "number" && Number.isFinite(schedule.intervalMinutes)
      ? Math.max(1, Math.round(schedule.intervalMinutes))
      : 60;
  const enabled = Boolean(schedule.enabled);
  const lastRunAt = normalizeValidDate(schedule.lastRunAt);
  const nowMs = options?.nowMs ?? Date.now();
  const existing = options?.existing;

  let nextRunAt: string | null = null;
  if (!enabled || intervalMinutes <= 0) {
    nextRunAt = null;
  } else {
    const lastRunMs = lastRunAt ? Date.parse(lastRunAt) : null;
    const existingNextMs = existing?.nextRunAt ? Date.parse(existing.nextRunAt) : NaN;
    const hasPersistedNext = !Number.isNaN(existingNextMs);
    if (lastRunMs === null && hasPersistedNext && existing?.nextRunAt) {
      nextRunAt = existing.nextRunAt;
    } else {
      nextRunAt = new Date((lastRunMs ?? nowMs) + intervalMinutes * 60 * 1000).toISOString();
    }
  }

  const status =
    schedule.lastStatus === "success" || schedule.lastStatus === "error" || schedule.lastStatus === "fallback"
      ? schedule.lastStatus
      : null;

  return {
    id: schedule.id.trim(),
    job: schedule.job.trim(),
    cadence: isNonEmptyString(schedule.cadence) ? schedule.cadence.trim() : `Every ${intervalMinutes} minutes`,
    intervalMinutes,
    enabled,
    lastRunAt,
    nextRunAt,
    lastStatus: status,
    detail: typeof schedule.detail === "string" ? schedule.detail : ""
  };
}

function normalizeSitePage(page: Partial<SitePage>): SitePage {
  const headings = Array.isArray(page.headings) ? page.headings.filter((item): item is string => typeof item === "string") : [];
  const contentText = typeof page.contentText === "string" ? page.contentText : headings.join(" ");
  const contentExcerpt = typeof page.contentExcerpt === "string" ? page.contentExcerpt : contentText.slice(0, 280);

  return {
    id: typeof page.id === "string" ? page.id : "",
    url: typeof page.url === "string" ? page.url : "",
    site: page.site === "docs" ? "docs" : page.site === "blog" ? "blog" : "primary",
    title: typeof page.title === "string" ? page.title : "",
    h1: typeof page.h1 === "string" ? page.h1 : (headings[0] ?? (typeof page.title === "string" ? page.title : "")),
    metaDescription: typeof page.metaDescription === "string" ? page.metaDescription : "",
    canonicalUrl: typeof page.canonicalUrl === "string" ? page.canonicalUrl : typeof page.url === "string" ? page.url : "",
    statusCode: typeof page.statusCode === "number" ? page.statusCode : 200,
    headings,
    internalLinks: Array.isArray(page.internalLinks) ? page.internalLinks.filter((item): item is string => typeof item === "string") : [],
    internalLinkDetails: Array.isArray(page.internalLinkDetails)
      ? page.internalLinkDetails
          .filter((item): item is SitePage["internalLinkDetails"][number] => Boolean(item && typeof item === "object"))
          .map((item) => ({
            targetUrl: typeof item.targetUrl === "string" ? item.targetUrl : "",
            anchorText: typeof item.anchorText === "string" ? item.anchorText : "",
            context: typeof item.context === "string" ? item.context : ""
          }))
          .filter((item) => item.targetUrl.length > 0)
      : [],
    contentText,
    contentExcerpt,
    contentChunks: Array.isArray(page.contentChunks)
      ? page.contentChunks.filter((item): item is string => typeof item === "string")
      : contentText
          .split(/\n+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 12),
    wordCount: typeof page.wordCount === "number" ? page.wordCount : contentText.split(/\s+/).filter(Boolean).length,
    issues: Array.isArray(page.issues) ? page.issues.filter((item): item is string => typeof item === "string") : [],
    contentHash: typeof page.contentHash === "string" ? page.contentHash : "",
    crawlDepth: typeof page.crawlDepth === "number" ? page.crawlDepth : 0,
    rendered: typeof page.rendered === "boolean" ? page.rendered : false,
    lastCrawled: typeof page.lastCrawled === "string" ? page.lastCrawled : new Date(0).toISOString()
  };
}

function normalizeStoredOpportunity(raw: unknown): Opportunity {
  const item = raw as Opportunity;
  if ((item.priorityBand as string) === "skip") {
    return { ...item, priorityBand: "deferred" };
  }
  return item;
}

function isValidOpportunityStatusTransition(from: Opportunity["status"], to: Opportunity["status"]): boolean {
  if (from === to) {
    return true;
  }
  if (from === "dismissed" && (to === "approved" || to === "drafting" || to === "in_review")) {
    return false;
  }
  return true;
}

function normalizeInternalLinkAudit(audit: Partial<InternalLinkAudit>): InternalLinkAudit {
  return {
    id: typeof audit.id === "string" ? audit.id : "",
    createdAt: typeof audit.createdAt === "string" ? audit.createdAt : new Date(0).toISOString(),
    scannedPages: typeof audit.scannedPages === "number" ? audit.scannedPages : 0,
    renderedPages: typeof audit.renderedPages === "number" ? audit.renderedPages : 0,
    suggestions: Array.isArray(audit.suggestions) ? audit.suggestions.filter(Boolean) as InternalLinkAudit["suggestions"] : [],
    orphanPages: Array.isArray(audit.orphanPages) ? audit.orphanPages.filter(Boolean) as InternalLinkAudit["orphanPages"] : [],
    weakClusters: Array.isArray(audit.weakClusters) ? audit.weakClusters.filter(Boolean) as InternalLinkAudit["weakClusters"] : []
  };
}

async function ensureStorageDirectory() {
  await mkdir(storageDirectory, { recursive: true });
  await mkdir(collectionStorageDirectory, { recursive: true });
}

function collectionFilePath(key: keyof SeoPersistenceState) {
  return path.join(collectionStorageDirectory, `${String(key)}.json`);
}

function normalizeCollection<K extends keyof SeoPersistenceState>(key: K, value: unknown): SeoPersistenceState[K] {
  if (!Array.isArray(value)) {
    return defaultState[key];
  }

  switch (key) {
    case "pages":
      return value.map((page) => normalizeSitePage(page as Partial<SitePage>)) as SeoPersistenceState[K];
    case "internalLinkAudits":
      return value.map((audit) => normalizeInternalLinkAudit(audit as Partial<InternalLinkAudit>)) as SeoPersistenceState[K];
    case "opportunities":
      return value.map((item) => normalizeStoredOpportunity(item)) as SeoPersistenceState[K];
    default:
      return value as SeoPersistenceState[K];
  }
}

async function readCollectionStateFromFile<K extends keyof SeoPersistenceState>(key: K) {
  try {
    const raw = await readFile(collectionFilePath(key), "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    logSeoEvent("debug", "SEO collection file missing or invalid.", { collection: String(key), error: String(error) });
    return undefined;
  }
}

async function readLegacyFileState() {
  try {
    const raw = await readFile(storageFilePath, "utf8");
    return JSON.parse(raw) as Partial<SeoPersistenceState>;
  } catch (error) {
    logSeoEvent("debug", "Legacy SEO runtime file missing or invalid.", { error: String(error) });
    return null;
  }
}

async function doReadCollection<K extends keyof SeoPersistenceState>(key: K): Promise<SeoPersistenceState[K]> {
  await ensureStorageDirectory();

  const databaseCollections = await readCollectionStatesFromDatabase([key]);
  if (Array.isArray(databaseCollections[key])) {
    return normalizeCollection(key, databaseCollections[key]);
  }

  const databaseState = await readStateFromDatabase();
  if (Array.isArray(databaseState?.[key])) {
    return normalizeCollection(key, databaseState[key]);
  }

  const fileCollection = await readCollectionStateFromFile(key);
  if (Array.isArray(fileCollection)) {
    return normalizeCollection(key, fileCollection);
  }

  const legacyFileState = await readLegacyFileState();
  if (Array.isArray(legacyFileState?.[key])) {
    return normalizeCollection(key, legacyFileState[key]);
  }

  return defaultState[key];
}

async function doReadState(): Promise<SeoPersistenceState> {
  await ensureStorageDirectory();

  const databaseCollections = await readCollectionStatesFromDatabase(persistenceKeys);
  const legacyDatabaseState = await readStateFromDatabase();
  const fileCollections = await Promise.all(
    persistenceKeys.map(async (key) => [key, await readCollectionStateFromFile(key)] as const)
  );
  const legacyFileState = await readLegacyFileState();
  const nextState = { ...defaultState } as SeoPersistenceState;

  for (const key of persistenceKeys) {
    const fileCollection = fileCollections.find(([candidate]) => candidate === key)?.[1];
    const rawCollection =
      databaseCollections[key] ??
      legacyDatabaseState?.[key] ??
      fileCollection ??
      legacyFileState?.[key] ??
      defaultState[key];

    setCollection(nextState, key, normalizeCollection(key, rawCollection));
  }

  return nextState;
}

interface CollectionMutationResult<K extends keyof SeoPersistenceState, T> {
  nextValue: SeoPersistenceState[K];
  result: T;
}

async function writeCollection<K extends keyof SeoPersistenceState>(key: K, value: SeoPersistenceState[K]) {
  const normalized = normalizeCollection(key, value);
  if (stateCache) {
    stateCache = {
      value: {
        ...stateCache.value,
        [key]: normalized
      },
      at: Date.now()
    };
  }
  await ensureStorageDirectory();
  const storedInDatabase = await writeCollectionStateToDatabase(key, normalized);
  if (storedInDatabase) {
    return;
  }
  await writeFile(collectionFilePath(key), JSON.stringify(normalized, null, 2), "utf8");
}

let stateReadPromise: Promise<SeoPersistenceState> | null = null;
let stateCache: { value: SeoPersistenceState; at: number } | null = null;
const collectionWriteQueues = new Map<keyof SeoPersistenceState, Promise<unknown>>();
const STATE_CACHE_TTL_MS = 2_000;

async function waitForPendingCollectionWrites(keys: Array<keyof SeoPersistenceState>) {
  const pendingWrites = keys
    .map((key) => collectionWriteQueues.get(key))
    .filter((queue): queue is Promise<void> => Boolean(queue));

  if (pendingWrites.length > 0) {
    await Promise.all(pendingWrites);
  }
}

async function mutateCollection<K extends keyof SeoPersistenceState, T>(
  key: K,
  mutate: (current: SeoPersistenceState[K]) => Promise<CollectionMutationResult<K, T>> | CollectionMutationResult<K, T>
): Promise<T> {
  const rowId = `${SEO_COLLECTION_ROW_PREFIX}${String(key)}`;
  const lockKey = `seo-persist:${String(key)}`;

  const pgResult = await runLockedCollectionMutation<T>(rowId, lockKey, async (client) => {
    const raw = await readCollectionRowJson(client, rowId);
    const current = normalizeCollection(key, Array.isArray(raw) ? raw : []);
    const { nextValue, result } = await Promise.resolve(mutate(current));
    const normalized = normalizeCollection(key, nextValue);
    await upsertCollectionRowJson(client, rowId, normalized);
    if (stateCache) {
      stateCache = {
        value: { ...stateCache.value, [key]: normalized },
        at: Date.now()
      };
    }
    return result;
  });

  if (pgResult !== null) {
    return pgResult;
  }

  const previous = collectionWriteQueues.get(key) ?? Promise.resolve();
  const operation = previous
    .catch((err: unknown) => {
      logSeoEvent("error", "SEO collection write queue: previous step failed.", {
        collection: String(key),
        error: String(err)
      });
      throw err;
    })
    .then(async () => {
      const current = await doReadCollection(key);
      const { nextValue, result } = await mutate(current);
      await writeCollection(key, nextValue);
      return result;
    });

  collectionWriteQueues.set(
    key,
    operation.catch((err: unknown) => {
      logSeoEvent("error", "SEO collection write failed.", { collection: String(key), error: String(err) });
      throw err;
    })
  );

  return operation;
}

async function readState(): Promise<SeoPersistenceState> {
  await waitForPendingCollectionWrites(persistenceKeys);
  if (stateCache && Date.now() - stateCache.at < STATE_CACHE_TTL_MS) {
    return stateCache.value;
  }
  if (stateReadPromise) return stateReadPromise;

  stateReadPromise = doReadState()
    .then((state) => {
      stateCache = { value: state, at: Date.now() };
      stateReadPromise = null;
      return state;
    })
    .catch((err: unknown) => {
      stateReadPromise = null;
      throw err;
    });
  return stateReadPromise;
}

async function readCollection<K extends keyof SeoPersistenceState>(key: K): Promise<SeoPersistenceState[K]> {
  await waitForPendingCollectionWrites([key]);
  if (stateCache && Date.now() - stateCache.at < STATE_CACHE_TTL_MS) {
    return stateCache.value[key];
  }

  return doReadCollection(key);
}

export async function getPersistenceState() {
  return readState();
}

export async function getStoredSourcePackById(id: string) {
  const sourcePacks = await readCollection("sourcePacks");
  return sourcePacks.find((item) => item.id === id) ?? null;
}

export async function getStoredSourcePacks() {
  const sourcePacks = await readCollection("sourcePacks");
  return sortByTimestamp(sourcePacks, (item) => item.generatedAt);
}

export async function getLatestSourcePackForOpportunity(opportunityId: string) {
  const sourcePacks = await getStoredSourcePacks();
  return sourcePacks.find((item) => item.supportingOpportunityId === opportunityId) ?? null;
}

export async function getStoredBriefById(id: string) {
  const briefs = await readCollection("briefs");
  return briefs.find((item) => item.id === id) ?? null;
}

export async function getStoredDraftById(id: string) {
  const storedDrafts = await readCollection("drafts");
  return storedDrafts.find((item) => item.id === id) ?? null;
}

export async function getStoredDraftsByIds(ids: string[]): Promise<Map<string, DraftDocument | null>> {
  const map = new Map<string, DraftDocument | null>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) {
    return map;
  }
  const storedDrafts = await readCollection("drafts");
  for (const id of unique) {
    map.set(id, storedDrafts.find((item) => item.id === id) ?? null);
  }
  return map;
}

export async function getContentStudioData(): Promise<ContentStudioData> {
  const [sourcePacks, briefs, storedDrafts, contentActions, linkSuggestions, performanceSnapshots] = await Promise.all([
    readCollection("sourcePacks"),
    readCollection("briefs"),
    readCollection("drafts"),
    readCollection("contentActions"),
    readCollection("linkSuggestions"),
    readCollection("performanceSnapshots")
  ]);
  const mergedDrafts = mergeById(drafts, storedDrafts);
  const studioDraftIds = new Set(mergedDrafts.map((draft) => draft.id));

  return {
    ideas: contentIdeas,
    briefs: mergeById(contentBriefs, briefs),
    drafts: mergedDrafts,
    sourcePacks: sortByTimestamp(sourcePacks, (item) => item.generatedAt),
    actions: sortByTimestamp(contentActions, (item) => item.updatedAt),
    linkSuggestions: sortByTimestamp(
      linkSuggestions.filter((item) => studioDraftIds.has(item.draftId)),
      (item) => item.createdAt
    ),
    performanceSnapshots: sortByTimestamp(
      performanceSnapshots.filter((item) =>
        contentActions.some((action) => studioDraftIds.has(action.draftId) && action.id === item.actionId)
      ),
      (item) => item.capturedAt
    )
  };
}

export async function saveSourcePack(sourcePack: SourcePack) {
  await mutateCollection("sourcePacks", async (sourcePacks) => ({
    nextValue: sortByTimestamp(upsertById(sourcePacks, sourcePack), (item) => item.generatedAt),
    result: sourcePack
  }));
  return sourcePack;
}

export async function saveBrief(brief: ContentBrief) {
  await mutateCollection("briefs", async (briefs) => ({
    nextValue: upsertById(briefs, brief),
    result: brief
  }));
  return brief;
}

export async function saveDraft(draft: DraftDocument) {
  await mutateCollection("drafts", async (storedDrafts) => ({
    nextValue: upsertById(storedDrafts, draft),
    result: draft
  }));
  return draft;
}

export async function saveConnectorRun(run: ConnectorRun) {
  await mutateCollection("connectorRuns", async (connectorRuns) => ({
    nextValue: sortByTimestamp(upsertById(connectorRuns, run), (item) => item.finishedAt),
    result: run
  }));
  return run;
}

export async function getConnectorRuns(connectorId?: string, options?: CollectionReadOptions) {
  const connectorRuns = await readCollection("connectorRuns");
  const runs = connectorId
    ? connectorRuns.filter((run) => run.connectorId === connectorId)
    : connectorRuns;

  const sorted = sortByTimestamp(runs, (item) => item.finishedAt);
  return sliceSortedPage(sorted, options);
}

export async function getLatestConnectorRun(connectorId: string) {
  const runs = await getConnectorRuns(connectorId);
  return runs[0] ?? null;
}

export async function saveSearchPerformanceRows(rows: SearchPerformanceRow[]) {
  await mutateCollection("searchPerformanceRows", async (searchPerformanceRows) => {
    const merged = rows.reduce((items, row) => upsertById(items, row), searchPerformanceRows);
    return {
      nextValue: sortByTimestamp(merged, (item) => item.capturedAt).slice(0, STORAGE_LIMITS.maxSearchPerformanceRows),
      result: rows
    };
  });
  return rows;
}

export async function getSearchPerformanceRows(
  provider?: SearchPerformanceRow["provider"],
  options?: CollectionReadOptions
) {
  const searchPerformanceRows = await readCollection("searchPerformanceRows");
  const rows = provider
    ? searchPerformanceRows.filter((row) => row.provider === provider)
    : searchPerformanceRows;

  const sorted = sortByTimestamp(rows, (item) => item.capturedAt);
  const maxCap = STORAGE_LIMITS.maxSearchPerformanceRows;
  const off = Math.max(0, options?.offset ?? 0);
  const lim = options?.limit ?? maxCap;
  const take = Math.min(Math.max(lim, 1), maxCap);
  return sorted.slice(off, off + take);
}

export async function saveOpportunities(opportunities: Opportunity[]) {
  await mutateCollection("opportunities", async (storedOpportunities) => {
    const merged = opportunities.reduce((items, opportunity) => upsertById(items, opportunity), storedOpportunities);
    clearIdeasCache();
    return {
      nextValue: sortByTimestamp(merged, (item) => item.lastUpdated),
      result: opportunities
    };
  });
  return opportunities;
}

export async function getStoredOpportunities(options?: CollectionReadOptions) {
  const opportunities = await readCollection("opportunities");
  const sorted = sortByTimestamp(opportunities, (item) => item.lastUpdated);
  return sliceSortedPage(sorted, options);
}

export async function updateStoredOpportunityStatus(id: string, status: Opportunity["status"]) {
  return mutateCollection("opportunities", async (opportunities) => {
    const target = opportunities.find((item) => item.id === id);
    if (!target) {
      throw new Error(`Opportunity ${id} not found`);
    }
    if (!isValidOpportunityStatusTransition(target.status, status)) {
      throw new Error(`Invalid status transition: ${target.status} → ${status}`);
    }

    const updated: Opportunity = {
      ...target,
      status,
      lastUpdated: new Date().toISOString()
    };

    return {
      nextValue: sortByTimestamp(upsertById(opportunities, updated), (item) => item.lastUpdated),
      result: updated
    };
  });
}

export async function saveSitePages(pages: SitePage[]) {
  await mutateCollection("pages", async (storedPages) => {
    const merged = pages.reduce((items, page) => upsertById(items, page), storedPages);
    return {
      nextValue: sortByTimestamp(merged, (item) => item.lastCrawled),
      result: pages
    };
  });
  return pages;
}

export async function getSitePages(site?: SitePage["site"], options?: CollectionReadOptions) {
  const storedPages = await readCollection("pages");
  const pages = site ? storedPages.filter((item) => item.site === site) : storedPages;
  const sorted = sortByTimestamp(pages, (item) => item.lastCrawled);
  return sliceSortedPage(sorted, options);
}

export async function saveInternalLinkAudit(audit: InternalLinkAudit) {
  await mutateCollection("internalLinkAudits", async (internalLinkAudits) => ({
    nextValue: sortByTimestamp(upsertById(internalLinkAudits, audit), (item) => item.createdAt).slice(0, STORAGE_LIMITS.maxInternalLinkAudits),
    result: audit
  }));
  return audit;
}

export async function getInternalLinkAudits(options?: CollectionReadOptions) {
  const internalLinkAudits = await readCollection("internalLinkAudits");
  const sorted = sortByTimestamp(internalLinkAudits, (item) => item.createdAt);
  return sliceSortedPage(sorted, options);
}

export async function getLatestInternalLinkAudit() {
  const audits = await getInternalLinkAudits();
  return audits[0] ?? null;
}

export async function savePageSpeedSnapshots(snapshots: PageSpeedSnapshot[]) {
  await mutateCollection("pageSpeedSnapshots", async (pageSpeedSnapshots) => {
    const merged = snapshots.reduce((items, snapshot) => upsertById(items, snapshot), pageSpeedSnapshots);
    return {
      nextValue: sortByTimestamp(merged, (item) => item.capturedAt).slice(0, STORAGE_LIMITS.maxPageSpeedSnapshots),
      result: snapshots
    };
  });
  return snapshots;
}

export async function getPageSpeedSnapshots(url?: string, options?: CollectionReadOptions) {
  const pageSpeedSnapshots = await readCollection("pageSpeedSnapshots");
  const snapshots = url ? pageSpeedSnapshots.filter((item) => item.url === url) : pageSpeedSnapshots;
  const sorted = sortByTimestamp(snapshots, (item) => item.capturedAt);
  return sliceSortedPage(sorted, options);
}

export async function saveSourceEvents(events: SourceEvent[]) {
  await mutateCollection("sourceEvents", async (sourceEvents) => {
    const merged = events.reduce((items, event) => upsertById(items, event), sourceEvents);
    return {
      nextValue: sortByTimestamp(merged, (item) => item.publishedAt).slice(0, STORAGE_LIMITS.maxSourceEvents),
      result: events
    };
  });
  return events;
}

export async function getSourceEvents(connectorId?: string, options?: CollectionReadOptions) {
  const sourceEvents = await readCollection("sourceEvents");
  const events = connectorId ? sourceEvents.filter((item) => item.connectorId === connectorId) : sourceEvents;
  const sorted = sortByTimestamp(events, (item) => item.publishedAt);
  return sliceSortedPage(sorted, options);
}

export async function saveLinkSuggestions(suggestions: LinkSuggestion[]) {
  await mutateCollection("linkSuggestions", async (linkSuggestions) => {
    const merged = suggestions.reduce((items, suggestion) => upsertById(items, suggestion), linkSuggestions);
    return {
      nextValue: sortByTimestamp(merged, (item) => item.createdAt).slice(0, STORAGE_LIMITS.maxLinkSuggestions),
      result: suggestions
    };
  });
  return suggestions;
}

export async function getLinkSuggestions(draftId?: string, options?: CollectionReadOptions) {
  const linkSuggestions = await readCollection("linkSuggestions");
  const suggestions = draftId ? linkSuggestions.filter((item) => item.draftId === draftId) : linkSuggestions;
  const sorted = sortByTimestamp(suggestions, (item) => item.createdAt);
  return sliceSortedPage(sorted, options);
}

export async function savePerformanceSnapshots(snapshots: PerformanceSnapshot[]) {
  await mutateCollection("performanceSnapshots", async (performanceSnapshots) => {
    const merged = snapshots.reduce((items, snapshot) => upsertById(items, snapshot), performanceSnapshots);
    return {
      nextValue: sortByTimestamp(merged, (item) => item.capturedAt).slice(0, STORAGE_LIMITS.maxPerformanceSnapshots),
      result: snapshots
    };
  });
  return snapshots;
}

export async function getPerformanceSnapshots(actionId?: string, options?: CollectionReadOptions) {
  const performanceSnapshots = await readCollection("performanceSnapshots");
  const snapshots = actionId
    ? performanceSnapshots.filter((item) => item.actionId === actionId)
    : performanceSnapshots;
  const sorted = sortByTimestamp(snapshots, (item) => item.capturedAt);
  return sliceSortedPage(sorted, options);
}

export async function saveContentAction(action: ContentAction) {
  await mutateCollection("contentActions", async (contentActions) => ({
    nextValue: sortByTimestamp(upsertById(contentActions, action), (item) => item.updatedAt),
    result: action
  }));
  return action;
}

export async function saveContentActionsBatch(actions: ContentAction[]) {
  if (actions.length === 0) {
    return actions;
  }
  await mutateCollection("contentActions", async (contentActions) => {
    const merged = actions.reduce((items, action) => upsertById(items, action), contentActions);
    return {
      nextValue: sortByTimestamp(merged, (item) => item.updatedAt),
      result: actions
    };
  });
  return actions;
}

export async function getContentActions(options?: CollectionReadOptions) {
  const contentActions = await readCollection("contentActions");
  const sorted = sortByTimestamp(contentActions, (item) => item.updatedAt);
  return sliceSortedPage(sorted, options);
}

export async function getContentActionByDraftId(draftId: string) {
  const actions = await getContentActions();
  return actions.find((item) => item.draftId === draftId) ?? null;
}

export async function saveOpportunityOutcomes(outcomes: OpportunityOutcome[]) {
  assertArrayInput(outcomes, "outcomes");
  const sanitized = dedupeById(
    outcomes
      .map((outcome) => normalizeOpportunityOutcome(outcome))
      .filter((outcome): outcome is OpportunityOutcome => Boolean(outcome))
  );

  await mutateCollection("opportunityOutcomes", async (storedOutcomes) => {
    const merged = sanitized.reduce((items, outcome) => upsertById(items, outcome), storedOutcomes);
    return {
      nextValue: sortByTimestamp(merged, (item) => item.capturedAt).slice(0, MAX_OUTCOMES_TO_RETAIN),
      result: sanitized
    };
  });
  return sanitized;
}

export async function getOpportunityOutcomes(opportunityId?: string, options?: CollectionReadOptions) {
  const outcomes = await readCollection("opportunityOutcomes");
  const filtered = opportunityId ? outcomes.filter((item) => item.opportunityId === opportunityId) : outcomes;
  const sorted = sortByTimestamp(filtered, (item) => item.capturedAt);
  return sliceSortedPage(sorted, options);
}

export async function saveJobSchedules(schedules: JobSchedule[]) {
  assertArrayInput(schedules, "schedules");
  const nowMs = Date.now();

  return mutateCollection("jobSchedules", async (storedSchedules) => {
    const byId = new Map(storedSchedules.map((item) => [item.id, item]));
    const sanitized = dedupeById(
      schedules
        .map((schedule) => normalizeJobSchedule(schedule, { existing: byId.get(schedule.id), nowMs }))
        .filter((schedule): schedule is JobSchedule => Boolean(schedule))
    );
    const merged = sanitized.reduce((items, schedule) => upsertById(items, schedule), storedSchedules);
    return {
      nextValue: merged.slice(0, MAX_JOB_SCHEDULES_TO_RETAIN),
      result: sanitized
    };
  });
}

export async function getJobSchedules() {
  return readCollection("jobSchedules");
}
