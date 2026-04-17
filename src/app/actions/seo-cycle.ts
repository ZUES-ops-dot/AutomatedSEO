"use server";

import { canRunPrivilegedUiActions } from "@/features/seo/server/env";
import { runSeoJob } from "@/features/seo/server/jobs";

export type RunCycleResult = { ok: true; job: string } | { ok: false; error: string };

export async function runFullSeoCycleAction(): Promise<RunCycleResult> {
  if (!canRunPrivilegedUiActions()) {
    return {
      ok: false,
      error: "Run cycle is disabled in this environment. Use the authenticated jobs API instead."
    };
  }

  try {
    const result = await runSeoJob("full-cycle");
    return { ok: true, job: result.job };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Full cycle failed."
    };
  }
}
