const defaultEnv = {
  NEXT_PUBLIC_APP_NAME: "Qubic SEO Autopilot",
  PRIMARY_SITE_URL: "https://qubic.org",
  DOCS_SITE_URL: "https://docs.qubic.org",
  BLOG_SITE_URL: "https://blogs.qubic.org",
  QUBIC_RPC_BASE_URL: "https://rpc.qubic.org",
  SEARCH_CONSOLE_PROPERTY: "sc-domain:qubic.org",
  GDELT_QUERY: '"Qubic" OR qubic.org',
  ANTHROPIC_MODEL: "claude-3-5-sonnet-latest"
} as const;

function readEnvValue(key: string, fallback = "") {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function getDefaultEnvValue(key: string) {
  return key in defaultEnv ? defaultEnv[key as keyof typeof defaultEnv] : "";
}

function getResolvedEnvValue(key: string) {
  return readEnvValue(key, getDefaultEnvValue(key));
}

export const appEnv = {
  appName: getResolvedEnvValue("NEXT_PUBLIC_APP_NAME"),
  primarySiteUrl: getResolvedEnvValue("PRIMARY_SITE_URL"),
  docsSiteUrl: getResolvedEnvValue("DOCS_SITE_URL"),
  blogSiteUrl: getResolvedEnvValue("BLOG_SITE_URL"),
  qubicRpcBaseUrl: getResolvedEnvValue("QUBIC_RPC_BASE_URL"),
  searchConsoleProperty: getResolvedEnvValue("SEARCH_CONSOLE_PROPERTY"),
  googleApiKey: readEnvValue("GOOGLE_API_KEY"),
  searchConsoleClientEmail: readEnvValue("GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL"),
  searchConsolePrivateKey: readEnvValue("GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  ga4PropertyId: readEnvValue("GA4_PROPERTY_ID"),
  coingeckoApiKey: readEnvValue("COINGECKO_API_KEY"),
  gdeltQuery: getResolvedEnvValue("GDELT_QUERY"),
  rssFeedUrls: readEnvValue("RSS_FEED_URLS")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  anthropicApiKey: readEnvValue("ANTHROPIC_API_KEY"),
  anthropicModel: getResolvedEnvValue("ANTHROPIC_MODEL"),
  databaseUrl: readEnvValue("DATABASE_URL"),
  jobSecret: readEnvValue("JOB_SECRET"),
  redisUrl: readEnvValue("REDIS_URL"),
  /** When true with `REDIS_URL`, `/api/jobs` POST enqueues work to BullMQ (`npm run worker:seo`). */
  useJobQueue: readEnvValue("USE_JOB_QUEUE") === "true",
  /** When true, `X-Tenant-Id` is honored for rate limits and domain events (storage remains single-DB until sharded). */
  multiTenantEnabled: readEnvValue("MULTI_TENANT") === "true"
};

export const deploymentTarget: "local" | "railway" = process.env.RAILWAY_ENVIRONMENT_NAME ? "railway" : "local";

export function getMissingEnvKeys(keys: string[]) {
  return keys.filter((key) => getResolvedEnvValue(key).length === 0);
}

export function getConfiguredEnvKeyCount(keys: string[]) {
  return keys.length - getMissingEnvKeys(keys).length;
}

export function hasAllEnvKeys(keys: string[]) {
  return getMissingEnvKeys(keys).length === 0;
}

export function canRunPrivilegedUiActions() {
  return !appEnv.jobSecret && process.env.NODE_ENV !== "production";
}

export function getEnvironmentOverview() {
  return {
    deploymentTarget,
    appName: appEnv.appName,
    primarySiteUrl: appEnv.primarySiteUrl,
    docsSiteUrl: appEnv.docsSiteUrl,
    blogSiteUrl: appEnv.blogSiteUrl,
    searchConsoleProperty: appEnv.searchConsoleProperty,
    connectors: {
      searchConsoleConfigured: hasAllEnvKeys([
        "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL",
        "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY"
      ]),
      pagespeedConfigured: hasAllEnvKeys(["GOOGLE_API_KEY"]),
      qubicRpcConfigured: hasAllEnvKeys(["QUBIC_RPC_BASE_URL"]),
      rssConfigured: appEnv.rssFeedUrls.length > 0,
      anthropicConfigured: appEnv.anthropicApiKey.length > 0,
      databaseConfigured: appEnv.databaseUrl.length > 0,
      redisConfigured: appEnv.redisUrl.length > 0,
      jobQueueConfigured: appEnv.redisUrl.length > 0 && appEnv.useJobQueue,
      multiTenant: appEnv.multiTenantEnabled
    }
  };
}

const requiredEnvKeys = ["JOB_SECRET"] as const;

const optionalEnvKeys = [
  "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL",
  "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY",
  "GOOGLE_API_KEY",
  "RSS_FEED_URLS",
  "ANTHROPIC_API_KEY",
  "DATABASE_URL",
  "REDIS_URL"
] as const;

export function getStartupConfigReport() {
  const requiredKeys = deploymentTarget === "railway" ? [...requiredEnvKeys] : [];
  const requiredMissing = requiredKeys.filter((key) => readEnvValue(key).length === 0);
  const optionalConfigured = optionalEnvKeys.filter((key) => readEnvValue(key).length > 0);

  return {
    deploymentTarget,
    required: {
      keys: requiredKeys,
      missing: requiredMissing,
      healthy: requiredMissing.length === 0
    },
    optional: {
      total: optionalEnvKeys.length,
      configured: optionalConfigured.length,
      configuredKeys: optionalConfigured
    },
    mode: requiredMissing.length === 0 ? "operational" : "needs_env_setup"
  };
}
