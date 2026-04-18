"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Clock3, Download, Loader2, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";

import { SeoOpsPipeline } from "@/components/seo-ops-pipeline";
import { navigationItems, pageMeta } from "@/features/seo/config/navigation";
import type { SystemQuickStats } from "@/features/seo/types";
import { cn } from "@/lib/utils";

type CycleFindings = {
  job: string;
  crawl?: { pagesCrawled: number; issues: number };
  internalLinks?: { suggestions: number; orphanPages: number };
  searchSignals?: { provider: string; rows: number };
  pageSpeed?: { snapshots: number };
  rss?: { events: number };
  gdelt?: { events: number };
  opportunities?: { candidates: number; topBand: string };
  monitoring?: { checkpoints: number };
};

interface AppShellProps {
  children: ReactNode;
  stats: SystemQuickStats;
  privilegedActionsEnabled?: boolean;
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface flex items-center gap-2 rounded-lg px-3 py-1.5">
      <span className="mono text-[10px] uppercase tracking-[0.12em] text-white/30">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

export function AppShell({ children, stats }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentMeta = pageMeta[pathname] ?? pageMeta["/"];
  const [cycleBanner, setCycleBanner] = useState<{ ok: boolean; text: string; findings?: CycleFindings } | null>(null);
  const [cyclePending, startCycle] = useTransition();

  const navSections = [
    {
      label: "SEO loop",
      items: navigationItems.filter((item) =>
        ["/", "/suggestions", "/content", "/content/generate", "/blog-links"].includes(item.href)
      )
    },
    {
      label: "Data in",
      items: navigationItems.filter((item) => ["/imports", "/connectors"].includes(item.href))
    }
  ];

  function handleRunCycle() {
    if (cyclePending) {
      return;
    }

    setCycleBanner(null);
    startCycle(async () => {
      const response = await fetch("/api/cycle", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        }
      });
      const result = (await response.json().catch(() => ({}))) as {
        findings?: CycleFindings;
        error?: string;
      };
      if (response.ok && result.findings) {
        const f = result.findings;
        const parts: string[] = [];
        if (f.crawl) parts.push(`${f.crawl.pagesCrawled} pages crawled (${f.crawl.issues} issues)`);
        if (f.internalLinks) parts.push(`${f.internalLinks.suggestions} link suggestions, ${f.internalLinks.orphanPages} orphans`);
        if (f.searchSignals) parts.push(`${f.searchSignals.rows} search rows (${f.searchSignals.provider})`);
        if (f.opportunities) parts.push(`${f.opportunities.candidates} opportunities (top: ${f.opportunities.topBand})`);
        if (f.rss) parts.push(`${f.rss.events} RSS events`);
        if (f.gdelt) parts.push(`${f.gdelt.events} GDELT events`);

        setCycleBanner({
          ok: true,
          text: parts.length > 0 ? `Cycle complete — ${parts.join(" • ")}` : "Cycle complete.",
          findings: f
        });
        router.refresh();
      } else {
        setCycleBanner({ ok: false, text: result.error ?? "Full cycle failed." });
      }
    });
  }

  function handleMobileNavigate(target: string) {
    if (!target || target === pathname) {
      return;
    }
    router.push(target as Route);
  }

  const badgeByHref: Partial<Record<(typeof navigationItems)[number]["href"], string>> = {
    "/suggestions": String(stats.opportunityCount),
    "/connectors": String(stats.totalConnectors)
  };

  return (
    <div className="min-h-screen">
      <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col border-r border-white/[0.07] px-0 py-6 lg:flex">
        <div className="border-b border-white/[0.07] px-5 pb-7">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10">
              <Activity className="h-4 w-4 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold tracking-[-0.02em] text-white">
                Qubic <span className="text-cyan-300">SEO</span>
              </p>
              <p className="mono truncate text-[10px] tracking-[0.08em] text-white/40">Autopilot v2.1</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4 last:mb-0">
              <p className="mono mb-1.5 px-2 text-[9px] uppercase tracking-[0.12em] text-white/20">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                        active
                          ? "bg-cyan-400/10 text-cyan-300 border-cyan-400/20"
                          : "text-white/40 hover:bg-white/[0.03] hover:text-white"
                      )}
                    >
                      {active ? (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-lg border border-cyan-400/20 bg-cyan-400/10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                        />
                      ) : null}
                      <Icon className="relative z-10 h-3.5 w-3.5 shrink-0 opacity-80" />
                      <div className="relative z-10 min-w-0 flex-1">
                        <span className="block leading-tight">{item.label}</span>
                        <span className="mono block truncate text-[9px] font-normal leading-tight text-white/22">
                          {item.subtitle}
                        </span>
                      </div>
                      {badgeByHref[item.href] ? (
                        <span className="mono relative z-10 ml-auto rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] text-cyan-300">
                          {badgeByHref[item.href]}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/[0.07] px-5 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(0,255,136,0.8)]" />
            <span className="mono text-[11px] text-white/45">Autopilot running</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <StatPill label="Opps" value={stats.opportunityCount} />
            <StatPill label="Review" value={stats.reviewCount} />
            <div className="col-span-2">
              <StatPill label="Connectors" value={`${stats.connectorCount}/${stats.totalConnectors}`} />
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 lg:ml-[220px]">
        <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.07] px-5 lg:px-7">
          <div className="flex items-center gap-4">
            <label className="sr-only" htmlFor="mobile-nav">
              Navigate
            </label>
            <select
              id="mobile-nav"
              className="surface rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 text-xs text-white/70 lg:hidden"
              value={pathname}
              onChange={(event) => handleMobileNavigate(event.target.value)}
            >
              {navigationItems.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
            <div>
              <div className="mono text-xs text-white/45">
                <span className="text-cyan-300">qubic.org</span> / {pathname === "/" ? "dashboard" : pathname.slice(1)}
              </div>
              <h1 className="mt-0.5 text-[15px] font-semibold text-white">{currentMeta.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="surface flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/55" aria-hidden>
              <Clock3 className="h-3 w-3" />
              <span className="mono">Live</span>
            </span>
            <Link
              href="/content"
              className="surface hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/55 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white md:flex"
            >
              <Download className="h-3 w-3" />
              <span>Studio</span>
            </Link>
            <button
              type="button"
              disabled={cyclePending}
              onClick={handleRunCycle}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300 transition hover:bg-cyan-400/15 disabled:opacity-60"
              title="Run the full SEO cycle: crawl, analyze, generate opportunities"
            >
              {cyclePending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              <span>{cyclePending ? "Running…" : "Run cycle"}</span>
            </button>
          </div>
        </header>

        {cycleBanner ? (
          <div
            className={cn(
              "border-b px-5 py-2.5 text-xs leading-snug lg:px-7",
              cycleBanner.ok
                ? "border-emerald-500/15 bg-emerald-500/[0.07] text-emerald-100/90"
                : "border-rose-500/20 bg-rose-500/[0.08] text-rose-100/90"
            )}
            role="status"
          >
            {cycleBanner.text}
          </div>
        ) : null}

        <section className="px-5 py-6 lg:px-7">
          <div className="mb-5 max-w-3xl">
            <p className="mono text-[10px] uppercase tracking-[0.12em] text-white/20">
              {pathname === "/" ? "Overview" : pathname.slice(1).replaceAll("/", " · ")}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/42">{currentMeta.subtitle}</p>
          </div>

          <div className="mb-8 max-w-5xl">
            <SeoOpsPipeline />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: "easeOut" as const }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
