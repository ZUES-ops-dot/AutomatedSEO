# Qubic SEO Autopilot

A greenfield Next.js MVP for a Qubic-focused SEO command center.

The app is tailored to the product plan in `plan.md` and the UI design system in `dream.md`.
It includes:

- dashboard command center
- suggestions inbox
- content studio
- imports center with CSV parsing and validation
- connectors view
- seeded scoring engine and domain data
- lightweight JSON API endpoints for key product surfaces
- server-side connector runtime registry with env-aware readiness
- source-pack, brief, and draft generation endpoints with Anthropic-first fallback logic
- replaceable runtime persistence with Railway Postgres support and file-backed fallback
- Search Console-first search-signal sync with manual/demo fallback when Google access is unavailable
- site crawling, live connector sync, opportunity generation, content publishing/export, internal-link planning, and performance monitoring

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Papa Parse
- Lucide React

## Routes

- `/`
- `/suggestions`
- `/content`
- `/imports`
- `/connectors`

## API endpoints

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/suggestions`
- `GET /api/connectors`
- `GET /api/connectors/search-console`
- `POST /api/connectors/search-console`
- `GET /api/content`
- `GET /api/content/source-pack`
- `POST /api/content/source-pack`
- `POST /api/content/brief`
- `POST /api/content/draft`
- `POST /api/content/publish`
- `GET /api/jobs`
- `POST /api/jobs`

## Architecture

### Product layer

- `plan.md`
  - authoritative product and implementation plan
- `dream.md`
  - Stitch-style UI and design system reference

### App layer

- `src/app`
  - Next.js app router pages and API routes

### Shared UI layer

- `src/components`
  - app shell
  - route-level feature views
  - reusable UI primitives

### SEO domain layer

- `src/features/seo/types.ts`
  - shared domain types
- `src/features/seo/data/demo-data.ts`
  - seeded demo dataset for connectors, opportunities, content, jobs, and import templates
- `src/features/seo/lib/scoring.ts`
  - weighted scoring and action routing logic
- `src/features/seo/lib/imports.ts`
  - template detection and CSV validation
- `src/features/seo/lib/selectors.ts`
  - route-facing view selectors
- `src/features/seo/lib/presentation.ts`
  - badge and UI tone mapping

### Server integration layer

- `src/features/seo/server/env.ts`
  - authoritative server-side environment resolution for local and Railway runtime
- `src/features/seo/server/connectors.ts`
  - env-aware connector runtime catalog and summary helpers
- `src/features/seo/server/content-engine.ts`
  - source-pack assembly and brief/draft generation with Anthropic or deterministic fallback
- `src/features/seo/server/content-workflows.ts`
  - persisted source-pack enrichment and end-to-end generation workflows
- `src/features/seo/server/search-signals.ts`
  - Google Search Console sync plus manual/demo fallback providers
- `src/features/seo/server/crawler.ts`
  - primary/docs crawl, page inventory, metadata extraction, and crawl issue detection
- `src/features/seo/server/live-connectors.ts`
  - PageSpeed, GitHub, RSS, and GDELT ingestion with normalized persistence
- `src/features/seo/server/opportunity-engine.ts`
  - live opportunity generation from search, crawl, and source-event signals
- `src/features/seo/server/link-engine.ts`
  - draft-level internal link planning based on crawled page relevance
- `src/features/seo/server/publishing.ts`
  - markdown export or GitHub-backed publishing plus baseline performance capture
- `src/features/seo/server/monitoring.ts`
  - checkpoint snapshotting for published/exported content actions
- `src/features/seo/server/jobs.ts`
  - orchestration for crawl, connector sync, opportunities, and monitoring jobs
- `src/features/seo/server/views.ts`
  - authoritative live view composition for dashboard, suggestions, studio, and shell stats
- `src/features/seo/server/storage.ts`
  - runtime storage adapter backed by Railway Postgres when configured, with local JSON fallback

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Environment

Copy `.env.example` to `.env.local` and fill in keys as you begin wiring real connectors.

For production on **Railway**, prioritize **`DATABASE_URL`** (Postgres plugin), **`ANTHROPIC_API_KEY`**, and **`JOB_SECRET`**. Other keys depend on which connectors you enable.

Common variables:

- `DATABASE_URL` — set from Railway Postgres (required for durable persistence; without it the app uses ephemeral `.data/` on disk)
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` — cloud LLM for briefs/drafts (recommended on Railway; Ollama is local-only)
- `JOB_SECRET` — protects `POST /api/jobs`; use with cron or CI
- `PRIMARY_SITE_URL`, `DOCS_SITE_URL`, `SEARCH_CONSOLE_PROPERTY`
- `GOOGLE_API_KEY` — PageSpeed Insights
- `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`, `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` — GSC API (paste private key with `\n` for newlines)
- `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_CONTENT_*` — GitHub sync / publish
- `RSS_FEED_URLS`, `GDELT_QUERY`
- `QUBIC_RPC_BASE_URL` — display/status only unless you extend ingestion

For live Search Console sync, the service account behind `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` must also be granted access to the Search Console property configured in `SEARCH_CONSOLE_PROPERTY`.
If you do not have that access yet, the app now supports manual/demo fallback search-signal sync so you can keep building the workflow.

Real integrations that require credentials or service setup include:

- Google Search Console
- PageSpeed / CrUX API key usage
- GitHub token-backed sync
- GitHub content publishing destination
- RSS source configuration
- Qubic RPC (status surface unless you extend RPC ingestion)

## Railway deployment

This repo includes `railway.toml` (Nixpacks build, `npm run start`, health check on `GET /api/health`).

1. **Create a Railway project** and deploy from this GitHub repository.
2. **Add PostgreSQL** (Plugins → PostgreSQL). Link **`DATABASE_URL`** on the Next.js service to the Postgres connection string (Railway’s variable reference, e.g. `${{Postgres.DATABASE_URL}}`, or copy from the Postgres service).
3. **Set environment variables** in the web service (see `.env.example`). For **Search Console**, put the service account private key in **`GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`** as a single line with `\n` where line breaks belong (the app converts `\n` to real newlines).
4. **Anthropic**: set **`ANTHROPIC_API_KEY`** for production LLM generation. You do **not** need Ollama on Railway.
5. **Redis**: the application **does not** use Redis; persistence goes through **Postgres** (`pg`). You can skip Redis unless you add custom caching later.
6. **Scheduled jobs**: long runs should call **`POST /api/jobs`** with body `{ "job": "full-cycle" }` (or a specific job name) and header **`Authorization: Bearer <JOB_SECRET>`** when `JOB_SECRET` is set. Use [Railway Cron Jobs](https://docs.railway.app/reference/cron-jobs) or an external scheduler.
7. **First deploy**: after Postgres is linked, deploy once; the app creates the `seo_runtime_state` table on first DB write.

Optional: deploy the frontend/API split elsewhere later; a single Railway service running `next start` is supported.

## Content-engine endpoints

The new content routes are structured for source-grounded generation:

- `GET /api/content`
  - returns the content studio seed data plus current provider/config state
- `GET /api/content/source-pack?opportunityId=...`
  - builds a grounded source pack from the seeded opportunity graph
- `POST /api/content/source-pack`
  - accepts `{ topic, opportunityId, briefId, draftId, sourcePackId, persist }`
- `POST /api/content/brief`
  - accepts the same payload and returns a structured `ContentBrief`, persisting it by default
- `POST /api/content/draft`
  - accepts the same payload and returns a structured `DraftDocument`, persisting it by default
- `POST /api/content/publish`
  - accepts `{ draftId, target }` and exports markdown locally or pushes content into the configured GitHub repo, then stores internal-link suggestions and baseline performance snapshots

If `ANTHROPIC_API_KEY` is not configured, the generation routes fall back to deterministic structured output so the workflow remains testable.

## Search-signal sync endpoint

The first live connector is now wired through `POST /api/connectors/search-console`.

- `google_search_console`
  - preferred when the service account has Search Console access
- `manual_csv`
  - accepts manual rows in JSON for flexible fallback workflows
- `demo_seed`
  - seeds synthetic search rows when Google access is not available yet

`GET /api/connectors/search-console` returns the current provider status, available fallback modes, stored row count, and the last connector run.

## Runtime persistence

Runtime persistence uses Railway Postgres when `DATABASE_URL` and the `pg` package are available, and otherwise falls back to `.data/seo-runtime.json`.

This gives you a working save/retrieve loop now for:

- source packs
- generated briefs
- generated drafts
- connector runs
- synced search rows
- crawled pages
- PageSpeed snapshots
- source events from GitHub, RSS, and GDELT
- opportunities
- internal link suggestions
- content actions
- performance snapshots

## Job orchestration

The automation loop is exposed through `POST /api/jobs`.

- `crawl`
  - crawl `qubic.org` and `docs.qubic.org`
- `search-signals`
  - sync Search Console/manual/demo search data
- `pagespeed`
  - capture live PageSpeed snapshots
- `github`
  - sync GitHub releases/events
- `rss`
  - sync configured RSS feeds
- `gdelt`
  - ingest topical GDELT articles
- `opportunities`
  - regenerate the live opportunity feed
- `monitor-content`
  - capture performance checkpoints for published/exported drafts
- `full-cycle`
  - run the full crawl, ingest, opportunity, and monitoring sequence

If `JOB_SECRET` is set, send it as `Authorization: Bearer <secret>` or `x-job-secret` when calling `POST /api/jobs`.

## Current status

The app now has a live runtime spine for crawl data, connector ingestion, opportunity generation, publishing/export, link planning, and performance review, while preserving deterministic fallbacks when credentials are not ready yet.
