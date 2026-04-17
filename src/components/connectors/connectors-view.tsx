"use client";

import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { connectorTone } from "@/features/seo/lib/presentation";
import type { ConnectorGroupView, ConnectorSummary } from "@/features/seo/types";

interface ConnectorsViewProps {
  groups: ConnectorGroupView[];
  summary: ConnectorSummary;
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } } };

export function ConnectorsView({ groups, summary }: ConnectorsViewProps) {
  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="surface flex flex-wrap items-center gap-4 rounded-[14px] px-5 py-4">
        <div className="mr-auto">
          <p className="mono text-[11px] uppercase tracking-[0.1em] text-white/30">
            {summary.configured}/{summary.total} configured · {summary.deploymentTarget}
          </p>
          <p className="mt-1 text-sm text-white/42">Connectors degrade gracefully when secrets are missing, but this view shows what is fully launch-ready.</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="lime">{summary.connected} live</Badge>
          <Badge tone="amber">{summary.attention} attention</Badge>
          <Badge tone="slate">{summary.planned} planned</Badge>
        </div>
      </motion.div>

      {/* Groups grid */}
      <motion.div variants={fadeUp} className="grid gap-4 xl:grid-cols-2">
        {groups.map((group) => (
          <Panel key={group.group} title={group.label}>
            <div className="space-y-2">
              {group.items.map((c) => (
                <div key={c.id} className="surface flex items-start gap-3 rounded-xl px-4 py-3">
                  {/* Status dot */}
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    c.status === "connected" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                    : c.status === "attention" ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                    : "bg-white/15"
                  }`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{c.name}</p>
                      <Badge tone={connectorTone(c.status)} className="shrink-0">{c.status}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/35">{c.cadence} · {c.auth}</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/42">{c.setupHint}</p>
                    <p className="mono mt-1 text-[10px] text-white/24">
                      keys {c.configuredKeyCount}/{c.envKeys.length}
                    </p>
                  </div>

                  {/* Health */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-white">{c.healthScore}%</p>
                    <div className="mt-1 h-1 w-12 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          c.healthScore >= 80 ? "bg-emerald-400" : c.healthScore >= 50 ? "bg-amber-400" : "bg-rose-400"
                        }`}
                        style={{ width: `${c.healthScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </motion.div>
    </motion.div>
  );
}
