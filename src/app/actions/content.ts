"use server";

import { AlignmentType, Document, HeadingLevel, Paragraph, TextRun, Packer } from "docx";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { publishDraft } from "@/features/seo/server/publishing";
import { getStoredDraftById } from "@/features/seo/server/storage";

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

export type DraftDocxResult =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string };

function safeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "qubic-draft"
  );
}

export async function downloadDraftDocxAction(draftId: string): Promise<DraftDocxResult> {
  if (typeof draftId !== "string" || draftId.trim().length === 0) {
    return { ok: false, error: "Draft ID is required." };
  }

  try {
    const draft = await getStoredDraftById(draftId.trim());
    if (!draft) {
      return { ok: false, error: `Draft ${draftId} not found.` };
    }

    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        text: draft.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.LEFT
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Meta title: ${draft.metaTitle}`, italics: true, size: 18 })]
      })
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Meta description: ${draft.metaDescription}`, italics: true, size: 18 })]
      })
    );

    if (draft.summary) {
      children.push(new Paragraph({ text: "" }));
      children.push(
        new Paragraph({
          text: "Summary",
          heading: HeadingLevel.HEADING_2
        })
      );
      children.push(new Paragraph({ text: draft.summary }));
    }

    for (const section of draft.sections) {
      children.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_2
        })
      );
      for (const paragraph of section.paragraphs) {
        children.push(new Paragraph({ text: paragraph }));
      }
    }

    if (draft.sources && draft.sources.length > 0) {
      children.push(new Paragraph({ text: "" }));
      children.push(
        new Paragraph({
          text: "Sources",
          heading: HeadingLevel.HEADING_2
        })
      );
      for (const source of draft.sources) {
        children.push(new Paragraph({ text: `• ${source}` }));
      }
    }

    if (draft.reviewFlags && draft.reviewFlags.length > 0) {
      children.push(new Paragraph({ text: "" }));
      children.push(
        new Paragraph({
          text: "Review flags",
          heading: HeadingLevel.HEADING_2
        })
      );
      for (const flag of draft.reviewFlags) {
        children.push(new Paragraph({ text: `• ${flag}` }));
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    await appendAuditEvent({
      action: "action.content.docx",
      detail: { draftId, title: draft.title }
    });

    return {
      ok: true,
      filename: `${safeFilename(draft.title)}.docx`,
      base64: Buffer.from(buffer).toString("base64")
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to generate DOCX."
    };
  }
}
