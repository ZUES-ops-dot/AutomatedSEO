import { getStoredDraftById } from "@/features/seo/server/storage";
import { getLatestSourcePackForOpportunity, getLinkSuggestions, getSitePages, saveLinkSuggestions } from "@/features/seo/server/storage";
import { appEnv } from "@/features/seo/server/env";
import type { DraftDocument, LinkSuggestion, SitePage, SourcePack } from "@/features/seo/types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function splitTerms(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function similarityScore(left: string, right: string) {
  const leftTerms = new Set(splitTerms(left));
  const rightTerms = new Set(splitTerms(right));
  if (leftTerms.size === 0 || rightTerms.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftTerms.forEach((term) => {
    if (rightTerms.has(term)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftTerms.size, rightTerms.size);
}

function inferDraftTargetUrl(draft: DraftDocument, sourcePack: SourcePack | null) {
  const slug = slugify(draft.title);
  const primaryTarget = sourcePack?.targetUrls[0];

  if (primaryTarget && !/https:\/\/[^/]+\/?$/i.test(primaryTarget) && !/docs\.qubic\.org\/?$/i.test(primaryTarget)) {
    return primaryTarget;
  }

  const looksLikeBlog =
    (sourcePack?.targetUrls ?? []).some((url) => url.includes("blog-grid")) || /week|update|roundup|launch|release|blog/i.test(draft.title);

  return looksLikeBlog ? `${appEnv.primarySiteUrl}/blog-grid/${slug}` : `${appEnv.primarySiteUrl}/${slug}`;
}

function buildAnchorText(draft: DraftDocument, sourcePack: SourcePack | null) {
  const query = sourcePack?.primaryQuery?.trim();
  if (query && query.length <= 60) {
    return query;
  }

  return draft.title.replace(/[:|].*$/, "").trim();
}

function scoreCandidate(page: SitePage, targetUrl: string, draft: DraftDocument, sourcePack: SourcePack | null) {
  const semantic = similarityScore(
    `${page.title} ${page.headings.join(" ")}`,
    `${draft.title} ${draft.summary} ${(sourcePack?.primaryQuery ?? "")} ${(sourcePack?.topic ?? "")}`
  );
  const linkNeed = page.internalLinks.includes(targetUrl) ? 0 : 1;
  const issuePenalty = page.issues.length > 0 ? 0.15 : 0;
  const score = Math.max(0, Math.round((semantic * 80 + page.internalLinks.length * 1.2 + linkNeed * 12 - issuePenalty * 100)));

  return score;
}

export async function buildLinkPlanForDraft(draftId: string) {
  const draft = await getStoredDraftById(draftId);
  if (!draft) {
    return [] as LinkSuggestion[];
  }

  const existing = await getLinkSuggestions(draftId);
  if (existing.length > 0) {
    return existing;
  }

  const sourcePack = await getLatestSourcePackForOpportunity(draft.supportingOpportunityId);
  const pages = await getSitePages();
  const targetUrl = inferDraftTargetUrl(draft, sourcePack);
  const anchorText = buildAnchorText(draft, sourcePack);

  const suggestions = pages
    .filter((page) => page.url !== targetUrl)
    .map((page) => ({
      page,
      score: scoreCandidate(page, targetUrl, draft, sourcePack)
    }))
    .filter((item) => item.score >= 35)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map(({ page, score }) => ({
      id: `link-${draft.id}-${slugify(page.url)}`,
      draftId: draft.id,
      sourceUrl: page.url,
      targetUrl,
      anchorText,
      reason:
        page.internalLinks.includes(targetUrl)
          ? `This page already links near the target cluster and can reinforce ${draft.title}.`
          : `This page shares topic overlap with ${draft.title} and should pass relevance into the target URL.`,
      score,
      createdAt: new Date().toISOString()
    } satisfies LinkSuggestion));

  await saveLinkSuggestions(suggestions);

  return suggestions;
}
