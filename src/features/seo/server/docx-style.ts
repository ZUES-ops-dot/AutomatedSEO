import { ExternalHyperlink, type IStylesOptions, Paragraph, TextRun } from "docx";

/**
 * Default document styles applied to every DOCX export.
 *
 * Word otherwise falls back to whatever "Normal" style the host installation defines,
 * which is how users ended up with 10pt Aptos or similar on some machines. Pinning
 * Calibri 11pt here gives a consistent, clean editorial look across Word/Pages/Docs.
 *
 * Sizes are in half-points (22 = 11pt).
 */
export const DOCX_DEFAULT_STYLES: IStylesOptions = {
  default: {
    document: {
      run: {
        font: "Calibri",
        size: 22
      },
      paragraph: {
        spacing: { after: 160, line: 312 }
      }
    },
    heading1: {
      run: { font: "Calibri", size: 40, bold: true, color: "0F172A" },
      paragraph: { spacing: { before: 320, after: 180 } }
    },
    heading2: {
      run: { font: "Calibri", size: 30, bold: true, color: "111827" },
      paragraph: { spacing: { before: 260, after: 140 } }
    },
    heading3: {
      run: { font: "Calibri", size: 26, bold: true, color: "1F2937" },
      paragraph: { spacing: { before: 220, after: 120 } }
    },
    hyperlink: {
      run: { color: "1D4ED8", underline: {} }
    }
  }
};

/**
 * Strip characters that look noisy in a Word document.
 *
 * The LLM tends to emit em-dashes; copy/paste from design tools brings smart quotes
 * and ellipsis glyphs; crawled HTML sometimes carries NBSPs. Normalizing here keeps
 * the final DOCX clean and consistent without changing the author's word choice.
 */
export function normalizeDocxText(text: string): string {
  if (typeof text !== "string") {
    return "";
  }
  return text
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]{2,}/g, " ");
}

export interface InlineLinkCandidate {
  anchorText: string;
  targetUrl: string;
}

type TextSpan = { kind: "text"; text: string } | { kind: "link"; text: string; url: string };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Inject inline hyperlinks into a paragraph of text.
 *
 * For each candidate link, find the first case-insensitive occurrence of `anchorText`
 * and replace it with a clickable hyperlink while preserving the surrounding prose
 * exactly. Whole-word boundaries are preferred so that partial matches inside a
 * longer token (e.g. anchor "wallet" inside "wallets") do not produce an odd split.
 *
 * Links are processed longest-first so a longer anchor ("qubic web wallet") wins over
 * a shorter overlapping anchor ("qubic") in the same sentence.
 *
 * Returns the finished Paragraph plus the set of URLs that were successfully embedded,
 * so callers can render an "also consider" list for any unmatched suggestions.
 */
export function renderParagraphWithInlineLinks(
  rawText: string,
  links: InlineLinkCandidate[]
): { paragraph: Paragraph; matchedUrls: Set<string> } {
  const normalized = normalizeDocxText(rawText);
  let spans: TextSpan[] = [{ kind: "text", text: normalized }];
  const matchedUrls = new Set<string>();

  const uniqueLinks = dedupeLinksByUrl(links)
    .map((link) => ({ ...link, anchorText: normalizeDocxText(link.anchorText) }))
    .filter((link) => link.anchorText.length >= 3)
    .sort((left, right) => right.anchorText.length - left.anchorText.length);

  for (const link of uniqueLinks) {
    if (matchedUrls.has(link.targetUrl)) {
      continue;
    }
    const escaped = escapeRegex(link.anchorText);
    const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escaped})(?=[^A-Za-z0-9]|$)`, "i");

    const nextSpans: TextSpan[] = [];
    let inserted = false;
    for (const span of spans) {
      if (inserted || span.kind !== "text") {
        nextSpans.push(span);
        continue;
      }
      const match = span.text.match(pattern);
      if (!match || match.index == null) {
        nextSpans.push(span);
        continue;
      }
      const leading = match[1] ?? "";
      const hit = match[2] ?? match[0];
      const start = match.index + leading.length;
      const end = start + hit.length;

      const before = span.text.slice(0, start);
      const after = span.text.slice(end);

      if (before) nextSpans.push({ kind: "text", text: before });
      nextSpans.push({ kind: "link", text: hit, url: link.targetUrl });
      if (after) nextSpans.push({ kind: "text", text: after });
      inserted = true;
    }
    spans = nextSpans;
    if (inserted) {
      matchedUrls.add(link.targetUrl);
    }
  }

  const children = spans.map((span) => {
    if (span.kind === "link") {
      return new ExternalHyperlink({
        link: span.url,
        children: [new TextRun({ text: span.text, style: "Hyperlink" })]
      });
    }
    return new TextRun({ text: span.text });
  });

  return {
    paragraph: new Paragraph({ children }),
    matchedUrls
  };
}

function dedupeLinksByUrl(links: InlineLinkCandidate[]): InlineLinkCandidate[] {
  const seen = new Set<string>();
  const out: InlineLinkCandidate[] = [];
  for (const link of links) {
    if (!link?.targetUrl || !link?.anchorText) continue;
    if (seen.has(link.targetUrl)) continue;
    seen.add(link.targetUrl);
    out.push(link);
  }
  return out;
}

/**
 * Build a compact inline "further reading" paragraph for links that didn't match
 * naturally inside the body. Renders as: "Also consider linking to X, Y, and Z."
 * with each title as a real hyperlink.
 */
export function buildFurtherReadingParagraph(
  links: Array<{ anchorText: string; targetUrl: string }>,
  leadText = "Also consider linking to "
): Paragraph | null {
  const usable = dedupeLinksByUrl(links).filter((link) => link.anchorText.trim().length > 0);
  if (usable.length === 0) {
    return null;
  }

  const children: Array<TextRun | ExternalHyperlink> = [
    new TextRun({ text: normalizeDocxText(leadText), italics: true })
  ];

  usable.forEach((link, index) => {
    children.push(
      new ExternalHyperlink({
        link: link.targetUrl,
        children: [new TextRun({ text: normalizeDocxText(link.anchorText), style: "Hyperlink", italics: true })]
      })
    );
    if (index < usable.length - 2) {
      children.push(new TextRun({ text: ", ", italics: true }));
    } else if (index === usable.length - 2) {
      children.push(new TextRun({ text: usable.length === 2 ? " and " : ", and ", italics: true }));
    }
  });

  children.push(new TextRun({ text: ".", italics: true }));

  return new Paragraph({ children, spacing: { before: 120, after: 180 } });
}
