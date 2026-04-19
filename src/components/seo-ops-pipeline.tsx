"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Gauge, LineChart, PlugZap, Radar, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  {
    key: "signals",
    label: "Signals",
    hint: "Search, crawl, feeds",
    href: "/connectors",
    paths: ["/connectors", "/imports"],
    Icon: PlugZap
  },
  {
    key: "prioritize",
    label: "Prioritize",
    hint: "Score & triage",
    href: "/suggestions",
    paths: ["/suggestions"],
    Icon: Radar
  },
  {
    key: "produce",
    label: "Produce",
    hint: "Briefs → publish",
    href: "/generate",
    paths: ["/generate", "/blog-links"],
    Icon: Sparkles
  },
  {
    key: "measure",
    label: "Measure",
    hint: "Dashboard & perf",
    href: "/",
    paths: ["/"],
    Icon: LineChart
  }
] as const;

function stepActive(pathname: string, paths: readonly string[]) {
  return paths.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}

interface SeoOpsPipelineProps {
  className?: string;
}

export function SeoOpsPipeline({ className }: SeoOpsPipelineProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "ops-pipeline-rail relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] via-transparent to-violet-500/[0.06] px-3 py-3 sm:px-4",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <Gauge className="h-3.5 w-3.5 text-cyan-400/80" aria-hidden />
        <p className="mono text-[10px] uppercase tracking-[0.14em] text-white/35">SEO ops loop</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {steps.map((step) => {
          const active = stepActive(pathname, step.paths);
          const Icon = step.Icon;

          return (
            <Link
              key={step.key}
              href={step.href as Route}
              className={cn(
                "group flex min-h-[72px] flex-col rounded-xl px-2.5 py-2.5 transition sm:px-3",
                active
                  ? "bg-cyan-400/[0.12] ring-1 ring-cyan-400/25"
                  : "hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    active ? "text-cyan-300" : "text-white/35 group-hover:text-white/55"
                  )}
                />
                <span
                  className={cn(
                    "truncate text-[12px] font-semibold",
                    active ? "text-cyan-100" : "text-white/55 group-hover:text-white/75"
                  )}
                >
                  {step.label}
                </span>
              </div>
              <p className="mono mt-1 truncate pl-[22px] text-[9px] leading-tight text-white/28">{step.hint}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
