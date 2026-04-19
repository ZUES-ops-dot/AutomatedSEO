import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardData } from "@/features/seo/server/views";

// Dashboard pulls live Morningscore/crawl/RSS data through env-gated connectors.
// Without force-dynamic, Next prerenders this at build time on Railway (where
// service env vars are absent) and the resulting "no data / degraded" snapshot
// is served forever.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboardData();

  return <DashboardView data={data} />;
}
