import { useState } from "react";
import { Gauge, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sessionTenantCode, tenantPath } from "@/lib/tenantPath";

export interface UsageNudgeData {
  label: string;
  used: number;
  limit: number;
  unit: string;
  planName: string;
}

const dismissKey = () => `trn.usageNudgeDismissed:${sessionTenantCode() ?? tenantPath()}`;

/**
 * Admin-portal banner once a plan limit is 80%+ used ("3 of 3 staff & teacher accounts"), so the
 * upgrade is offered before the hard stop rather than only as an error. Hidden for the rest of the
 * browser session once dismissed, per academy and per limit/level.
 */
export function UsageNudge({ nudge, onUpgrade }: { nudge: UsageNudgeData; onUpgrade: () => void }) {
  const signature = `${nudge.label}:${nudge.used}/${nudge.limit}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(dismissKey()) === signature;
    } catch {
      return false;
    }
  });
  if (dismissed) return null;

  const full = nudge.used >= nudge.limit;
  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(dismissKey(), signature); } catch { /* storage blocked: hide for this page only */ }
  };

  return (
    <div
      role="status"
      className={`mb-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${full ? "border-warning/50 bg-warning/10" : "border-primary/25 bg-primary/5"}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${full ? "bg-warning/20 text-warning-foreground" : "bg-primary/10 text-primary"}`}>
        <Gauge className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-foreground">
          {full ? "You've reached a plan limit" : "You're close to a plan limit"}: {nudge.used} of {nudge.limit} {nudge.label.toLowerCase()}
        </p>
        <p className="text-muted-foreground">
          {full
            ? `Your ${nudge.planName} plan can't add more ${nudge.unit}. Upgrade to keep growing.`
            : `Upgrade before you run out of ${nudge.unit} on your ${nudge.planName} plan.`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={onUpgrade}>Upgrade</Button>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
