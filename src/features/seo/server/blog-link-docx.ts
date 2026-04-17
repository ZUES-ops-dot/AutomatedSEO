import { Document, ExternalHyperlink, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import type { InternalLinkAuditSuggestion, SitePage } from "@/features/seo/types";

function linkParagraph(label: string, url: string) {
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

export async function buildBlogLinkDocxBuffer(page: SitePage, suggestions: InternalLinkAuditSuggestion[]) {
  const title = page.title || page.h1 || "Blog post";
  const canonical = page.canonicalUrl || page.url;

  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1
    }),
    linkParagraph("Live URL", canonical),
    new Paragraph({
      text: "This document was generated from a crawl of the public post. Add suggested links in your CMS; this file is an editorial worksheet with working hyperlinks.",
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: "Article text (from crawl)",
      heading: HeadingLevel.HEADING_2
    })
  ];

  const bodyChunks = page.contentText.split(/\n+/).filter((c) => c.trim().length > 0);
  if (bodyChunks.length === 0) {
    children.push(new Paragraph("(No body text was extracted.)"));
  } else {
    for (const chunk of bodyChunks) {
      children.push(new Paragraph(chunk));
    }
  }

  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      text: "Existing on-post links (same host, from crawl)",
      heading: HeadingLevel.HEADING_2
    })
  );

  if (page.internalLinkDetails.length === 0) {
    children.push(new Paragraph("None detected, or the page uses client-only navigation."));
  } else {
    for (const detail of page.internalLinkDetails.slice(0, 48)) {
      const label = detail.anchorText?.trim() || detail.targetUrl;
      children.push(
        new Paragraph({
          children: [
            new TextRun("• "),
            new ExternalHyperlink({
              children: [new TextRun({ text: label, style: "Hyperlink" })],
              link: detail.targetUrl
            }),
            new TextRun({ text: ` — ${detail.targetUrl}`, color: "666666" })
          ]
        })
      );
    }
  }

  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      text: "Suggested links to add (blog + qubic.org / docs)",
      heading: HeadingLevel.HEADING_2
    })
  );

  if (suggestions.length === 0) {
    children.push(new Paragraph("No suggestions yet — recrawl the blog or pick a post with more text."));
  } else {
    for (const s of suggestions) {
      children.push(
        new Paragraph({
          children: [
            new TextRun("• "),
            new ExternalHyperlink({
              children: [new TextRun({ text: s.anchorText, style: "Hyperlink" })],
              link: s.targetUrl
            }),
            new TextRun(` — ${s.targetTitle || s.targetUrl}. Placement: ${s.placement}`)
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return Packer.toBuffer(doc);
}
