import { AlignmentType, Document, HeadingLevel, Paragraph, TextRun, Packer } from "docx";
import { NextRequest } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { getStoredDraftById } from "@/features/seo/server/storage";
import { contentDraftDocxPostSchema, parseJsonBody } from "@/lib/api-validation";
import { requireApiAuthorization } from "@/lib/api-auth";
import { catchToJsonError } from "@/lib/api-error";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

function safeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "qubic-draft"
  );
}

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-content-docx-post", max: 20, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, contentDraftDocxPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const draft = await getStoredDraftById(parsed.data.draftId.trim());
    if (!draft) {
      return new Response(JSON.stringify({ error: `Draft ${parsed.data.draftId} not found.` }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
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
      children.push(new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph({ text: draft.summary }));
    }

    for (const section of draft.sections) {
      children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2 }));
      for (const paragraph of section.paragraphs) {
        children.push(new Paragraph({ text: paragraph }));
      }
    }

    if (draft.sources.length > 0) {
      children.push(new Paragraph({ text: "" }));
      children.push(new Paragraph({ text: "Sources", heading: HeadingLevel.HEADING_2 }));
      for (const source of draft.sources) {
        children.push(new Paragraph({ text: `• ${source}` }));
      }
    }

    if (draft.reviewFlags.length > 0) {
      children.push(new Paragraph({ text: "" }));
      children.push(new Paragraph({ text: "Review flags", heading: HeadingLevel.HEADING_2 }));
      for (const flag of draft.reviewFlags) {
        children.push(new Paragraph({ text: `• ${flag}` }));
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    const filename = `${safeFilename(draft.title)}.docx`;

    await appendAuditEvent({
      action: "api.content.docx",
      detail: { draftId: draft.id, title: draft.title }
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return catchToJsonError(error, "Failed to generate DOCX.");
  }
}
