import { crawlConfiguredSites } from "@/features/seo/server/crawler";
import { buildInternalLinkAudit } from "@/features/seo/server/internal-links";
import { syncGdeltArticles, syncPageSpeed, syncRssFeeds } from "@/features/seo/server/live-connectors";
import { syncContentPerformanceReview } from "@/features/seo/server/monitoring";
import { generateOpportunityFeed } from "@/features/seo/server/opportunity-engine";
import { syncSearchSignals } from "@/features/seo/server/search-signals";

export const SEO_JOB_NAMES = [
  "crawl",
  "internal-links",
  "search-signals",
  "pagespeed",
  "rss",
  "gdelt",
  "opportunities",
  "monitor-content",
  "full-cycle"
] as const;

export type JobName = (typeof SEO_JOB_NAMES)[number];

let fullCycleInFlight: Promise<FullCycleJobResult> | null = null;

export type FullCycleJobResult = Awaited<ReturnType<typeof executeFullCycleJob>>;

export async function runSeoJob(job: JobName) {
  switch (job) {
    case "crawl":
      return {
        job,
        result: await crawlConfiguredSites()
      };
    case "internal-links":
      return {
        job,
        result: await buildInternalLinkAudit({ persist: true, crawlIfMissing: true })
      };
    case "search-signals":
      return {
        job,
        result: await syncSearchSignals()
      };
    case "pagespeed":
      return {
        job,
        result: await syncPageSpeed()
      };
    case "rss":
      return {
        job,
        result: await syncRssFeeds()
      };
    case "gdelt":
      return {
        job,
        result: await syncGdeltArticles()
      };
    case "opportunities":
      return {
        job,
        result: await generateOpportunityFeed({ persist: true })
      };
    case "monitor-content":
      return {
        job,
        result: await syncContentPerformanceReview()
      };
    case "full-cycle":
      return runFullCycleJob();
  }
}

async function executeFullCycleJob() {
  const job = "full-cycle" as const;
  const crawl = await crawlConfiguredSites();
  const internalLinks = await buildInternalLinkAudit({ persist: true, crawlIfMissing: false });

  const [searchSignals, pageSpeed, rss, gdelt] = await Promise.all([
    syncSearchSignals(),
    syncPageSpeed(),
    syncRssFeeds(),
    syncGdeltArticles()
  ]);

  const [opportunities, monitoring] = await Promise.all([
    generateOpportunityFeed({ persist: true }),
    syncContentPerformanceReview()
  ]);

  return {
    job,
    result: {
      crawl,
      internalLinks,
      searchSignals,
      pageSpeed,
      rss,
      gdelt,
      opportunities,
      monitoring
    }
  };
}

/** Serializes concurrent full-cycle runs so only one pipeline executes at a time. */
export function runFullCycleJob() {
  if (!fullCycleInFlight) {
    fullCycleInFlight = executeFullCycleJob().finally(() => {
      fullCycleInFlight = null;
    });
  }
  return fullCycleInFlight;
}
