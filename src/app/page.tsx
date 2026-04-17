import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardData } from "@/features/seo/server/views";

export default async function HomePage() {
  const data = await getDashboardData();

  return <DashboardView data={data} />;
}
