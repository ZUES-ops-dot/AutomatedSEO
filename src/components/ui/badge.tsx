import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/features/seo/lib/presentation";

const toneClasses: Record<BadgeTone, string> = {
  violet: "border border-cyan-400/18 bg-cyan-400/10 text-cyan-300",
  cyan: "border border-cyan-400/18 bg-cyan-400/10 text-cyan-300",
  lime: "border border-emerald-400/18 bg-emerald-400/10 text-emerald-300",
  amber: "border border-amber-400/18 bg-amber-400/10 text-amber-300",
  rose: "border border-rose-400/18 bg-rose-400/10 text-rose-300",
  slate: "border border-white/[0.08] bg-white/[0.04] text-white/50"
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "slate", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "mono inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
