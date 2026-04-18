"use client";

import { Download, FileText, Loader2, Sparkles, Target, TrendingUp, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

import type { KeywordGapReport } from "@/features/seo/server/keyword-gaps";
import type { LongFormArticle } from "@/features/seo/server/long-form-generator";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

export function LongFormGenerator() {
  const [topic, setTopic] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [targetWordCount, setTargetWordCount] = useState(2500);
  const [audience, setAudience] = useState("");
  const [angle, setAngle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [article, setArticle] = useState<LongFormArticle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [gapLoading, setGapLoading] = useState(false);
  const [gapReport, setGapReport] = useState<KeywordGapReport | null>(null);

  async function handleAnalyzeGaps() {
    setGapLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/keyword-gaps", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          rankingLimit: 15
        })
      });
      const result = (await response.json().catch(() => ({}))) as { report?: KeywordGapReport; error?: string };
      if (!response.ok || !result.report) {
        throw new Error(result.error ?? "Gap analysis failed.");
      }
      setGapReport(result.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gap analysis failed.");
    } finally {
      setGapLoading(false);
    }
  }

  async function handleGenerate() {
    if (topic.trim().length === 0) {
      setError("Please enter a topic.");
      return;
    }

    setGenerating(true);
    setError(null);
    setArticle(null);

    try {
      const response = await fetch("/api/long-form", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          topic: topic.trim(),
          primaryKeyword: primaryKeyword.trim() || undefined,
          targetWordCount,
          audience: audience.trim() || undefined,
          angle: angle.trim() || undefined
        })
      });
      const result = (await response.json().catch(() => ({}))) as { article?: LongFormArticle; error?: string };
      if (!response.ok || !result.article) {
        throw new Error(result.error ?? "Generation failed.");
      }

      setArticle(result.article);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (!article) return;

    setDownloading(true);
    setError(null);

    try {
      const response = await fetch("/api/long-form/docx", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ article })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Download failed.");
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
      a.download = match?.[1] ?? "qubic-article.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Generate a long-form article"
        subtitle="Enter a topic and generate a 2500+ word blog post with embedded internal links to your existing site pages. Export as DOCX for review and publishing."
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-white/55">
              Topic (required)
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Qubic smart contracts, useful proof-of-work mining"
                className="surface mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/28 focus:border-cyan-400/35 focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-white/55">
              Primary keyword (optional)
              <input
                type="text"
                value={primaryKeyword}
                onChange={(e) => setPrimaryKeyword(e.target.value)}
                placeholder="e.g. qubic smart contracts"
                className="surface mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/28 focus:border-cyan-400/35 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-xs font-medium text-white/55">
              Target word count
              <input
                type="number"
                min={500}
                max={6000}
                step={100}
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(Number(e.target.value))}
                className="surface mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white focus:border-cyan-400/35 focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-white/55 md:col-span-2">
              Audience (optional)
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. developers building on Qubic"
                className="surface mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/28 focus:border-cyan-400/35 focus:outline-none"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-white/55">
            Angle / specific framing (optional)
            <input
              type="text"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="e.g. how useful proof-of-work reshapes AI training economics"
              className="surface mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/28 focus:border-cyan-400/35 focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={generating || topic.trim().length === 0}
              onClick={() => void handleGenerate()}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating article (up to 60s)…" : "Generate article"}
            </button>

            <button
              type="button"
              disabled={gapLoading}
              onClick={() => void handleAnalyzeGaps()}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-400/15 disabled:opacity-50"
              title="Find keywords you're not ranking for and topic ideas to target"
            >
              {gapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              {gapLoading ? "Analyzing…" : "Analyze keyword gaps"}
            </button>

            {article ? (
              <button
                type="button"
                disabled={downloading}
                onClick={() => void handleDownload()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.07] disabled:opacity-50"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download DOCX
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/90" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Panel>

      {gapReport ? (
        <Panel
          title="Keyword gap analysis"
          subtitle={`${gapReport.rankingGaps.length} ranking gaps • ${gapReport.topicGaps.length} topic ideas • analyzed ${gapReport.totalSearchRowsAnalyzed} search rows • via ${gapReport.provider}`}
        >
          <div className="space-y-6">
            {gapReport.rankingGaps.length > 0 ? (
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-violet-200">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Keywords you rank for but underperform
                </h3>
                <div className="space-y-2">
                  {gapReport.rankingGaps.slice(0, 10).map((gap, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-3 rounded-xl border border-violet-400/10 bg-violet-400/[0.04] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white/90">{gap.query}</p>
                          <Badge tone="violet">Score {gap.opportunityScore}</Badge>
                          <Badge tone="slate">Pos #{Math.round(gap.position)}</Badge>
                          <Badge tone="slate">{gap.impressions} impr</Badge>
                        </div>
                        <p className="mono mt-1 text-[10px] text-white/30 truncate">{gap.page}</p>
                        <p className="mt-1 text-xs text-white/55">{gap.reason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTopic(gap.query);
                          setPrimaryKeyword(gap.query);
                        }}
                        className="shrink-0 rounded-lg border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200 transition hover:bg-violet-400/15"
                      >
                        Use as topic
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/55">
                No ranking gaps found yet. Run a crawl + search-signals sync first, or use the topic gap suggestions below once you provide a topic.
              </p>
            )}

            {gapReport.topicGaps.length > 0 ? (
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-cyan-200">
                  <Target className="h-3.5 w-3.5" />
                  Topic ideas you don't cover yet
                </h3>
                <div className="space-y-2">
                  {gapReport.topicGaps.map((gap, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white/90">{gap.keyword}</p>
                          <Badge tone="cyan">{gap.intent}</Badge>
                          <Badge tone={gap.estimatedDifficulty === "low" ? "lime" : gap.estimatedDifficulty === "medium" ? "amber" : "rose"}>
                            {gap.estimatedDifficulty} difficulty
                          </Badge>
                        </div>
                        {gap.suggestedAngle ? (
                          <p className="mt-1 text-xs text-white/60">
                            <span className="text-white/35">Angle: </span>
                            {gap.suggestedAngle}
                          </p>
                        ) : null}
                        {gap.reason ? (
                          <p className="mt-0.5 text-xs text-white/45">{gap.reason}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTopic(gap.keyword);
                          setPrimaryKeyword(gap.keyword);
                          if (gap.suggestedAngle) {
                            setAngle(gap.suggestedAngle);
                          }
                        }}
                        className="shrink-0 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 transition hover:bg-cyan-400/15"
                      >
                        Use as topic
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {article ? (
        <Panel title="Preview" subtitle={`${article.wordCount} words • ${article.internalLinkCount} internal links • via ${article.provider}`}>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone="cyan">{article.wordCount} words</Badge>
              <Badge tone="lime">{article.internalLinkCount} internal links</Badge>
              <Badge tone="violet">{article.sections.length} sections</Badge>
              <Badge tone="slate">via {article.provider}</Badge>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">{article.title}</h2>
              <p className="mono mt-1 text-xs text-white/40">Meta title: {article.metaTitle}</p>
              <p className="mono text-xs text-white/40">Meta description: {article.metaDescription}</p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-cyan-200">Introduction</h3>
              <div className="space-y-2 text-sm leading-relaxed text-white/75">
                {article.introduction.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {article.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-3">
                <h3 className="text-base font-semibold text-cyan-200">{section.heading}</h3>
                <div className="space-y-2 text-sm leading-relaxed text-white/75">
                  {section.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}
                </div>

                {section.internalLinks.length > 0 ? (
                  <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-cyan-200">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Suggested internal links for this section
                    </p>
                    <ul className="space-y-1.5">
                      {section.internalLinks.map((link, linkIndex) => (
                        <li key={linkIndex} className="text-xs text-white/65">
                          <a
                            href={link.targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-300 hover:underline"
                          >
                            {link.anchorText}
                          </a>
                          <span className="text-white/40"> — {link.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-cyan-200">Conclusion</h3>
              <div className="space-y-2 text-sm leading-relaxed text-white/75">
                {article.conclusion.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {article.faq.length > 0 ? (
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-cyan-200">
                  <FileText className="h-3.5 w-3.5" />
                  Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  {article.faq.map((item, index) => (
                    <div key={index}>
                      <p className="text-sm font-medium text-white/85">{item.question}</p>
                      <p className="mt-1 text-sm text-white/65">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
