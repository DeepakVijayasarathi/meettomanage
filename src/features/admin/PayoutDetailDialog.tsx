import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineAlert } from "@/components/InlineAlert";
import { PayoutHistoryList } from "@/components/PayoutHistoryList";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { addPayoutItem, adjustPayoutItem, getPayoutHistory, type ApiPayoutChange } from "@/api/payouts";
import type { TeacherPayout, TeacherPayoutItem } from "@/types";
import { formatCurrency, formatDate, formatTimeLabel } from "@/lib/utils";
import { utcIsoToLocalDateTime } from "@/lib/datetime";

const TYPE_LABELS: Record<string, string> = {
  SessionEarning: "Class",
  StudentNoShowWaiting: "Student no-show waiting amount",
  TeacherNoShowDeduction: "Teacher no-show deduction",
  Penalty: "Deduction",
  Bonus: "Addition",
  Adjustment: "Adjustment",
};

function itemTitle(item: TeacherPayoutItem): string {
  const kind = TYPE_LABELS[item.type] ?? item.type;
  if (!item.sessionDate) return kind;
  const local = utcIsoToLocalDateTime(item.sessionDate);
  const when = `${formatDate(local.date, "short")} · ${formatTimeLabel(local.time)}`;
  const base = item.type === "SessionEarning" ? when : `${kind} · ${when}`;
  return item.className ? `${base} · ${item.className}` : base;
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "bad" | "good" | "strong" }) {
  const color = tone === "bad" ? "text-destructive" : tone === "good" ? "text-success" : "text-foreground";
  return (
    <div className={`rounded-xl border border-border p-3 ${tone === "strong" ? "bg-primary/5" : "bg-background"}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

/**
 * One teacher's payout for one month, opened from Teacher Payouts: the full breakdown
 * (sessions, base amount, each deduction/addition with its reason, final payable), available
 * before finalizing and afterwards. Lines stay correctable after the payout is finalized or
 * paid (client requirement) — every correction needs a reason and lands in the history below.
 */
export function PayoutDetailDialog({
  payout,
  onClose,
  onChanged,
  onFinalize,
}: {
  payout: TeacherPayout;
  onClose: () => void;
  /** A line was corrected or added — the caller reloads its payouts so this dialog re-renders with the new figures. */
  onChanged: () => void | Promise<void>;
  onFinalize: (payout: TeacherPayout) => void;
}) {
  const { toast } = useToast();
  const canEdit = apiEnabled();
  const [history, setHistory] = useState<ApiPayoutChange[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [addKind, setAddKind] = useState<"addition" | "deduction">("deduction");
  const [addAmount, setAddAmount] = useState("");
  const [addReason, setAddReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reloaded whenever the payable total changes, i.e. after every correction.
  useEffect(() => {
    if (!canEdit) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    getPayoutHistory(payout.id)
      .then((items) => !cancelled && setHistory(items))
      .catch(() => !cancelled && setHistory([]));
    return () => {
      cancelled = true;
    };
  }, [canEdit, payout.id, payout.finalAmount, payout.items.length]);

  const summary = useMemo(() => {
    const sessions = payout.items.filter((i) => i.type === "SessionEarning");
    const others = payout.items.filter((i) => i.type !== "SessionEarning");
    const base = sessions.reduce((sum, i) => sum + (i.originalAmount ?? i.amount), 0);
    // A class paid at less (or more) than it was first calculated counts as a deduction (or addition).
    const sessionDelta = sessions.reduce((sum, i) => sum + (i.amount - (i.originalAmount ?? i.amount)), 0);
    const deductions =
      others.filter((i) => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0) + (sessionDelta < 0 ? -sessionDelta : 0);
    const additions =
      others.filter((i) => i.amount > 0).reduce((sum, i) => sum + i.amount, 0) + (sessionDelta > 0 ? sessionDelta : 0);
    return { sessions: sessions.length, base, deductions, additions };
  }, [payout.items]);

  const sortedItems = useMemo(
    () => [...payout.items].sort((a, b) => (a.sessionDate ?? a.createdAtUtc).localeCompare(b.sessionDate ?? b.createdAtUtc)),
    [payout.items]
  );

  function startEdit(item: TeacherPayoutItem) {
    setError(null);
    setAdding(false);
    setEditingId(item.id);
    setEditAmount(String(item.amount));
    setEditReason("");
  }

  async function saveEdit(item: TeacherPayoutItem) {
    const newAmount = Number(editAmount);
    if (editAmount.trim() === "" || !Number.isFinite(newAmount)) return setError("Enter a valid amount.");
    if (!editReason.trim()) return setError("A reason is required.");
    setSaving(true);
    setError(null);
    try {
      await adjustPayoutItem(payout.id, item.id, { newAmount, reason: editReason.trim() });
      await onChanged();
      setEditingId(null);
      toast({ variant: "success", title: "Correction saved" });
    } catch (err) {
      setError(userMessage(err, "Could not save this correction."));
    } finally {
      setSaving(false);
    }
  }

  async function saveAdd() {
    const amount = Number(addAmount);
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount greater than zero.");
    if (!addReason.trim()) return setError("A reason is required.");
    setSaving(true);
    setError(null);
    try {
      await addPayoutItem(payout.id, { amount: addKind === "deduction" ? -amount : amount, reason: addReason.trim() });
      await onChanged();
      setAdding(false);
      setAddAmount("");
      setAddReason("");
      toast({ variant: "success", title: addKind === "deduction" ? "Deduction added" : "Addition added" });
    } catch (err) {
      setError(userMessage(err, "Could not add this line."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {payout.teacherName} — {payout.month}
            <Badge variant={payout.status === "paid" ? "success" : payout.status === "finalized" ? "default" : "warning"} className="capitalize">
              {payout.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {payout.status === "pending"
              ? "Review every line, then finalize. Classes completed this month keep being added until you do."
              : "This payout is locked for new classes, but a line can still be corrected — every correction is recorded below."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Figure label="Sessions conducted" value={String(summary.sessions)} />
            <Figure label="Base amount" value={formatCurrency(summary.base)} />
            <Figure label="Deductions" value={summary.deductions > 0 ? `-${formatCurrency(summary.deductions)}` : "—"} tone={summary.deductions > 0 ? "bad" : undefined} />
            <Figure label="Additions" value={summary.additions > 0 ? `+${formatCurrency(summary.additions)}` : "—"} tone={summary.additions > 0 ? "good" : undefined} />
            <Figure label="Final payable" value={formatCurrency(payout.finalAmount)} tone="strong" />
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Line by line</h3>
              {canEdit && !adding && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    setEditingId(null);
                    setAdding(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add addition / deduction
                </Button>
              )}
            </div>

            {adding && (
              <div className="mb-3 grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-[150px_130px_1fr_auto] sm:items-end">
                <div className="grid gap-1.5">
                  <Label>Type</Label>
                  <Select value={addKind} onValueChange={(v) => setAddKind(v as "addition" | "deduction")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deduction">Deduction</SelectItem>
                      <SelectItem value="addition">Addition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="add-amount">Amount (₹)</Label>
                  <Input id="add-amount" type="number" min={0} value={addAmount} onChange={(e) => setAddAmount(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="add-reason">Reason</Label>
                  <Input id="add-reason" value={addReason} onChange={(e) => setAddReason(e.target.value)} placeholder="Why is this being added?" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => setAdding(false)}>Cancel</Button>
                  <Button size="sm" disabled={saving} onClick={() => void saveAdd()}>
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                  </Button>
                </div>
              </div>
            )}

            {sortedItems.length === 0 ? (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">No lines on this payout yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sortedItems.map((item) => {
                  const changed = item.originalAmount != null && item.originalAmount !== item.amount;
                  const short =
                    item.scheduledMinutes != null && item.deliveredMinutes != null && item.deliveredMinutes < item.scheduledMinutes;
                  return (
                    <li key={item.id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{itemTitle(item)}</p>
                          {item.requiresReview && (
                            <Badge variant="warning" className="mt-1 gap-1">
                              <AlertTriangle className="h-3 w-3" /> Needs review
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right tabular-nums">
                            {changed && <p className="text-xs text-muted-foreground line-through">{formatCurrency(item.originalAmount!)}</p>}
                            <p className={`font-semibold ${item.amount < 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrency(item.amount)}</p>
                          </div>
                          {canEdit && editingId !== item.id && (
                            <Button size="sm" variant="outline" title="Correct this amount" aria-label="Correct this amount" onClick={() => startEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {changed && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Calculated at {formatCurrency(item.originalAmount!)}, now {formatCurrency(item.amount)} (
                          {item.amount < item.originalAmount! ? "reduced" : "increased"} by {formatCurrency(Math.abs(item.amount - item.originalAmount!))}).
                        </p>
                      )}
                      {short && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Teacher was in class {item.deliveredMinutes} of {item.scheduledMinutes} scheduled minutes.
                        </p>
                      )}
                      {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}

                      {editingId === item.id && (
                        <div className="mt-3 grid gap-3 rounded-lg bg-muted/30 p-3 sm:grid-cols-[130px_1fr_auto] sm:items-end">
                          <div className="grid gap-1.5">
                            <Label htmlFor={`edit-amount-${item.id}`}>New amount (₹)</Label>
                            <Input id={`edit-amount-${item.id}`} type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`edit-reason-${item.id}`}>Reason</Label>
                            <Input
                              id={`edit-reason-${item.id}`}
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              placeholder="e.g. verified the class was conducted"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button size="sm" disabled={saving} onClick={() => void saveEdit(item)}>
                              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {error && <InlineAlert variant="error" className="mt-3 text-sm">{error}</InlineAlert>}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Change history</h3>
            {history === null ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <PayoutHistoryList changes={history} />
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>Close</Button>
          {payout.status === "pending" && (
            <Button disabled={saving || payout.requiresReview} title={payout.requiresReview ? "Review the flagged line(s) first" : undefined} onClick={() => onFinalize(payout)}>
              Finalize
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
