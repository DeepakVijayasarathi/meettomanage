import { Link } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/api/hooks";
import { listPayoutApprovals, type ApiPayoutApproval } from "@/api/payouts";
import { apiEnabled } from "@/lib/api";
import { usePortalBase } from "@/lib/portalBase";
import { useSession } from "@/state/session";

/**
 * Admin / Management dashboard prompt: classes that ended before their scheduled duration
 * and are waiting in Payout Approvals. Renders nothing when there are none, or for a login
 * without Payouts access.
 */
export function PayoutApprovalsBanner() {
  const { hasPermission } = useSession();
  const canView = apiEnabled() && hasPermission("Payouts", "View");
  const portalBase = usePortalBase();
  const { data: pending } = useApiData(
    () => (canView ? listPayoutApprovals(true) : Promise.resolve([] as ApiPayoutApproval[])),
    [] as ApiPayoutApproval[],
  );

  if (!canView || pending.length === 0) return null;

  const shortfall = pending.reduce((sum, r) => sum + (r.shortfallMinutes ?? 0), 0);
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning-foreground">
        <ClipboardCheck className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">
          {pending.length} short class{pending.length === 1 ? "" : "es"} awaiting payout approval
        </p>
        <p className="text-sm text-muted-foreground">
          {shortfall} minute{shortfall === 1 ? "" : "s"} short in total. Approve full, partial or no payout for each one.
        </p>
      </div>
      <Button asChild size="sm">
        <Link to={`${portalBase}/payout-approvals`}>Review</Link>
      </Button>
    </div>
  );
}
