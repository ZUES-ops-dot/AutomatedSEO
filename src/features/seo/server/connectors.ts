import { connectors } from "@/features/seo/data/demo-data";
import { appEnv, deploymentTarget, getConfiguredEnvKeyCount, getMissingEnvKeys } from "@/features/seo/server/env";
import type { Connector, ConnectorGroup, ConnectorGroupView, ConnectorRuntime, ConnectorState, ConnectorSummary } from "@/features/seo/types";

/**
 * Runtime env snapshot: reports which sensitive keys are ACTUALLY loaded in
 * the running Node process right now. This is not cached and evaluates on
 * each server call, so it's the source of truth for "is my Anthropic key
 * present on Railway?" kinds of questions.
 */
export function getRuntimeEnvSnapshot() {
  const maskTail = (value: string) => (value.length >= 4 ? value.slice(-4) : value);
  return {
    deploymentTarget,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    railwayEnv: process.env.RAILWAY_ENVIRONMENT_NAME ?? null,
    checks: [
      {
        label: "Anthropic API key",
        env: "ANTHROPIC_API_KEY",
        configured: appEnv.anthropicApiKey.length > 0,
        detail:
          appEnv.anthropicApiKey.length > 0
            ? `Loaded (\u2026${maskTail(appEnv.anthropicApiKey)}, ${appEnv.anthropicApiKey.length} chars, model ${appEnv.anthropicModel})`
            : "Not loaded. Set ANTHROPIC_API_KEY in Railway and redeploy."
      },
      {
        label: "Search Console service account email",
        env: "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL",
        configured: appEnv.searchConsoleClientEmail.length > 0,
        detail:
          appEnv.searchConsoleClientEmail.length > 0
            ? `Loaded (${appEnv.searchConsoleClientEmail})`
            : "Not loaded. Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL."
      },
      {
        label: "Search Console service account private key",
        env: "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY",
        configured: appEnv.searchConsolePrivateKey.length > 0,
        detail:
          appEnv.searchConsolePrivateKey.length > 0
            ? `Loaded (${appEnv.searchConsolePrivateKey.length} chars, includes BEGIN marker: ${appEnv.searchConsolePrivateKey.includes("BEGIN")})`
            : "Not loaded. Paste the private key (including BEGIN/END markers) into GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY."
      },
      {
        label: "Google API key (PageSpeed / CrUX)",
        env: "GOOGLE_API_KEY",
        configured: appEnv.googleApiKey.length > 0,
        detail:
          appEnv.googleApiKey.length > 0
            ? `Loaded (\u2026${maskTail(appEnv.googleApiKey)})`
            : "Not loaded. Set GOOGLE_API_KEY."
      },
      {
        label: "Job secret",
        env: "JOB_SECRET",
        configured: appEnv.jobSecret.length > 0,
        detail:
          appEnv.jobSecret.length > 0
            ? "Loaded."
            : "Not loaded. Needed to call /api/jobs and /api/suggestions HTTP endpoints with Bearer auth."
      },
      {
        label: "Primary site URL",
        env: "PRIMARY_SITE_URL",
        configured: appEnv.primarySiteUrl.length > 0,
        detail: `Using ${appEnv.primarySiteUrl}.`
      },
      {
        label: "Blog site URL + path prefix",
        env: "BLOG_SITE_URL / BLOG_URL_PATH_PREFIX",
        configured: appEnv.blogSiteUrl.length > 0,
        detail: `Base: ${appEnv.blogSiteUrl}. Path filter: ${appEnv.blogUrlPathPrefix || "(none)"}`
      }
    ]
  };
}

const groupLabels: Record<ConnectorGroup, string> = {
  site_intelligence: "Site intelligence",
  google_signals: "Google signals",
  qubic_sources: "Qubic official sources",
  community_signals: "Community and market signals",
  ai_generation: "AI generation"
};

function resolveConnectorStatus(connector: Connector, missingEnvKeys: string[]): ConnectorState {
  if (connector.status === "planned") {
    return "planned";
  }

  if (missingEnvKeys.length > 0) {
    return "attention";
  }

  return "connected";
}

function buildSetupHint(connector: ConnectorRuntime) {
  if (connector.missingEnvKeys.length === 0) {
    return deploymentTarget === "railway"
      ? "Ready for Railway deployment and scheduled jobs."
      : "Ready for local development and API execution.";
  }

  if (connector.id === "search-console") {
    return "Add Google service-account access for live Search Console data, or use the manual/demo search-signal fallback via the Search Console sync endpoint.";
  }

  if (connector.missingEnvKeys.length === connector.envKeys.length) {
    return `Add ${connector.missingEnvKeys.join(", ")} to enable ${connector.name.toLowerCase()}.`;
  }

  return `Finish setup by adding ${connector.missingEnvKeys.join(", ")}.`;
}

function toRuntimeConnector(connector: Connector): ConnectorRuntime {
  const missingEnvKeys = getMissingEnvKeys(connector.envKeys);
  const configuredKeyCount = getConfiguredEnvKeyCount(connector.envKeys);
  const status = resolveConnectorStatus(connector, missingEnvKeys);

  const runtimeConnector: ConnectorRuntime = {
    ...connector,
    status,
    configured: missingEnvKeys.length === 0,
    configuredKeyCount,
    missingEnvKeys,
    setupHint: ""
  };

  runtimeConnector.setupHint = buildSetupHint(runtimeConnector);

  return runtimeConnector;
}

export function getConnectorCatalog(): ConnectorGroupView[] {
  const runtimeConnectors = connectors.map(toRuntimeConnector);

  return (Object.entries(groupLabels) as Array<[ConnectorGroup, string]>)
    .map(([group, label]) => ({
      group,
      label,
      items: runtimeConnectors.filter((connector) => connector.group === group)
    }))
    .filter((group) => group.items.length > 0);
}

export function getConnectorSummary(): ConnectorSummary {
  const runtimeConnectors = connectors.map(toRuntimeConnector);

  return {
    total: runtimeConnectors.length,
    configured: runtimeConnectors.filter((connector) => connector.configured).length,
    connected: runtimeConnectors.filter((connector) => connector.status === "connected").length,
    attention: runtimeConnectors.filter((connector) => connector.status === "attention").length,
    planned: runtimeConnectors.filter((connector) => connector.status === "planned").length,
    deploymentTarget
  };
}

export function getConnectorRuntimeById(id: string) {
  return connectors.map(toRuntimeConnector).find((connector) => connector.id === id) ?? null;
}
