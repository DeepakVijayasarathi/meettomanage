import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
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
  /** "lg" gives the metric more visual weight (bigger value + icon badge) for headline KPIs
   *  pulled to the top of a dashboard. Defaults to "default" everywhere else — purely additive,
   *  existing call sites are unaffected. */
  size?: "default" | "lg";
  /** Makes the whole card a button (e.g. drilling into what's behind a count) — cursor and hover/focus affordance only show up when this is set, so a plain read-only KPI never looks clickable. */
  onClick?: () => void;
}

const TONE_STYLES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary ring-4 ring-primary/5",
  success: "bg-success/15 text-success ring-4 ring-success/5",
  warning: "bg-warning/20 text-warning-foreground ring-4 ring-warning/10",
  destructive: "bg-destructive/10 text-destructive ring-4 ring-destructive/5",
  neutral: "bg-muted text-muted-foreground ring-4 ring-muted",
};

export function KpiCard({ label, value, detail, icon: Icon, trend, tone = "primary", className, loading, error, size = "default", onClick }: KpiCardProps) {
  const positive = trend ? trend.value >= 0 : true;
  const isLg = size === "lg";

  // Fit the figure to the card instead of guessing a size from its length: the same number needs
  // different room in a 5-up desktop row, a 2-up tablet row and a phone. Start at the largest step and
  // drop one step at a time until it fits on one line; only if even the smallest step (14-16px) overflows does
  // it wrap (never truncated -- the number is the point of the card). Re-measured from the top whenever
  // the value changes or the card's width does.
  const valueRef = useRef<HTMLParagraphElement>(null);
  const [fitStep, setFitStep] = useState(0);
  useLayoutEffect(() => {
    setFitStep(0);
  }, [value]);
  useLayoutEffect(() => {
    const el = valueRef.current;
    if (el && fitStep < 3 && el.scrollWidth > el.clientWidth + 1) setFitStep((step) => step + 1);
  }, [fitStep, value, loading, error]);
  useLayoutEffect(() => {
    const el = valueRef.current?.parentElement;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        setFitStep(0);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
    // The value element only exists once loading/error have cleared, so re-attach then.
  }, [loading, error]);

  if (loading) {
    return (
      <Card className={cn("p-5", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className={cn("h-6 w-16", isLg && "h-7 w-24")} />
          </div>
          {Icon && <Skeleton className={cn("h-10 w-10 shrink-0 rounded-xl", isLg && "h-12 w-12")} />}
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
    <Card
      className={cn(
        "group p-5 transition-shadow hover:shadow-pop",
        onClick && "cursor-pointer hover:ring-2 hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...(onClick ? { role: "button", tabIndex: 0, onClick, onKeyDown: (e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && onClick() } : {})}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* line-clamp-2, not truncate: a one-line ellipsis clips these titles mid-word
              ("Demo → Enrollment Co..."). Two lines fits every title in this app without
              growing the card for the common one-line case. */}
          <p className="line-clamp-2 text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          {/* break-words (not truncate): this is the one number the card exists to show —
              clipping it with an ellipsis on narrow grid columns (5-up KPI rows at typical
              desktop widths) hides the actual figure behind "₹4,86,2…". Wrapping to a
              second line loses a little visual neatness but never hides real data.
              A longer string (currency with lakhs separators, "₹4,86,200") also drops a
              size step first — confirmed live that at the default size it still wrapped,
              but mid-digit ("₹4,86,20" / "0"), which read as more broken than the plain
              truncation it replaced; the smaller size fits every KPI value seen in this
              app on one line in a 5-up row without needing to wrap at all. */}
          <p
            ref={valueRef}
            className={cn(
              "mt-1.5 font-bold leading-tight tracking-tight text-foreground",
              fitStep === 0 && (isLg ? "whitespace-nowrap text-2xl sm:text-3xl" : "whitespace-nowrap text-xl sm:text-2xl"),
              fitStep === 1 && "whitespace-nowrap text-lg sm:text-xl",
              fitStep === 2 && "whitespace-nowrap text-base sm:text-lg",
              fitStep >= 3 && "break-words text-sm sm:text-base"
            )}
          >
            {value}
          </p>
          {detail && <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{detail}</p>}
        </div>
        {Icon && (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl",
              isLg ? "h-12 w-12" : "h-10 w-10",
              TONE_STYLES[tone]
            )}
          >
            <Icon className={isLg ? "h-6 w-6" : "h-5 w-5"} />
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
