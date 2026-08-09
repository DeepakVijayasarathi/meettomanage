import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  eyebrow?: string;
}

export function PageHeader({ title, description, actions, className, eyebrow }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow && (
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary sm:text-xs">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {eyebrow}
          </span>
        )}
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground sm:text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
