import { ContentStudio } from "@/components/content/content-studio";
import { getContentStudioViewData } from "@/features/seo/server/views";

export default async function ContentPage() {
  const studio = await getContentStudioViewData();

  return (
    <ContentStudio
      ideas={studio.ideas}
      briefs={studio.briefs}
      drafts={studio.drafts}
      actions={studio.actions}
      linkSuggestions={studio.linkSuggestions}
      performanceSnapshots={studio.performanceSnapshots}
    />
  );
}
