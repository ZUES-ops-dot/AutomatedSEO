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
        <header className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-[13px] font-semibold text-white">{title}</h2> : null}
            {subtitle ? <p className="mt-1 break-words text-xs leading-5 text-white/40">{subtitle}</p> : null}
          </div>
          {action ? <div className="min-w-0 shrink-0 self-start">{action}</div> : null}
        </header>
      )}
      <div className={cn("px-4 py-4 sm:px-5", contentClassName)}>{children}</div>
    </section>
  );
}
