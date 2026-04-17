# Environment Variables Setup Guide (Railway Deployment)

This guide walks you through obtaining every API key and environment variable needed to deploy Qubic SEO Autopilot on Railway with both frontend and backend hosted there.

**Important:** Since you're hosting on Railway, you must use **Anthropic API** for AI features. Local LLMs like Ollama are not accessible from cloud deployments.

---

## Table of Contents

1. [Quick Start (Railway Deployment)](#quick-start-railway-deployment)
2. [Required for Production](#required-for-production)
3. [AI / LLM (Anthropic)](#ai--llm-anthropic)
4. [Google APIs](#google-apis)
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

**Optional but recommended:** `GOOGLE_API_KEY`, `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`, `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`

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

## Google APIs

### PageSpeed Insights API

**`GOOGLE_API_KEY`**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to "APIs & Services" → "Library"
4. Search "PageSpeed Insights API" and click "Enable"
5. Go to "Credentials" → "Create Credentials" → "API Key"
6. Copy the key and add to `.env.local`: `GOOGLE_API_KEY=AIza...`

**Quota:** 100 queries per 100 seconds (sufficient for most sites).

---

### Search Console API (for search performance data)

Requires **Service Account** credentials (not OAuth).

**`GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`**

**`GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "IAM & Admin" → "Service Accounts"
3. Click "Create Service Account"
4. Name: `search-console-reader`
5. Grant role: "Search Console Viewer" (or create custom)
6. Click into the service account → "Keys" tab → "Add Key" → "Create new key"
7. Select JSON format, download the file
8. Open the JSON file and extract:
   - `client_email` → `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` (copy entire value including `-----BEGIN PRIVATE KEY-----`)

9. Add your site in Search Console:
   - Go to [search.google.com/search-console](https://search.google.com/search-console)
   - Add property → Domain → `qubic.org`
   - Verify ownership via DNS or other method

10. Share the property with the service account:
    - In Search Console, go to Settings → Users and Permissions
    - Add the service account email (`search-console-reader@your-project.iam.gserviceaccount.com`)
    - Grant "Full" or "Restricted" permission

**Note:** The private key in `.env.local` must have literal newlines. Either:
- Use `.env.local` with actual line breaks (not recommended)
- Or escape as `\n` in the value (the app handles conversion)

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
| `BLOG_SITE_URL` | `https://blogs.qubic.org` | Blog site |
| `QUBIC_RPC_BASE_URL` | `https://rpc.qubic.org` | Qubic blockchain RPC |
| `SEARCH_CONSOLE_PROPERTY` | `sc-domain:qubic.org` | Search Console property |

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
BLOG_SITE_URL=https://blogs.qubic.org
QUBIC_RPC_BASE_URL=https://rpc.qubic.org
SEARCH_CONSOLE_PROPERTY=sc-domain:qubic.org
GDELT_QUERY="Qubic" OR qubic.org

# =============================================================================
# AI / LLM — Anthropic is required for Railway
# =============================================================================
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# =============================================================================
# Google APIs (Optional but recommended)
# =============================================================================
GOOGLE_API_KEY=AIza-your-key
GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"

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

### "Search Console not configured"
- Both `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` and `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` must be set
- Verify the service account email has been added to your Search Console property

### "Database connection failed"
- Check `DATABASE_URL` format
- Ensure Postgres is running (local) or accessible (cloud)
- Try without `DATABASE_URL` to use file storage fallback

### "Job execution unauthorized"
- `JOB_SECRET` must be set in production
- Include correct `Authorization: Bearer <JOB_SECRET>` header
