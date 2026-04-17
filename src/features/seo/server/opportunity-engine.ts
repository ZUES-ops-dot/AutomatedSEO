import { opportunities as seededOpportunities } from "@/features/seo/data/demo-data";
import { enrichOpportunity } from "@/features/seo/lib/scoring";
import { getSearchPerformanceRows, getSitePages, getSourceEvents, getStoredOpportunities, saveConnectorRun, saveOpportunities } from "@/features/seo/server/storage";
import type { ConnectorRun, Opportunity, OpportunityCandidate, SearchPerformanceRow, SitePage, SourceEvent } from "@/features/seo/types";

interface OpportunityEngineInput {
  persist?: boolean;
  recordRun?: boolean;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function splitTerms(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function similarityScore(left: string, right: string) {
  const leftTerms = new Set(splitTerms(left));
  const rightTerms = new Set(splitTerms(right));
  if (leftTerms.size === 0 && rightTerms.size === 0) {
    return 1;
  }
  if (leftTerms.size === 0 || rightTerms.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftTerms.forEach((term) => {
    if (rightTerms.has(term)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftTerms.size, rightTerms.size);
}

function inferCluster(query: string) {
  if (/wallet|setup|troubleshoot|recover/i.test(query)) {
    return "wallet onboarding";
  }

  if (/ecosystem|launch|update|release/i.test(query)) {
    return "ecosystem momentum";
  }

  if (/smart contract|contract|developer|docs/i.test(query)) {
    return "developer education";
  }

  return "search opportunity";
}

function inferPageType(page: string): OpportunityCandidate["pageType"] {
  if (page.includes("docs.")) {
    return "docs";
  }

  if (page.includes("blog") || page.includes("/blog-grid")) {
    return "blog";
  }

  if (page.includes("ecosystem")) {
    return "ecosystem";
  }

  return "landing";
}

function getPathname(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function findClosestPage(row: SearchPerformanceRow, pages: SitePage[]) {
  return (
    pages.find((page) => page.url === row.page) ??
    pages
      .map((page) => ({ page, score: similarityScore(`${page.title} ${page.headings.join(" ")}`, row.query) }))
      .sort((left, right) => right.score - left.score)[0]?.page ??
    null
  );
}

export function buildRefreshCandidate(row: SearchPerformanceRow, page: SitePage | null, existingStatus?: Opportunity["status"]): OpportunityCandidate {
  const businessRelevance = clamp(row.page.includes("ecosystem") ? 88 : row.page.includes("docs") ? 82 : 74);
  const demandSignal = clamp(Math.log10(Math.max(row.impressions, 1)) * 40 + 18);
  const ctrGap = clamp((0.12 - row.ctr) * 600 + 30);
  const freshnessNeed = clamp((page?.issues.length ?? 0) * 12 + (page?.wordCount && page.wordCount < 250 ? 20 : 8));
  const uniquenessPotential = clamp(62 + (page?.headings.length ?? 0) * 4);
  const enrichmentAvailable = clamp(page ? 78 : 58);
  const internalLinkSupport = clamp(Math.min(page?.internalLinks.length ?? 1, 12) * 7);
  const cannibalizationRisk = clamp(page?.canonicalUrl && page.canonicalUrl !== row.page ? 45 : 12);
  const difficultyGap = clamp(row.position > 20 ? 62 : row.position > 10 ? 38 : 24);
  const cluster = inferCluster(row.query);

  return {
    id: `opp-refresh-${slugify(row.query)}-${slugify(row.page)}`,
    title: `Refresh ${titleCase(row.query)} coverage for ${getPathname(row.page)}`,
    cluster,
    primaryQuery: row.query,
    affectedUrls: [row.page],
    pageType: inferPageType(row.page),
    reason: `Search performance shows ${row.impressions} impressions and ${(row.ctr * 100).toFixed(1)}% CTR for ${row.query}, suggesting an existing-page refresh opportunity.`,
    evidence: [
      `Search Console row: ${row.clicks} clicks, ${row.impressions} impressions, ${(row.ctr * 100).toFixed(1)}% CTR, average position ${row.position.toFixed(1)}.`,
      ...(page ? page.issues.map((issue) => `Crawl signal: ${issue}`) : ["No crawl snapshot exists for this URL yet."]),
      `Primary URL observed: ${row.page}`
    ],
    sourceTypes: [
      "search_console",
      ...(page
        ? [
            page.site === "docs" ? "docs_crawl" : page.site === "blog" ? "blog_crawl" : "site_crawl"
          ]
        : [])
    ],
    businessRelevance,
    demandSignal,
    ctrGap,
    freshnessNeed,
    uniquenessPotential,
    enrichmentAvailable,
    internalLinkSupport,
    cannibalizationRisk,
    difficultyGap,
    existingPageTargetsIntent: true,
    rankingButUnderperforming: row.position <= 20 && row.impressions >= 20,
    ctrWeak: row.ctr < 0.06,
    staleOrMissingSubtopics: Boolean(page?.issues.length),
    repeatedIntent: false,
    noCurrentPageMapsCleanly: false,
    evergreenBetterThanBlog: false,
    supportsPriorityCluster: /wallet|ecosystem|smart contract|developer/i.test(cluster),
    risingTopic: false,
    commentaryAddsValue: false,
    firstPartyContextAvailable: Boolean(page),
    overlappingPages: false,
    strongerCanonicalExists: Boolean(page?.canonicalUrl && page.canonicalUrl !== row.page),
    demandTooWeak: row.impressions < 10,
    competitionTooStrong: row.position > 35,
    limitedUniqueValue: false,
    offStrategy: false,
    status: existingStatus ?? "new",
    lastUpdated: new Date().toISOString()
  };
}

export function buildSupportCandidate(rows: SearchPerformanceRow[], existingStatus?: Opportunity["status"]): OpportunityCandidate | null {
  const topRow = [...rows].sort((left, right) => right.impressions - left.impressions)[0];
  if (!topRow) {
    return null;
  }

  const cluster = inferCluster(topRow.query);
  const totalImpressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const rootLikePages = rows.filter((row) => /https:\/\/[^/]+\/?$/i.test(row.page) || /docs\.qubic\.org\/?$/i.test(row.page));

  return {
    id: `opp-support-${slugify(cluster)}-${slugify(topRow.query)}`,
    title: `Create a support page for ${titleCase(topRow.query)}`,
    cluster,
    primaryQuery: topRow.query,
    affectedUrls: rows.map((row) => row.page),
    pageType: "landing",
    reason: `The query cluster around ${topRow.query} is spread across ${rows.length} rows without a clear evergreen owner page.`,
    evidence: [
      `Cluster totals: ${totalClicks} clicks and ${totalImpressions} impressions across related rows.`,
      `Observed pages: ${rows.map((row) => row.page).join(", ")}`,
      rootLikePages.length > 0
        ? "Traffic is landing on root-like pages, suggesting the intent lacks a dedicated support asset."
        : "Related demand is distributed across multiple URLs without a single canonical support page."
    ],
    sourceTypes: ["search_console", "search_gap_review"],
    businessRelevance: clamp(82 + rootLikePages.length * 4),
    demandSignal: clamp(Math.log10(Math.max(totalImpressions, 1)) * 40 + 15),
    ctrGap: clamp((0.1 - totalClicks / Math.max(totalImpressions, 1)) * 500 + 28),
    freshnessNeed: 58,
    uniquenessPotential: 84,
    enrichmentAvailable: 78,
    internalLinkSupport: 74,
    cannibalizationRisk: 16,
    difficultyGap: clamp(topRow.position > 20 ? 56 : 34),
    existingPageTargetsIntent: false,
    rankingButUnderperforming: false,
    ctrWeak: totalClicks / Math.max(totalImpressions, 1) < 0.06,
    staleOrMissingSubtopics: false,
    repeatedIntent: true,
    noCurrentPageMapsCleanly: true,
    evergreenBetterThanBlog: /setup|guide|wallet|how|faq|docs/i.test(topRow.query),
    supportsPriorityCluster: /wallet|ecosystem|developer|smart contract/i.test(cluster),
    risingTopic: false,
    commentaryAddsValue: false,
    firstPartyContextAvailable: true,
    overlappingPages: false,
    strongerCanonicalExists: false,
    demandTooWeak: totalImpressions < 15,
    competitionTooStrong: topRow.position > 35,
    limitedUniqueValue: false,
    offStrategy: false,
    status: existingStatus ?? "new",
    lastUpdated: new Date().toISOString()
  };
}

function buildFreshnessCandidate(event: SourceEvent, existingStatus?: Opportunity["status"]): OpportunityCandidate {
  const cluster = inferCluster(event.title);
  const daysOld = Math.max(0, (Date.now() - Date.parse(event.publishedAt)) / (1000 * 60 * 60 * 24));
  const freshnessBoost = clamp(85 - Math.min(30, daysOld));

  return {
    id: `opp-blog-${event.connectorId}-${slugify(event.title)}`,
    title: `Turn ${event.title} into a relevant blog or update note`,
    cluster,
    primaryQuery: event.title.toLowerCase(),
    affectedUrls: [event.url],
    pageType: "blog",
    reason: `${event.connectorId} surfaced a fresh signal that can support a timely, evidence-backed blog or changelog-style asset.`,
    evidence: [
      `${event.connectorId} signal: ${event.summary}`,
      `Source URL: ${event.url}`,
      `Published at: ${event.publishedAt}`
    ],
    sourceTypes: [event.connectorId === "github" ? "github" : event.connectorId === "gdelt" ? "gdelt" : "community_signal"],
    businessRelevance: clamp(event.kind === "github_release" ? 84 : 70),
    demandSignal: clamp(event.score + 5),
    ctrGap: 48,
    freshnessNeed: freshnessBoost,
    uniquenessPotential: clamp(event.kind === "github_release" ? 88 : 74),
    enrichmentAvailable: clamp(event.connectorId === "rss-watch" || event.connectorId === "github" ? 86 : 62),
    internalLinkSupport: 72,
    cannibalizationRisk: 12,
    difficultyGap: 30,
    existingPageTargetsIntent: false,
    rankingButUnderperforming: false,
    ctrWeak: false,
    staleOrMissingSubtopics: false,
    repeatedIntent: false,
    noCurrentPageMapsCleanly: true,
    evergreenBetterThanBlog: false,
    supportsPriorityCluster: true,
    risingTopic: true,
    commentaryAddsValue: true,
    firstPartyContextAvailable: event.connectorId !== "gdelt",
    overlappingPages: false,
    strongerCanonicalExists: false,
    demandTooWeak: false,
    competitionTooStrong: false,
    limitedUniqueValue: false,
    offStrategy: false,
    status: existingStatus ?? "new",
    lastUpdated: new Date().toISOString()
  };
}

function buildMergeCandidates(pages: SitePage[], existingById: Map<string, Opportunity>) {
  const candidates: OpportunityCandidate[] = [];
  const candidatePages = pages.slice(0, 50);

  for (let index = 0; index < candidatePages.length; index += 1) {
    const left = candidatePages[index];
    for (let rightIndex = index + 1; rightIndex < candidatePages.length; rightIndex += 1) {
      const right = candidatePages[rightIndex];
      const similarity = similarityScore(`${left.title} ${left.headings.join(" ")}`, `${right.title} ${right.headings.join(" ")}`);
      if (similarity < 0.72) {
        continue;
      }

      const id = `opp-merge-${slugify(left.url)}-${slugify(right.url)}`;
      candidates.push({
        id,
        title: `Merge overlapping pages ${getPathname(left.url)} and ${getPathname(right.url)}`,
        cluster: inferCluster(`${left.title} ${right.title}`),
        primaryQuery: left.title.toLowerCase(),
        affectedUrls: [left.url, right.url],
        pageType: inferPageType(left.url),
        reason: `The crawl found two highly similar pages that may be splitting relevance and internal-link equity.`,
        evidence: [
          `Similarity score: ${(similarity * 100).toFixed(0)}% based on titles/headings.`,
          `${left.url} has ${left.wordCount} visible words; ${right.url} has ${right.wordCount}.`,
          `Both pages may compete for the same intent cluster.`
        ],
        sourceTypes: ["site_crawl", "internal_link_graph"],
        businessRelevance: 70,
        demandSignal: 48,
        ctrGap: 40,
        freshnessNeed: 52,
        uniquenessPotential: 58,
        enrichmentAvailable: 62,
        internalLinkSupport: 64,
        cannibalizationRisk: 84,
        difficultyGap: 22,
        existingPageTargetsIntent: true,
        rankingButUnderperforming: false,
        ctrWeak: false,
        staleOrMissingSubtopics: false,
        repeatedIntent: false,
        noCurrentPageMapsCleanly: false,
        evergreenBetterThanBlog: false,
        supportsPriorityCluster: true,
        risingTopic: false,
        commentaryAddsValue: false,
        firstPartyContextAvailable: true,
        overlappingPages: true,
        strongerCanonicalExists: false,
        demandTooWeak: false,
        competitionTooStrong: false,
        limitedUniqueValue: false,
        offStrategy: false,
        status: existingById.get(id)?.status ?? "new",
        lastUpdated: new Date().toISOString()
      });
    }
  }

  return candidates;
}

function dedupeCandidates(candidates: OpportunityCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) {
      return false;
    }
    seen.add(candidate.id);
    return true;
  });
}

function buildRun(status: ConnectorRun["status"], detail: string, recordCount: number, startedAt: string): ConnectorRun {
  return {
    id: `opportunity-engine-run-${Date.now()}`,
    connectorId: "suggestions-engine",
    provider: "opportunity_engine",
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    detail,
    recordCount,
    metadata: {}
  };
}

export async function getReadableOpportunities() {
  const stored = await getStoredOpportunities();
  return stored.length > 0 ? stored : seededOpportunities;
}

export async function generateOpportunityFeed(input: OpportunityEngineInput = {}) {
  const startedAt = new Date().toISOString();
  const stored = await getStoredOpportunities();
  const existingById = new Map(stored.map((item) => [item.id, item]));
  const searchRows = await getSearchPerformanceRows();
  const pages = await getSitePages();
  const events = await getSourceEvents();

  const refreshCandidates = searchRows.slice(0, 12).map((row) => buildRefreshCandidate(row, findClosestPage(row, pages), existingById.get(`opp-refresh-${slugify(row.query)}-${slugify(row.page)}`)?.status));
  const groupedSupportRows = new Map<string, SearchPerformanceRow[]>();

  for (const row of searchRows) {
    const key = inferCluster(row.query);
    groupedSupportRows.set(key, [...(groupedSupportRows.get(key) ?? []), row]);
  }

  const supportCandidates = Array.from(groupedSupportRows.values())
    .filter((rows) => rows.length >= 2)
    .map((rows) => {
      const topRow = [...rows].sort((left, right) => right.impressions - left.impressions)[0];
      const statusKey = topRow
        ? `opp-support-${slugify(inferCluster(topRow.query))}-${slugify(topRow.query)}`
        : "";
      return buildSupportCandidate(rows, existingById.get(statusKey)?.status);
    })
    .filter((candidate): candidate is OpportunityCandidate => candidate !== null);
  const freshnessCandidates = events
    .slice(0, 8)
    .map((event) => buildFreshnessCandidate(event, existingById.get(`opp-blog-${event.connectorId}-${slugify(event.title)}`)?.status));
  const mergeCandidates = buildMergeCandidates(pages.slice(0, 20), existingById);

  const generated = dedupeCandidates([...refreshCandidates, ...supportCandidates, ...freshnessCandidates, ...mergeCandidates]).map((candidate) => enrichOpportunity(candidate));
  const opportunities = generated.length > 0 ? generated.sort((left, right) => right.score - left.score).slice(0, 30) : stored.length > 0 ? stored : seededOpportunities;

  if (input.persist ?? true) {
    await saveOpportunities(opportunities);
  }

  const run = buildRun(
    opportunities.length > 0 ? "success" : "fallback",
    generated.length === 0 && stored.length === 0
      ? "No live crawl/search/event data was available, so the seeded opportunity set remains active."
      : `Generated ${opportunities.length} opportunities from crawl, search, and freshness signals.`,
    opportunities.length,
    startedAt
  );

  if (input.recordRun ?? (input.persist ?? true)) {
    await saveConnectorRun(run);
  }

  return {
    opportunities,
    run
  };
}
