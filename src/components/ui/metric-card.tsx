import type { DashboardMetric } from "@/features/seo/types";

const toneColors: Record<DashboardMetric["tone"], string> = {
  accent: "text-cyan-300",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-rose-400"
};

interface MetricCardProps {
  metric: DashboardMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const accentCard = metric.tone === "accent";

  return (
    <div className={`surface surface-hover relative overflow-hidden rounded-[14px] px-5 py-4 ${accentCard ? "border-cyan-400/20 bg-cyan-400/[0.04]" : ""}`}>
      <div className="pointer-events-none absolute right-0 top-0 h-14 w-14 bg-[radial-gradient(circle_at_top_right,rgba(0,255,255,0.06),transparent_70%)]" />
      <p className="mono text-[10px] uppercase tracking-[0.1em] text-white/38">{metric.label}</p>
      <p className={`mt-2 text-[28px] font-bold leading-none tracking-[-0.03em] ${accentCard ? "text-cyan-300" : "text-white"}`}>{metric.value}</p>
      <p className={`mt-1 text-xs font-medium ${toneColors[metric.tone]}`}>{metric.delta}</p>
    </div>
  );
}
