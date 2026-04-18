"use client";

import { Download, Link2, Loader2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

type BlogListItem = {
  id: string;
  url: string;
  title: string;
  h1: string;
  lastCrawled: string;
  wordCount: number;
};

type Suggestion = {
  id: string;
  targetUrl: string;
  targetTitle: string;
  anchorText: string;
  placement: string;
  reason: string;
  impact: "high" | "medium" | "low";
  score: number;
};

interface BlogLinksViewProps {
  blogSiteUrl: string;
}

export function BlogLinksView({ blogSiteUrl }: BlogLinksViewProps) {
  const blogHost = useMemo(() => {
    try {
      return new URL(blogSiteUrl).hostname;
    } catch {
      return "blogs.qubic.org";
    }
  }, [blogSiteUrl]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pages, setPages] = useState<BlogListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [recrawl, setRecrawl] = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<{ blogPagesScanned: number; crossSiteSuggestions: number } | null>(null);
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawlMessage, setCrawlMessage] = useState<string | null>(null);

  function formatCrawledAt(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "unknown" : parsed.toLocaleString();
  }

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 220);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog-links?q=${encodeURIComponent(debouncedSearch)}`);
      const data = (await res.json()) as { pages?: BlogListItem[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Search failed.");
      }
      setPages(data.pages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setListLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function runPack() {
    setPackLoading(true);
    setError(null);
    setMessage(null);
    setSuggestions([]);
    setStats(null);
    try {
      const response = await fetch("/api/blog-links", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ targetUrl, recrawl, maxPages: 48 })
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string | null;
        suggestions?: Suggestion[];
        blogPagesScanned?: number;
        crossSiteSuggestions?: number;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Request failed.");
      }
      if (result.message) {
        setMessage(result.message);
      }
      setSuggestions(result.suggestions ?? []);
      setStats({
        blogPagesScanned: result.blogPagesScanned ?? 0,
        crossSiteSuggestions: result.crossSiteSuggestions ?? 0
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setPackLoading(false);
    }
  }

  async function triggerCrawl() {
    setCrawlLoading(true);
    setError(null);
    setCrawlMessage(null);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ job: "crawl" })
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Crawl failed.");
      }
      setCrawlMessage(result.message ?? "Crawl completed.");
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crawl failed.");
    } finally {
      setCrawlLoading(false);
    }
  }

  async function downloadDocx() {
    setDocxLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/blog-links/docx", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ targetUrl, recrawl, maxPages: 48 })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "DOCX export failed.");
      }
      const bytes = await response.arrayBuffer();
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/i);
      a.download = match?.[1] ?? "blog-link-pack.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "DOCX export failed.");
    } finally {
      setDocxLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Blog link workspace"
        subtitle={`Search crawled posts on ${blogHost}, pick a URL, then generate suggestions or a Word document with embedded links.`}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search titles and URLs (${blogHost})…`}
              className="surface w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/28 focus:border-cyan-400/35 focus:outline-none"
              autoComplete="off"
            />
            {listLoading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/35" aria-hidden />
            ) : null}
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/20">
            {pages.length === 0 ? (
              <div className="px-4 py-6">
                <p className="text-sm text-white/55">
                  {listLoading
                    ? "Loading…"
                    : `No blog posts have been crawled yet from ${blogHost}.`}
                </p>
                {!listLoading ? (
                  <p className="mt-1 text-xs text-white/35">
                    Click “Run crawl” to index posts, or paste a target URL below and check “Recrawl blog”.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={crawlLoading}
                    onClick={() => void triggerCrawl()}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-50"
                  >
                    {crawlLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {crawlLoading ? "Crawling…" : "Run crawl"}
                  </button>
                </div>
                {crawlMessage ? (
                  <p className="mt-2 text-xs text-emerald-300">{crawlMessage}</p>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {pages.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setTargetUrl(p.url)}
                      className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition hover:bg-white/[0.04]"
                    >
                      <span className="text-sm font-medium text-white/90">{p.title || p.h1 || p.url}</span>
                      <span className="mono truncate text-[11px] text-cyan-300/80">{p.url}</span>
                      <span className="mono text-[10px] text-white/28">
                        {p.wordCount} words · crawled {formatCrawledAt(p.lastCrawled)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="block text-xs font-medium text-white/55">
            Target post URL
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder={`https://${blogHost}/…`}
              className="surface mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/28 focus:border-cyan-400/35 focus:outline-none"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/55">
            <input
              type="checkbox"
              checked={recrawl}
              onChange={(e) => setRecrawl(e.target.checked)}
              className="rounded border-white/20 bg-black/40"
            />
            Recrawl blog before analyzing (slower; use when a post is missing or stale)
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={packLoading || !targetUrl.trim()}
              onClick={() => void runPack()}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-50"
            >
              {packLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Build suggestions
            </button>
            <button
              type="button"
              disabled={docxLoading || !targetUrl.trim()}
              onClick={() => void downloadDocx()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.07] disabled:opacity-50"
            >
              {docxLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download DOCX
            </button>
            <button
              type="button"
              onClick={() => void loadList()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/55 hover:bg-white/[0.04]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh list
            </button>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/90" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </Panel>

      {stats ? (
        <div className="flex flex-wrap gap-2">
          <Badge tone="slate">Blog pages in index: {stats.blogPagesScanned}</Badge>
          <Badge tone="lime">Cross-property suggestions: {stats.crossSiteSuggestions}</Badge>
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <Panel title="Suggested links" subtitle="Editorial targets ranked by topical overlap and link need.">
          <ul className="space-y-3">
            {suggestions.map((s) => (
              <li key={s.id} className="surface rounded-xl border border-white/[0.06] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={s.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-cyan-300 underline-offset-2 hover:underline"
                  >
                    {s.targetTitle || s.targetUrl}
                  </a>
                  <Badge tone={s.impact === "high" ? "lime" : s.impact === "medium" ? "amber" : "slate"}>{s.impact}</Badge>
                  <span className="mono text-[10px] text-white/30">score {s.score}</span>
                </div>
                <p className="mt-1 text-xs text-white/45">
                  <span className="text-white/55">Anchor:</span> {s.anchorText}
                </p>
                <p className="mt-1 text-xs text-white/38">{s.placement}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/42">{s.reason}</p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
