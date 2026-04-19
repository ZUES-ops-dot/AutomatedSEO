# Environment Variables Setup Guide (Railway Deployment)

This guide walks you through obtaining every API key and environment variable needed to deploy Qubic SEO Autopilot on Railway with both frontend and backend hosted there.

**Important:** Since you're hosting on Railway, you must use **Anthropic API** for AI features. Local LLMs like Ollama are not accessible from cloud deployments.

---

## Table of Contents

1. [Quick Start (Railway Deployment)](#quick-start-railway-deployment)
2. [Required for Production](#required-for-production)
3. [AI / LLM (Anthropic)](#ai--llm-anthropic)
4. [Google PageSpeed & Morningscore](#google-pagespeed--morningscore)
5. [Database & Caching](#database--caching)
6. [Monitoring & Error Tracking](#monitoring--error-tracking)
7. [Content Sources](#content-sources)
8. [Security](#security)
9. [Complete Railway Environment Variables](#complete-railway-environment-variables)

---

## Quick Start (Railway Deployment)

For Railway deployment, you need:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
JOB_SECRET=your-generated-secret-min-32-chars
```

The app works with fallbacks for all other features.

**Railway will auto-generate:** `DATABASE_URL` (via Postgres plugin)

**Optional but recommended:** `MORNINGSCORE_API_KEY`

---

## Required for Production

### `JOB_SECRET` (Required on Railway)

A random secret to protect job execution endpoints.

**How to generate:**
```bash
# Generate a secure random string
openssl rand -hex 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Usage:** Include as `Authorization: Bearer <JOB_SECRET>` header when calling `/api/jobs`.

---

## AI / LLM (Anthropic)

Since you're hosting on Railway, you **must use Anthropic**. Ollama and other local LLMs are not accessible from cloud deployments.

### Getting Your Anthropic API Key

**`ANTHROPIC_API_KEY`**

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Click "Get API keys" → "Create Key"
4. Copy the key (starts with `sk-ant-api03-`)
5. Add to Railway Variables: `ANTHROPIC_API_KEY=sk-ant-api03-your-key`

**Cost estimate:** ~$0.50-2.00 per brief generation depending on model. Set up usage limits in your Anthropic console.

**`ANTHROPIC_MODEL`** (Optional, defaults to `claude-3-5-sonnet-latest`)

Available options:
- `claude-3-5-sonnet-latest` (recommended, best balance)
- `claude-3-5-haiku-latest` (faster, cheaper)
- `claude-3-opus-latest` (best quality, most expensive)

---

## Google PageSpeed & Morningscore

### Morningscore API (search performance, onsite, issues, backlinks)

Replaces Google Search Console and GA4 for this app: keyword rankings, estimated traffic, landing pages, Morningscore value, Linkscore, and onsite Healthscore. See [api.morningscore.io](https://api.morningscore.io) and [Morningscore SEO API](https://morningscore.io/seo-api/).

**`MORNINGSCORE_API_KEY`**

1. Open [Morningscore](https://v3.morningscore.io) and add your website as a domain if needed.
2. Go to **Settings → API** and create an API key (Bearer token).
3. Set `MORNINGSCORE_API_KEY=<your-token>` in Railway or `.env.local`.
4. **Railway:** Add the variable on the **same service** that runs the Next.js app (`next start`). Variables attached only to Postgres/Redis/Cron services are not visible to the web process—if the UI shows “Not loaded”, fix the service or name, then **redeploy**.
5. **Aliases:** The app also reads `MORNINGSCORE_TOKEN` or `MS_API_KEY` if `MORNINGSCORE_API_KEY` is empty (useful when fixing naming mistakes).

**`MORNINGSCORE_DOMAIN_ID`** (optional)

- The `global_domain_identifier` returned by `GET https://api.morningscore.io/v1/domains`.
- If omitted, the app matches `PRIMARY_SITE_URL`’s hostname to your Morningscore domains list.

**Rate limits:** about 2 requests per second (see Morningscore docs). Sync batches keyword pages with a short delay between calls.

### Site crawl & Playwright (blog / rendered pages)

Framer and similar sites need a **headless browser** for full HTML. The app uses **Playwright Chromium**.

- **Docker / Railway (this repo):** The `Dockerfile` **runner** image is Debian-based and runs `npx playwright install chromium --with-deps` at build time. Redeploy after pulling the updated Dockerfile so the browser binary exists in the image.
- **Local dev:** After `npm install`, run once:
  ```bash
  npx playwright install chromium
  ```
  Without this, crawls fall back to plain HTTP fetch (often **0 blog pages** for client-rendered sites), and dashboard “Activity” may show blog crawl errors.

---

## Database & Caching

### PostgreSQL

**`DATABASE_URL`**

**Option 1: Railway (Recommended for Production)**
1. In Railway, add the "PostgreSQL" plugin to your project
2. Railway auto-generates `DATABASE_URL`
3. The app uses this automatically (no manual copy needed if using variable reference)

**Option 2: Local Development**
1. Install Postgres locally or use Docker:
   ```bash
   docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
   ```
2. Set in `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
   ```

**Option 3: Neon/Supabase (Cloud)**
1. Create account at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com)
2. Create a project
3. Copy connection string from dashboard
4. Set in `.env.local`:
   ```
   DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
   ```

**Note:** If `DATABASE_URL` is not set, the app falls back to file-based storage in `.data/seo-runtime/`.

---

### Redis (Optional, for job queue)

**`REDIS_URL`**

**Option 1: Railway**
1. Add "Redis" plugin to your Railway project
2. Railway auto-generates `REDIS_URL`

**Option 2: Local**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```
Set in `.env.local`:
```
REDIS_URL=redis://localhost:6379
```

**Option 3: Upstash (Serverless Redis)**
1. Go to [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy the Redis URL
4. Set in `.env.local`:
   ```
   REDIS_URL=rediss://default:pass@your-db.upstash.io:6379
   ```

**`USE_JOB_QUEUE`**
- Set to `true` to enable BullMQ job queue (requires Redis)
- When enabled, long-running jobs are processed by a separate worker

---

### File Storage Location (Optional)

**`SEO_DATA_DIR`**

Override where file-based data is stored (default: project root `.data/`).

```bash
SEO_DATA_DIR=/var/lib/qubic-seo/data
```

---

## Monitoring & Error Tracking

### Sentry (Optional)

**`SENTRY_DSN`** (server-side)  
**`NEXT_PUBLIC_SENTRY_DSN`** (client-side)

1. Go to [sentry.io](https://sentry.io)
2. Create project → Select "Next.js"
3. Copy DSN from the setup instructions
4. Set in `.env.local`:
   ```
   SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
   ```

---

## Content Sources

### RSS Feeds

**`RSS_FEED_URLS`**

Comma-separated list of RSS feed URLs to monitor for content ideas.

```bash
RSS_FEED_URLS=https://qubic.org/blog/feed.xml,https://docs.qubic.org/rss.xml
```

---

### GitHub (for release notes & content publishing)

**`GITHUB_TOKEN`**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. Scopes needed: `repo` (for content repo), `read:packages` (optional)
4. Copy token and set in `.env.local`:
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   ```

**`GITHUB_REPO`** (Optional, defaults to `qubic/core`)
- Repository to fetch releases from for news/updates

**`GITHUB_CONTENT_REPO`** (Optional)
- Repository to publish generated content to
- Example: `your-org/your-blog`

**`GITHUB_CONTENT_BRANCH`** (Optional, defaults to `main`)

**`GITHUB_CONTENT_PATH`** (Optional, defaults to `content/seo`)
- Path within the repo where SEO content is stored

---

### GDELT (Global Database of Events, Language, and Tone)

**`GDELT_QUERY`** (Optional, defaults to `"Qubic" OR qubic.org`)

No API key required. This configures what terms to search for in GDELT's global news database.

```bash
GDELT_QUERY="Qubic Network" OR "Qubic blockchain" OR qubic.org
```

---

## Security

### Multi-Tenant Mode (Advanced)

**`MULTI_TENANT`**

Set to `true` to enable multi-tenant mode. When enabled, `X-Tenant-Id` header is honored for rate limits and domain events.

```bash
MULTI_TENANT=false
```

**Note:** Storage remains single-DB until sharded. This is for future-proofing.

---

## Site Configuration

These have sensible defaults but can be customized:

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_APP_NAME` | `Qubic SEO Autopilot` | App name in UI |
| `PRIMARY_SITE_URL` | `https://qubic.org` | Main site to optimize |
| `DOCS_SITE_URL` | `https://docs.qubic.org` | Documentation site |
| `BLOG_SITE_URL` | `https://qubic.org` | Base URL where blog posts are crawled |
| `BLOG_URL_PATH_PREFIX` | `/blog-detail` | Path prefix for blog URLs on that host |
| `QUBIC_RPC_BASE_URL` | `https://rpc.qubic.org` | Qubic blockchain RPC |
| `MORNINGSCORE_DOMAIN_ID` | _(empty)_ | Optional; `global_domain_identifier` from Morningscore `/v1/domains` |

---

## Complete Railway Environment Variables

Set these in your Railway project dashboard (Variables section):

```bash
# =============================================================================
# Core App Settings
# =============================================================================
NEXT_PUBLIC_APP_NAME=Qubic SEO Autopilot
PRIMARY_SITE_URL=https://qubic.org
DOCS_SITE_URL=https://docs.qubic.org
BLOG_SITE_URL=https://qubic.org
BLOG_URL_PATH_PREFIX=/blog-detail
QUBIC_RPC_BASE_URL=https://rpc.qubic.org
GDELT_QUERY="Qubic" OR qubic.org

# =============================================================================
# AI / LLM — Anthropic is required for Railway
# =============================================================================
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# =============================================================================
# Morningscore (optional — keywords, onsite, dashboard)
# =============================================================================
MORNINGSCORE_API_KEY=your-morningscore-bearer-token
MORNINGSCORE_DOMAIN_ID=

# =============================================================================
# Content Sources (Optional)
# =============================================================================
RSS_FEED_URLS=https://qubic.org/blog/feed.xml,https://docs.qubic.org/rss.xml
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO=qubic/core
GITHUB_CONTENT_REPO=your-org/your-blog
GITHUB_CONTENT_BRANCH=main
GITHUB_CONTENT_PATH=content/seo

# =============================================================================
# Database & Infrastructure (Railway auto-generates DATABASE_URL)
# =============================================================================
# DATABASE_URL is auto-generated by Railway Postgres plugin
REDIS_URL=redis://localhost:6379  # Optional: add Redis plugin if needed
USE_JOB_QUEUE=false

# =============================================================================
# Security (Required)
# =============================================================================
JOB_SECRET=your-generated-secret-min-32-chars-long

# =============================================================================
# Monitoring (Optional)
# =============================================================================
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz

# =============================================================================
# Multi-tenant (Advanced, Optional)
# =============================================================================
MULTI_TENANT=false
```

---

## Verification

After deploying to Railway:

```bash
# Check health endpoint
curl https://your-railway-domain.railway.app/api/health
```

The health endpoint returns the environment overview showing which connectors are configured.

For local development (before deploying):

```bash
# Run type check
npm run typecheck

# Start dev server
npm run dev
# Visit http://localhost:3000/api/health
```

---

## Railway Deployment Notes

1. **Do NOT commit `.env.local` to git.** Railway uses its own variable system.

2. **Required variables on Railway:**
   - `DATABASE_URL` (auto-generated by Postgres plugin)
   - `ANTHROPIC_API_KEY`
   - `JOB_SECRET`

3. **Cron job setup:**
   - Use Railway's Cron service or external cron
   - POST to `/api/jobs` with `Authorization: Bearer <JOB_SECRET>`
   - Example cron schedule: `0 */6 * * *` (every 6 hours)

4. **Redis:** Optional. Only needed if `USE_JOB_QUEUE=true`.

---

## Troubleshooting

### "Anthropic API key not configured"
- Check `ANTHROPIC_API_KEY` is set and not empty
- Verify key starts with `sk-ant-`

### "Morningscore sync fails" / empty dashboard KPIs
- Set `MORNINGSCORE_API_KEY` from Morningscore → Settings → API
- Ensure your site exists in Morningscore, or set `MORNINGSCORE_DOMAIN_ID` to the value from `GET /v1/domains`
- Match `PRIMARY_SITE_URL` hostname to the domain in Morningscore when not using an explicit domain id

### "Database connection failed"
- Check `DATABASE_URL` format
- Ensure Postgres is running (local) or accessible (cloud)
- Try without `DATABASE_URL` to use file storage fallback

### "Job execution unauthorized"
- `JOB_SECRET` must be set in production
- Include correct `Authorization: Bearer <JOB_SECRET>` header
