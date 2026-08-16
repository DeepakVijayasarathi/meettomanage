import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  /** A second, supporting figure (e.g. "312 active"), rendered smaller on its own line
   *  below the value. Keeps every card in a row the same height regardless of whether
   *  its value string is short — folding it into `value` with a separator instead wraps
   *  at an unpredictable point once the combined string is long, breaking row alignment
   *  with cards that don't wrap. */
  detail?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  tone?: "primary" | "success" | "warning" | "destructive" | "neutral";
  className?: string;
  /** Shows skeleton placeholders instead of the (possibly still-zeroed) value while a fetch is in flight. */
  loading?: boolean;
  /** Shows an inline error instead of a value that would otherwise look like real zero data. */
  error?: string | null;
}

const TONE_STYLES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary ring-4 ring-primary/5",
  success: "bg-success/15 text-success ring-4 ring-success/5",
  warning: "bg-warning/20 text-warning-foreground ring-4 ring-warning/10",
  destructive: "bg-destructive/10 text-destructive ring-4 ring-destructive/5",
  neutral: "bg-muted text-muted-foreground ring-4 ring-muted",
};

export function KpiCard({ label, value, detail, icon: Icon, trend, tone = "primary", className, loading, error }: KpiCardProps) {
  const positive = trend ? trend.value >= 0 : true;

  if (loading) {
    return (
      <Card className={cn("p-5", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          {Icon && <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-5", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Couldn&apos;t load
            </p>
          </div>
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-4 ring-destructive/5">
              <Icon className="h-5 w-5" />
            </span>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("group p-5 transition-shadow hover:shadow-pop", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* line-clamp-2, not truncate: a one-line ellipsis clips these titles mid-word
              ("Demo → Enrollment Co..."). Two lines fits every title in this app without
              growing the card for the common one-line case. */}
          <p className="line-clamp-2 text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">{value}</p>
          {detail && <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{detail}</p>}
        </div>
        {Icon && (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONE_STYLES[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold">
          <span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5", positive ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-muted-foreground">{trend.label ?? "vs last month"}</span>
        </div>
      )}
    </Card>
  );
}
