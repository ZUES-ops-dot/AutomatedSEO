import { appEnv } from "@/features/seo/server/env";
import {
  fetchMorningscoreBacklinksPage,
  getMorningscoreDomainDetails,
  MORNINGSCORE_REQUEST_GAP_MS,
  resolveMorningscoreDomainId,
  sleepMs
} from "@/features/seo/server/morningscore-api";

export type MorningscoreLinkProfileContext = {
  refdomains: number | null;
  avgBacklinkStrength: number | null;
  /** Additive boost applied to opportunity demand signals (0–8). */
  boostPoints: number;
};

/**
 * Uses domain link metrics + a sample of backlink strengths to nudge opportunity scoring
 * toward higher authority when refdomains and link strength are strong.
 */
export async function getMorningscoreLinkProfileContext(): Promise<MorningscoreLinkProfileContext> {
  if (!appEnv.morningscoreApiKey) {
    return { refdomains: null, avgBacklinkStrength: null, boostPoints: 0 };
  }

  try {
    const domainId = await resolveMorningscoreDomainId(
      appEnv.morningscoreApiKey,
      appEnv.morningscoreDomainId,
      appEnv.primarySiteUrl
    );
    await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);

    const details = await getMorningscoreDomainDetails(appEnv.morningscoreApiKey, domainId);
    await sleepMs(MORNINGSCORE_REQUEST_GAP_MS);

    const backlinks = await fetchMorningscoreBacklinksPage(appEnv.morningscoreApiKey, domainId, 1, 50, "all");
    const strengths = backlinks.data.map((row) => row.strength).filter((n): n is number => typeof n === "number");
    const avg =
      strengths.length > 0 ? Math.round(strengths.reduce((sum, n) => sum + n, 0) / strengths.length) : null;

    const refdomains = details.metrics?.refdomains ?? null;
    let boost = 0;
    if (refdomains != null) {
      if (refdomains >= 2000) {
        boost += 4;
      } else if (refdomains >= 500) {
        boost += 3;
      } else if (refdomains >= 100) {
        boost += 2;
      } else if (refdomains >= 25) {
        boost += 1;
      }
    }
    if (avg != null) {
      if (avg >= 45) {
        boost += 3;
      } else if (avg >= 30) {
        boost += 2;
      } else if (avg >= 15) {
        boost += 1;
      }
    }

    return {
      refdomains,
      avgBacklinkStrength: avg,
      boostPoints: Math.min(8, boost)
    };
  } catch {
    return { refdomains: null, avgBacklinkStrength: null, boostPoints: 0 };
  }
}
