import { ConnectorsView } from "@/components/connectors/connectors-view";
import { getConnectorCatalog, getConnectorSummary, getRuntimeEnvSnapshot } from "@/features/seo/server/connectors";

export default function ConnectorsPage() {
  return (
    <ConnectorsView
      groups={getConnectorCatalog()}
      summary={getConnectorSummary()}
      runtimeEnv={getRuntimeEnvSnapshot()}
    />
  );
}
