import { ConnectorsView } from "@/components/connectors/connectors-view";
import { getConnectorCatalog, getConnectorSummary, getRuntimeEnvSnapshot } from "@/features/seo/server/connectors";

// Force runtime rendering so process.env is read on every request. Without this,
// Next.js prerenders this page during `next build` (inside the Railway Docker
// builder stage) where none of the service env vars exist, and the resulting
// "Not loaded" snapshot gets baked into the deployed HTML forever.
export const dynamic = "force-dynamic";

export default function ConnectorsPage() {
  return (
    <ConnectorsView
      groups={getConnectorCatalog()}
      summary={getConnectorSummary()}
      runtimeEnv={getRuntimeEnvSnapshot()}
    />
  );
}
