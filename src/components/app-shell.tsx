"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Clock3, Loader2, Menu, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  const navSections = [
    {
      label: "SEO loop",
      items: navigationItems.filter((item) =>
        ["/", "/suggestions", "/generate", "/blog-links"].includes(item.href)
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

  // Primary routes shown in the mobile bottom tab bar (max 5 keeps thumb reach).
  const bottomTabs = navigationItems.filter((item) =>
    ["/", "/suggestions", "/generate", "/blog-links", "/connectors"].includes(item.href)
  );

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

      <main className="min-w-0 overflow-x-clip lg:ml-[220px]">
        <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-white/[0.07] px-3 sm:px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="surface flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/70 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="mono truncate text-[11px] text-white/45">
                <span className="text-cyan-300">qubic.org</span> / {pathname === "/" ? "dashboard" : pathname.slice(1)}
              </div>
              <h1 className="mt-0.5 truncate text-[14px] font-semibold text-white sm:text-[15px]">{currentMeta.title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="surface hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/55 sm:flex" aria-hidden>
              <Clock3 className="h-3 w-3" />
              <span className="mono">Live</span>
            </span>
            <button
              type="button"
              disabled={cyclePending}
              onClick={handleRunCycle}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1.5 text-xs text-cyan-300 transition hover:bg-cyan-400/15 disabled:opacity-60 sm:px-3"
              title="Run the full SEO cycle: crawl, analyze, generate opportunities"
            >
              {cyclePending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              <span className="hidden sm:inline">{cyclePending ? "Running…" : "Run cycle"}</span>
              <span className="sm:hidden">{cyclePending ? "…" : "Cycle"}</span>
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

        <section className="overflow-x-clip px-4 pb-28 pt-5 sm:px-5 sm:py-6 lg:px-7 lg:pb-6">
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

      <AnimatePresence>
        {mobileNavOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden
            />
            <motion.aside
              className="glass absolute inset-y-0 left-0 flex w-[270px] max-w-[85vw] flex-col overflow-x-hidden border-r border-white/[0.08] px-0 py-5"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 pb-5">
                <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2.5">
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
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="surface flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/55"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                            onClick={() => setMobileNavOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-[13px] font-medium transition",
                              active
                                ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                                : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0 opacity-80" />
                            <div className="min-w-0 flex-1">
                              <span className="block leading-tight">{item.label}</span>
                              <span className="mono block truncate text-[9px] font-normal leading-tight text-white/30">
                                {item.subtitle}
                              </span>
                            </div>
                            {badgeByHref[item.href] ? (
                              <span className="mono rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] text-cyan-300">
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

              <div className="border-t border-white/[0.07] px-5 pt-4">
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
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav
        className="glass fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-stretch border-t border-white/[0.08] px-1 py-2 lg:hidden"
        aria-label="Primary"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {bottomTabs.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition",
                active ? "text-cyan-300" : "text-white/45 hover:text-white/80"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "opacity-100" : "opacity-80")} />
              <span className="max-w-full truncate leading-none">{item.label}</span>
              {active ? (
                <motion.span
                  layoutId="mobile-tab-dot"
                  className="mt-0.5 h-1 w-1 rounded-full bg-cyan-300"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
