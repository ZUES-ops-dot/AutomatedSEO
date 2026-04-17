"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { TrendSeries } from "@/features/seo/types";

interface TrendBarsProps {
  series: TrendSeries;
}

export function TrendBars({ series }: TrendBarsProps) {
  const [mounted, setMounted] = useState(false);
  const data = series.values.map((v, i) => ({ i, v }));
  const last = series.values[series.values.length - 1] ?? 0;
  const color = series.direction === "up" ? "#34d399" : "#fb7185";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/70">{series.label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-white">
            {last}
            {series.suffix ?? ""}
          </span>
          {series.direction === "up" ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
          )}
        </div>
      </div>
      <div className="h-16">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${series.label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ background: "rgba(12,14,36,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, color: "#fff" }}
                labelFormatter={() => ""}
                formatter={(value) => [`${value}${series.suffix ?? ""}`, series.label]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${series.label})`}
                dot={false}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-lg bg-white/[0.02]" />
        )}
      </div>
    </div>
  );
}
