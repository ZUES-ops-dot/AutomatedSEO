import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PanelProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName
}: PanelProps) {
  return (
    <section className={cn("surface rounded-[14px]", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div>
            {title ? <h2 className="text-[13px] font-semibold text-white">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-xs leading-5 text-white/40">{subtitle}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </header>
      )}
      <div className={cn("px-5 py-4", contentClassName)}>{children}</div>
    </section>
  );
}
