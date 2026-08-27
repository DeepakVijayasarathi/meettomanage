import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type InlineAlertVariant = "error" | "success" | "warning" | "info";

const VARIANT_ICON = {
  error: AlertCircle,
  success: CheckCircle2,
  warning: TriangleAlert,
  info: Info,
} as const;

// Matches the ad hoc markup that was previously copy-pasted per-screen (bg-{color}/10,
// text-{color}, rounded-lg, px-3 py-2.5) — consolidating it here keeps every future
// screen consistent instead of re-deriving the same four color/icon pairings by hand.
const VARIANT_CLASS: Record<InlineAlertVariant, string> = {
  error: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning-foreground",
  info: "bg-primary/10 text-primary",
};

// error is assertive (interrupts a screen reader immediately — appropriate for a failed
// submit the user is actively waiting on); the rest are polite (announced without
// interrupting, appropriate for background load failures / confirmations / hints).
const VARIANT_ROLE: Record<InlineAlertVariant, "alert" | "status"> = {
  error: "alert",
  success: "status",
  warning: "status",
  info: "status",
};

interface InlineAlertProps {
  variant?: InlineAlertVariant;
  children: ReactNode;
  className?: string;
  /** Larger, bordered card style used for standalone confirmations (vs. the compact default used for inline load-error banners above a list/form). */
  bordered?: boolean;
  icon?: boolean;
}

/**
 * Shared replacement for the `role="alert"`/`role="status"` banners that used to be
 * hand-rolled per screen with drifting padding/radius. Two sizes cover both patterns
 * seen across the app: the compact default (a load-error strip above a table) and
 * `bordered` (a standalone success/notice card, e.g. after submitting a form).
 */
export function InlineAlert({ variant = "info", children, className, bordered = false, icon = true }: InlineAlertProps) {
  const Icon = VARIANT_ICON[variant];
  return (
    <div
      role={VARIANT_ROLE[variant]}
      className={cn(
        "flex items-start gap-2 text-sm font-medium",
        bordered ? "rounded-xl border p-4" : "rounded-lg px-3 py-2.5",
        bordered && variant === "error" && "border-destructive/30",
        bordered && variant === "success" && "border-success/30",
        bordered && variant === "warning" && "border-warning/40",
        bordered && variant === "info" && "border-primary/30",
        VARIANT_CLASS[variant],
        className
      )}
    >
      {icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <span className="min-w-0">{children}</span>
    </div>
  );
}
