import { Document, ExternalHyperlink, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import {
  DOCX_DEFAULT_STYLES,
  buildFurtherReadingParagraph,
  normalizeDocxText,
  renderParagraphWithInlineLinks
} from "@/features/seo/server/docx-style";
import type { InternalLinkAuditSuggestion, SitePage } from "@/features/seo/types";

function formatCrawledAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "unknown";
  }
  return parsed.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function paragraphBreak() {
  return new Paragraph({ text: "" });
}

function titleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function impactBucket(impact: InternalLinkAuditSuggestion["impact"]) {
  if (impact === "high") return { label: "High impact", rank: 0 };
  if (impact === "medium") return { label: "Medium impact", rank: 1 };
  return { label: "Lower impact", rank: 2 };
}

function urlLine(label: string, url: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new ExternalHyperlink({
        children: [new TextRun({ text: url, style: "Hyperlink" })],
        link: url
      })
    ]
  });
}

function buildMetaLine(page: SitePage, suggestionCount: number): Paragraph {
  const parts = [
    `${page.wordCount} words`,
    `crawled ${formatCrawledAt(page.lastCrawled)}`,
    `${suggestionCount} link suggestion${suggestionCount === 1 ? "" : "s"}`
  ];
  return new Paragraph({
    children: [new TextRun({ text: normalizeDocxText(parts.join(" \u00B7 ")), italics: true, size: 20, color: "4B5563" })],
    spacing: { after: 200 }
  });
}

function buildReviewParagraph(suggestion: InternalLinkAuditSuggestion): Paragraph {
  const anchor = normalizeDocxText(suggestion.anchorText || suggestion.targetTitle || suggestion.targetUrl);
  const reason = normalizeDocxText(suggestion.reason ?? "");
  const placement = normalizeDocxText(suggestion.placement ?? "");
  const scoreText = Number.isFinite(suggestion.score) ? `score ${Math.round(suggestion.score)}` : "";

  const children: TextRun[] = [
    new TextRun({ text: "Link ", bold: true }),
    new TextRun({ text: `"${anchor}"`, bold: true })
  ];

  const qualifierBits: string[] = [];
  if (scoreText) qualifierBits.push(scoreText);
  if (suggestion.targetTitle && suggestion.targetTitle !== anchor) {
    qualifierBits.push(`targets "${normalizeDocxText(suggestion.targetTitle)}"`);
  }
  if (qualifierBits.length > 0) {
    children.push(new TextRun({ text: ` (${qualifierBits.join(", ")})` }));
  }
  children.push(new TextRun({ text: ". " }));

  if (reason) {
    children.push(new TextRun({ text: reason }));
    if (!reason.endsWith(".")) {
      children.push(new TextRun({ text: "." }));
    }
    children.push(new TextRun({ text: " " }));
  }

  if (placement) {
    children.push(new TextRun({ text: "Suggested placement: ", italics: true }));
    children.push(new TextRun({ text: titleCase(placement), italics: true }));
    if (!placement.endsWith(".")) {
      children.push(new TextRun({ text: ".", italics: true }));
    }
  }

  return new Paragraph({ children, spacing: { after: 120 } });
}

function splitBodyIntoParagraphs(contentText: string): string[] {
  return contentText
    .split(/\n+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

export async function buildBlogLinkDocxBuffer(page: SitePage, suggestions: InternalLinkAuditSuggestion[]) {
  const title = normalizeDocxText(page.title || page.h1 || "Blog post");
  const canonical = page.canonicalUrl || page.url;

  const children: Paragraph[] = [];

  // Header block
  children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }));
  children.push(urlLine("Live URL", canonical));
  children.push(buildMetaLine(page, suggestions.length));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: normalizeDocxText(
            "This document is an editorial worksheet generated from the crawl. The top section reviews each suggested internal link; the body below reproduces the crawled post with those links embedded inline where the anchor text appears naturally."
          ),
          italics: true,
          color: "4B5563"
        })
      ],
      spacing: { after: 240 }
    })
  );

  // 1. Editorial review
  children.push(new Paragraph({ text: "Editorial review", heading: HeadingLevel.HEADING_2 }));

  if (suggestions.length === 0) {
    children.push(
      new Paragraph({
        text: normalizeDocxText(
          "No suggestions were produced for this post. Try recrawling the blog, or pick a post with more extracted body text so the topical similarity model has enough signal."
        )
      })
    );
  } else {
    const sortedForReview = [...suggestions].sort((left, right) => {
      const leftRank = impactBucket(left.impact).rank;
      const rightRank = impactBucket(right.impact).rank;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return (right.score ?? 0) - (left.score ?? 0);
    });

    const groups = new Map<string, InternalLinkAuditSuggestion[]>();
    for (const suggestion of sortedForReview) {
      const label = impactBucket(suggestion.impact).label;
      groups.set(label, [...(groups.get(label) ?? []), suggestion]);
    }

    for (const [label, group] of groups) {
      children.push(
        new Paragraph({
          text: `${label} (${group.length})`,
          heading: HeadingLevel.HEADING_3
        })
      );
      for (const suggestion of group) {
        children.push(buildReviewParagraph(suggestion));
      }
    }
  }

  // 2. Body with embedded link suggestions
  children.push(new Paragraph({ text: "Body with embedded link suggestions", heading: HeadingLevel.HEADING_2 }));

  const bodyParagraphs = splitBodyIntoParagraphs(page.contentText);
  const matchedUrls = new Set<string>();

  if (bodyParagraphs.length === 0) {
    children.push(
      new Paragraph({
        text: normalizeDocxText(
          "No readable body text was extracted from this post. The crawl may have hit a client-rendered page or an empty template."
        )
      })
    );
  } else {
    const linkCandidates = suggestions.map((suggestion) => ({
      anchorText: suggestion.anchorText || suggestion.targetTitle || "",
      targetUrl: suggestion.targetUrl
    }));

    for (const paragraphText of bodyParagraphs) {
      const { paragraph, matchedUrls: paragraphMatches } = renderParagraphWithInlineLinks(paragraphText, linkCandidates);
      paragraphMatches.forEach((url) => matchedUrls.add(url));
      children.push(paragraph);
    }
  }

  const unmatched = suggestions.filter((suggestion) => !matchedUrls.has(suggestion.targetUrl));
  if (unmatched.length > 0) {
    children.push(paragraphBreak());
    const furtherReading = buildFurtherReadingParagraph(
      unmatched.map((suggestion) => ({
        anchorText: suggestion.anchorText || suggestion.targetTitle || suggestion.targetUrl,
        targetUrl: suggestion.targetUrl
      })),
      "Anchors without a natural inline match - consider inserting these manually: "
    );
    if (furtherReading) {
      children.push(furtherReading);
    }
  }

  // 3. Existing on-post links (compact reference)
  children.push(paragraphBreak());
  children.push(
    new Paragraph({ text: "Existing on-post links (from crawl)", heading: HeadingLevel.HEADING_2 })
  );

  if (page.internalLinkDetails.length === 0) {
    children.push(
      new Paragraph({
        text: normalizeDocxText("None detected, or the page uses client-only navigation.")
      })
    );
  } else {
    for (const detail of page.internalLinkDetails.slice(0, 48)) {
      const label = normalizeDocxText(detail.anchorText?.trim() || detail.targetUrl);
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "\u2022 " }),
            new ExternalHyperlink({
              children: [new TextRun({ text: label, style: "Hyperlink" })],
              link: detail.targetUrl
            }),
            new TextRun({ text: ` (${detail.targetUrl})`, color: "6B7280" })
          ]
        })
      );
    }
  }

  const doc = new Document({
    styles: DOCX_DEFAULT_STYLES,
    sections: [{ properties: {}, children }]
  });

  return Packer.toBuffer(doc);
}
