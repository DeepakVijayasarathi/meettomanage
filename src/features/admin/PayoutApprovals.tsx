import { useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock, Loader2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import {
  decidePayoutApproval,
  listPayoutApprovals,
  type ApiPayoutApproval,
  type PayoutReviewDecision,
} from "@/api/payouts";
import { toast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { getUserTimeZone } from "@/lib/datetime";
import { useSession } from "@/state/session";
import { formatCurrency } from "@/lib/utils";

const DECISION_LABEL: Record<PayoutReviewDecision, string> = {
  ApprovedFull: "Approved — full payout",
  ApprovedPartial: "Approved — partial payout",
  Rejected: "Not approved",
};

const DECISION_VARIANT: Record<PayoutReviewDecision, "success" | "warning" | "destructive"> = {
  ApprovedFull: "success",
  ApprovedPartial: "warning",
  Rejected: "destructive",
};

/** "Tue, 22 Sept, 3:00 pm" in the signed-in user's own account timezone. */
function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: getUserTimeZone(),
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { timeZone: getUserTimeZone(), hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Payout Approvals: every class that ran shorter than its scheduled duration (or had no
 * teacher attendance at all) lands here instead of being paid as a normal completed class.
 * Admin and Management / Owners approve it for full payout, a partial payout (pre-filled
 * pro-rated to the minutes actually taught), or no payout. Shared by the Admin, Management
 * and Founder portals.
 */
export default function PayoutApprovals() {
  const { hasPermission } = useSession();
  const canDecide = hasPermission("Payouts", "Approve");
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  const { data: pending, loading, error, reload } = useApiData(() => listPayoutApprovals(true), [] as ApiPayoutApproval[]);
  const { data: decided, reload: reloadDecided } = useApiData(() => listPayoutApprovals(false), [] as ApiPayoutApproval[]);

  const [target, setTarget] = useState<ApiPayoutApproval | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<PayoutReviewDecision | null>(null);

  function open(row: ApiPayoutApproval) {
    setTarget(row);
    setPartialAmount(String(row.proRatedAmount));
    setNote("");
  }

  async function decide(decision: PayoutReviewDecision) {
    if (!target) return;
    const amount = decision === "ApprovedPartial" ? Number(partialAmount) : undefined;
    if (decision === "ApprovedPartial" && (!Number.isFinite(amount) || amount! < 0 || (target.fullAmount > 0 && amount! > target.fullAmount))) {
      toast({
        variant: "error",
        title: "Enter a partial amount",
        description: target.fullAmount > 0 ? `Between ${formatCurrency(0)} and ${formatCurrency(target.fullAmount)}.` : "Enter the amount to pay (0 or more).",
      });
      return;
    }
    setBusy(decision);
    try {
      await decidePayoutApproval(target.itemId, { decision, amount, note: note.trim() || undefined });
      toast({ variant: "success", title: DECISION_LABEL[decision], description: `${target.teacherName} · ${target.className}` });
      setTarget(null);
      reload();
      reloadDecided();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't save the decision", description: userMessage(err, "Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  const rows = tab === "pending" ? pending : decided;
  const pendingShortfall = pending.reduce((sum, r) => sum + (r.shortfallMinutes ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Payroll"
        title="Payout Approvals"
        description="Classes that ended before their scheduled duration. Decide whether each one is paid in full, partially, or not at all — the teacher's payout can't be finalized until you do."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Awaiting decision" value={String(pending.length)} icon={Clock} tone="warning" />
        <KpiCard label="Minutes short (pending)" value={String(pendingShortfall)} icon={ClipboardCheck} tone="destructive" />
        <KpiCard label="Decided" value={String(decided.length)} icon={CheckCircle2} tone="success" />
      </div>

      <div className="mb-4 inline-flex rounded-lg border p-0.5">
        <Button size="sm" variant={tab === "pending" ? "secondary" : "ghost"} onClick={() => setTab("pending")}>
          Awaiting decision ({pending.length})
        </Button>
        <Button size="sm" variant={tab === "decided" ? "secondary" : "ghost"} onClick={() => setTab("decided")}>
          Decided
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error && apiEnabled() ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Couldn't load payout approvals"
          description={error}
          action={<Button variant="outline" onClick={reload}>Try again</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={tab === "pending" ? "Nothing waiting for approval" : "No decisions yet"}
          description={
            tab === "pending"
              ? "Any class that ends before its scheduled time shows up here automatically, and Admin and Management are emailed."
              : "Approved and rejected short classes are listed here."
          }
        />
      ) : (
        <Card className="divide-y overflow-hidden p-0">
          {rows.map((r) => (
            <div key={r.itemId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{r.teacherName}</p>
                  <span className="text-sm text-muted-foreground">· {r.className}</span>
                  {r.decision && <Badge variant={DECISION_VARIANT[r.decision]}>{DECISION_LABEL[r.decision]}</Badge>}
                </div>
                {r.studentNames && <p className="text-sm text-muted-foreground">Student(s): {r.studentNames}</p>}
                <p className="text-sm text-foreground">
                  Scheduled {formatWhen(r.scheduledStartAtUtc)} – {formatTime(r.scheduledEndAtUtc)} ({r.scheduledMinutes ?? "—"} min)
                </p>
                <p className="text-sm">
                  {r.deliveredMinutes === null ? (
                    <span className="font-medium text-destructive">No teacher attendance recorded</span>
                  ) : (
                    <>
                      Actual: <span className="font-medium">{r.deliveredMinutes} min</span>
                      {" · "}
                      <span className="font-semibold text-destructive">{r.shortfallMinutes} min short</span>
                    </>
                  )}
                </p>
                {r.decision && (
                  <p className="text-xs text-muted-foreground">
                    Paid {formatCurrency(r.amount)} of {formatCurrency(r.fullAmount)}
                    {r.reviewedByName ? ` · by ${r.reviewedByName}` : ""}
                    {r.reviewedAtUtc ? ` · ${formatWhen(r.reviewedAtUtc)}` : ""}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Full payout</p>
                  <p className="font-semibold text-foreground">{formatCurrency(r.fullAmount)}</p>
                </div>
                {r.pending && canDecide && r.payoutStatus === "Pending" && (
                  <Button size="sm" onClick={() => open(r)}>Review</Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && !busy && setTarget(null)}>
        <DialogContent className="max-w-lg">
          {target && (
            <>
              <DialogHeader>
                <DialogTitle>Decide payout</DialogTitle>
                <DialogDescription>
                  {target.teacherName} · {target.className} · {formatWhen(target.scheduledStartAtUtc)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                  <p className="font-semibold">{target.scheduledMinutes ?? "—"} min</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="font-semibold">{target.deliveredMinutes === null ? "No attendance" : `${target.deliveredMinutes} min`}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Shortfall</p>
                  <p className="font-semibold text-destructive">{target.shortfallMinutes ?? "—"} min</p>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="partial-amount">Partial payout amount</Label>
                <Input
                  id="partial-amount"
                  type="number"
                  min={0}
                  max={target.fullAmount > 0 ? target.fullAmount : undefined}
                  step="0.01"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {target.fullAmount > 0
                    ? `Pre-filled pro-rated to the minutes taught (${formatCurrency(target.proRatedAmount)} of ${formatCurrency(target.fullAmount)}).`
                    : "No payout was priced for this class (no rate was set when it finished), so enter the amount to pay."}
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="decision-note">Note (optional)</Label>
                <Textarea id="decision-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Network dropped at the end; confirmed with the parent." />
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="text-destructive" disabled={!!busy} onClick={() => void decide("Rejected")}>
                  {busy === "Rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} No payout
                </Button>
                <Button variant="outline" disabled={!!busy} onClick={() => void decide("ApprovedPartial")}>
                  {busy === "ApprovedPartial" && <Loader2 className="h-4 w-4 animate-spin" />} Approve partial
                </Button>
                <Button disabled={!!busy} onClick={() => void decide("ApprovedFull")}>
                  {busy === "ApprovedFull" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve full
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
