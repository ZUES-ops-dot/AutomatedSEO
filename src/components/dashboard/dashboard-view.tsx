"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AlertTriangle, Check, Clock3, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { TrendBars } from "@/components/ui/trend-bars";
import { connectorTone } from "@/features/seo/lib/presentation";
import { cn, titleCase } from "@/lib/utils";

interface DashboardViewProps {
  data: Awaited<ReturnType<typeof import("@/features/seo/server/views").getDashboardData>>;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } }
};

export function DashboardView({ data }: DashboardViewProps) {
  const {
    connectors,
    doNowAction,
    doNow,
    jobs,
    metrics,
    pagesNeedingAttention,
    topOpportunity,
    trendSeries,
    activeQueue,
    ideas,
    briefs,
    drafts,
    schedules
  } = data;
  const [doNowState, setDoNowState] = useState<{ loading: boolean; message: string; tone: "success" | "error" | "" }>({
    loading: false,
    message: "",
    tone: ""
  });

  const opportunityItems = [topOpportunity, ...activeQueue.filter((item) => item.id !== topOpportunity.id)].slice(0, 5);
  const opportunityLookup = new Map([topOpportunity, ...activeQueue, ...doNow].map((item) => [item.id, item]));
  const contentRows = [
    ...drafts.map((item) => ({
      id: item.id,
      title: item.title,
      stage: "draft",
      status: item.status === "review_required" ? "review" : "draft",
      score: opportunityLookup.get(item.supportingOpportunityId)?.score ?? null,
      meta: item.metaTitle
    })),
    ...briefs.map((item) => ({
      id: item.id,
      title: item.title,
      stage: "brief",
      status: "review",
      score: opportunityLookup.get(item.supportingOpportunityId)?.score ?? null,
      meta: item.format
    })),
    ...ideas.map((item) => ({
      id: item.id,
      title: item.title,
      stage: "idea",
      status: "draft",
      score: opportunityLookup.get(item.relatedOpportunityId)?.score ?? null,
      meta: item.freshness
    }))
  ].slice(0, 4);
  const cycleSteps = jobs.slice(0, 5);
  const activeSchedules = schedules.filter((schedule) => schedule.enabled).slice(0, 3);
  const activityItems: Array<{
    id: string;
    title: string;
    detail: string;
    time: string;
    tone: "success" | "danger" | "warning" | "muted";
    href?: string;
    isExternal?: boolean;
  }> = [
    ...cycleSteps.slice(0, 2).map((job) => ({
      id: `job-${job.id}`,
      title: job.name,
      detail: job.detail,
      time: job.lastRun,
      tone: (job.status === "healthy" ? "success" : job.status === "warning" ? "warning" : "muted") as "success" | "warning" | "muted"
    })),
    ...pagesNeedingAttention.slice(0, 5).map((page) => ({
      id: `page-${page.id}`,
      title: page.url,
      detail: page.issue,
      time: page.priority,
      tone: (page.priority === "high" ? "danger" : "warning") as "danger" | "warning",
      href: page.url,
      isExternal: true
    }))
  ].slice(0, 7);

  async function generateDoNowBrief() {
    if (!doNowAction) {
      return;
    }
    setDoNowState({ loading: true, message: "", tone: "" });

    try {
      const response = await fetch("/api/content/brief", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          opportunityId: doNowAction.id
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; brief?: { title?: string } };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate Do Now brief.");
      }

      setDoNowState({
        loading: false,
        message: payload.brief?.title ? `Generated brief: ${payload.brief.title}` : "Do Now brief generated.",
        tone: "success"
      });
    } catch (error) {
      setDoNowState({
        loading: false,
        message: error instanceof Error ? error.message : "Failed to generate Do Now brief.",
        tone: "error"
      });
    }
  }

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      <motion.section variants={fadeUp} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </motion.section>

      <motion.section variants={fadeUp} className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel
          title="Top opportunities"
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={generateDoNowBrief}
                disabled={!doNowAction || doNowState.loading}
                className="mono rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-60"
              >
                {doNowState.loading ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Running
                  </span>
                ) : (
                  "Do now"
                )}
              </button>
              <Link href="/suggestions" className="mono text-[11px] text-cyan-300 transition hover:text-cyan-200">
                View all →
              </Link>
            </div>
          }
        >
          <div className="space-y-2.5">
            {doNowState.message ? (
              <p className={`text-[11px] ${doNowState.tone === "error" ? "text-rose-300" : "text-emerald-300"}`}>
                {doNowState.message}
              </p>
            ) : null}
            {opportunityItems.map((item) => {
              const scoreClass = item.score >= 85
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : item.score >= 65
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                  : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

              return (
                <div key={item.id} className="surface surface-hover flex items-start gap-3 rounded-lg px-3.5 py-3">
                  <div className={`mono flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${scoreClass}`}>
                    {item.score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
                    <p className="mono mt-1 text-[11px] text-white/40">
                      {titleCase(item.recommendedAction)} · {item.affectedUrls.length} URLs affected
                    </p>
                  </div>
                  <Badge className="self-center">{item.pageType}</Badge>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Autopilot cycle"
          action={
            <Link href="/connectors" className="mono text-[11px] text-cyan-300 transition hover:text-cyan-200">
              Connectors →
            </Link>
          }
        >
          <div className="space-y-0">
            {cycleSteps.map((job, index) => {
              const statusTone = job.status === "healthy" ? "done" : job.status === "warning" ? "running" : "pending";

              return (
                <div key={job.id} className="relative flex items-center gap-3 py-2.5 last:pb-0">
                  {index < cycleSteps.length - 1 ? (
                    <div className="absolute left-[13px] top-8 h-[calc(100%-8px)] w-px bg-gradient-to-b from-white/[0.07] to-transparent" />
                  ) : null}
                  <div className={cn(
                    "mono relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px]",
                    statusTone === "done" && "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
                    statusTone === "running" && "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
                    statusTone === "pending" && "border-white/[0.08] bg-white/[0.03] text-white/25"
                  )}>
                    {statusTone === "done" ? <Check className="h-3.5 w-3.5" /> : statusTone === "running" ? <Clock3 className="h-3.5 w-3.5" /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-white">{job.name}</p>
                    <p className="mono text-[10.5px] text-white/38">{job.lastRun}</p>
                  </div>
                  <Badge tone={statusTone === "done" ? "lime" : statusTone === "running" ? "cyan" : "slate"}>
                    {statusTone}
                  </Badge>
                </div>
              );
            })}
            {activeSchedules.length > 0 ? (
              <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
                {activeSchedules.map((schedule) => (
                  <p key={schedule.id} className="mono text-[10px] text-white/35">
                    {schedule.job}: next {schedule.nextRunAt ?? "pending"}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </Panel>
      </motion.section>

      <motion.section variants={fadeUp}>
        <Panel
          title="Content pipeline"
          action={
            <Link href="/content" className="mono text-[11px] text-cyan-300 transition hover:text-cyan-200">
              Open studio →
            </Link>
          }
          contentClassName="px-5 pb-2 pt-4"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="mono pb-2 text-left text-[10px] font-normal uppercase tracking-[0.1em] text-white/20">Title / context</th>
                  <th className="mono pb-2 text-left text-[10px] font-normal uppercase tracking-[0.1em] text-white/20">Status</th>
                  <th className="mono pb-2 text-left text-[10px] font-normal uppercase tracking-[0.1em] text-white/20">SEO score</th>
                  <th className="mono pb-2 text-left text-[10px] font-normal uppercase tracking-[0.1em] text-white/20">Stage</th>
                  <th className="mono pb-2 text-left text-[10px] font-normal uppercase tracking-[0.1em] text-white/20">Meta</th>
                </tr>
              </thead>
              <tbody>
                {contentRows.map((row) => (
                  <tr key={row.id} className="border-b border-white/[0.04] last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="text-[12.5px] font-semibold text-white">{row.title}</div>
                      <div className="mono mt-0.5 text-[11px] text-white/40">{row.meta}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={row.status === "review" ? "cyan" : "amber"}>{row.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex min-w-[120px] items-center gap-2">
                        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                          <div className={`h-full rounded-full ${row.score && row.score < 65 ? "bg-amber-400" : "bg-cyan-300"}`} style={{ width: `${row.score ?? 18}%` }} />
                        </div>
                        <span className="mono min-w-[28px] text-[11px] text-white/45">{row.score ?? "--"}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="mono text-[11px] text-white/45">{row.stage}</span>
                    </td>
                    <td className="py-3">
                      <span className="mono text-[11px] text-white/25">linked</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </motion.section>

      <motion.section variants={fadeUp} className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Connectors"
          action={
            <Link href="/connectors" className="mono text-[11px] text-cyan-300 transition hover:text-cyan-200">
              Manage →
            </Link>
          }
        >
          <div className="space-y-2">
            {connectors.slice(0, 6).map((c) => (
              <div key={c.id} className="surface flex items-center gap-3 rounded-lg px-3 py-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${c.status === "connected" ? "bg-emerald-400 shadow-[0_0_6px_rgba(0,255,136,0.7)]" : c.status === "attention" ? "bg-amber-400" : "bg-white/20"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-white">{c.name}</p>
                  <p className="mono mt-0.5 text-[10.5px] text-white/38">{c.cadence}</p>
                </div>
                <Badge tone={connectorTone(c.status)}>{c.status}</Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Signals (14d)">
          <div className="space-y-4">
            {trendSeries.slice(0, 2).map((series) => (
              <TrendBars key={series.label} series={series} />
            ))}
          </div>
        </Panel>

        <Panel
          title="Activity & issues"
          action={
            <Link href="/suggestions" className="mono text-[11px] text-cyan-300 transition hover:text-cyan-200">
              View all →
            </Link>
          }
        >
          <div className="space-y-0">
            {activityItems.length === 0 ? (
              <p className="text-[12px] text-white/40">
                No activity yet. Run the autopilot cycle to populate job runs and page issues.
              </p>
            ) : null}
            {activityItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 border-b border-white/[0.04] py-2.5 last:border-b-0 last:pb-0">
                <div className="surface mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                  {item.tone === "success" ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : item.tone === "danger" ? (
                    <AlertTriangle className="h-3 w-3 text-rose-400" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-cyan-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {item.href && item.isExternal ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[11.5px] font-semibold leading-5 text-cyan-300 hover:underline"
                      title={item.href}
                    >
                      {item.title}
                    </a>
                  ) : (
                    <p className="truncate text-[11.5px] leading-5 text-white">
                      <strong className="font-semibold">{item.title}</strong>
                    </p>
                  )}
                  <p className="text-[11px] leading-5 text-white/42">{item.detail}</p>
                </div>
                <div className="mono shrink-0 pt-0.5 text-[10px] text-white/22">{item.time}</div>
              </div>
            ))}
          </div>
        </Panel>
      </motion.section>
    </motion.div>
  );
}
