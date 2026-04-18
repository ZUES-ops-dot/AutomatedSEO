"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Loader2, X } from "lucide-react";

import { updateSuggestionStatusAction } from "@/app/actions/suggestions";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { actionTone, statusTone } from "@/features/seo/lib/presentation";
import type { Opportunity, OpportunityAction, OpportunityStatus } from "@/features/seo/types";
import { titleCase } from "@/lib/utils";

const actionFilters: Array<OpportunityAction | "all"> = [
  "all",
  "refresh",
  "new_support_page",
  "new_relevant_blog",
  "merge",
  "skip"
];

interface SuggestionsBoardProps {
  initialOpportunities: Opportunity[];
}

export function SuggestionsBoard({ initialOpportunities }: SuggestionsBoardProps) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [selectedAction, setSelectedAction] = useState<OpportunityAction | "all">("all");
  const [selectedId, setSelectedId] = useState(opportunities[0]?.id ?? "");
  const [patchError, setPatchError] = useState<string | null>(null);
  const [clusterState, setClusterState] = useState<{ loading: boolean; message: string | null; error: string | null }>({
    loading: false,
    message: null,
    error: null
  });

  const filtered = useMemo(() => {
    return opportunities.filter((item) => {
      return selectedAction === "all" || item.recommendedAction === selectedAction;
    });
  }, [opportunities, selectedAction]);

  const selected =
    filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  async function updateStatus(status: OpportunityStatus) {
    if (!selected) return;

    setPatchError(null);
    const previous = selected;
    const optimistic = { ...selected, status, lastUpdated: new Date().toISOString() };
    setOpportunities((c) => c.map((i) => (i.id === selected.id ? optimistic : i)));

    try {
      const result = await updateSuggestionStatusAction({ id: selected.id, status });
      if (!result.ok) {
        throw new Error(result.error);
      }
      const persisted = result.opportunity;
      setOpportunities((c) => c.map((i) => (i.id === persisted.id ? persisted : i)));
    } catch (error) {
      setPatchError(error instanceof Error ? error.message : "Could not update status.");
      setOpportunities((c) => c.map((i) => (i.id === previous.id ? previous : i)));
    }
  }

  async function generateClusterBriefs() {
    if (!selected) return;
    setClusterState({ loading: true, message: null, error: null });
    try {
      const res = await fetch("/api/content/cluster", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cluster: selected.cluster, limit: 4 })
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        generated?: Array<{ opportunityId: string }>;
        failed?: Array<{ opportunityId: string }>;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not generate cluster briefs.");
      }

      setClusterState({
        loading: false,
        message: `Generated ${data.generated?.length ?? 0} briefs for cluster "${selected.cluster}".`,
        error: data.failed && data.failed.length > 0 ? `${data.failed.length} opportunities failed quality or generation.` : null
      });
    } catch (error) {
      setClusterState({
        loading: false,
        message: null,
        error: error instanceof Error ? error.message : "Could not generate cluster briefs."
      });
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      {/* ── List ── */}
      <Panel title="Queue" action={<Badge>{filtered.length}</Badge>}>
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-1.5">
            {actionFilters.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setSelectedAction(a)}
                aria-pressed={selectedAction === a}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${
                  selectedAction === a
                    ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                    : "bg-white/[0.04] text-white/40 hover:text-white/60"
                }`}
              >
                {titleCase(a)}
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="space-y-1.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {filtered.map((item) => {
              const active = item.id === selected?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={active}
                  className={`w-full rounded-xl px-3.5 py-3 text-left transition-all duration-200 ${
                    active
                      ? "bg-white/[0.08] glow-accent"
                      : "bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    <span className="shrink-0 text-sm font-bold text-white">{item.score}</span>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <Badge tone={actionTone(item.recommendedAction)}>{titleCase(item.recommendedAction)}</Badge>
                    <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-white/30">No matches</p>
            )}
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
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge tone={actionTone(selected.recommendedAction)}>{titleCase(selected.recommendedAction)}</Badge>
                    <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
                  </div>
                  <h2 className="text-xl font-semibold text-white">{selected.title}</h2>
                  <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{selected.reason}</p>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.04] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Impact</p>
                    <p className="mt-1 text-2xl font-bold text-white">{selected.score}</p>
                    <div className="progress-bar mt-2"><div className="bg-cyan-300" style={{ width: `${selected.score}%` }} /></div>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Confidence</p>
                    <p className="mt-1 text-2xl font-bold text-white">{selected.confidenceScore}</p>
                    <div className="progress-bar mt-2"><div className="bg-cyan-500" style={{ width: `${selected.confidenceScore}%` }} /></div>
                  </div>
                </div>

                {/* Evidence + URLs */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Evidence</p>
                    <div className="space-y-1.5">
                      {selected.evidence.map((e) => (
                        <p key={e} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/60">{e}</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">URLs</p>
                    <div className="space-y-1.5">
                      {selected.affectedUrls.map((u) => (
                        <p key={u} className="truncate rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/60">{u}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {patchError && (
                  <p className="text-xs text-rose-300" role="alert">
                    {patchError}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => updateStatus("approved")}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus("snoozed")}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/25"
                  >
                    <Clock className="h-3.5 w-3.5" /> Snooze
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus("dismissed")}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25"
                  >
                    <X className="h-3.5 w-3.5" /> Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={generateClusterBriefs}
                    disabled={clusterState.loading}
                    className="flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/25 disabled:opacity-60"
                  >
                    {clusterState.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Cluster briefs
                  </button>
                </div>
                {clusterState.message ? <p className="text-xs text-emerald-300">{clusterState.message}</p> : null}
                {clusterState.error ? <p className="text-xs text-amber-300">{clusterState.error}</p> : null}
              </div>
            </Panel>
          </motion.div>
        ) : (
          <Panel>
            <p className="py-12 text-center text-sm text-white/30">Select an opportunity to inspect</p>
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
}
