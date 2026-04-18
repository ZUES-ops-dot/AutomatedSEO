import { NextRequest } from "next/server";

import { appendAuditEvent } from "@/features/seo/server/audit-log";
import { buildLongFormDocx } from "@/features/seo/server/long-form-generator";
import { longFormDocxPostSchema, parseJsonBody } from "@/lib/api-validation";
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
      .slice(0, 80) || "qubic-article"
  );
}

export async function POST(request: NextRequest) {
  const authError = requireApiAuthorization(request);
  if (authError) {
    return authError;
  }

  const limited = await rateLimitResponse(request, { namespace: "api-long-form-docx-post", max: 12, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const parsed = await parseJsonBody(request, longFormDocxPostSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const article = parsed.data.article;
    const buffer = await buildLongFormDocx(article);
    const filename = `${safeFilename(article.title)}.docx`;

    await appendAuditEvent({
      action: "api.longForm.docx",
      detail: { title: article.title, wordCount: article.wordCount }
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
