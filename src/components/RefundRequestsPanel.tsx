import { useMemo, useState } from "react";
import { Check, Lock, Undo2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { useSession } from "@/state/session";
import { listRefunds, reviewRefund, type ApiRefund } from "@/api/billing";
import { formatCurrency } from "@/lib/utils";

/**
 * Refund requests awaiting the centre's decision — raised from an invoice's
 * payment history (Billing → invoice detail). Approving disburses through the
 * original gateway (Razorpay/Cashfree) for a real payment, or is just a record
 * for cash; rejecting only closes the request, no money moves either way.
 * Mirrors CashConfirmationsPanel's shape: everyone with View sees the queue,
 * only a login granted Approve on Billing & Finance can act on it.
 */
export function RefundRequestsPanel() {
  const { data: refunds, reload } = useApiData<ApiRefund[]>(() => listRefunds(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Approving irreversibly disburses real money via the gateway (Tier 1: destructive
  // ConfirmDialog required) — rejecting just closes the request, no money moves, so it
  // fires directly like it always has.
  const [approveTarget, setApproveTarget] = useState<ApiRefund | null>(null);
  const { hasPermission } = useSession();
  const canApprove = hasPermission("BillingFinance", "Approve");

  const pending = useMemo(() => refunds.filter((r) => r.status === "Requested"), [refunds]);

  // See CashConfirmationsPanel for why this renders an explanatory empty state
  // instead of null — a bare null leaves the "Pending Refund Requests" heading in
  // admin/Billing.tsx floating over blank space in demo mode.
  if (!apiEnabled()) {
    return (
      <EmptyState
        icon={Undo2}
        title="Demo mode"
        description="Connect the API (VITE_API_BASE_URL) to see and act on live refund requests here."
      />
    );
  }

  async function handleReview(refund: ApiRefund, approve: boolean) {
    setError(null);
    setBusyId(refund.id);
    try {
      await reviewRefund(refund.id, approve);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not ${approve ? "approve" : "reject"} this refund.`);
    } finally {
      setBusyId(null);
    }
  }

  if (pending.length === 0) {
    return (
      <EmptyState
        icon={Undo2}
        title="No pending refund requests"
        description="Refunds raised from an invoice's payment history will appear here for review."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      {pending.map((refund) => (
        <Card key={refund.id} className="border-warning/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <Undo2 className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="font-semibold text-foreground">
                  {formatCurrency(refund.amount)} — {refund.invoiceNumber ?? "Invoice"}
                </p>
                <p className="text-xs text-muted-foreground">{refund.reason}</p>
              </div>
            </div>
            {canApprove ? (
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={busyId === refund.id} onClick={() => setApproveTarget(refund)}>
                  <Check className="h-3.5 w-3.5" />
                  Approve &amp; refund
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === refund.id}
                  onClick={() => handleReview(refund, false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Ask your Admin for Approve access on Billing &amp; Finance to act on this.
              </span>
            )}
          </CardContent>
        </Card>
      ))}

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve this refund?"
        description={
          approveTarget
            ? `${formatCurrency(approveTarget.amount)} will be disbursed through the original payment gateway right away. This can't be undone from here.`
            : undefined
        }
        confirmLabel="Approve & refund"
        destructive
        onConfirm={() => {
          if (approveTarget) return handleReview(approveTarget, true).then(() => setApproveTarget(null));
        }}
      />
    </div>
  );
}
