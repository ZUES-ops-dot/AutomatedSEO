import { createHash } from "crypto";

import type { PageLinkReference } from "@/features/seo/types";
import { HTTP_CLIENT } from "@/features/seo/server/seo-constants";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { logSeoEvent } from "@/lib/seo-log";

const headingPattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
const paragraphPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
const listItemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
const anchorPattern = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const titlePattern = /<title[^>]*>([\s\S]*?)<\/title>/i;
const descriptionPattern = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i;
const descriptionFallbackPattern = /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i;
const canonicalPattern = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i;
const canonicalFallbackPattern = /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i;
const stripPattern = /<[^>]+>/g;
const scriptPattern = /<script[\s\S]*?<\/script>/gi;
const stylePattern = /<style[\s\S]*?<\/style>/gi;

interface ExtractedPageData {
  statusCode: number;
  title: string;
  h1: string;
  metaDescription: string;
  canonicalUrl: string;
  headings: string[];
  internalLinks: string[];
  internalLinkDetails: PageLinkReference[];
  contentText: string;
  contentExcerpt: string;
  contentChunks: string[];
  wordCount: number;
  contentHash: string;
  rendered: boolean;
}

type BrowserPage = {
  goto: (url: string, options?: { waitUntil?: "domcontentloaded" | "networkidle"; timeout?: number }) => Promise<{ status: () => number | null }>;
  waitForLoadState: (state: "networkidle", options?: { timeout?: number }) => Promise<void>;
  evaluate: <T>(pageFunction: () => T | Promise<T>) => Promise<T>;
  close: () => Promise<void>;
};

type BrowserContext = {
  newPage: () => Promise<BrowserPage>;
  close: () => Promise<void>;
};

type BrowserInstance = {
  newContext?: () => Promise<BrowserContext>;
  newPage?: () => Promise<BrowserPage>;
  close: () => Promise<void>;
};

type ChromiumModule = {
  launch: (options?: { headless?: boolean }) => Promise<BrowserInstance>;
};

export interface RenderedExtractionSession {
  newPage: () => Promise<BrowserPage>;
  close: () => Promise<void>;
}

interface ExtractPageSnapshotOptions {
  renderedSession?: RenderedExtractionSession | null;
}

let chromiumLoader: Promise<ChromiumModule | null> | null = null;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value: string) {
  return normalizeWhitespace(decodeHtml(value.replace(stripPattern, " ")));
}

function extractMatch(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? stripTags(match[1]) : "";
}

function uniqueStrings(values: string[], limit: number) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, limit);
}

export function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    if (parsed.pathname !== "/") {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function isInternalUrl(candidate: string, baseUrl: string) {
  try {
    const parsed = new URL(candidate);
    const base = new URL(baseUrl);
    return parsed.origin === base.origin;
  } catch {
    return false;
  }
}

export function absoluteUrl(candidate: string, baseUrl: string) {
  try {
    return normalizeUrl(new URL(candidate, baseUrl).toString());
  } catch {
    return "";
  }
}

function toContentExcerpt(contentText: string) {
  return contentText.slice(0, 280);
}

function toWordCount(contentText: string) {
  if (!contentText) {
    return 0;
  }

  return contentText.split(/\s+/).filter(Boolean).length;
}

function buildHash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

async function loadChromium() {
  if (chromiumLoader) {
    return chromiumLoader;
  }

  chromiumLoader = (async () => {
    try {
      const importPlaywright = new Function("return import('playwright')") as () => Promise<{ chromium?: ChromiumModule }>;
      const module = await importPlaywright();
      return module.chromium ?? null;
    } catch (error) {
      logSeoEvent("warn", "Playwright chromium module could not be loaded.", { error: String(error) });
      return null;
    }
  })();

  return chromiumLoader;
}

export async function createRenderedExtractionSession(): Promise<RenderedExtractionSession | null> {
  const chromium = await loadChromium();
  if (!chromium) {
    return null;
  }

  const browser = await chromium.launch({ headless: true });
  const context = browser.newContext ? await browser.newContext() : null;

  return {
    newPage: async () => {
      if (context) {
        return context.newPage();
      }
      if (!browser.newPage) {
        throw new Error("Playwright browser instance cannot create pages.");
      }
      return browser.newPage();
    },
    close: async () => {
      if (context) {
        await context.close().catch(() => undefined);
      }
      await browser.close().catch(() => undefined);
    }
  };
}

async function extractWithPlaywright(url: string, baseUrl: string, renderedSession?: RenderedExtractionSession | null) {
  const ownedSession = renderedSession ?? (await createRenderedExtractionSession());
  if (!ownedSession) {
    return null;
  }

  const page = await ownedSession.newPage();

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);

    const extracted = await page.evaluate(() => {
      const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
      const readText = (element: Element | null) => normalize((element?.textContent ?? ""));
      const contentNodes = Array.from(document.querySelectorAll("main p, main li, article p, article li, [role='main'] p, [role='main'] li"));
      const fallbackNodes = Array.from(document.querySelectorAll("p, li"));
      const chunkPool = (contentNodes.length > 0 ? contentNodes : fallbackNodes)
        .map((node) => readText(node))
        .filter((value) => value.length >= 30);
      const contentChunks = Array.from(new Set(chunkPool)).slice(0, 24);
      const contentText = (contentChunks.length > 0 ? contentChunks.join("\n") : normalize(document.body?.innerText ?? "")).trim();
      const anchors = Array.from(document.querySelectorAll("a[href]")).map((anchor) => {
        const href = anchor.getAttribute("href") ?? "";
        const anchorText = readText(anchor);
        const contextNode = anchor.closest("p, li, div, section, article");
        const context = readText(contextNode).slice(0, 240);
        return { href, anchorText, context };
      });

      return {
        title: normalize(document.title ?? ""),
        h1: readText(document.querySelector("h1")),
        metaDescription: (document.querySelector("meta[name='description']") as HTMLMetaElement | null)?.content?.trim() ?? "",
        canonicalUrl: (document.querySelector("link[rel='canonical']") as HTMLLinkElement | null)?.href?.trim() ?? "",
        headings: Array.from(document.querySelectorAll("h1, h2, h3")).map((node) => readText(node)).filter(Boolean).slice(0, 20),
        contentText,
        contentChunks,
        anchors
      };
    });

    const internalLinkDetails = uniqueStrings(
      extracted.anchors
        .map((anchor) => {
          const targetUrl = absoluteUrl(anchor.href, url);
          if (!targetUrl || !isInternalUrl(targetUrl, baseUrl)) {
            return null;
          }
          return JSON.stringify({
            targetUrl,
            anchorText: anchor.anchorText,
            context: anchor.context
          });
        })
        .filter((value): value is string => typeof value === "string"),
      100
    ).map((value) => JSON.parse(value) as PageLinkReference);
    const internalLinks = uniqueStrings(internalLinkDetails.map((item) => item.targetUrl), 100);
    const contentText = normalizeWhitespace(extracted.contentText);

    return {
      statusCode: response?.status() ?? 200,
      title: extracted.title,
      h1: extracted.h1,
      metaDescription: normalizeWhitespace(extracted.metaDescription),
      canonicalUrl: absoluteUrl(extracted.canonicalUrl, baseUrl) || url,
      headings: uniqueStrings(extracted.headings.map((item) => normalizeWhitespace(item)), 20),
      internalLinks,
      internalLinkDetails,
      contentText,
      contentExcerpt: toContentExcerpt(contentText),
      contentChunks: uniqueStrings(extracted.contentChunks.map((item) => normalizeWhitespace(item)), 24),
      wordCount: toWordCount(contentText),
      contentHash: buildHash(contentText || extracted.title || url),
      rendered: true
    } satisfies ExtractedPageData;
  } finally {
    await page.close().catch(() => undefined);
    if (!renderedSession) {
      await ownedSession.close().catch(() => undefined);
    }
  }
}

async function extractWithFetch(url: string, baseUrl: string) {
  const response = await fetchWithTimeout(
    url,
    {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; QubicSEOAutopilot/1.0; +https://qubic.org) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9"
      }
    },
    HTTP_CLIENT.slowApiTimeoutMs
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  }

  const html = await response.text();
  const cleanHtml = html.replace(scriptPattern, " ").replace(stylePattern, " ");
  const title = extractMatch(cleanHtml, titlePattern);
  const metaDescription = extractMatch(cleanHtml, descriptionPattern) || extractMatch(cleanHtml, descriptionFallbackPattern);
  const canonicalUrl = absoluteUrl(extractMatch(cleanHtml, canonicalPattern) || extractMatch(cleanHtml, canonicalFallbackPattern), baseUrl) || url;
  const headings = uniqueStrings(Array.from(cleanHtml.matchAll(headingPattern)).map((match) => stripTags(match[1])), 20);
  const paragraphs = Array.from(cleanHtml.matchAll(paragraphPattern)).map((match) => stripTags(match[1]));
  const listItems = Array.from(cleanHtml.matchAll(listItemPattern)).map((match) => stripTags(match[1]));
  const contentChunks = uniqueStrings([...paragraphs, ...listItems].filter((value) => value.length >= 30), 24);
  const contentText = normalizeWhitespace((contentChunks.length > 0 ? contentChunks.join("\n") : stripTags(cleanHtml)).trim());
  const internalLinkDetails = uniqueStrings(
    Array.from(cleanHtml.matchAll(anchorPattern))
      .map((match) => {
        const targetUrl = absoluteUrl(match[1], url);
        if (!targetUrl || !isInternalUrl(targetUrl, baseUrl)) {
          return null;
        }
        return JSON.stringify({
          targetUrl,
          anchorText: stripTags(match[2]),
          context: ""
        });
      })
      .filter((value): value is string => typeof value === "string"),
    100
  ).map((value) => JSON.parse(value) as PageLinkReference);
  const internalLinks = uniqueStrings(internalLinkDetails.map((item) => item.targetUrl), 100);

  return {
    statusCode: response.status,
    title,
    h1: headings[0] ?? title,
    metaDescription,
    canonicalUrl,
    headings,
    internalLinks,
    internalLinkDetails,
    contentText,
    contentExcerpt: toContentExcerpt(contentText),
    contentChunks,
    wordCount: toWordCount(contentText),
    contentHash: buildHash(cleanHtml),
    rendered: false
  } satisfies ExtractedPageData;
}

export async function extractPageSnapshot(url: string, baseUrl: string, preferRendered: boolean, options: ExtractPageSnapshotOptions = {}) {
  if (preferRendered) {
    try {
      const rendered = await extractWithPlaywright(url, baseUrl, options.renderedSession);
      if (rendered) {
        return rendered;
      }
    } catch (error) {
      logSeoEvent("warn", "Rendered extraction failed; falling back to static fetch.", { url, error: String(error) });
    }
  }

  return extractWithFetch(url, baseUrl);
}
