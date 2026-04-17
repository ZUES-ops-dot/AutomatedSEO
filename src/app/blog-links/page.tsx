import { BlogLinksView } from "@/components/blog-links/blog-links-view";
import { appEnv } from "@/features/seo/server/env";

export default function BlogLinksPage() {
  return <BlogLinksView blogSiteUrl={appEnv.blogSiteUrl} />;
}
