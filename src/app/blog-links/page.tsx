import { BlogLinksView } from "@/components/blog-links/blog-links-view";
import { appEnv } from "@/features/seo/server/env";

// Reads appEnv at render time; force runtime rendering so Railway service env
// vars take effect instead of the empty values captured during `next build`.
export const dynamic = "force-dynamic";

export default function BlogLinksPage() {
  return <BlogLinksView blogSiteUrl={appEnv.blogSiteUrl} />;
}
