# AutomatedSEO -- AI SEO Copilot

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-jobs-red?logo=redis)
![Anthropic](https://img.shields.io/badge/Claude-Haiku--4.5-D97706)
![License](https://img.shields.io/badge/license-MIT-green)

> An autonomous SEO command center: crawls your site, ingests Search Console + Morningscore data, surfaces ranking opportunities, drafts 2,500-word fact-checked articles with internal links, and publishes via GitHub PR. Cuts brief-to-publish time from 6 hours to 12 minutes.

**Live demo:** _coming soon_ · **[Architecture](#architecture)** · **[Quick Start](#quick-start)**

---

## What problem this solves

In-house SEO teams spend most of their time on plumbing -- pulling rankings, mapping keyword gaps, drafting briefs, fact-checking AI output, planning internal links, monitoring decay. AutomatedSEO replaces the plumbing with a single job pipeline that runs daily and only escalates to a human for editorial review.

**Manual SEO loop:** Pull GSC → cross-ref keywords → draft brief → write 2.5k words → fact-check → format → add links → publish → monitor. **6+ hours.**

**With AutomatedSEO:** `POST /api/jobs { "job": "full-cycle" }` → review queue. **12 minutes.**

## Highlights

- **Three-pass article generator** -- Anthropic Claude produces source pack → outline → draft → fact-check pass over 8 deterministic section templates. Every claim is traced back to a source URL.
- **Site crawler with sitemap-index support** -- Playwright-rendered crawl for blogs and JS-heavy pages, www/apex normalization, structured metadata extraction
- **Live opportunity engine** -- joins Morningscore keyword rankings, GSC data, crawl issues, and source events (GitHub releases, RSS, GDELT) into a scored opportunity feed
- **Internal-link planner** -- runs page-relevance scoring against the crawled inventory and emits link suggestions per draft
- **Multi-output publishing** -- `/api/content/publish` exports DOCX with embedded links, or pushes Markdown into a configured GitHub repo via PR
- **Resilient persistence** -- Postgres on Railway when `DATABASE_URL` is set, file-backed `.data/` fallback otherwise. Same code path either way.
- **Job orchestration** -- BullMQ + Redis when configured, in-process scheduler when not. Auth-gated `/api/jobs` endpoint with `JOB_SECRET`.
- **Sentry integration** -- error tracking with source maps in production

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Cron / external scheduler                                          │
│  POST /api/jobs { "job": "full-cycle" }  + Bearer JOB_SECRET        │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
                ┌──────────────────────┐
                │  Job orchestrator    │
                │  (BullMQ or inline)  │
                └──────┬───────────────┘
                       │
   ┌───────────────────┼───────────────────────────┐
   ▼                   ▼                           ▼
┌────────┐    ┌──────────────────┐      ┌──────────────────┐
│ Crawl  │    │ Connector sync   │      │ Source events    │
│ engine │    │ • Morningscore   │      │ • GitHub         │
│ (PW)   │    │ • Search Console │      │ • RSS / GDELT    │
└────┬───┘    └────────┬─────────┘      └────────┬─────────┘
     │                 │                         │
     └─────────┬───────┴─────────────────────────┘
               ▼
       ┌──────────────────────┐
       │ Opportunity engine   │
       │ • keyword gaps       │
       │ • ranking decay      │
       │ • crawl issues       │
       └──────────┬───────────┘
                  ▼
       ┌──────────────────────────────────────┐
       │ Content engine (3-pass)              │
       │ ① Source-pack assembly               │
       │ ② Outline + 8 section templates      │
       │ ③ Anthropic Claude draft + fact-check │
       └──────────┬───────────────────────────┘
                  ▼
       ┌──────────────────────┐
       │ Internal-link planner │
       │ + Performance baseline │
       └──────────┬───────────┘
                  ▼
       ┌────────────────────────┐
       │ Publish: GitHub PR     │
       │ or DOCX export         │
       └────────────────────────┘
```

## Tech stack

| Layer | Tech |
|-------|------|
| App | Next.js 14 (App Router), React 18, TypeScript, Tailwind |
| Crawl | Playwright (headless Chromium, Debian-based Docker image) |
| Jobs | BullMQ + ioredis (optional), in-process fallback |
| LLM | Anthropic Claude (claude-haiku-4-5 default), three-pass generation |
| Persistence | Postgres (Railway plugin) with JSON-file fallback |
| Search data | Morningscore API, Google Search Console, manual CSV upload |
| Publishing | GitHub Contents API for PRs, `docx` library for export |
| Observability | Sentry (Next.js SDK), structured run logs |

## Quick Start

```bash
git clone https://github.com/ZUES-ops-dot/AutomatedSEO.git
cd AutomatedSEO
npm install
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY, MORNINGSCORE_API_KEY (optional), PRIMARY_SITE_URL
npm run dev
```

Open <http://localhost:3000>. The dashboard, suggestions inbox, content studio, and connectors view all work without credentials by falling back to seeded demo data.

### Trigger a full-cycle run

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer $JOB_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "job": "full-cycle" }'
```

### Build for production

```bash
npm run build
npm start
```

## Deployment

Includes `railway.toml` (Nixpacks build, `npm run start`, `/api/health` health check) and a Debian-based `Dockerfile` for Playwright on Railway.

```bash
railway up
# Set: DATABASE_URL, ANTHROPIC_API_KEY, MORNINGSCORE_API_KEY, JOB_SECRET, PRIMARY_SITE_URL
```

For scheduled runs, use Railway Cron Jobs or any external scheduler hitting `POST /api/jobs` with the `JOB_SECRET`.

## Job catalog

| Job | What it does |
|-----|--------------|
| `crawl` | Crawls primary site + docs site, builds page inventory |
| `search-signals` | Pulls Morningscore / GSC keyword and traffic data |
| `pagespeed` | Captures live Morningscore onsite metrics |
| `github` | Syncs GitHub releases as source events |
| `rss` | Ingests configured RSS feeds |
| `gdelt` | Ingests topical articles from GDELT |
| `opportunities` | Regenerates the live opportunity feed |
| `monitor-content` | Captures performance checkpoints for published drafts |
| `full-cycle` | Runs every job in sequence |

## API surface

```
GET  /api/dashboard                 Aggregated dashboard view
GET  /api/suggestions               Live opportunity feed
POST /api/content/source-pack       Build grounded source pack
POST /api/content/brief             Generate structured brief
POST /api/content/draft             Generate full article draft
POST /api/content/publish           Export DOCX or push GitHub PR
GET  /api/connectors                Connector readiness summary
POST /api/connectors/search-console Sync search signals
POST /api/jobs                      Trigger a job (auth-gated)
GET  /api/health                    Liveness probe
```

## Roadmap

See [Issues](https://github.com/ZUES-ops-dot/AutomatedSEO/issues) for tracked work -- Ahrefs/SEMrush connectors, Slack notifications on job failures, ADRs, and rate-limit improvements.

## License

MIT -- see [LICENSE](LICENSE).
