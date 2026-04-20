"use client";

import type { ReactNode } from "react";

export type InlineLink = { anchorText: string; targetUrl: string };

type LinkWithIndex = InlineLink & { _i: number };

/** Client-safe text normalizer: mirrors `normalizeDocxText` so the UI preview matches the DOCX. */
export function normalizePreviewText(text: string): string {
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

/**
 * Renders paragraph text with suggested anchor phrases as inline links (left-to-right).
 */
export function paragraphWithInlineLinks(paragraph: string, links: InlineLink[], keyPrefix: string): ReactNode {
  const normalized = normalizePreviewText(paragraph);
  const pool: LinkWithIndex[] = links
    .map((link, i) => ({ ...link, anchorText: normalizePreviewText(link.anchorText).trim(), _i: i }))
    .filter((link) => link.anchorText.length > 0);

  if (pool.length === 0) {
    return normalized;
  }

  const consumed = new Set<number>();
  const parts: ReactNode[] = [];
  let rest = normalized;
  let guard = 0;

  while (rest.length > 0 && guard < 200) {
    guard++;
    let best: { index: number; length: number; url: string; display: string; i: number } | null = null;

    for (const link of pool) {
      if (consumed.has(link._i)) {
        continue;
      }
      const idx = rest.toLowerCase().indexOf(link.anchorText.toLowerCase());
      if (idx === -1) {
        continue;
      }
      const display = rest.slice(idx, idx + link.anchorText.length);
      if (
        !best ||
        idx < best.index ||
        (idx === best.index && link.anchorText.length > best.length)
      ) {
        best = { index: idx, length: link.anchorText.length, url: link.targetUrl, display, i: link._i };
      }
    }

    if (!best) {
      parts.push(rest);
      break;
    }

    if (best.index > 0) {
      parts.push(rest.slice(0, best.index));
    }

    parts.push(
      <a
        key={`${keyPrefix}-lnk-${best.i}-${parts.length}`}
        href={best.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-cyan-300 underline decoration-cyan-400/50 underline-offset-[3px] transition hover:text-cyan-200 hover:decoration-cyan-300"
        title={best.url}
      >
        {best.display}
      </a>
    );

    consumed.add(best.i);
    rest = rest.slice(best.index + best.length);
  }

  return parts.length > 0 ? parts : normalized;
}
