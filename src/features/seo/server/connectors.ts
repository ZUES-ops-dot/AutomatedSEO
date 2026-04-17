import { connectors } from "@/features/seo/data/demo-data";
import { deploymentTarget, getConfiguredEnvKeyCount, getMissingEnvKeys } from "@/features/seo/server/env";
import type { Connector, ConnectorGroup, ConnectorGroupView, ConnectorRuntime, ConnectorState, ConnectorSummary } from "@/features/seo/types";

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
