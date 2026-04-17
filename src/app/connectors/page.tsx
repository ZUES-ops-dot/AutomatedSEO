import { ConnectorsView } from "@/components/connectors/connectors-view";
import { getConnectorCatalog, getConnectorSummary } from "@/features/seo/server/connectors";

export default function ConnectorsPage() {
  return <ConnectorsView groups={getConnectorCatalog()} summary={getConnectorSummary()} />;
}
