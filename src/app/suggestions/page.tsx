import { SuggestionsBoard } from "@/components/suggestions/suggestions-board";
import { getSuggestionsData } from "@/features/seo/server/views";

export default async function SuggestionsPage() {
  const opportunities = await getSuggestionsData();

  return <SuggestionsBoard initialOpportunities={opportunities} />;
}
