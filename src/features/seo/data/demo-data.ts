import { enrichOpportunity } from "@/features/seo/lib/scoring";
import type {
  Connector,
  ContentBrief,
  ContentIdea,
  DashboardMetric,
  DraftDocument,
  ImportTemplate,
  JobRun,
  OpportunityCandidate,
  PageAttentionItem,
  TrendSeries
} from "@/features/seo/types";

const opportunityCandidates: OpportunityCandidate[] = [
  {
    id: "opp-refresh-smart-contract-guide",
    title: "Refresh the smart contract guide to reclaim lost CTR",
    cluster: "developer education",
    primaryQuery: "qubic smart contracts",
    affectedUrls: ["https://docs.qubic.org/smart-contracts", "https://qubic.org/blog-grid"],
    pageType: "docs",
    reason:
      "The existing page already maps to intent, but the title structure and missing examples are leaving clicks on the table.",
    evidence: [
      "Search Console shows impressions rising while CTR lags position.",
      "Docs page has stale code samples and no FAQ section.",
      "Internal links from ecosystem pages are weak for this topic cluster."
    ],
    sourceTypes: ["morningscore", "docs_crawl", "internal_link_graph"],
    businessRelevance: 92,
    demandSignal: 80,
    ctrGap: 85,
    freshnessNeed: 78,
    uniquenessPotential: 82,
    enrichmentAvailable: 88,
    internalLinkSupport: 76,
    cannibalizationRisk: 18,
    difficultyGap: 28,
    existingPageTargetsIntent: true,
    rankingButUnderperforming: true,
    ctrWeak: true,
    staleOrMissingSubtopics: true,
    repeatedIntent: false,
    noCurrentPageMapsCleanly: false,
    evergreenBetterThanBlog: false,
    supportsPriorityCluster: true,
    risingTopic: false,
    commentaryAddsValue: false,
    firstPartyContextAvailable: true,
    overlappingPages: false,
    strongerCanonicalExists: false,
    demandTooWeak: false,
    competitionTooStrong: false,
    limitedUniqueValue: false,
    offStrategy: false,
    status: "in_review",
    lastUpdated: "2h ago"
  },
  {
    id: "opp-wallet-support-page",
    title: "Create a wallet setup and troubleshooting support page",
    cluster: "wallet onboarding",
    primaryQuery: "qubic wallet setup",
    affectedUrls: ["https://qubic.org/", "https://docs.qubic.org/"],
    pageType: "landing",
    reason:
      "The intent appears repeatedly across docs and community questions, but no stable evergreen page owns the topic end to end.",
    evidence: [
      "Repeated onboarding questions show up across docs, community, and search queries.",
      "No clean canonical page currently answers wallet setup and troubleshooting together.",
      "The page would support both onboarding and ecosystem conversion paths."
    ],
    sourceTypes: ["morningscore", "community_signal", "docs_crawl"],
    businessRelevance: 95,
    demandSignal: 78,
    ctrGap: 65,
    freshnessNeed: 70,
    uniquenessPotential: 86,
    enrichmentAvailable: 90,
    internalLinkSupport: 84,
    cannibalizationRisk: 12,
    difficultyGap: 34,
    existingPageTargetsIntent: false,
    rankingButUnderperforming: false,
    ctrWeak: false,
    staleOrMissingSubtopics: false,
    repeatedIntent: true,
    noCurrentPageMapsCleanly: true,
    evergreenBetterThanBlog: true,
    supportsPriorityCluster: true,
    risingTopic: false,
    commentaryAddsValue: false,
    firstPartyContextAvailable: true,
    overlappingPages: false,
    strongerCanonicalExists: false,
    demandTooWeak: false,
    competitionTooStrong: false,
    limitedUniqueValue: false,
    offStrategy: false,
    status: "new",
    lastUpdated: "45m ago"
  },
  {
    id: "opp-ecosystem-roundup",
    title: "Draft an ecosystem roundup blog tied to recent launches",
    cluster: "ecosystem momentum",
    primaryQuery: "qubic ecosystem updates",
    affectedUrls: ["https://qubic.org/ecosystem", "https://qubic.org/blog-grid"],
    pageType: "blog",
    reason:
      "The topic is time-sensitive, supported by first-party sources, and useful as a linking bridge into priority ecosystem pages.",
    evidence: [
      "GitHub and ecosystem pages show fresh launches worth interpretation.",
      "The content can feed internal links into ecosystem and docs clusters.",
      "The topic benefits from commentary and a weekly operator summary."
    ],
    sourceTypes: ["github", "ecosystem_page_changes", "gdelt"],
    businessRelevance: 82,
    demandSignal: 74,
    ctrGap: 60,
    freshnessNeed: 94,
    uniquenessPotential: 80,
    enrichmentAvailable: 92,
    internalLinkSupport: 73,
    cannibalizationRisk: 15,
    difficultyGap: 40,
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
    firstPartyContextAvailable: true,
    overlappingPages: false,
    strongerCanonicalExists: false,
    demandTooWeak: false,
    competitionTooStrong: false,
    limitedUniqueValue: false,
    offStrategy: false,
    status: "approved",
    lastUpdated: "20m ago"
  },
  {
    id: "opp-merge-mining-faqs",
    title: "Merge overlapping mining FAQ content into one canonical page",
    cluster: "mining education",
    primaryQuery: "qubic mining faq",
    affectedUrls: [
      "https://qubic.org/blog-grid/mining-faq",
      "https://qubic.org/blog-grid/mining-guide"
    ],
    pageType: "blog",
    reason:
      "Several weak pages overlap on a single intent and are likely splitting signals that belong on one stronger canonical asset.",
    evidence: [
      "Two blog URLs overlap heavily on mining setup questions.",
      "Neither page is deep enough to justify separate rankings.",
      "The current architecture creates avoidable cannibalization risk."
    ],
    sourceTypes: ["site_crawl", "content_similarity", "morningscore"],
    businessRelevance: 70,
    demandSignal: 50,
    ctrGap: 40,
    freshnessNeed: 48,
    uniquenessPotential: 56,
    enrichmentAvailable: 60,
    internalLinkSupport: 65,
    cannibalizationRisk: 82,
    difficultyGap: 20,
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
    strongerCanonicalExists: true,
    demandTooWeak: false,
    competitionTooStrong: false,
    limitedUniqueValue: false,
    offStrategy: false,
    status: "new",
    lastUpdated: "1d ago"
  },
  {
    id: "opp-refresh-ecosystem-page",
    title: "Refresh the ecosystem page with stronger internal links and clearer metadata",
    cluster: "ecosystem hub",
    primaryQuery: "qubic ecosystem",
    affectedUrls: ["https://qubic.org/ecosystem"],
    pageType: "ecosystem",
    reason:
      "The page is strategically important and already ranking, but it can better support downstream pages and clarify the ecosystem narrative.",
    evidence: [
      "The ecosystem hub is a priority page with multiple downstream link opportunities.",
      "Metadata and section hierarchy are underspecified for current intent coverage.",
      "This page can pass relevance into launch-specific and wallet-support content."
    ],
    sourceTypes: ["site_crawl", "internal_link_graph", "morningscore"],
    businessRelevance: 88,
    demandSignal: 67,
    ctrGap: 72,
    freshnessNeed: 66,
    uniquenessPotential: 74,
    enrichmentAvailable: 81,
    internalLinkSupport: 90,
    cannibalizationRisk: 16,
    difficultyGap: 30,
    existingPageTargetsIntent: true,
    rankingButUnderperforming: true,
    ctrWeak: true,
    staleOrMissingSubtopics: false,
    repeatedIntent: false,
    noCurrentPageMapsCleanly: false,
    evergreenBetterThanBlog: false,
    supportsPriorityCluster: true,
    risingTopic: false,
    commentaryAddsValue: false,
    firstPartyContextAvailable: true,
    overlappingPages: false,
    strongerCanonicalExists: false,
    demandTooWeak: false,
    competitionTooStrong: false,
    limitedUniqueValue: false,
    offStrategy: false,
    status: "drafting",
    lastUpdated: "5h ago"
  },
  {
    id: "opp-generic-blockchain-post",
    title: "Skip a generic blockchain explainer unrelated to Qubic differentiation",
    cluster: "generic awareness",
    primaryQuery: "what is blockchain",
    affectedUrls: ["https://qubic.org/blog-grid"],
    pageType: "blog",
    reason:
      "The topic is broad, weakly differentiated, and off-strategy for an evidence-led single-site autopilot.",
    evidence: [
      "Competition is high and the upside is weak for Qubic-specific business goals.",
      "The content would rely on generic information with little first-party advantage.",
      "It does not support a priority cluster or conversion path."
    ],
    sourceTypes: ["keyword_import", "search_gap_review"],
    businessRelevance: 25,
    demandSignal: 54,
    ctrGap: 34,
    freshnessNeed: 20,
    uniquenessPotential: 12,
    enrichmentAvailable: 10,
    internalLinkSupport: 18,
    cannibalizationRisk: 63,
    difficultyGap: 80,
    existingPageTargetsIntent: false,
    rankingButUnderperforming: false,
    ctrWeak: false,
    staleOrMissingSubtopics: false,
    repeatedIntent: false,
    noCurrentPageMapsCleanly: true,
    evergreenBetterThanBlog: false,
    supportsPriorityCluster: false,
    risingTopic: false,
    commentaryAddsValue: false,
    firstPartyContextAvailable: false,
    overlappingPages: false,
    strongerCanonicalExists: false,
    demandTooWeak: false,
    competitionTooStrong: true,
    limitedUniqueValue: true,
    offStrategy: true,
    status: "dismissed",
    lastUpdated: "3d ago"
  }
];

export const opportunities = opportunityCandidates.map(enrichOpportunity).sort((a, b) => b.score - a.score);

export const connectors: Connector[] = [
  {
    id: "site-crawl",
    name: "Site Crawl",
    group: "site_intelligence",
    description: "Crawls `qubic.org` to detect indexability, metadata, and link-graph changes.",
    cadence: "Twice weekly",
    status: "connected",
    healthScore: 97,
    auth: "No auth required",
    outputs: ["URL inventory", "metadata coverage", "internal link graph"],
    envKeys: []
  },
  {
    id: "docs-crawl",
    name: "Docs Crawl",
    group: "qubic_sources",
    description: "Monitors `docs.qubic.org` changes for refresh opportunities and source grounding.",
    cadence: "Twice weekly",
    status: "connected",
    healthScore: 95,
    auth: "No auth required",
    outputs: ["docs diffs", "topic freshness", "content source pack"],
    envKeys: []
  },
  {
    id: "qubic-rpc",
    name: "Qubic RPC",
    group: "qubic_sources",
    description: "Pulls first-party chain and protocol context to ground briefs, drafts, and factual refreshes.",
    cadence: "Hourly",
    status: "connected",
    healthScore: 92,
    auth: "Base URL only",
    outputs: ["protocol facts", "chain-aware source notes", "technical context packs"],
    envKeys: ["QUBIC_RPC_BASE_URL"]
  },
  {
    id: "search-console",
    name: "Morningscore SEO API",
    group: "google_signals",
    description:
      "Keyword rankings, estimated traffic, landing pages, Morningscore value, Linkscore, and onsite Healthscore via api.morningscore.io.",
    cadence: "Daily",
    status: "attention",
    healthScore: 63,
    auth: "Bearer API key (Morningscore dashboard)",
    outputs: ["ranked keywords", "traffic value", "visibility and link metrics"],
    envKeys: ["MORNINGSCORE_API_KEY"]
  },
  {
    id: "pagespeed",
    name: "Morningscore Onsite",
    group: "google_signals",
    description:
      "Derives per-URL onsite scores from Morningscore crawl (issues/tasks), including page-speed-related validators—no Google API.",
    cadence: "Daily",
    status: "connected",
    healthScore: 88,
    auth: "Morningscore API key",
    outputs: ["onsite scores", "issue-weighted priorities", "task impact"],
    envKeys: ["MORNINGSCORE_API_KEY"]
  },
  {
    id: "crux",
    name: "Chrome UX Report",
    group: "google_signals",
    description: "Optional CrUX-style trends; superseded for this deployment by Morningscore onsite + page_speed issues.",
    cadence: "Daily",
    status: "planned",
    healthScore: 44,
    auth: "Not wired",
    outputs: ["field metrics"],
    envKeys: []
  },
  {
    id: "gdelt",
    name: "GDELT News",
    group: "community_signals",
    description: "Flags Qubic-adjacent news for relevant blog opportunities and freshness alerts.",
    cadence: "Hourly",
    status: "connected",
    healthScore: 79,
    auth: "No auth required",
    outputs: ["news topic clusters", "event alerts"],
    envKeys: []
  },
  {
    id: "rss-watch",
    name: "RSS Watcher",
    group: "community_signals",
    description: "Monitors official feeds, changelogs, and ecosystem posts to seed timely source packs.",
    cadence: "Hourly",
    status: "connected",
    healthScore: 84,
    auth: "No auth required",
    outputs: ["feed item digests", "freshness alerts", "brief source candidates"],
    envKeys: []
  },
  {
    id: "csv-imports",
    name: "CSV Imports",
    group: "site_intelligence",
    description: "Ingests keyword and URL files with validation, preview, and downstream triggers.",
    cadence: "On demand",
    status: "connected",
    healthScore: 100,
    auth: "No auth required",
    outputs: ["keyword batches", "URL inventories", "import audit logs"],
    envKeys: []
  },
  {
    id: "anthropic",
    name: "Anthropic Drafting",
    group: "ai_generation",
    description: "Generates grounded briefs and drafts from source packs using the primary hosted model.",
    cadence: "On demand",
    status: "attention",
    healthScore: 68,
    auth: "Anthropic API key",
    outputs: ["brief generation", "draft generation", "revision passes"],
    envKeys: ["ANTHROPIC_API_KEY"]
  }
];

export const jobRuns: JobRun[] = [
  {
    id: "job-critical-monitor",
    name: "Critical-page monitor",
    cadence: "Hourly",
    status: "healthy",
    lastRun: "10m ago",
    nextRun: "in 50m",
    detail: "Watching top pages, RSS feeds, and ecosystem change events."
  },
  {
    id: "job-search-console-sync",
    name: "Morningscore sync",
    cadence: "Daily",
    status: "warning",
    lastRun: "Yesterday 06:15",
    nextRun: "Blocked",
    detail: "Connector needs property credentials before query rows can refresh."
  },
  {
    id: "job-site-crawl",
    name: "Site crawl + snapshot",
    cadence: "Twice weekly",
    status: "healthy",
    lastRun: "Today 04:20",
    nextRun: "Thu 04:20",
    detail: "Captures canonical tags, headings, response codes, and internal links."
  },
  {
    id: "job-content-ideas",
    name: "Content idea generation",
    cadence: "Daily",
    status: "healthy",
    lastRun: "Today 08:00",
    nextRun: "Tomorrow 08:00",
    detail: "Builds idea candidates from docs changes, GitHub, and ecosystem signals."
  },
  {
    id: "job-import-normalization",
    name: "Import normalization",
    cadence: "On demand",
    status: "healthy",
    lastRun: "2d ago",
    nextRun: "when triggered",
    detail: "Runs field mapping, URL normalization, dedupe, and downstream tagging."
  }
];

export const pagesNeedingAttention: PageAttentionItem[] = [
  {
    id: "page-ecosystem",
    url: "https://qubic.org/ecosystem",
    issue: "Section hierarchy and linking are underspecified for current ecosystem intent.",
    priority: "high",
    affectedMetric: "CTR and downstream support",
    recommendation: "Refresh metadata, add cluster-aware sub-sections, and route more internal links outward."
  },
  {
    id: "page-wallet-docs",
    url: "https://docs.qubic.org/",
    issue: "Wallet setup information is fragmented across multiple docs sections.",
    priority: "high",
    affectedMetric: "Onboarding clarity",
    recommendation: "Promote a single support page and add stronger wayfinding from docs and homepage surfaces."
  },
  {
    id: "page-blog-grid",
    url: "https://qubic.org/blog-grid",
    issue: "Blog archive does not clearly surface recent high-value technical or ecosystem content.",
    priority: "medium",
    affectedMetric: "Discovery and recirculation",
    recommendation: "Feature recent relevant-blog outputs and reinforce navigation into supporting clusters."
  }
];

export const contentIdeas: ContentIdea[] = [
  {
    id: "idea-wallet-troubleshooting",
    title: "Qubic wallet setup and troubleshooting: the operator guide",
    angle: "Combine onboarding steps, common failures, and canonical support paths into one evergreen asset.",
    freshness: "Steady recurring demand",
    relatedOpportunityId: "opp-wallet-support-page",
    sources: ["Qubic docs", "community troubleshooting patterns", "Search Console query cluster"],
    clusterRole: "Own the wallet onboarding cluster and support ecosystem conversion pages."
  },
  {
    id: "idea-ecosystem-roundup",
    title: "What changed in the Qubic ecosystem this week",
    angle: "Translate fresh launches and releases into a relevant blog that links users into priority pages.",
    freshness: "High freshness",
    relatedOpportunityId: "opp-ecosystem-roundup",
    sources: ["GitHub releases", "ecosystem page changes", "GDELT topic alerts"],
    clusterRole: "Serve as a freshness bridge into ecosystem and docs clusters."
  },
  {
    id: "idea-smart-contract-refresh",
    title: "Refresh the smart contract explainer with clearer examples and FAQs",
    angle: "Improve CTR and educational depth by updating examples, metadata, and support sections.",
    freshness: "Performance-driven refresh",
    relatedOpportunityId: "opp-refresh-smart-contract-guide",
    sources: ["Search Console", "docs audit", "internal link analysis"],
    clusterRole: "Strengthen the developer education cluster."
  }
];

export const contentBriefs: ContentBrief[] = [
  {
    id: "brief-wallet-setup",
    title: "Wallet setup and troubleshooting support page",
    format: "Support page",
    objective: "Own the wallet setup intent with one stable evergreen page grounded in official Qubic guidance.",
    audience: "New users and ecosystem participants trying to configure or recover wallet access.",
    supportingOpportunityId: "opp-wallet-support-page",
    outline: [
      "Explain who the page is for and what success looks like.",
      "Document the primary wallet setup path step by step.",
      "List the most common setup and recovery issues.",
      "Route users toward official docs and ecosystem next steps.",
      "Add FAQ schema-friendly questions and trust markers."
    ],
    sources: ["Official Qubic docs", "wallet-related query cluster", "community support patterns"],
    reviewFlags: [
      "[HUMAN REQUIRED: verify wallet recovery steps]",
      "[HUMAN REQUIRED: confirm final support CTA]"
    ]
  },
  {
    id: "brief-ecosystem-roundup",
    title: "Qubic ecosystem weekly roundup",
    format: "Relevant blog",
    objective: "Capture freshness demand and reinforce the ecosystem hub with a reviewable weekly format.",
    audience: "Existing users, builders, and researchers following Qubic momentum.",
    supportingOpportunityId: "opp-ecosystem-roundup",
    outline: [
      "Summarize the most important ecosystem shift of the week.",
      "Break down launches, releases, or partnerships with source references.",
      "Explain why the changes matter for the Qubic ecosystem.",
      "Link readers into core ecosystem and docs destinations."
    ],
    sources: ["GitHub releases", "ecosystem page updates", "official Qubic announcements"],
    reviewFlags: [
      "[HUMAN REQUIRED: verify launch claims]",
      "[HUMAN REQUIRED: add ecosystem screenshots]"
    ]
  }
];

export const drafts: DraftDocument[] = [
  {
    id: "draft-ecosystem-roundup",
    title: "What changed in the Qubic ecosystem this week",
    status: "review_required",
    supportingOpportunityId: "opp-ecosystem-roundup",
    summary: "A source-grounded roundup that explains the latest ecosystem activity and links readers into the main hub.",
    metaTitle: "Qubic ecosystem updates this week: launches, releases, and what matters",
    metaDescription:
      "Review the latest Qubic ecosystem changes, recent launches, and the official sources behind this week's momentum.",
    sources: ["GitHub release feed", "Qubic ecosystem page", "official Qubic announcements"],
    reviewFlags: [
      "[HUMAN REQUIRED: verify release sequencing]",
      "[HUMAN REQUIRED: confirm final internal-link targets]"
    ],
    sections: [
      {
        heading: "Why this week matters",
        paragraphs: [
          "The latest Qubic changes are not just incremental updates. They create new reasons to revisit the ecosystem hub and give the main site fresher entry points into supporting pages.",
          "This draft is designed to translate official changes into a clearer weekly narrative instead of shipping another generic crypto news post."
        ]
      },
      {
        heading: "The signals behind this roundup",
        paragraphs: [
          "GitHub release activity, ecosystem page updates, and official announcements point to a cluster of changes that justify a relevant blog entry this cycle.",
          "Each section below should stay tied to official or first-party references so the post remains useful after review."
        ]
      },
      {
        heading: "Where this post should link",
        paragraphs: [
          "Link readers into the ecosystem hub, any launch-specific landing pages, and the most relevant docs pages created or refreshed this cycle.",
          "The blog exists to support the cluster, not to compete with the evergreen pages it references."
        ]
      }
    ]
  },
  {
    id: "draft-wallet-support",
    title: "Qubic wallet setup and troubleshooting guide",
    status: "ready_for_editor",
    supportingOpportunityId: "opp-wallet-support-page",
    summary: "A structured evergreen support page draft that consolidates onboarding, troubleshooting, and next-step guidance.",
    metaTitle: "Qubic wallet setup and troubleshooting guide",
    metaDescription:
      "Set up a Qubic wallet, fix common issues, and follow the official support path with one guided resource.",
    sources: ["Official Qubic docs", "imported keyword rows", "community issue patterns"],
    reviewFlags: [
      "[HUMAN REQUIRED: verify setup sequence]",
      "[HUMAN REQUIRED: add annotated screenshots]"
    ],
    sections: [
      {
        heading: "Start here",
        paragraphs: [
          "This page should become the single stable entry point for wallet setup and recovery questions.",
          "It must stay operational, specific, and grounded in the official Qubic workflow."
        ]
      },
      {
        heading: "Common failure points",
        paragraphs: [
          "Group repeated issues into a predictable troubleshooting pattern so the page can serve both searchers and support teams.",
          "Use short sections, explicit checks, and links into the relevant official docs."
        ]
      },
      {
        heading: "Where to go next",
        paragraphs: [
          "Route users into the ecosystem page, account-related docs, and next-step educational resources once the setup path is complete.",
          "This preserves the support-page role while strengthening the surrounding site architecture."
        ]
      }
    ]
  }
];

export const importTemplates: ImportTemplate[] = [
  {
    id: "keywords",
    name: "Keyword import",
    description: "Seed the opportunity engine with keyword clusters, intent hints, and target URLs.",
    requiredFields: ["keyword", "topic", "intent"],
    optionalFields: ["country", "priority", "target_url", "notes"],
    sampleRows: [
      {
        keyword: "qubic wallet setup",
        topic: "wallet onboarding",
        intent: "informational",
        country: "global",
        priority: "high",
        target_url: "https://qubic.org/",
        notes: "Recurring support need"
      },
      {
        keyword: "qubic ecosystem updates",
        topic: "ecosystem momentum",
        intent: "informational",
        country: "global",
        priority: "medium",
        target_url: "https://qubic.org/ecosystem",
        notes: "Relevant weekly roundup angle"
      }
    ]
  },
  {
    id: "urls",
    name: "URL inventory import",
    description: "Import canonical URLs, owners, status, and target-topic mappings.",
    requiredFields: ["url", "page_type", "title"],
    optionalFields: ["status", "target_keyword", "owner"],
    sampleRows: [
      {
        url: "https://qubic.org/ecosystem",
        page_type: "ecosystem",
        title: "Qubic Ecosystem",
        status: "indexable",
        target_keyword: "qubic ecosystem",
        owner: "SEO"
      },
      {
        url: "https://docs.qubic.org/smart-contracts",
        page_type: "docs",
        title: "Smart Contracts",
        status: "indexable",
        target_keyword: "qubic smart contracts",
        owner: "Docs"
      }
    ]
  },
  {
    id: "content_calendar",
    name: "Content calendar import",
    description: "Bring editorial schedules into the same workspace as SEO signals.",
    requiredFields: ["title", "topic", "publish_date"],
    optionalFields: ["stage", "persona", "cta"],
    sampleRows: [
      {
        title: "Qubic ecosystem weekly roundup",
        topic: "ecosystem momentum",
        publish_date: "2026-04-10",
        stage: "brief",
        persona: "existing users",
        cta: "Visit ecosystem hub"
      }
    ]
  },
  {
    id: "internal_links",
    name: "Internal link import",
    description: "Track proposed source URLs, targets, and anchor text at scale.",
    requiredFields: ["source_url", "target_url", "anchor_text"],
    optionalFields: ["priority"],
    sampleRows: [
      {
        source_url: "https://qubic.org/ecosystem",
        target_url: "https://docs.qubic.org/smart-contracts",
        anchor_text: "smart contracts on Qubic",
        priority: "high"
      }
    ]
  }
];

export const dashboardMetrics: DashboardMetric[] = [
  {
    id: "metric-opportunities",
    label: "Actionable opportunities",
    value: String(opportunities.filter((item) => item.recommendedAction !== "skip").length),
    delta: "+3 this cycle",
    tone: "accent"
  },
  {
    id: "metric-do-now",
    label: "Do-now items",
    value: String(opportunities.filter((item) => item.priorityBand === "do_now").length),
    delta: "Refresh-first bias",
    tone: "warning"
  },
  {
    id: "metric-connectors",
    label: "Healthy connectors",
    value: `${connectors.filter((item) => item.status === "connected").length}/${connectors.length}`,
    delta: "2 need setup",
    tone: "success"
  },
  {
    id: "metric-import-success",
    label: "Import completion rate",
    value: "94%",
    delta: "Last 30 days",
    tone: "success"
  }
];

export const trendSeries: TrendSeries[] = [
  {
    label: "Impressions",
    values: [42, 46, 48, 53, 57, 61, 68],
    direction: "up",
    suffix: "k"
  },
  {
    label: "Issue backlog",
    values: [18, 16, 15, 13, 10, 9, 7],
    direction: "down"
  },
  {
    label: "Draft throughput",
    values: [1, 2, 2, 3, 3, 4, 5],
    direction: "up"
  }
];
