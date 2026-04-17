import type { ContentIdea } from "@/features/seo/types";

let ideaCache: { ideas: ContentIdea[]; timestamp: number } | null = null;

export const IDEA_CACHE_TTL_MS = 5 * 60 * 1000;

export function clearIdeasCache() {
  ideaCache = null;
}

export function getCachedIdeasIfValid(): ContentIdea[] | null {
  if (ideaCache && Date.now() - ideaCache.timestamp < IDEA_CACHE_TTL_MS) {
    return ideaCache.ideas;
  }
  return null;
}

export function setIdeasCache(ideas: ContentIdea[]) {
  ideaCache = { ideas, timestamp: Date.now() };
}
