# Codebase Audit + Research: Achieving Real SEO Results

## Part 1: Codebase Audit

### What the plan.md says you need vs what's actually built

| Plan goal | Status | Gap |
|---|---|---|
| Weighted scoring engine (§8.4) | **Done** — `scoring.ts` implements all 9 dimensions, action routing, confidence score, and priority bands exactly as specified | None |
| Action router: refresh / new_support_page / new_relevant_blog / merge / skip (§8.5–8.6) | **Done** — `decideAction()` implements all five decision paths with the correct boolean signal checks | None |
| Source-grounded content generation (§10) | **Done** — source packs, briefs, drafts with `[HUMAN REQUIRED]` markers, Anthropic-first with deterministic fallback | None |
| Search Console connector (§5.1) | **Partial** — JWT auth, query fetch, and persistence are wired, but no scheduled sync or historical accumulation yet | Needs cron + DB |
| PageSpeed / CrUX connectors (§5.1) | **Not built** — connector entries exist in demo data but no fetch logic | Missing implementation |
| GitHub connector (§5.1) | **Not built** — demo entry exists, no release/commit fetch | Missing implementation |
| RSS / GDELT connectors (§5.2–5.3) | **Not built** — demo entries exist, no feed parsing or GDELT API call | Missing implementation |
| Site crawl + snapshot pipeline (§3.1, §8.1) | **Not built** — demo connector entry only | Missing — this is critical for real SEO |
| Internal link graph (§9.3) | **Not built** — no crawl, no link map, no suggestion logic | Missing |
| Performance monitoring loop (§Monitoring loop) | **Not built** — no before/after tracking for published content | Missing |
| Publishing / CMS push (§Publishing model) | **Not built** — drafts stay in file storage, no export or CMS integration | Missing |
| Database persistence (§8.3) | **Partial** — file-backed `.data/seo-runtime.json` works but is not production-ready | Needs Railway Postgres |
| Scheduled jobs / automation cadence (§12) | **Not built** — `jobRuns` in demo data are display-only, no real scheduler | Missing |
| CSV import pipeline (§11) | **Partial** — templates and validation exist in UI, but imported rows don't feed the opportunity engine | Missing wiring |

### Good practices already followed

- **Evidence-first architecture**: every opportunity traces back to evidence, every draft includes `[HUMAN REQUIRED]` flags
- **Scoring model matches plan exactly**: weights, bands, thresholds all align with §8.7–8.8
- **Connector isolation**: each external source has its own entry with env-key awareness
- **Fallback-first**: content engine and search signals both degrade gracefully without API keys
- **Type safety**: strict TypeScript throughout, clean domain types
- **Source grounding**: briefs and drafts always reference their source pack and opportunity chain
- **Human review gate**: no auto-publish, all drafts require review — matches §10.4 and §17
- **dream.md alignment**: dark mode, operator language, evidence blocks, badge tones, panel hierarchy all match the design spec

### Issues found in the audit

1. **Opportunities are static demo data only**
   - `demo-data.ts` has 6 hardcoded opportunities
   - No code path creates opportunities from live signals (Search Console rows, crawl findings, community signals)
   - The scoring engine is correct but only scores pre-written candidates

2. **Dashboard data is entirely seeded**
   - `getDashboardView()` in `selectors.ts` pulls from `demo-data.ts`
   - Metrics, trend series, job runs, and pages-needing-attention are all hardcoded strings
   - No live data feeds into the dashboard yet

3. **Suggestions board changes are client-side only**
   - `SuggestionsBoard` uses `useState` for approve/snooze/dismiss
   - Status changes disappear on page reload — not persisted

4. **Content ideas are static**
   - `contentIdeas` in demo data never grow from real signals
   - The content engine can generate briefs and drafts, but there's no pipeline to auto-generate *ideas* from connector outputs

5. **No site crawl exists**
   - Plan §3.1 and §8.1 require crawling `qubic.org` and `docs.qubic.org`
   - Without a crawl, the tool can't detect: broken pages, redirect chains, thin content, missing metadata, internal link gaps, or schema opportunities
   - This is the single biggest SEO capability gap

6. **File storage won't survive Railway deployment**
   - `.data/seo-runtime.json` is fine for local dev but Railway's ephemeral filesystem means data is lost on every deploy
   - Needs Railway Postgres before going live

7. **No error boundaries on API routes**
   - Routes like `POST /api/connectors/search-console` will return 500 with a stack trace if the JSON body is malformed
   - Should wrap in try/catch with structured error responses

---

## Part 2: Research — How to Achieve Each SEO Goal

### 1. Real live data flowing consistently

**What this means for SEO**: Without fresh data, the tool can't detect new opportunities, track regressions, or know when content is getting stale.

**How to achieve it on Railway**:

Railway supports two models for scheduled work:

- **Cron service**: A separate Railway service with a cron schedule (e.g. `0 6 * * *` for daily at 6am). It runs your sync script, connects to the shared Postgres, and exits. Railway spins it down after completion. This is the recommended approach.

- **pg_cron**: If you use Railway Postgres, you can enable the `pg_cron` extension and schedule SQL-level jobs directly. Good for simple maintenance but not ideal for external API calls.

**Practical implementation plan**:

```
src/features/seo/server/jobs/
  sync-search-console.ts    — daily: fetch GSC rows, upsert into DB
  sync-pagespeed.ts         — daily: check priority URLs, store results
  sync-github.ts            — hourly: poll releases for qubic/core
  sync-rss.ts               — hourly: parse official feeds
  sync-gdelt.ts             — hourly: query GDELT DOC 2.0 for "Qubic"
  generate-opportunities.ts — daily: combine signals into scored candidates
  detect-stale-content.ts   — weekly: flag pages with declining metrics
```

Each job would:
1. Fetch data from the external source
2. Normalize into internal types
3. Upsert into Postgres
4. Create a `ConnectorRun` record for auditability

**Trigger approach**: A single `scripts/run-job.ts` entry point that takes a job name as an argument. The Railway cron service calls `node scripts/run-job.ts sync-search-console`. This keeps one codebase but separates the web service from the job runner.

### 2. Publishing / distribution

**What this means for SEO**: A draft sitting in your tool doesn't help rankings. It needs to get published to `qubic.org/blog-grid` or wherever the content lives.

**Options ranked by complexity**:

**A. GitHub-as-CMS (simplest, recommended first)**
- Store approved drafts as markdown files in a GitHub repo (e.g. `qubic/blog-content`)
- Use the GitHub REST API (you already have `GITHUB_TOKEN` in env) to create a PR with the draft
- The site's existing build pipeline picks up merged markdown and deploys it
- This matches the plan's "draft to markdown → human approval → publish" flow exactly
- No new CMS needed

**B. Headless CMS API push**
- If `qubic.org` uses a CMS (Payload, Sanity, Strapi, etc.), add a "push to CMS draft" action
- The draft stays in draft state in the CMS until a human publishes it
- Requires knowing which CMS is used

**C. Static export**
- Export drafts as `.md` files with frontmatter (title, meta, slug, date)
- A human manually drops them into the blog repo
- Lowest effort but also lowest automation

**Practical implementation**:
- Add a `POST /api/content/draft/:id/publish` route
- On publish: convert `DraftDocument` to markdown with frontmatter
- Push to GitHub as a PR via the REST API
- Update the draft status to `published` with the PR URL
- Add a "Publish to GitHub" button in the Content Studio UI

### 3. Internal linking decisions

**What this means for SEO**: Internal links pass relevance between pages. Without them, new content is orphaned and existing hub pages don't benefit from new supporting content.

**How to achieve it**:

**Step 1: Build a page inventory**
- Crawl `qubic.org` and `docs.qubic.org` (use `fetch` + HTML parsing, or a library like `cheerio`)
- Store each page's URL, title, headings, and outbound internal links
- This creates a link graph

**Step 2: Detect link gaps**
- For each opportunity/draft, identify which existing pages should link TO the new content
- For each new piece, identify which existing pages it should link TO
- Score link candidates by: topical relevance (shared cluster), authority (existing traffic), and structural position (hub vs leaf)

**Step 3: Generate link suggestions**
- Output: "Add a link from [source page] to [target page] with anchor text [suggested anchor]"
- Attach these to the draft's review checklist
- The plan already has an `internal_links` import template — imported link targets should feed into this system

**Practical implementation**:
```
src/features/seo/server/link-engine.ts
  - buildPageInventory(crawlData)     — creates the link graph
  - findLinkCandidates(draft, graph)  — suggests source→target pairs
  - scoreLinkOpportunity(candidate)   — relevance + authority + structure
  - generateLinkPlan(draft)           — returns a list of suggestions
```

Add a `linkSuggestions` field to `DraftDocument` and display them in the Content Studio detail view.

### 4. Performance review over time

**What this means for SEO**: You need to know if your content actions actually worked — did impressions rise? Did CTR improve? Did the page start ranking?

**How to achieve it**:

**Step 1: Snapshot before acting**
- When a draft is approved, snapshot the current Search Console metrics for its target URLs
- Store: impressions, clicks, CTR, average position, date

**Step 2: Track after publishing**
- After publishing, continue syncing Search Console data for those URLs
- At 7, 14, 30, and 90 days post-publish, compare against the before-snapshot

**Step 3: Surface wins and losses**
- If impressions rose → highlight as a win
- If impressions rose but CTR didn't → suggest title/meta revision
- If nothing moved → suggest reviewing internal links or page format
- If two pages split intent → suggest merge

This is exactly the feedback loop described in plan.md §Monitoring loop.

**Practical implementation**:
```
Types:
  PerformanceSnapshot { urlId, date, impressions, clicks, ctr, position }
  ContentAction { draftId, publishedAt, targetUrls, beforeSnapshot, afterSnapshots[] }

Jobs:
  snapshot-before-publish.ts  — runs when draft status changes to published
  track-published-content.ts  — daily: refreshes metrics for recently published URLs
  generate-win-loss-report.ts — weekly: compares before vs after
```

Add a "Performance" tab to the Content Studio that shows before/after comparisons.

### 5. More live connectors and database-backed history

**What this means for SEO**: More signal sources = better opportunity detection. Database = history survives deploys and enables trend analysis.

**Database: Railway Postgres**

Railway provides managed Postgres. The migration path from file storage:

1. Add `DATABASE_URL` to Railway env
2. Add Prisma or Drizzle as the ORM
3. Define schema matching `SeoPersistenceState` + new tables for crawl data, page inventory, link graph, performance snapshots
4. Replace `storage.ts` read/write functions with DB queries
5. The API routes don't change — only the storage adapter changes

**Recommended schema additions** (beyond current persistence):

| Table | Purpose |
|---|---|
| `pages` | URL inventory from crawls |
| `page_snapshots` | Historical metadata, status codes, heading structure |
| `internal_links` | Source → target link graph |
| `page_metrics` | Time-series Search Console data per URL |
| `content_actions` | Published draft tracking with before/after snapshots |
| `github_events` | Release/commit records from Qubic repos |
| `rss_items` | Feed items for freshness signals |
| `gdelt_articles` | News mentions for opportunity seeding |

**Live connectors to build next** (in priority order):

1. **PageSpeed Insights** — single `fetch` call per URL, free with API key, immediate value for performance suggestions
2. **GitHub releases** — poll `https://api.github.com/repos/qubic/core/releases`, seed content ideas from changelogs
3. **RSS watcher** — parse Atom/RSS feeds from official Qubic channels, detect freshness signals
4. **GDELT DOC 2.0** — `GET https://api.gdeltproject.org/api/v2/doc/doc?query="Qubic"&mode=artlist&format=json`, free, no auth
5. **Site crawl** — fetch + cheerio for HTML parsing, build page inventory and link graph

---

## Part 3: Priority Roadmap

Based on the audit and research, here's what to build next in order of SEO impact:

### Tier 1 — Unblocks real SEO work

1. **Railway Postgres** — replace file storage so data survives deployments
2. **Site crawl for qubic.org** — creates page inventory, enables link analysis and technical SEO detection
3. **Opportunity generation from live signals** — turn Search Console rows + crawl findings into scored opportunities instead of only using demo data

### Tier 2 — Enables the content loop

4. **GitHub publish action** — push approved drafts as PRs to the blog repo
5. **Internal link engine** — suggest links for new and refreshed content
6. **Performance snapshots** — before/after tracking for published content

### Tier 3 — Expands signal coverage

7. **PageSpeed connector** — performance-based suggestions
8. **GitHub releases connector** — changelog-driven content ideas
9. **RSS + GDELT connectors** — freshness and news-driven ideas
10. **Railway cron service** — automated daily/hourly sync for all connectors

### Tier 4 — Closes the feedback loop

11. **Win/loss reporting** — weekly comparison of published content vs baseline
12. **Stale content detection** — flag pages with declining metrics for refresh
13. **Opportunity status persistence** — approve/snooze/dismiss survives reload
14. **Dashboard driven by live data** — metrics, trends, and job status from DB instead of hardcoded values

---

## Summary

**What's working well**: The scoring engine, action router, source-grounded content generation, human review gates, connector isolation, fallback logic, and type safety are all correctly implemented and aligned with the plan.

**What's missing for real SEO impact**: Live data ingestion, site crawling, publishing workflow, internal linking, performance tracking, and database persistence. These are the gaps between "a tool that shows you what SEO work could look like" and "a tool that actually helps you rank."

**Biggest single win**: Building the site crawl + Railway Postgres combo, because it unlocks page inventory, link analysis, technical SEO detection, and historical trend tracking all at once.
