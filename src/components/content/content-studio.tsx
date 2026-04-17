"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, FileText, Lightbulb, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import type {
  ContentAction,
  ContentBrief,
  ContentIdea,
  DraftDocument,
  LinkSuggestion,
  PerformanceSnapshot
} from "@/features/seo/types";

const tabs = ["ideas", "briefs", "drafts"] as const;
type StudioTab = (typeof tabs)[number];

const tabMeta: Record<StudioTab, { icon: typeof Lightbulb; tone: "violet" | "cyan" | "lime" }> = {
  ideas: { icon: Lightbulb, tone: "violet" },
  briefs: { icon: BookOpen, tone: "cyan" },
  drafts: { icon: FileText, tone: "lime" }
};

interface ContentStudioProps {
  ideas?: ContentIdea[];
  briefs?: ContentBrief[];
  drafts?: DraftDocument[];
  actions?: ContentAction[];
  linkSuggestions?: LinkSuggestion[];
  performanceSnapshots?: PerformanceSnapshot[];
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
  return [nextItem, ...items.filter((item) => item.id !== nextItem.id)];
}

export function ContentStudio({
  ideas = [],
  briefs = [],
  drafts = [],
  actions = [],
  linkSuggestions = [],
  performanceSnapshots = []
}: ContentStudioProps) {
  const [tab, setTab] = useState<StudioTab>("ideas");
  const [selectedId, setSelectedId] = useState(ideas[0]?.id ?? "");
  const [contentActions, setContentActions] = useState(actions);
  const [draftLinkSuggestions, setDraftLinkSuggestions] = useState(linkSuggestions);
  const [draftSnapshots, setDraftSnapshots] = useState(performanceSnapshots);
  const [publishState, setPublishState] = useState<{ draftId: string; loading: boolean; error: string | null }>({
    draftId: "",
    loading: false,
    error: null
  });

  const items = useMemo(() => {
    switch (tab) {
      case "briefs": return briefs;
      case "drafts": return drafts;
      default: return ideas;
    }
  }, [briefs, drafts, ideas, tab]);

  const selected = items.find((i) => i.id === selectedId) ?? items[0] ?? null;
  const selectedAction =
    selected && "sections" in selected ? contentActions.find((a) => a.draftId === selected.id) ?? null : null;
  const selectedLinkSuggestions =
    selected && "sections" in selected ? draftLinkSuggestions.filter((i) => i.draftId === selected.id) : [];
  const selectedSnapshots = selectedAction
    ? draftSnapshots.filter((s) => s.actionId === selectedAction.id)
    : [];

  async function publishSelectedDraft() {
    if (!selected || !("sections" in selected)) return;
    setPublishState({ draftId: selected.id, loading: true, error: null });

    try {
      const res = await fetch("/api/content/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId: selected.id })
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; action?: ContentAction };
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to publish/export draft.");
      }

      const result = payload as {
        action: ContentAction;
        linkSuggestions: LinkSuggestion[];
        baselineSnapshots: PerformanceSnapshot[];
      };

      if (!result.action) {
        throw new Error("Invalid response from publish endpoint.");
      }

      setContentActions((c) => upsertById(c, result.action));
      setDraftLinkSuggestions((c) => {
        let n = c;
        for (const s of result.linkSuggestions ?? []) n = upsertById(n, s);
        return n;
      });
      setDraftSnapshots((c) => {
        let n = c;
        for (const s of result.baselineSnapshots ?? []) n = upsertById(n, s);
        return n;
      });
      setPublishState({ draftId: selected.id, loading: false, error: null });
    } catch (error) {
      setPublishState({ draftId: selected.id, loading: false, error: error instanceof Error ? error.message : "Failed." });
    }
  }

  const { tone } = tabMeta[tab];

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      {/* ── Sidebar list ── */}
      <Panel title="Pipeline" action={<Badge tone={tone}>{items.length}</Badge>}>
        <div className="space-y-3">
          {/* Tab switcher */}
          <div className="flex gap-1">
            {tabs.map((t) => {
              const Icon = tabMeta[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    const first = t === "ideas" ? ideas[0]?.id : t === "briefs" ? briefs[0]?.id : drafts[0]?.id;
                    setSelectedId(first ?? "");
                  }}
                  aria-pressed={tab === t}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                    tab === t
                      ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                      : "bg-white/[0.04] text-white/40 hover:text-white/60"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {t}
                </button>
              );
            })}
          </div>

          {/* Items */}
          <div className="space-y-1.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {items.map((item) => {
              const active = item.id === selected?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={active}
                  className={`w-full rounded-xl px-3.5 py-3 text-left transition-all duration-200 ${
                    active ? "bg-white/[0.08] glow-accent" : "bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-white/40">
                    {"angle" in item ? item.angle : "objective" in item ? item.objective : item.summary}
                  </p>
                </button>
              );
            })}
            {items.length === 0 && <p className="py-8 text-center text-sm text-white/30">Empty</p>}
          </div>
        </div>
      </Panel>

      {/* ── Detail ── */}
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Panel>
              <div className="space-y-5">
                {/* Header */}
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge tone={tone}>{tab.slice(0, -1)}</Badge>
                    {"format" in selected ? <Badge>{selected.format}</Badge> : null}
                    {"status" in selected ? <Badge tone="amber">{selected.status.replaceAll("_", " ")}</Badge> : null}
                  </div>
                  <h2 className="text-xl font-semibold text-white">{selected.title}</h2>
                  <p className="mt-1 text-sm text-white/50 leading-relaxed">
                    {"angle" in selected ? selected.angle : "objective" in selected ? selected.objective : selected.summary}
                  </p>
                </div>

                {/* Sources */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.sources.map((s) => (
                      <span key={s} className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-white/50">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Review flags */}
                {"reviewFlags" in selected && selected.reviewFlags.length > 0 && (
                  <div className="rounded-xl bg-amber-500/[0.06] px-4 py-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300/60">Review flags</p>
                    <div className="space-y-1">
                      {selected.reviewFlags.map((f) => (
                        <p key={f} className="text-xs text-amber-200/70">{f}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brief outline */}
                {"outline" in selected && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Outline</p>
                    <ol className="space-y-1.5 text-sm text-white/60 list-decimal list-inside">
                      {selected.outline.map((p, i) => (
                        <li key={`outline-${i}`}>{p}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Draft content */}
                {"sections" in selected && (
                  <div className="space-y-4">
                    {/* Meta */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Meta title</p>
                        <p className="mt-1 text-sm text-white">{selected.metaTitle}</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Meta desc</p>
                        <p className="mt-1 text-sm text-white/70">{selected.metaDescription}</p>
                      </div>
                    </div>

                    {/* Sections */}
                    {selected.sections.map((sec) => (
                      <div key={sec.heading} className="rounded-xl bg-white/[0.03] px-4 py-3">
                        <p className="text-sm font-semibold text-white">{sec.heading}</p>
                        <div className="mt-2 space-y-2 text-sm text-white/50 leading-relaxed">
                          {sec.paragraphs.map((p, pi) => (
                            <p key={`${sec.heading}-${pi}`}>{p}</p>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Publish */}
                    <div className="flex items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06] px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          {selectedAction ? selectedAction.detail : "Export to markdown or GitHub"}
                        </p>
                        {selectedAction && (
                          <div className="mt-1.5 flex gap-1.5">
                            <Badge tone="cyan">{selectedAction.publishTarget.replaceAll("_", " ")}</Badge>
                            <Badge tone={selectedAction.status === "error" ? "rose" : "lime"}>{selectedAction.status.replaceAll("_", " ")}</Badge>
                          </div>
                        )}
                        {publishState.error && publishState.draftId === selected.id && (
                          <p className="mt-1 text-xs text-rose-300" role="alert">
                            {publishState.error}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={publishSelectedDraft}
                        disabled={publishState.loading && publishState.draftId === selected.id}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/15 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {publishState.loading && publishState.draftId === selected.id ? "Publishing…" : "Publish"}
                      </button>
                    </div>

                    {/* Links + Performance */}
                    {(selectedLinkSuggestions.length > 0 || selectedSnapshots.length > 0) && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {selectedLinkSuggestions.length > 0 && (
                          <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Link plan</p>
                            <div className="space-y-1.5">
                              {selectedLinkSuggestions.map((l) => (
                                <div key={l.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                                  <p className="text-xs font-medium text-white">{l.anchorText}</p>
                                  <p className="text-[11px] text-white/40">{l.targetUrl}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedSnapshots.length > 0 && (
                          <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Performance</p>
                            <div className="space-y-1.5">
                              {selectedSnapshots.map((s) => (
                                <div key={s.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                                  <div className="flex gap-1.5">
                                    <Badge tone={s.kind === "baseline" ? "amber" : "cyan"}>{s.kind}</Badge>
                                  </div>
                                  <p className="mt-1 text-[11px] text-white/40">
                                    {s.clicks} clicks · {s.impressions} imp · {(s.ctr * 100).toFixed(1)}% CTR
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Idea detail */}
                {"clusterRole" in selected && !("outline" in selected) && !("sections" in selected) && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/30">Cluster role</p>
                    <p className="text-sm text-white/60 leading-relaxed">{selected.clusterRole}</p>
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>
        ) : (
          <Panel>
            <p className="py-12 text-center text-sm text-white/30">No content items available</p>
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
}
