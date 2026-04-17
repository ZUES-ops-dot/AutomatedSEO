# Qubic SEO Autopilot Plan

## 1. Product Goal

Build an SEO and content autopilot focused on `qubic.org` and adjacent Qubic surfaces such as `docs.qubic.org`.

The system should:

- Continuously audit and monitor the target site.
- Suggest upgrades across technical SEO, content, internal linking, information architecture, indexing, and performance.
- Generate blog ideas, content briefs, and draft articles.
- Accept CSV imports for many kinds of business, SEO, and editorial data.
- Stay modular so new connectors, prompts, data sources, and workflows can be added over time.

## 2. Primary Target Surfaces

- `https://qubic.org/`
- `https://qubic.org/blog-grid`
- Qubic blog article URLs
- `https://qubic.org/ecosystem`
- `https://docs.qubic.org/`
- Selected Qubic GitHub repositories
- Public Qubic ecosystem pages and announcements

## 3. Core Product Modes

### 3.1 Audit Mode

Runs deep crawls and produces a current-state SEO map.

Outputs:

- Indexable URL inventory
- Title and meta coverage
- Canonical consistency
- Internal link graph
- heading structure issues
- duplicate and thin content flags
- schema opportunities
- image alt coverage
- status code and redirect findings

### 3.2 Monitor Mode

Runs scheduled checks and tracks changes over time.

Outputs:

- new or removed URLs
- performance regressions
- crawl anomalies
- Search Console trend shifts
- docs or blog changes worth turning into content
- market and community events relevant to Qubic

### 3.3 Suggestion Mode

Continuously proposes improvements.

Suggestion categories:

- technical SEO
- metadata improvements
- internal linking improvements
- content refresh suggestions
- blog opportunities
- docs-to-blog repurposing ideas
- schema additions
- indexation and sitemap fixes
- page speed improvements
- trust, clarity, and conversion-related upgrades

### 3.4 Content Mode

Turns monitored signals into publishable content workflows.

Outputs:

- topic ideas
- content clusters
- article briefs
- outlines
- draft blog posts
- refresh recommendations for existing content
- post-publish monitoring

### 3.5 Import Mode

Allows structured CSV ingestion so the system can learn from external data and user-provided spreadsheets.

Supported use cases:

- keyword lists
- URL inventories
- content calendars
- editorial briefs
- competitor lists
- internal link targets
- redirect maps
- outreach targets
- historical performance exports

## 4. What the Autopilot Should Actually Do

The autopilot should not only collect data. It should transform data into actions.

Daily or scheduled actions:

- crawl important pages on `qubic.org`
- fetch search and performance metrics
- compare current page state with previous snapshots
- detect content gaps and stale pages
- propose highest-impact upgrades
- generate blog ideas from official Qubic changes and external signals
- prepare briefs and draft content for approval
- push indexing signals where valid and safe

Human-in-the-loop rules:

- suggestions can be auto-generated
- publishing should require approval unless explicitly enabled later
- content should cite evidence sources
- facts should prefer official Qubic docs and official Qubic APIs where possible

## 5. Free API and Tool Inventory

This section prioritizes free or realistically free options first.

### 5.1 Official / High-Value Core Integrations

| API / Tool | Type | Free Status | Main Use | Notes |
|---|---|---|---|---|
| Qubic RPC API | Official API | Free | Blockchain, network, contract, and historical Qubic data | Best source for factual Qubic ecosystem data in content workflows |
| Qubic docs content | Official content source | Free | Canonical product and technical facts | Use as trusted source for blog grounding |
| Google Search Console API | Official API | Free | Queries, clicks, impressions, pages, sitemaps, inspection workflows | Requires verified property and OAuth/service account setup |
| Google Analytics Data API | Official API | Free | Traffic, landing pages, engagement, conversions | Requires GA4 property access |
| Google PageSpeed Insights API | Official API | Free with quota | Lighthouse + field performance reporting | Great for page-level recommendations |
| Chrome UX Report API | Official API | Free with API key | Real-user Core Web Vitals trends | Useful for tracking page experience over time |
| IndexNow | Official protocol/API | Free | Fast URL submission to supported search engines | Best for Bing/Yandex-style ecosystem, not a Google replacement |
| Sitemap and robots fetching | Native site fetch | Free | Detect crawlability and discovery issues | Required for every audit run |

### 5.2 Discovery, Crawl, and Historical Intelligence

| API / Tool | Type | Free Status | Main Use | Notes |
|---|---|---|---|---|
| Common Crawl Index API | Public index API | Free | Check public web crawl presence and historical URL discovery | Useful for finding missed or legacy pages |
| Internet Archive Wayback / CDX APIs | Public archive API | Free | Historical URL discovery and content comparison | Strong for content refresh and deleted-page recovery |
| Crawl4AI | Open-source self-hosted tool | Free | JavaScript-aware crawling, extraction, and clean markdown | Strong self-hosted crawl option |
| Firecrawl self-hosted or limited free tier | Open-source / hosted tool | Free or limited free | Site crawl and clean content extraction | Good for content ingestion and RAG-style workflows |
| Playwright | Open-source tool | Free | Browser rendering for JS-heavy pages and screenshots | Useful for visual QA and rendered HTML checks |

### 5.3 Content, News, Market, and Community Signals

| API / Tool | Type | Free Status | Main Use | Notes |
|---|---|---|---|---|
| GDELT DOC 2.0 API | Public news API | Free | Global news monitoring for Qubic-related topics | Strong for timely article discovery |
| CoinGecko API | Official API | Free demo tier | Token price, market, and ecosystem context | Good for market-aware blog content |
| GeckoTerminal API | Official API | Free beta | On-chain token and pool data | Useful if Qubic ecosystem tokens/liquidity are relevant |
| Reddit API | Official API | Free with limits | Community discussion monitoring | Good for topic mining and FAQs |
| GitHub REST API | Official API | Free with rate limits | Repo activity, issues, releases, commits | Great for build logs, changelog blogs, and developer content |
| YouTube Data API | Official API | Free with quota | Video topic discovery and creator monitoring | Good for content resonance and trend discovery |
| RSS/Atom feeds | Open feed format | Free | Official blog, ecosystem, and media monitoring | Low-cost and reliable ingestion layer |
| NewsAPI | Public API | Free dev tier | Supplemental news discovery | Useful in prototype phase, but free tier restrictions apply |
| Hacker News Algolia API | Public API | Free | Developer discussion discovery | Optional but useful for technical angle finding |
| Wikipedia Pageviews API | Public API | Free | Demand and awareness trend signals | Optional for broader topic interest tracking |
| Stack Exchange API | Public API | Free | Technical question discovery | Optional for developer education content |

### 5.4 Local / Free Content Generation and Enrichment Layer

| API / Tool | Type | Free Status | Main Use | Notes |
|---|---|---|---|---|
| Ollama local API | Local API | Free | Local blog drafting, summarization, and transformation | Good for avoiding paid LLM calls during development |
| Local embedding models | Local model tooling | Free | Topic clustering, similarity, dedupe, retrieval | Useful for keyword grouping and source grounding |
| Markdown / HTML parsing libraries | Local tooling | Free | Metadata extraction and cleanup | Core part of ingestion stack |

## 6. Recommended Integration Priority

### 6.1 MVP Priority

Build these first:

- Qubic site crawl for `qubic.org`
- docs crawl for `docs.qubic.org`
- sitemap and robots parser
- Google Search Console API sync
- PageSpeed Insights API checks
- Chrome UX Report API checks
- IndexNow submission helper
- GitHub API connector for Qubic repositories
- RSS/GDELT topic discovery
- CSV import pipeline

### 6.2 Second Wave

- Google Analytics Data API
- CoinGecko API
- GeckoTerminal API
- Reddit API
- YouTube Data API
- Common Crawl history checks
- Wayback comparison support

### 6.3 Third Wave

- Hacker News Algolia API
- Wikipedia Pageviews API
- Stack Exchange API
- NewsAPI fallback enrichment
- competitor domain benchmarking

## 7. Important Constraints and Truths

- Google Search Console and Google Analytics are free, but they require property access.
- PageSpeed and CrUX are free, but quotas mean responses should be cached.
- IndexNow is useful, but it does not replace Google indexing workflows.
- Google Indexing API is not a general SEO submission API for normal website pages; it is limited to specific content types according to official guidance.
- Some community and news APIs have rate limits or dev-tier restrictions, so the architecture should tolerate partial outages.
- Blog generation should always be grounded in trusted sources to avoid hallucinated facts.

## 8. Proposed System Architecture

### 8.1 Connector Layer

Each external source should be isolated behind a connector.

Recommended connectors:

- `siteCrawlerConnector`
- `docsCrawlerConnector`
- `searchConsoleConnector`
- `analyticsConnector`
- `pageSpeedConnector`
- `cruxConnector`
- `indexNowConnector`
- `githubConnector`
- `gdeltConnector`
- `redditConnector`
- `youtubeConnector`
- `coinGeckoConnector`
- `csvImportConnector`

### 8.2 Ingestion Pipeline

Pipeline stages:

1. fetch raw source data
2. normalize into internal schemas
3. dedupe and canonicalize
4. store snapshots and metrics
5. run rules and scoring
6. produce suggestions, briefs, and alerts

### 8.3 Storage Model

Suggested entities:

- `domains`
- `pages`
- `page_snapshots`
- `crawl_runs`
- `internal_links`
- `page_metrics`
- `search_console_rows`
- `analytics_rows`
- `page_speed_runs`
- `crux_runs`
- `source_items`
- `topic_clusters`
- `content_ideas`
- `content_briefs`
- `blog_drafts`
- `upgrade_suggestions`
- `import_jobs`
- `import_rows`
- `watchlists`
- `change_events`

### 8.4 Rules Engine

The rules engine should score findings by impact, confidence, and urgency.

Example score dimensions:

- organic traffic opportunity
- page importance
- ease of implementation
- confidence of diagnosis
- freshness of signal
- business relevance to Qubic ecosystem goals

### 8.5 Action Planner

Each opportunity should resolve to exactly one recommended action:

- `refresh`
- `new_support_page`
- `new_relevant_blog`
- `merge`
- `skip`

This keeps the autopilot focused on the best next move, not just the highest content volume.

### 8.6 Decision Rules

Choose `refresh` when:

- an existing page already targets the intent
- the page is ranking but underperforming
- CTR is weak for its current position
- the page is stale or missing subtopics

Choose `new_support_page` when:

- the intent appears repeatedly in queries, docs, support, or community questions
- no current page maps cleanly to the intent
- the topic fits a stable evergreen page better than a blog post
- the page can support an important cluster, ecosystem page, or conversion path

Choose `new_relevant_blog` when:

- the topic is rising, time-sensitive, or event-driven
- explanation, interpretation, examples, or commentary adds value
- the post can strengthen a cluster or key landing page through internal linking
- there is meaningful first-party or official-source context to include

Choose `merge` when:

- multiple weak pages overlap on one intent
- one stronger canonical page should absorb the others

Choose `skip` when:

- demand is too weak
- competition is too strong for the likely upside
- the tool cannot add unique value
- the content would be thin, redundant, or off-strategy

### 8.7 Initial Weighted Score

| Dimension | Weight | Notes |
|---|---:|---|
| Business relevance | 20% | Importance to Qubic goals, priority pages, or ecosystem narratives |
| Demand or impression signal | 15% | Search Console, repeated questions, or recurring topic mentions |
| Position or CTR gap | 15% | Ranking but underperforming usually offers the best leverage |
| Freshness need | 10% | Decay, outdated information, or current-event relevance |
| Uniqueness potential | 15% | Ability to add official facts, examples, screenshots, or better structure |
| First-party enrichment available | 10% | Docs, GitHub, product pages, ecosystem updates, or internal notes |
| Internal-link support | 10% | Ability to support or be supported by existing clusters |
| Cannibalization risk | -15% | Negative weight |
| Difficulty or authority gap | -10% | Negative weight |

### 8.8 Output Thresholds

- `80+` -> do now
- `65-79` -> queue this cycle
- `50-64` -> backlog or conditional
- `<50` -> skip

## 9. Upgrade Suggestion Categories

The autopilot should keep generating suggestions across these categories.

### 9.1 Technical SEO

- broken pages
- redirect chains
- missing canonicals
- blocked valuable pages
- orphan pages
- duplicate titles or descriptions
- thin pages
- slow pages
- missing sitemap coverage

### 9.2 On-Page Optimization

- title rewrites
- meta description rewrites
- H1 alignment issues
- missing structured sections
- schema opportunities
- image alt improvements
- FAQ additions where appropriate

### 9.3 Internal Linking

- suggest source pages for new internal links
- identify high-authority pages that should pass relevance
- detect isolated docs or blog pages
- build topic clusters between docs, blog, academy, and ecosystem pages

### 9.4 Content Strategy

- create article ideas from docs changes
- repurpose release notes into blog posts
- convert GitHub activity into developer updates
- convert ecosystem launches into spotlight articles
- detect keyword gaps against existing pages
- find outdated articles that need refreshes

### 9.5 Performance and UX

- LCP, CLS, and INP issue prioritization
- image compression opportunities
- script loading opportunities
- layout stability improvements
- mobile performance fixes on top traffic pages

## 10. Blog Autopilot Design

### 10.1 Blog Idea Inputs

The system should create topic ideas from:

- Qubic official docs changes
- Qubic GitHub releases or notable commits
- ecosystem page changes
- major market movements around QUBIC
- community questions and discussion trends
- news mentions of Qubic or adjacent topics
- performance or search opportunity findings from site data

### 10.2 Blog Workflow

1. collect source items
2. cluster into possible topics
3. score relevance and freshness
4. generate content brief
5. assemble fact pack from trusted sources
6. generate outline
7. generate first draft
8. human review and edits
9. publish or export
10. monitor performance and refresh later

### 10.3 Blog Output Types

- news explainer
- product update article
- ecosystem spotlight
- educational SEO article for Qubic topics
- technical guide based on docs
- market context article using official or public data
- content refresh of older blog pages

### 10.4 Blog Safety Rules

- never invent protocol facts
- cite or store source URLs used for claims
- prefer official Qubic sources for product details
- clearly separate facts from opinion
- require review for sensitive claims or market commentary

### 10.5 What Counts as a Relevant Blog

A blog post should be created only when at least one of these is true:

- a rising topic cluster does not fit a stable page template
- the topic benefits from interpretation, examples, or commentary
- a launch, docs update, market move, or ecosystem event creates a freshness opportunity
- the post will clearly support another priority page or cluster through internal linking
- there is meaningful first-party or official-source input that makes the piece materially better

A blog post should not be created when:

- it repeats generic information already covered everywhere else
- it exists only to hit a publishing quota
- it has no clear intent or cluster role
- it has no unique input and no linking job

### 10.6 Required Human Review Markers

Generated briefs or drafts should explicitly flag unresolved items such as:

```text
[HUMAN REQUIRED: verify claim]
[HUMAN REQUIRED: add screenshot]
[HUMAN REQUIRED: add ecosystem example]
[HUMAN REQUIRED: confirm final CTA]
```

## 11. CSV Import Design

CSV import is a core feature, not a side feature.

### 11.1 CSV Types to Support Early

- `keywords.csv`
- `urls.csv`
- `content_calendar.csv`
- `blog_briefs.csv`
- `internal_links.csv`
- `redirects.csv`
- `competitors.csv`
- `outreach_targets.csv`
- `performance_exports.csv`
- `custom_notes.csv`

### 11.2 Example Fields by Import Type

#### Keywords

- `keyword`
- `topic`
- `intent`
- `country`
- `priority`
- `target_url`
- `notes`

#### URLs

- `url`
- `page_type`
- `title`
- `status`
- `target_keyword`
- `owner`

#### Content Calendar

- `title`
- `topic`
- `stage`
- `publish_date`
- `persona`
- `cta`

#### Competitors

- `domain`
- `type`
- `priority`
- `notes`

#### Internal Links

- `source_url`
- `target_url`
- `anchor_text`
- `priority`

### 11.3 Import Pipeline

1. upload file
2. detect file type or let user choose template
3. map columns
4. validate required fields
5. preview errors and row counts
6. normalize and canonicalize values
7. dedupe rows
8. import into source tables
9. trigger downstream jobs

### 11.4 Import Rules

- normalize URLs before storing
- support custom column mapping
- keep original raw file for auditability
- preserve row-level validation errors
- allow re-import with upsert behavior
- tag all imported rows by source and batch id

## 12. Scheduling and Automation

Recommended job cadence:

- hourly: monitor critical pages, feeds, and GitHub changes
- daily: Search Console sync, PageSpeed checks for key URLs, content idea generation
- twice weekly: broader crawl and internal link analysis
- weekly: topic clustering, stale content detection, refresh suggestions
- on demand: CSV imports, full audits, draft generation, export jobs

## 13. Suggested UI / Product Surfaces

### 13.1 Dashboard

- top opportunities
- traffic and impression trends
- indexation warnings
- top pages needing fixes
- upcoming content opportunities

### 13.2 Suggestions Inbox

- sortable list of recommendations
- impact score
- confidence score
- affected URLs
- one-click approve, snooze, or dismiss

### 13.3 Content Studio

- content ideas
- briefs
- outlines
- drafts
- source references
- version history

### 13.4 Imports Center

- upload CSV
- map columns
- preview validation
- manage import history
- trigger downstream jobs

## 14. MVP Definition

The first real version should be able to do the following well:

- crawl `qubic.org` and `docs.qubic.org`
- parse `robots.txt` and sitemaps
- sync Search Console data
- run PageSpeed and CrUX checks on key URLs
- store snapshots and change events
- generate prioritized upgrade suggestions
- ingest keyword and URL CSV files
- produce blog ideas and draft briefs grounded in official Qubic sources

## 15. Phase Roadmap

### Phase 1: Foundation

- crawling
- URL normalization
- snapshot storage
- sitemap and robots support
- CSV import templates

### Phase 2: SEO Intelligence

- Search Console connector
- PageSpeed and CrUX connector
- scoring engine
- recommendation inbox

### Phase 3: Content Autopilot

- topic clustering
- brief generation
- draft generation
- source grounding and citations

### Phase 4: Broader Signal Layer

- GitHub, Reddit, YouTube, CoinGecko, GDELT
- historical archive checks
- competitor and ecosystem monitoring

### Phase 5: Workflow Maturity

- approvals
- publishing integrations
- refresh scheduling
- experiment tracking

## 16. Success Metrics

- number of indexable pages correctly covered
- number of high-impact issues detected and resolved
- change in clicks, impressions, and CTR
- number of accepted suggestions
- blog output volume and quality
- time saved versus manual SEO operations
- successful CSV import completion rate

## 17. Recommended Build Principles

- connector-first architecture
- human review before risky actions
- evidence-backed recommendations
- source-grounded content generation
- caching for quota-sensitive APIs
- resilient retries and partial failure handling
- every suggestion should map to a reason and a source

### 17.1 Avoid in Early Versions

- blind auto-publish to production
- content-volume quotas with no scoring gate
- generic AI blog generation with no source grounding
- separate content-farm microsites or subdomains
- backlink promises or mass-page generation
- multi-tenant SaaS complexity before the single-site loop works

## 18. Immediate Next Build Tasks

1. create the crawl and snapshot pipeline for `qubic.org`
2. add sitemap and `robots.txt` ingestion
3. define the database schema for pages, snapshots, metrics, suggestions, and imports
4. implement CSV import templates for keywords and URLs first
5. add Search Console sync
6. add PageSpeed and CrUX sync
7. build the first suggestion engine rules
8. build the first content brief generator using official Qubic sources

## 19. Final Positioning

This project should become a Qubic-focused SEO command center that combines:

- site crawling
- search performance intelligence
- technical recommendations
- content opportunity discovery
- blog drafting
- CSV-driven workflows

The strongest low-cost path is to combine free official APIs, public web datasets, open-source crawl tooling, and local generation tools, then layer a recommendation engine on top.

## 20. Legacy Reference Notes

The notes below are preserved from earlier planning passes. Sections `1-19` above are the current authoritative plan for the Qubic-focused autopilot. Any repo-specific assumptions in the notes below should be re-verified before implementation.

# Autopilot SEO + Relevant Blog Tool Plan

## Executive decision

Build this as a **search-support and relevant-blog engine**, not as a generic AI blog autopublisher.

The right shape for this repo is:

- **main-site support layer**, not a second content site
- **refresh-first**, not net-new-first
- **query-mined**, not random topic generation
- **human-reviewed**, not blind auto-publish
- **content + internal linking + monitoring**, not just article drafting

This tool should do two jobs well:

1. **Find the highest-value SEO opportunities** from real search and customer signals
2. **Generate the right content asset for that opportunity**, which may be:
   - a page refresh
   - a support page
   - an FAQ page
   - a comparison / alternatives page
   - a glossary / definition page
   - a use-case page
   - a **relevant blog post** when a blog is actually the right format

## Final research conclusion

Based on the research already in this workspace, the conclusion is clear:

- **Do not build** a generic managed-blog SaaS that promises traffic and backlinks from AI blog posts.
- **Do build** a controlled search-support engine that mines real opportunity signals and writes only the content that is justified by those signals.
- **Relevant blogs should be a subset of outputs**, not the product's whole identity.

Why:

- AI blog writing alone is commoditized.
- Publishing alone rarely produces rankings or backlinks.
- The winning system is the one that decides **what should be written**, not just how fast to draft it.
- Your existing repo already points in this direction through the prior `search_support_engine_build_plan.md` and the `managed_blog_saas_research.md` verdict.

## What I found in the current codebase

### Current repo shape

The repo is already a lightweight Python research engine with clear extension points:

- `engine/server.py`
  - FastAPI app
  - current endpoints: `/health`, `/topics/research`, `/ideas/evaluate`
- `engine/brain.py`
  - main orchestration logic for evidence gathering and scoring
- `engine/sources.py`
  - public-source fetchers using `requests`
- `engine/models.py`
  - Pydantic request/response models
- `skills/`
  - scoring helpers for pain, channel fit, competition, MRR path, sustainability
- `discord_scraper.py`
  - already demonstrates a useful pattern for:
    - fetch
    - sanitize
    - score
    - trim
    - send curated context to an LLM
    - write markdown output

### Important implication

You do **not** need a brand-new app architecture.
You can extend the current `engine` into an SEO/content system by following the same pattern already used elsewhere in the repo:

- gather inputs
- score them
- select the best subset
- pass curated context to an LLM
- save structured outputs

That is the right foundation for the autopilot SEO tool.

## Product definition

### Core job

The tool should answer this question every week:

> What is the highest-value search/content action we should take next, and can we draft it in a way that is specific, useful, and safe to publish after review?

### Inputs

The tool should eventually pull from:

- Google Search Console
- GA4
- CMS content export
- site search logs
- support tickets
- CRM / sales objections
- product docs
- founder notes / SME notes
- optional SERP snapshots

### Outputs

The tool should produce:

- prioritized opportunity queue
- refresh briefs for existing pages
- new-page briefs
- relevant blog briefs
- AI-assisted markdown drafts
- internal-link plans
- QA checklist output
- monitoring snapshots

## Action rules

These are the default decision rules I would implement.

### Choose `refresh` when

- an existing page already targets the intent
- the page is ranking but underperforming
- CTR is weak for its current position
- the page is stale or missing subtopics

### Choose `new_support_page` when

- the intent appears repeatedly in queries, docs, support, or community questions
- no current page maps cleanly to the intent
- the topic fits a stable evergreen page better than a blog post
- the page can support an important cluster, ecosystem page, or conversion path

### Choose `new_relevant_blog` when

- the topic is rising, time-sensitive, or event-driven
- explanation, interpretation, examples, or commentary adds value
- the post can strengthen a cluster or key landing page through internal linking
- there is meaningful first-party or official-source context to include

### Choose `merge` when

- multiple weak pages overlap on one intent
- one stronger canonical page should absorb the others

### Choose `skip` when

- demand is too weak
- competition is too strong for the likely upside
- the tool cannot add unique value
- the content would be thin, redundant, or off-strategy

## Scoring model

A good first scoring model:

| Dimension | Weight | Notes |
|---|---:|---|
| Business relevance | 20% | Importance to Qubic goals, priority pages, or ecosystem narratives |
| Demand or impression signal | 15% | Search Console, repeated questions, or recurring topic mentions |
| Position or CTR gap | 15% | Ranking but underperforming usually offers the best leverage |
| Freshness need | 10% | Decay, outdated information, or current-event relevance |
| Uniqueness potential | 15% | Ability to add official facts, examples, screenshots, or better structure |
| First-party enrichment available | 10% | Docs, GitHub, product pages, ecosystem updates, or internal notes |
| Internal-link support | 10% | Ability to support or be supported by existing clusters |
| Cannibalization risk | -15% | Negative weight |
| Difficulty or authority gap | -10% | Negative weight |

### Simple output thresholds

- `80+` -> do now
- `65-79` -> queue this cycle
- `50-64` -> backlog or conditional
- `<50` -> skip

## Content templates the tool should support

### 1. Refresh brief

Used when a page already exists.

Sections:

- target URL
- target query cluster
- why this is an opportunity
- missing sections / subtopics
- CTR/title issues
- metadata rewrite
- internal links to add
- human enrichment required

### 2. FAQ page

Best for repeated support or query patterns.

### 3. Comparison page

Best for `vs`, `alternative`, or decision-intent traffic.

### 4. Glossary / definition page

Best for foundational concepts and terminology.

### 5. Use-case / problem-solution page

Best when intent maps to a real workflow problem.

### 6. Relevant blog post

Use a blog format only when the topic is dynamic or interpretive.

Recommended structure:

- why this topic matters now
- what changed / what the user needs to know
- explanation or framework
- examples / screenshots / first-party detail
- recommended next steps
- internal links to core pages

## Drafting pipeline

The drafting engine should follow this order:

1. load the opportunity
2. load relevant existing pages
3. load first-party source material
4. load external evidence or SERP notes
5. assign the correct template
6. build outline
7. draft in markdown
8. mark all areas requiring human input
9. attach metadata and link suggestions

### Drafting principles

- use AI for structure and acceleration
- do not use AI as the only source of truth
- every draft must incorporate first-party or repo-owned context when available
- avoid unsupported claims
- prefer concise, high-signal pages over padded long-form content

### Required human markers inside drafts

The draft should explicitly insert markers such as:

```text
[HUMAN REQUIRED: add screenshot]
[HUMAN REQUIRED: verify pricing]
[HUMAN REQUIRED: add customer example]
[HUMAN REQUIRED: approve final claim]
```

## QA rules

Before anything can be published, the tool must check:

- clear target intent exists
- format choice is correct
- no obvious cannibalization
- no hallucinated claims
- enough unique value vs SERPs
- internal links added both in and out where appropriate
- title and meta match the query intent
- canonical / noindex decision is explicit if needed
- schema suggestion is attached if useful

## Publishing model

### Default mode

- draft to markdown
- save locally or to CMS draft
- require human approval
- publish manually or via CMS draft-to-publish step

### Do not build first

- instant auto-publish to production
- mass generation with no editorial gate
- separate microsite or subdomain for content dumping

## Monitoring loop

Track every published or refreshed URL for:

- impressions
- clicks
- CTR
- average position
- conversions if available
- time-to-first-movement
- internal-link status

### Feedback loop rules

If a page gains impressions but not clicks:

- revisit title and meta

If a page gains clicks but not conversions:

- revisit intent match and CTA path

If a page does not move:

- revisit internal links, page format, and authority gap

If two pages split intent:

- merge or re-scope them

## Repo-specific implementation plan

This plan is designed to fit the current repo, not replace it.

### Keep

- `engine/server.py`
- FastAPI entry point
- Pydantic model style in `engine/models.py`
- simple orchestration style in `engine/brain.py`
- `requests`-based source adapters pattern in `engine/sources.py`
- scoring-module pattern already used in `skills/`

### Add

#### New engine modules

- `engine/seo_models.py`
  - opportunity, cluster, draft, publish, metrics models
- `engine/seo_sources.py`
  - Search Console, GA4, CMS export, site-search, support imports
- `engine/seo_inventory.py`
  - page inventory, URL mapping, cluster registry
- `engine/seo_scoring.py`
  - scoring logic and action routing
- `engine/seo_writer.py`
  - LLM prompting, draft assembly, metadata generation
- `engine/seo_links.py`
  - internal-link suggestions and anchor plans
- `engine/seo_monitor.py`
  - before/after tracking
- `engine/seo_brain.py`
  - orchestration layer for the whole SEO workflow

#### Optional skills modules

If you want scoring symmetry with the rest of the repo:

- `skills/seo_intent.py`
- `skills/seo_uniqueness.py`
- `skills/seo_cannibalization.py`
- `skills/seo_freshness.py`

### New endpoints

I would add these API endpoints:

- `POST /seo/opportunities/sync`
  - ingest and normalize fresh source data
- `POST /seo/opportunities/score`
  - score and classify opportunities
- `POST /seo/plan/week`
  - return top recommended actions for the cycle
- `POST /seo/draft`
  - generate a content draft from an approved opportunity
- `POST /seo/link-plan`
  - generate internal-link suggestions
- `POST /seo/publish-draft`
  - push to CMS draft state only
- `POST /seo/monitor/sync`
  - refresh metrics for published URLs
- `GET /seo/opportunities`
  - view queue and filters
- `GET /seo/pages/{url_id}`
  - view content history and performance snapshots

## Suggested data models

### Opportunity

Fields:

- `id`
- `query_cluster`
- `primary_query`
- `mapped_url`
- `page_type`
- `recommended_action`
- `score`
- `business_intent_score`
- `uniqueness_score`
- `freshness_score`
- `cannibalization_risk`
- `supporting_signals`
- `status`

### Draft

Fields:

- `opportunity_id`
- `title`
- `slug`
- `template_type`
- `markdown_body`
- `meta_title`
- `meta_description`
- `schema_type`
- `internal_links_in`
- `internal_links_out`
- `human_review_flags`

### Page metrics snapshot

Fields:

- `url`
- `date`
- `impressions`
- `clicks`
- `ctr`
- `position`
- `conversions`
- `action_taken`

## Storage recommendation

For MVP, keep it simple:

- `SQLite` for structured state
- markdown files for drafts
- JSON exports for debugging

Suggested directories:

- `outputs/seo/opportunities/`
- `outputs/seo/drafts/`
- `outputs/seo/link_plans/`
- `outputs/seo/reports/`
- `outputs/seo/metrics/`

## LLM recommendation

Because this workspace already uses Anthropic in content workflows, the easiest path is:

- use **Anthropic** for draft generation
- keep prompts structured and context-limited
- send only the curated opportunity packet, not raw dumps

That matches the pattern already used in `discord_scraper.py`:

- collect raw material
- sanitize it
- score it
- trim it
- prompt the model with only the best context

That same pattern should power the SEO tool.

## External integrations needed

### Required for MVP

- Search Console API
- CMS export or crawl
- Anthropic API

### Strongly recommended next

- GA4
- site-search logs
- support ticket export
- CRM objection export

### Optional later

- SERP snapshot provider
- Slack/Discord digest delivery
- Indexing API / submission helper

## Engineering phases

### Phase 1 — Opportunity engine

Build:

- Search Console ingestion
- content inventory
- opportunity scoring
- weekly recommendation output

Deliverable:

- top 25 prioritized actions with recommended format

### Phase 2 — Draft engine

Build:

- template system
- LLM drafting
- metadata generation
- human-review markers

Deliverable:

- markdown drafts for refreshes, support pages, and relevant blogs

### Phase 3 — Internal-link engine

Build:

- site inventory parser
- candidate source-page finder
- link suggestion output

Deliverable:

- link insertion plans for each new/refreshed page

### Phase 4 — Publish + monitor

Build:

- CMS draft push
- action logging
- weekly metrics sync
- win/loss reporting

Deliverable:

- tracked before/after results per content action

## MVP scope

If you want the smallest useful version, build this first:

1. Search Console opportunity ingest
2. manual CMS export ingest
3. refresh vs new-page vs relevant-blog classifier
4. markdown draft generator using Anthropic
5. internal-link suggestion list
6. manual publishing
7. weekly monitoring report

That is enough to prove the loop without overbuilding.

## What not to build first

- separate domain or subdomain content farm
- backlink promise engine
- mass city-page generation
- auto-publish with no QA
- heavy all-in-one SEO suite
- multi-tenant SaaS complexity before the single-site workflow works
- keyword volume obsession without business-intent scoring

## Success metrics

The tool is successful if it improves:

- time from opportunity discovery to usable draft
- percentage of content actions tied to real signals
- CTR on refreshed pages
- clicks on support pages
- cluster coverage for money pages
- internal-link density around priority URLs
- percentage of published pieces that were refreshes vs random net-new posts

If you later productize it, add:

- monthly content actions per customer
- time-to-first-win
- retention after month 2
- percentage of pages requiring deep manual rewrite

## Recommended first implementation order in this repo

1. add SEO models
2. add Search Console source adapter
3. add content inventory module
4. add opportunity scoring + action router
5. add draft generator using Anthropic
6. add internal-link planner
7. add monitoring sync
8. expose everything behind new `/seo/*` endpoints

## Final recommendation

The strongest version of this idea for your workspace is:

> A Python/FastAPI search-support engine that mines real search and customer signals, chooses the right content action, and drafts refreshes, support pages, and relevant blog posts with a human QA gate.

This is the version that:

- matches your existing repo architecture
- matches the prior research conclusion
- avoids generic AI-blog-tool commoditization
- still gives you automated blog writing where it is genuinely useful

## Deliverables this plan implies

If you want to execute immediately, the next concrete build outputs should be:

- `engine/seo_models.py`
- `engine/seo_sources.py`
- `engine/seo_inventory.py`
- `engine/seo_scoring.py`
- `engine/seo_writer.py`
- `engine/seo_links.py`
- `engine/seo_monitor.py`
- `engine/seo_brain.py`
- route additions in `engine/server.py`
- a sample `outputs/seo/` directory structure
- one pilot run against a single site property

## File written for this plan

- `outputs/research/autopilot_seo_blog_tool_plan.md`
