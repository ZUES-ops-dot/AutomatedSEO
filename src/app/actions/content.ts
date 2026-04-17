"use server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { publishDraft } from "@/features/seo/server/publishing";

export type PublishDraftResult =
  | { ok: true; data: Awaited<ReturnType<typeof publishDraft>> }
  | { ok: false; error: string };

export async function publishDraftAction(
  draftId: string,
  target: "local_markdown" = "local_markdown"
): Promise<PublishDraftResult> {
  if (typeof draftId !== "string" || draftId.trim().length === 0) {
    return { ok: false, error: "Draft ID is required." };
  }

  try {
    const data = await publishDraft(draftId.trim(), target);
    await appendAuditEvent({
      action: "action.content.publish",
      detail: { draftId, target }
    });
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to publish draft."
    };
  }
}
