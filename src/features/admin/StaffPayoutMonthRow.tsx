import { useState } from "react";
import { CheckCircle2, History, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/InlineAlert";
import { PayoutHistoryList } from "@/components/PayoutHistoryList";
import { toast } from "@/hooks/use-toast";
import { userMessage } from "@/lib/api";
import type { ApiPayoutChange } from "@/api/payouts";
import { adjustStaffPayout, formatStaffPayoutPeriod, getStaffPayoutHistory, type ApiStaffPayout } from "@/api/staffPayouts";
import { formatCurrency } from "@/lib/utils";

/** How the month's amount was arrived at, in one line. */
function calculationLine(p: ApiStaffPayout): string {
  if (p.basis === "FixedMonthly") {
    return `Fixed monthly salary${p.appliedFixedAmount != null ? ` of ${formatCurrency(p.appliedFixedAmount)}` : ""}`;
  }
  return `Collected ${formatCurrency(p.collectionAmountRaw ?? 0)}, counted as ${formatCurrency(p.collectionAmountRounded ?? 0)} × ${p.appliedPercentage ?? 0}%`;
}

/**
 * One past (locked) month of a staff member's pay in Staff Payroll: its calculation, Mark Paid,
 * and — even after it was approved or paid — a correction of the payable amount with a
 * mandatory reason, plus the history of every such correction.
 */
export function StaffPayoutMonthRow({
  payout,
  marking,
  onMarkPaid,
  onAdjusted,
}: {
  payout: ApiStaffPayout;
  marking: boolean;
  onMarkPaid: (id: string) => void;
  onAdjusted: (updated: ApiStaffPayout) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ApiPayoutChange[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const id = payout.id;

  function loadHistory() {
    if (!id) return;
    setHistory(null);
    getStaffPayoutHistory(id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  async function save() {
    if (!id) return;
    const newAmount = Number(amount);
    if (amount.trim() === "" || !Number.isFinite(newAmount) || newAmount < 0) return setError("Enter a valid amount.");
    if (!reason.trim()) return setError("A reason is required.");
    setSaving(true);
    setError(null);
    try {
      onAdjusted(await adjustStaffPayout(id, { newAmount, reason: reason.trim() }));
      setEditing(false);
      setHistoryOpen(true);
      loadHistory();
      toast({ variant: "success", title: "Payout corrected" });
    } catch (err) {
      setError(userMessage(err, "Could not save this correction."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{formatStaffPayoutPeriod(payout.periodYear, payout.periodMonth)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{calculationLine(payout)}</p>
          <Badge variant={payout.status === "Paid" ? "success" : "warning"} className="mt-1">{payout.status === "Paid" ? "Paid" : "Finalized"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold tabular-nums text-foreground">{formatCurrency(payout.amount)}</span>
          {id && (
            <>
              <Button
                size="sm"
                variant="outline"
                title="Correct this amount"
                onClick={() => {
                  setError(null);
                  setAmount(String(payout.amount));
                  setReason("");
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                title="Show corrections made to this payout"
                onClick={() => {
                  if (!historyOpen) loadHistory();
                  setHistoryOpen((open) => !open);
                }}
              >
                <History className="h-3.5 w-3.5" /> History
              </Button>
              {payout.status === "Finalized" && (
                <Button size="sm" disabled={marking} onClick={() => onMarkPaid(id)}>
                  {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Mark Paid
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3 grid gap-3 rounded-lg bg-muted/30 p-3 sm:grid-cols-[130px_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor={`staff-amount-${id}`}>New amount (₹)</Label>
            <Input id={`staff-amount-${id}`} type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`staff-reason-${id}`}>Reason</Label>
            <Input id={`staff-reason-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being changed?" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </Button>
          </div>
          {error && <InlineAlert variant="error" className="text-sm sm:col-span-3">{error}</InlineAlert>}
        </div>
      )}

      {historyOpen && (
        <div className="mt-3">
          {history === null ? (
            <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <PayoutHistoryList changes={history} />
          )}
        </div>
      )}
    </div>
  );
}
