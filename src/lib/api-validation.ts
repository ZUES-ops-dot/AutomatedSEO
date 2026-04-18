import { z } from "zod";

import { jsonError } from "@/lib/api-error";

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: jsonError("Request body must be valid JSON.", 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.flatten();
    return {
      ok: false,
      response: jsonError("Invalid request body.", 400, { issues: detail.fieldErrors, formErrors: detail.formErrors })
    };
  }

  return { ok: true, data: parsed.data };
}

export const jobPostSchema = z
  .object({
    job: z.string().max(64).optional(),
    runDue: z.boolean().optional()
  })
  .refine((body) => body.runDue === true || typeof body.job === "string", {
    message: "Provide runDue: true or a job name."
  });

export const jobPatchSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().optional(),
  intervalMinutes: z.number().int().positive().max(87600).optional(),
  cadence: z.string().max(500).optional(),
  detail: z.string().max(2000).optional()
});

export const suggestionPatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "approved", "in_review", "drafting", "snoozed", "dismissed"])
});

export const contentDraftPostSchema = z.object({
  topic: z.string().max(500).optional(),
  opportunityId: z.string().max(200).optional(),
  briefId: z.string().max(200).optional(),
  draftId: z.string().max(200).optional(),
  sourcePackId: z.string().max(200).optional(),
  provider: z.enum(["anthropic", "deterministic"]).optional(),
  persist: z.boolean().optional(),
  enforceQualityGates: z.boolean().optional()
});

export const contentBriefPostSchema = contentDraftPostSchema;

export const contentPublishPostSchema = z.object({
  draftId: z.string().min(1).max(200),
  target: z.enum(["local_markdown"]).optional()
});

export const contentDraftDocxPostSchema = z.object({
  draftId: z.string().min(1).max(200)
});

export const contentClusterPostSchema = z.object({
  cluster: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(10).optional(),
  persist: z.boolean().optional(),
  enforceQualityGates: z.boolean().optional(),
  provider: z.enum(["anthropic", "deterministic"]).optional()
});

export const sourcePackPostSchema = contentDraftPostSchema;

export const internalLinksPostSchema = z.object({
  recrawl: z.boolean().optional(),
  maxPages: z.number().int().positive().max(500).optional(),
  maxSuggestions: z.number().int().positive().max(500).optional()
});

export const blogLinkPackPostSchema = z.object({
  targetUrl: z.string().max(2000).optional(),
  recrawl: z.boolean().optional(),
  maxPages: z.number().int().positive().max(200).optional()
});

export const keywordGapPostSchema = z.object({
  topic: z.string().max(500).optional(),
  rankingLimit: z.number().int().min(1).max(100).optional()
});

export const longFormPostSchema = z.object({
  topic: z.string().min(1).max(500),
  primaryKeyword: z.string().max(500).optional(),
  targetWordCount: z.number().int().min(500).max(6000).optional(),
  audience: z.string().max(500).optional(),
  angle: z.string().max(1000).optional()
});

export const longFormDocxPostSchema = z.object({
  article: z.object({
    id: z.string().max(200),
    topic: z.string().max(500),
    title: z.string().max(500),
    metaTitle: z.string().max(200),
    metaDescription: z.string().max(300),
    introduction: z.array(z.string().max(20000)).max(50),
    sections: z.array(
      z.object({
        heading: z.string().max(500),
        paragraphs: z.array(z.string().max(20000)).max(50),
        internalLinks: z.array(
          z.object({
            anchorText: z.string().max(500),
            targetUrl: z.string().max(2000),
            reason: z.string().max(2000)
          })
        ).max(100)
      })
    ).max(30),
    conclusion: z.array(z.string().max(20000)).max(30),
    faq: z.array(
      z.object({
        question: z.string().max(500),
        answer: z.string().max(20000)
      })
    ).max(20),
    provider: z.enum(["anthropic", "deterministic"]),
    generatedAt: z.string().max(100),
    wordCount: z.number().int().nonnegative(),
    internalLinkCount: z.number().int().nonnegative()
  })
});

export const searchSignalPostSchema = z
  .object({
    provider: z.enum(["morningscore", "manual_csv", "demo_seed"]).optional(),
    property: z.string().max(500).optional(),
    startDate: z.string().max(32).optional(),
    endDate: z.string().max(32).optional(),
    rowLimit: z.number().int().min(1).max(25_000).optional(),
    dimensions: z.array(z.string().max(64)).max(20).optional(),
    manualRows: z
      .array(
        z.object({
          query: z.string().max(2000).optional(),
          page: z.string().max(2000).optional(),
          clicks: z.number().optional(),
          impressions: z.number().optional(),
          ctr: z.number().optional(),
          position: z.number().optional(),
          country: z.string().max(8).optional(),
          device: z.string().max(32).optional()
        })
      )
      .max(5000)
      .optional()
  })
  .passthrough();
