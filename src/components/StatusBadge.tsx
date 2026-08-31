import type { SessionStatus, UserStatus } from "@/types";
import { cn } from "@/lib/utils";

const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  noshow: "No-Show",
  demo: "Demo",
  rescheduled: "Rescheduled",
  holiday: "Holiday",
  leave: "Teacher Leave",
};

const SESSION_STATUS_COLOR: Record<SessionStatus, string> = {
  scheduled: "bg-status-scheduled",
  completed: "bg-status-completed",
  cancelled: "bg-status-cancelled",
  noshow: "bg-status-noshow",
  demo: "bg-status-demo",
  rescheduled: "bg-status-rescheduled",
  holiday: "bg-status-holiday",
  leave: "bg-status-leave",
};

export function SessionStatusBadge({ status, className }: { status: SessionStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground/80", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", SESSION_STATUS_COLOR[status])} />
      {SESSION_STATUS_LABEL[status]}
    </span>
  );
}

const USER_STATUS_VARIANT: Record<UserStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/15 text-success" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground" },
  suspended: { label: "Suspended", className: "bg-destructive/10 text-destructive" },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const v = USER_STATUS_VARIANT[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", v.className)}>{v.label}</span>;
}

const FEE_STATUS_VARIANT: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-success/15 text-success" },
  due: { label: "Due", className: "bg-warning/20 text-warning-foreground" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
  suspended: { label: "Suspended", className: "bg-destructive/15 text-destructive" },
  pending: { label: "Pending", className: "bg-warning/20 text-warning-foreground" },
  // Was bg-role-admission/10 text-role-admission — role.admission (#8356E7) is a portal
  // brand hue, not a status color, and at this pill's text-xs/font-semibold size (12px
  // bold, below WCAG's ~18.7px-bold "large text" threshold) it only cleared ~3.98:1
  // against the app's off-white background, short of AA's 4.5:1. Swapped to the
  // already-AA-verified primary token, keeping "Partially Paid" visually distinct from
  // the other fee-status pills (success/warning/destructive/muted) without a new hue.
  partial: { label: "Partially Paid", className: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

export function FeeStatusBadge({ status }: { status: string }) {
  const v = FEE_STATUS_VARIANT[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", v.className)}>{v.label}</span>;
}

export { SESSION_STATUS_LABEL, SESSION_STATUS_COLOR };
