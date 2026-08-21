import { useState } from "react";
import { Banknote, Check, Lock, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { useSession } from "@/state/session";
import { listCashIntents, confirmCashIntent, rejectCashIntent, type ApiCashIntent } from "@/api/billing";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * Pending "pay by cash" declarations a parent made from their portal, awaiting the
 * centre's confirmation once the money is actually collected. Shown to whichever
 * staff login owns billing follow-up — Admin, Sub Admin (with Billing & Finance
 * access) or Admission Team — sourced from the same API so every login sees the
 * same queue. The Confirm/Reject buttons themselves only render for a login that's
 * been explicitly granted Approve on Billing & Finance — everyone else with just
 * View access sees the queue read-only, matching how the backend endpoint is gated.
 */
export function CashConfirmationsPanel() {
  const { data: intents, reload } = useApiData<ApiCashIntent[]>(() => listCashIntents(), []);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tier 2 (plain, non-destructive confirm): this creates a financial record but is
  // correctable if the amount is wrong, unlike an actual refund disbursement.
  const [confirmTarget, setConfirmTarget] = useState<ApiCashIntent | null>(null);
  const { hasPermission } = useSession();
  const canApprove = hasPermission("BillingFinance", "Approve");

  // Returning null (rather than an explanatory empty state) here used to leave the
  // "Pending Cash Confirmations" section heading in admin/Billing.tsx and
  // admission/Payments.tsx floating over a blank gap in demo mode, which reads as a
  // broken/incomplete section rather than an intentional demo-mode state.
  if (!apiEnabled()) {
    return (
      <EmptyState
        icon={Banknote}
        title="Demo mode"
        description="Connect the API (VITE_API_BASE_URL) to see and act on live cash-payment confirmations here."
      />
    );
  }

  async function handleConfirm(intent: ApiCashIntent) {
    setError(null);
    setBusyId(intent.transactionId);
    const draft = amountDrafts[intent.transactionId];
    const amount = draft ? Number(draft) : undefined;
    try {
      await confirmCashIntent(intent.transactionId, amount);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm this payment.");
      // A stale intent (invoice already paid) is auto-closed server-side — refresh
      // the queue so it disappears instead of erroring again on the next click.
      reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(intent: ApiCashIntent) {
    setError(null);
    setBusyId(intent.transactionId);
    try {
      await rejectCashIntent(intent.transactionId, "Not collected");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reject this intent.");
    } finally {
      setBusyId(null);
    }
  }

  if (intents.length === 0) {
    return (
      <EmptyState
        icon={Banknote}
        title="No pending cash confirmations"
        description="Every parent who chose to pay in cash has been confirmed or rejected."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      {intents.map((intent) => (
        <Card key={intent.transactionId} className="border-warning/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <Banknote className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="font-semibold text-foreground">{intent.parentName}</p>
                <p className="text-xs text-muted-foreground">
                  Invoice {intent.invoiceNumber} · Declared {formatDate(intent.requestedAtUtc.slice(0, 10))} · Ref {intent.reference}
                </p>
              </div>
            </div>
            {canApprove ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  className="w-32"
                  placeholder={String(intent.amount)}
                  value={amountDrafts[intent.transactionId] ?? ""}
                  onChange={(e) =>
                    setAmountDrafts((prev) => ({ ...prev, [intent.transactionId]: e.target.value }))
                  }
                />
                <span className="text-xs text-muted-foreground">{intent.currency}</span>
                <Button
                  size="sm"
                  disabled={busyId === intent.transactionId}
                  onClick={() => setConfirmTarget(intent)}
                >
                  <Check className="h-3.5 w-3.5" />
                  Confirm collected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === intent.transactionId}
                  onClick={() => handleReject(intent)}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                {formatCurrency(intent.amount)} declared — ask your Admin for Approve access on Billing & Finance to act on this.
              </span>
            )}
          </CardContent>
        </Card>
      ))}
      {canApprove && (
        <p className="text-xs text-muted-foreground">
          Amount defaults to what the parent declared ({intents[0] ? formatCurrency(intents[0].amount) : "—"}); type a different figure only if the cash collected differs.
        </p>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title="Confirm this cash payment was collected?"
        description={
          confirmTarget
            ? `Marks ${formatCurrency(
                amountDrafts[confirmTarget.transactionId] ? Number(amountDrafts[confirmTarget.transactionId]) : confirmTarget.amount
              )} as received from ${confirmTarget.parentName} against invoice ${confirmTarget.invoiceNumber}.`
            : undefined
        }
        confirmLabel="Confirm collected"
        onConfirm={() => {
          if (confirmTarget) return handleConfirm(confirmTarget).then(() => setConfirmTarget(null));
        }}
      />
    </div>
  );
}
