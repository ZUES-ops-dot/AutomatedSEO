let playwrightCache: { checkedAt: number; result: PlaywrightHealth } | null = null;

const PLAYWRIGHT_CACHE_MS = 60_000;

export type PlaywrightHealth = { ok: boolean; chromiumAvailable: boolean; detail?: string };

/**
 * Cheap check: verifies the Playwright package resolves and exposes chromium (no browser launch).
 */
export async function getPlaywrightRuntimeHealth(): Promise<PlaywrightHealth> {
  const now = Date.now();
  if (playwrightCache && now - playwrightCache.checkedAt < PLAYWRIGHT_CACHE_MS) {
    return playwrightCache.result;
  }

  try {
    const pw = await import("playwright");
    const chromiumAvailable = typeof pw.chromium?.launch === "function";
    const result: PlaywrightHealth = {
      ok: chromiumAvailable,
      chromiumAvailable
    };
    playwrightCache = { checkedAt: now, result };
    return result;
  } catch (error) {
    const result: PlaywrightHealth = {
      ok: false,
      chromiumAvailable: false,
      detail: String(error)
    };
    playwrightCache = { checkedAt: now, result };
    return result;
  }
}
