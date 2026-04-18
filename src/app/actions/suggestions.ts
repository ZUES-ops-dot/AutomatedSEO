"use server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { generateOpportunityFeed } from "@/features/seo/server/opportunity-engine";
import { updateStoredOpportunityStatus } from "@/features/seo/server/storage";
import type { Opportunity, OpportunityStatus } from "@/features/seo/types";

export type UpdateSuggestionStatusResult =
  | { ok: true; opportunity: Opportunity }
  | { ok: false; error: string };

const ALLOWED_STATUSES: OpportunityStatus[] = ["new", "in_review", "approved", "drafting", "snoozed", "dismissed"];

export async function updateSuggestionStatusAction(input: {
  id: string;
  status: OpportunityStatus;
}): Promise<UpdateSuggestionStatusResult> {
  if (!input.id || typeof input.id !== "string") {
    return { ok: false, error: "Suggestion id is required." };
  }
  if (!ALLOWED_STATUSES.includes(input.status)) {
    return { ok: false, error: `Invalid status: ${input.status}` };
  }

  try {
    const updated = await updateStoredOpportunityStatus(input.id, input.status);
    if (!updated) {
      return { ok: false, error: `Suggestion ${input.id} was not found.` };
    }

    await appendAuditEvent({
      action: "action.suggestion.patch",
      detail: { id: input.id, status: input.status }
    });

    return { ok: true, opportunity: updated };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update suggestion."
    };
  }
}

export type RegenerateSuggestionsResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

export async function regenerateSuggestionsAction(): Promise<RegenerateSuggestionsResult> {
  try {
    const payload = await generateOpportunityFeed({ persist: true });
    await appendAuditEvent({ action: "action.suggestions.regenerate", detail: {} });
    return { ok: true, count: payload.opportunities.length };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to regenerate suggestions."
    };
  }
}
