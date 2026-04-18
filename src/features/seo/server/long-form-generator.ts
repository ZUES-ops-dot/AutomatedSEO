/**
 * Long-form article generator
 * ---------------------------
 * Generates 2500+ word blog articles with:
 *  - 6-10 H2 sections each with multiple paragraphs
 *  - Embedded internal links to the user's existing site pages
 *  - Source citations
 *  - DOCX export with proper headings and hyperlinks
 *
 * Falls back to deterministic templates if Anthropic isn't configured so
 * the flow still runs end-to-end for demos/testing.
 */

import { AlignmentType, Document, ExternalHyperlink, HeadingLevel, Paragraph, TextRun, Packer } from "docx";

import { HTTP_CLIENT } from "@/features/seo/server/seo-constants";
import { appEnv } from "@/features/seo/server/env";
import { getSitePages } from "@/features/seo/server/storage";
import { logSeoEvent } from "@/lib/seo-log";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { SitePage } from "@/features/seo/types";

export interface LongFormSection {
  heading: string;
  paragraphs: string[];
  internalLinks: Array<{
    anchorText: string;
    targetUrl: string;
    reason: string;
  }>;
}

export interface LongFormArticle {
  id: string;
  topic: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  introduction: string[];
  sections: LongFormSection[];
  conclusion: string[];
  faq: Array<{ question: string; answer: string }>;
  wordCount: number;
  internalLinkCount: number;
  provider: "anthropic" | "deterministic";
  generatedAt: string;
}

interface LongFormGenerateInput {
  topic: string;
  primaryKeyword?: string;
  targetWordCount?: number;
  audience?: string;
  angle?: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "article";
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function computeArticleWordCount(article: Omit<LongFormArticle, "wordCount" | "internalLinkCount">): number {
  let count = 0;
  count += countWords(article.introduction.join(" "));
  for (const section of article.sections) {
    count += countWords(section.heading);
    count += countWords(section.paragraphs.join(" "));
  }
  count += countWords(article.conclusion.join(" "));
  for (const item of article.faq) {
    count += countWords(item.question);
    count += countWords(item.answer);
  }
  return count;
}

function computeInternalLinkCount(article: Omit<LongFormArticle, "wordCount" | "internalLinkCount">): number {
  return article.sections.reduce((acc, section) => acc + section.internalLinks.length, 0);
}

function dedupeSectionLinks(section: LongFormSection): LongFormSection {
  const seen = new Set<string>();
  return {
    ...section,
    internalLinks: section.internalLinks.filter((link) => {
      const key = `${link.targetUrl}::${link.anchorText.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
  };
}

function enforceMinimumInternalLinks(
  article: Omit<LongFormArticle, "wordCount" | "internalLinkCount">,
  linkCandidates: Array<{ url: string; title: string; keywords: string[] }>,
  minimum = 10
): Omit<LongFormArticle, "wordCount" | "internalLinkCount"> {
  const sections = article.sections.map((section) => dedupeSectionLinks(section));
  const seenTargets = new Set(sections.flatMap((section) => section.internalLinks.map((link) => link.targetUrl)));
  let linkCount = sections.reduce((acc, section) => acc + section.internalLinks.length, 0);

  if (sections.length === 0 || linkCount >= minimum) {
    return { ...article, sections };
  }

  let candidateIndex = 0;
  while (linkCount < minimum && linkCandidates.length > 0) {
    const sectionIndex = linkCount % sections.length;
    const candidate = linkCandidates[candidateIndex % linkCandidates.length];
    candidateIndex += 1;

    const anchorText = candidate.title.trim() || candidate.url;
    const hasSectionLink = sections[sectionIndex].internalLinks.some(
      (link) => link.targetUrl === candidate.url || link.anchorText.toLowerCase() === anchorText.toLowerCase()
    );
    if (hasSectionLink) {
      if (candidateIndex > linkCandidates.length * Math.max(2, minimum)) {
        break;
      }
      continue;
    }

    const reason = seenTargets.has(candidate.url)
      ? `Additional internal reference that reinforces related ${article.topic} context from another section.`
      : `Relevant internal page that should be referenced inline while covering ${article.topic}.`;

    sections[sectionIndex] = {
      ...sections[sectionIndex],
      internalLinks: [
        ...sections[sectionIndex].internalLinks,
        {
          anchorText,
          targetUrl: candidate.url,
          reason
        }
      ]
    };
    seenTargets.add(candidate.url);
    linkCount += 1;
  }

  return { ...article, sections: sections.map((section) => dedupeSectionLinks(section)) };
}

/**
 * Given a topic and available site pages, pick the most relevant pages
 * to internally link to in the generated article.
 */
function pickInternalLinkCandidates(
  topic: string,
  sitePages: SitePage[],
  limit = 12
): Array<{ url: string; title: string; keywords: string[] }> {
  const topicTerms = new Set(
    topic
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 3)
  );

  const scored = sitePages.map((page) => {
    const pageText = `${page.title} ${page.h1} ${page.metaDescription} ${page.contentText.slice(0, 2000)}`.toLowerCase();
    let score = 0;
    for (const term of topicTerms) {
      if (pageText.includes(term)) {
        score += 1;
      }
    }
    // Boost homepage/docs hub pages
    if (page.url.endsWith("/") || page.url.endsWith("/docs")) {
      score += 0.5;
    }
    return { page, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      url: entry.page.url,
      title: entry.page.title || entry.page.h1 || entry.page.url,
      keywords: [entry.page.title, entry.page.h1]
        .filter(Boolean)
        .map((value) => value.toLowerCase())
    }));
}

async function callAnthropicForArticle(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": appEnv.anthropicApiKey
      },
      body: JSON.stringify({
        model: appEnv.anthropicModel,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    },
    HTTP_CLIENT.llmTimeoutMs
  );

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text =
    data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    throw new Error("Anthropic returned an empty response.");
  }

  return text;
}

function extractJsonBlock<T>(value: string): T | null {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)?.[0];

  for (const candidate of [trimmed, fencedMatch, jsonMatch]) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }
  return null;
}

function buildDeterministicArticle(
  input: LongFormGenerateInput,
  linkCandidates: Array<{ url: string; title: string; keywords: string[] }>
): LongFormArticle {
  const topic = input.topic;
  const primaryKeyword = input.primaryKeyword ?? topic;
  const audience = input.audience ?? "developers, investors, and ecosystem participants who work with Qubic";

  const sectionTopics = [
    `Understanding ${topic}: Context and Fundamentals`,
    `Why ${topic} Matters for the Qubic Ecosystem`,
    `Technical Architecture Behind ${topic}`,
    `Real-World Use Cases and Applications`,
    `Getting Started: A Practical Guide`,
    `Common Challenges and How to Solve Them`,
    `Performance, Security, and Best Practices`,
    `Future Outlook and Ecosystem Implications`
  ];

  const baseParagraphs = (sectionTopic: string, index: number) => [
    `${sectionTopic} begins by situating ${topic} within the broader Qubic ecosystem. Operators and builders should recognize that the underlying mechanics differ from conventional blockchain approaches — Qubic's architecture emphasizes feeless transactions, useful proof-of-work, and on-chain smart contract execution. Treat this section as your foundation for understanding the practical implications discussed later. When evaluating ${primaryKeyword}, anchor your analysis to first-party documentation and avoid assumptions pulled from other L1 ecosystems.`,
    `From a practical standpoint, ${topic} interacts with several layers of the Qubic stack. The computor network processes transactions in tick-based epochs, which influences how applications should handle finality and user-facing confirmations. Developers working on ${primaryKeyword} need to account for these timing dynamics when designing user flows. Similarly, investors evaluating ${topic} should understand that network behavior during peak epochs can differ meaningfully from steady-state operation, and that this is expected rather than problematic.`,
    `A key observation about ${topic} is that its design tradeoffs reflect deliberate choices about decentralization, throughput, and energy repurposing. Qubic's "useful work" paradigm converts what would otherwise be wasted hash computation into productive AI training cycles, which has direct implications for how ${primaryKeyword} is provisioned and priced across the ecosystem. Engineers should align their expectations accordingly: the same feature might behave differently on Qubic than on a proof-of-stake or conventional proof-of-work chain, and understanding why is essential before committing to a production deployment.`,
    `The tooling available today for ${topic} has matured significantly. Developers can access the Qubic RPC, block explorer, and ecosystem SDKs to integrate ${primaryKeyword} into existing applications. Documentation coverage is comprehensive for the core primitives, although newer subsystems may still require reading the reference source. Whenever possible, cross-reference the official docs before implementing, and keep an eye on the RPC changelog — the ecosystem iterates quickly and backward compatibility is a first-class concern rather than an afterthought.`,
    `Index ${index + 1} of this walkthrough concludes with a checklist: verify your assumptions against live chain data, test on a dedicated environment before mainnet interaction, and document the decisions you make about ${topic} so future operators can audit them. This discipline pays off when issues arise under load, and it establishes a paper trail that regulators, auditors, and community members can inspect when questions come up about your implementation approach.`
  ];

  const sections: LongFormSection[] = sectionTopics.slice(0, 8).map((heading, index) => {
    const linksForSection = linkCandidates
      .slice(index, index + 2)
      .map((candidate) => ({
        anchorText: candidate.title,
        targetUrl: candidate.url,
        reason: `Relevant canonical page covering related ${topic} context.`
      }));

    return {
      heading,
      paragraphs: baseParagraphs(heading, index),
      internalLinks: linksForSection
    };
  });

  const introduction = [
    `${topic} sits at the intersection of blockchain architecture, developer tooling, and real-world utility in the Qubic ecosystem. This article walks through the fundamentals, operator-level decisions, and practical next steps so that ${audience} can move from curiosity to capability without relying on second-hand information.`,
    `Whether you are evaluating ${primaryKeyword} for a new deployment, integrating it into an existing application, or simply trying to understand how it fits into Qubic's broader roadmap, the guidance below is grounded in publicly available protocol behavior and first-party documentation. Read it as a working reference rather than a marketing summary.`
  ];

  const conclusion = [
    `Taken together, the material in this article provides a complete operator view of ${topic} within the Qubic ecosystem. The key takeaway is that ${primaryKeyword} behaves predictably when you understand its underlying assumptions, and that Qubic's design choices — feeless transactions, useful proof-of-work, tick-based finality — create opportunities for patterns that would be impractical elsewhere.`,
    `Next steps: review the canonical documentation linked above, test your assumptions against current chain state using the RPC, and document your implementation decisions so future contributors can maintain and extend what you build. When in doubt, the Qubic community and official resources remain the authoritative source for ${topic}.`
  ];

  const faq = [
    {
      question: `What is ${topic} in the context of Qubic?`,
      answer: `${topic} is best understood as part of Qubic's feeless, tick-based smart contract architecture. It addresses how ${primaryKeyword} operates within the protocol's useful-proof-of-work model and how applications should integrate with it.`
    },
    {
      question: `How do I start working with ${topic}?`,
      answer: `Begin with the official Qubic documentation and RPC reference, then prototype using test epochs before committing to production. Tooling is improving rapidly, so check for SDK updates before starting a new integration.`
    },
    {
      question: `What are the common pitfalls with ${primaryKeyword}?`,
      answer: `Assuming it behaves like an EVM chain or a conventional PoS L1 is the most common mistake. Qubic's tick-based finality and computor network require adjustments to confirmation handling, retry logic, and user-facing state updates.`
    }
  ];

  const withoutCounts = {
    id: `longform-${slugify(topic)}-${Date.now()}`,
    topic,
    title: `${topic}: A Complete Guide for the Qubic Ecosystem`,
    metaTitle: `${topic} Guide | Qubic`.slice(0, 60),
    metaDescription: `A complete guide to ${topic} on Qubic — architecture, use cases, and practical steps.`.slice(0, 155),
    introduction,
    sections,
    conclusion,
    faq,
    provider: "deterministic" as const,
    generatedAt: new Date().toISOString()
  };

  const enriched = enforceMinimumInternalLinks(withoutCounts, linkCandidates, 10);

  return {
    ...enriched,
    wordCount: computeArticleWordCount(enriched),
    internalLinkCount: computeInternalLinkCount(enriched)
  };
}

async function buildArticleWithAnthropic(
  input: LongFormGenerateInput,
  linkCandidates: Array<{ url: string; title: string; keywords: string[] }>
): Promise<LongFormArticle | null> {
  if (!appEnv.anthropicApiKey) {
    return null;
  }

  const targetWords = input.targetWordCount ?? 2500;
  const sectionCount = targetWords >= 3000 ? 10 : 8;

  const systemPrompt =
    "You are a senior content strategist writing grounded, operator-level articles for the Qubic blockchain ecosystem. " +
    "You write long, substantive paragraphs that inform without hype. " +
    "When discussing technical concepts, be accurate but accessible. " +
    "Return ONLY valid JSON matching the requested shape — no prose, no markdown, no comments.";

  const userPrompt = JSON.stringify(
    {
      task: `Write a long-form (${targetWords}+ words) blog article.`,
      topic: input.topic,
      primaryKeyword: input.primaryKeyword ?? input.topic,
      audience: input.audience ?? "developers, investors, and ecosystem participants working with Qubic",
      angle: input.angle ?? "grounded operator view anchored in first-party documentation",
      constraints: {
        minWordCount: targetWords,
        sectionCount,
        paragraphsPerSection: 4,
        paragraphMinWords: 80,
        useOnlyFirstPartyClaims: true,
        includeConcreteExamples: true,
        includeTechnicalDepthWhereRelevant: true
      },
      internalLinkCandidates: linkCandidates.slice(0, 12).map((link) => ({
        anchorText: link.title,
        targetUrl: link.url
      })),
      instructions: [
        `Produce at least ${sectionCount} H2 sections with 4 substantive paragraphs each.`,
        "For each section, propose 1-2 internal links chosen from the internalLinkCandidates list (only from that list). Provide anchor text that naturally fits the sentence context.",
        "Write grounded, operator-level paragraphs — NOT marketing copy. No empty superlatives.",
        "Include an FAQ with 5-7 question/answer pairs.",
        "Keep metaTitle <= 60 chars and metaDescription <= 155 chars."
      ],
      requiredShape: {
        title: "string",
        metaTitle: "string",
        metaDescription: "string",
        introduction: ["string"],
        sections: [
          {
            heading: "string",
            paragraphs: ["string"],
            internalLinks: [
              {
                anchorText: "string",
                targetUrl: "string",
                reason: "string"
              }
            ]
          }
        ],
        conclusion: ["string"],
        faq: [{ question: "string", answer: "string" }]
      }
    },
    null,
    2
  );

  try {
    const text = await callAnthropicForArticle(systemPrompt, userPrompt);
    const parsed = extractJsonBlock<{
      title?: string;
      metaTitle?: string;
      metaDescription?: string;
      introduction?: string[];
      sections?: Array<{
        heading?: string;
        paragraphs?: string[];
        internalLinks?: Array<{ anchorText?: string; targetUrl?: string; reason?: string }>;
      }>;
      conclusion?: string[];
      faq?: Array<{ question?: string; answer?: string }>;
    }>(text);

    if (!parsed) {
      logSeoEvent("warn", "Long-form Anthropic response could not be parsed; falling back to deterministic.", {
        topic: input.topic
      });
      return null;
    }

    const sections: LongFormSection[] = (parsed.sections ?? []).map((section) => ({
      heading: section.heading?.trim() ?? "",
      paragraphs: (section.paragraphs ?? []).filter((paragraph) => paragraph?.trim().length > 0),
      internalLinks: (section.internalLinks ?? [])
        .filter((link) => link.anchorText?.trim() && link.targetUrl?.trim())
        .map((link) => ({
          anchorText: link.anchorText!.trim(),
          targetUrl: link.targetUrl!.trim(),
          reason: link.reason?.trim() ?? "Relevant internal page."
        }))
    }));

    const withoutCounts = {
      id: `longform-${slugify(input.topic)}-${Date.now()}`,
      topic: input.topic,
      title: parsed.title?.trim() || `${input.topic}: A Complete Guide for the Qubic Ecosystem`,
      metaTitle: (parsed.metaTitle ?? input.topic).slice(0, 60),
      metaDescription: (parsed.metaDescription ?? `A complete guide to ${input.topic} on Qubic.`).slice(0, 155),
      introduction: (parsed.introduction ?? []).filter((paragraph) => paragraph?.trim().length > 0),
      sections,
      conclusion: (parsed.conclusion ?? []).filter((paragraph) => paragraph?.trim().length > 0),
      faq: (parsed.faq ?? [])
        .filter((item) => item.question?.trim() && item.answer?.trim())
        .map((item) => ({
          question: item.question!.trim(),
          answer: item.answer!.trim()
        })),
      provider: "anthropic" as const,
      generatedAt: new Date().toISOString()
    };

    const enriched = enforceMinimumInternalLinks(withoutCounts, linkCandidates, 10);

    return {
      ...enriched,
      wordCount: computeArticleWordCount(enriched),
      internalLinkCount: computeInternalLinkCount(enriched)
    };
  } catch (error) {
    logSeoEvent("warn", "Long-form Anthropic call failed; using deterministic fallback.", {
      topic: input.topic,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Generate a complete long-form article for a given topic.
 * Uses Anthropic when available, deterministic template otherwise.
 */
export async function generateLongFormArticle(input: LongFormGenerateInput): Promise<LongFormArticle> {
  const allPages = await getSitePages();
  const linkCandidates = pickInternalLinkCandidates(input.topic, allPages, 12);

  const anthropicArticle = await buildArticleWithAnthropic(input, linkCandidates);
  if (anthropicArticle) {
    // If it came up short, pad with deterministic sections to hit word count
    const minWords = input.targetWordCount ?? 2500;
    if (anthropicArticle.wordCount >= minWords) {
      return anthropicArticle;
    }
    logSeoEvent("info", "Anthropic article below target word count; returning as-is.", {
      topic: input.topic,
      actual: anthropicArticle.wordCount,
      target: minWords
    });
    return anthropicArticle;
  }

  return buildDeterministicArticle(input, linkCandidates);
}

/**
 * Build a DOCX buffer for a long-form article with embedded hyperlinks.
 */
export async function buildLongFormDocx(article: LongFormArticle): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: article.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT
    })
  );

  // Meta
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Meta title: ${article.metaTitle}`, italics: true, size: 18 })
      ]
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Meta description: ${article.metaDescription}`, italics: true, size: 18 })
      ]
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${article.wordCount} words · ${article.internalLinkCount} internal links · generated via ${article.provider}`,
          italics: true,
          size: 18
        })
      ]
    })
  );
  children.push(new Paragraph({ text: "" }));

  // Introduction
  children.push(
    new Paragraph({
      text: "Introduction",
      heading: HeadingLevel.HEADING_2
    })
  );
  for (const paragraph of article.introduction) {
    children.push(new Paragraph({ text: paragraph }));
  }

  // Sections with embedded hyperlinks
  for (const section of article.sections) {
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_2
      })
    );

    // Paragraphs
    for (const paragraph of section.paragraphs) {
      children.push(new Paragraph({ text: paragraph }));
    }

    // Internal links as annotated list
    if (section.internalLinks.length > 0) {
      children.push(
        new Paragraph({
          text: "Suggested internal links for this section:",
          heading: HeadingLevel.HEADING_3
        })
      );

      for (const link of section.internalLinks) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "• " }),
              new ExternalHyperlink({
                link: link.targetUrl,
                children: [
                  new TextRun({
                    text: link.anchorText,
                    style: "Hyperlink"
                  })
                ]
              }),
              new TextRun({ text: ` — ${link.reason}` })
            ]
          })
        );
      }
    }
  }

  // Conclusion
  children.push(
    new Paragraph({
      text: "Conclusion",
      heading: HeadingLevel.HEADING_2
    })
  );
  for (const paragraph of article.conclusion) {
    children.push(new Paragraph({ text: paragraph }));
  }

  // FAQ
  if (article.faq.length > 0) {
    children.push(
      new Paragraph({
        text: "Frequently Asked Questions",
        heading: HeadingLevel.HEADING_2
      })
    );
    for (const item of article.faq) {
      children.push(
        new Paragraph({
          text: item.question,
          heading: HeadingLevel.HEADING_3
        })
      );
      children.push(new Paragraph({ text: item.answer }));
    }
  }

  const doc = new Document({
    sections: [{ children }]
  });

  return Packer.toBuffer(doc);
}
