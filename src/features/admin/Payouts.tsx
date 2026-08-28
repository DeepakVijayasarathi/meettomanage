import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Download, IndianRupee, Loader2, Settings2, UsersRound, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAYOUTS } from "@/data/payouts";
import { getTeacherById } from "@/data/users";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { adjustPayoutItem, finalizePayout, listPayouts, markPayoutPaid, toFrontendPayout } from "@/api/payouts";
import { downloadReportCsv } from "@/api/reports";
import type { TeacherPayout, TeacherPayoutItem } from "@/types";
import { formatCurrency, formatNumber, getInitials, toCsv } from "@/lib/utils";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminPayouts() {
  const { toast } = useToast();
  const { data: payouts, loading: payoutsLoading, error: payoutsError, reload: reloadPayouts } = useApiData(
    () => listPayouts().then((items) => items.map(toFrontendPayout)),
    PAYOUTS
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Finalize/mark-paid: the API client (finalizePayout/markPayoutPaid) and backend
  // (PayoutService.FinalizeAsync/MarkPaidAsync, already tested) existed with no UI
  // anywhere calling them — this table was purely read-only, so a payout could never
  // actually be finalized or paid from the app itself.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ payout: TeacherPayout; action: "finalize" | "mark-paid" } | null>(null);

  // Review flow: a payout can't finalize while any item is flagged (teacher's captured
  // attendance fell well short of the scheduled class) — this dialog is the only way to act
  // on that, either correcting the amount or confirming it as-is (same amount, a reason logged).
  const [reviewPayout, setReviewPayout] = useState<TeacherPayout | null>(null);
  const [reviewAmounts, setReviewAmounts] = useState<Record<string, string>>({});
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  const [reviewSavingId, setReviewSavingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  function openReview(payout: TeacherPayout) {
    setReviewError(null);
    const flagged = payout.items.filter((i) => i.requiresReview);
    setReviewAmounts(Object.fromEntries(flagged.map((i) => [i.id, String(i.amount)])));
    setReviewReasons(Object.fromEntries(flagged.map((i) => [i.id, ""])));
    setReviewPayout(payout);
  }

  async function saveReviewItem(item: TeacherPayoutItem) {
    if (!reviewPayout) return;
    const reason = (reviewReasons[item.id] ?? "").trim();
    if (!reason) {
      setReviewError("A reason is required before saving.");
      return;
    }
    const newAmount = Number(reviewAmounts[item.id]);
    if (!Number.isFinite(newAmount)) {
      setReviewError("Enter a valid amount.");
      return;
    }
    setReviewSavingId(item.id);
    setReviewError(null);
    try {
      const updated = await adjustPayoutItem(reviewPayout.id, item.id, { newAmount, reason });
      const stillFlagged = updated.items.some((i) => i.requiresReview);
      await reloadPayouts();
      if (stillFlagged) {
        setReviewPayout((prev) =>
          prev ? { ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, requiresReview: false, amount: newAmount } : i)) } : prev
        );
      } else {
        setReviewPayout(null);
      }
      toast({ variant: "success", title: "Adjustment saved" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save this adjustment.";
      setReviewError(message);
      toast({ variant: "error", title: "Couldn't save adjustment", description: message });
    } finally {
      setReviewSavingId(null);
    }
  }

  async function runPayoutAction() {
    if (!confirmTarget) return;
    const { payout, action } = confirmTarget;
    if (!apiEnabled()) {
      setActionError(`Demo mode — no payout actually ${action === "finalize" ? "finalized" : "marked paid"}.`);
      setConfirmTarget(null);
      return;
    }
    setBusyId(payout.id);
    setActionError(null);
    try {
      if (action === "finalize") await finalizePayout(payout.id);
      else await markPayoutPaid(payout.id);
      await reloadPayouts();
      toast({ variant: "success", title: action === "finalize" ? "Payout finalized" : "Payout marked paid" });
    } catch (err) {
      const message = err instanceof Error ? err.message : `Could not ${action === "finalize" ? "finalize" : "mark paid"} this payout.`;
      setActionError(message);
      toast({ variant: "error", title: "Couldn't update payout", description: message });
    } finally {
      setBusyId(null);
      setConfirmTarget(null);
    }
  }

  async function handleExport() {
    setExportError(null);
    if (apiEnabled()) {
      setExporting(true);
      try {
        await downloadReportCsv("payouts");
      } catch {
        setExportError("Couldn't reach the export endpoint. Showing the on-screen list as CSV instead.");
        downloadCsv(
          `payouts-${new Date().toISOString().slice(0, 10)}.csv`,
          toCsv(
            ["Teacher", "Month", "Sessions", "Base Amount", "Deductions", "Waiting Added", "Final Amount", "Status"],
            payouts.map((p) => [p.teacherName, p.month, p.sessionsCompleted, p.baseAmount, p.deductions, p.waitingAmountAdded, p.finalAmount, p.status])
          )
        );
      } finally {
        setExporting(false);
      }
      return;
    }
    downloadCsv(
      "payouts-2026-07-09.csv",
      toCsv(
        ["Teacher", "Month", "Sessions", "Base Amount", "Deductions", "Waiting Added", "Final Amount", "Status"],
        payouts.map((p) => [p.teacherName, p.month, p.sessionsCompleted, p.baseAmount, p.deductions, p.waitingAmountAdded, p.finalAmount, p.status])
      )
    );
  }

  const currentMonthLabel = format(new Date(), "MMMM yyyy");

  const totals = useMemo(() => {
    const thisMonth = payouts.filter((p) => p.month === currentMonthLabel);
    const paidCount = payouts.filter((p) => p.status === "paid").length;
    const pendingCount = payouts.filter((p) => p.status === "pending").length;
    return {
      totalThisMonth: thisMonth.reduce((sum, p) => sum + p.finalAmount, 0),
      teachersPaid: paidCount,
      pendingCalculations: pendingCount,
    };
  }, [payouts, currentMonthLabel]);

  const columns: DataTableColumn<TeacherPayout>[] = useMemo(
    () => [
      {
        key: "teacherName",
        header: "Teacher",
        sortable: true,
        accessor: (row) => row.teacherName,
        render: (row) => {
          const teacher = getTeacherById(row.teacherId);
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback style={{ backgroundColor: `${teacher?.avatarColor ?? "#999"}22`, color: teacher?.avatarColor ?? "#999" }}>
                  {getInitials(row.teacherName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{row.teacherName}</p>
                <p className="text-xs text-muted-foreground">{teacher?.department ?? "—"}</p>
              </div>
            </div>
          );
        },
      },
      { key: "month", header: "Month", sortable: true, accessor: (row) => row.month, render: (row) => <span className="text-sm">{row.month}</span> },
      {
        key: "sessionsCompleted",
        header: "Sessions",
        sortable: true,
        accessor: (row) => row.sessionsCompleted,
        render: (row) => <span className="text-sm">{row.sessionsCompleted}</span>,
      },
      {
        key: "baseAmount",
        header: "Base Amount",
        sortable: true,
        accessor: (row) => row.baseAmount,
        render: (row) => <span className="text-sm text-muted-foreground">{formatCurrency(row.baseAmount)}</span>,
      },
      {
        key: "deductions",
        header: "Deductions",
        sortable: true,
        accessor: (row) => row.deductions,
        render: (row) => (
          <span className={row.deductions > 0 ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
            {row.deductions > 0 ? `-${formatCurrency(row.deductions)}` : "—"}
          </span>
        ),
      },
      {
        key: "waitingAmountAdded",
        header: "Waiting Added",
        sortable: true,
        accessor: (row) => row.waitingAmountAdded,
        render: (row) => (
          <span className={row.waitingAmountAdded > 0 ? "text-sm font-medium text-success" : "text-sm text-muted-foreground"}>
            {row.waitingAmountAdded > 0 ? `+${formatCurrency(row.waitingAmountAdded)}` : "—"}
          </span>
        ),
      },
      {
        key: "finalAmount",
        header: "Final Amount",
        sortable: true,
        accessor: (row) => row.finalAmount,
        render: (row) => <span className="text-sm font-bold text-foreground">{formatCurrency(row.finalAmount)}</span>,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={row.status === "paid" ? "success" : row.status === "finalized" ? "default" : "warning"}
              className="capitalize"
            >
              {row.status}
            </Badge>
            {row.requiresReview && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> Needs review
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => {
          if (row.status === "pending" && row.requiresReview) {
            return (
              <Button
                size="sm"
                variant="outline"
                className="text-warning-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  openReview(row);
                }}
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Review
              </Button>
            );
          }
          if (row.status === "pending") {
            return (
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmTarget({ payout: row, action: "finalize" });
                }}
              >
                {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Finalize"}
              </Button>
            );
          }
          if (row.status === "finalized") {
            return (
              <Button
                size="sm"
                disabled={busyId === row.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmTarget({ payout: row, action: "mark-paid" });
                }}
              >
                {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark Paid"}
              </Button>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Paid
            </span>
          );
        },
      },
    ],
    [busyId]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Payroll"
        title="Teacher Payouts"
        description="Monthly payout calculation from each teacher's rate card, and payment history. Rate cards (and the no-show penalty) are configured in Settings & Branding → Payroll."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/settings?tab=payroll">
                <Settings2 className="h-4 w-4" />
                Configure Rates
              </Link>
            </Button>
          </div>
        }
      />

      {apiEnabled() && payoutsError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load payouts ({payoutsError}) — the totals below don't reflect real data.{" "}
          <button type="button" className="underline" onClick={() => reloadPayouts()}>
            Retry
          </button>
        </InlineAlert>
      )}

      {exportError && <InlineAlert variant="warning" className="mb-4">{exportError}</InlineAlert>}

      {actionError && <InlineAlert variant="warning" className="mb-4">{actionError}</InlineAlert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={`Total Payout — ${currentMonthLabel}`} value={formatCurrency(totals.totalThisMonth)} icon={IndianRupee} tone="primary" loading={payoutsLoading} />
        <KpiCard label="Teachers Paid" value={formatNumber(totals.teachersPaid)} icon={UsersRound} tone="success" loading={payoutsLoading} />
        <KpiCard label="Pending Calculations" value={formatNumber(totals.pendingCalculations)} icon={Wallet} tone="warning" loading={payoutsLoading} />
      </div>

      <div className="mt-6">
        <DataTable
          data={payouts}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by teacher name…"
          emptyTitle="No payouts yet"
          emptyDescription="Teacher payouts will appear here once sessions are delivered and calculated for a pay period."
          error={apiEnabled() ? payoutsError : null}
          onRetry={reloadPayouts}
        />
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={confirmTarget?.action === "finalize" ? "Finalize this payout?" : "Mark this payout as paid?"}
        description={
          confirmTarget?.action === "finalize"
            ? `Locks ${confirmTarget.payout.teacherName}'s ${confirmTarget.payout.month} amount (${formatCurrency(confirmTarget.payout.finalAmount)}) — no more sessions will be added to it.`
            : confirmTarget
              ? `Confirms ${confirmTarget.payout.teacherName}'s ${confirmTarget.payout.month} payout (${formatCurrency(confirmTarget.payout.finalAmount)}) was paid and emails their salary slip.`
              : undefined
        }
        confirmLabel={confirmTarget?.action === "finalize" ? "Finalize" : "Mark Paid"}
        destructive={confirmTarget?.action === "finalize"}
        onConfirm={runPayoutAction}
      />

      <Dialog open={reviewPayout !== null} onOpenChange={(open) => !open && setReviewPayout(null)}>
        <DialogContent className="max-w-lg">
          {reviewPayout && (
            <>
              <DialogHeader>
                <DialogTitle>Review {reviewPayout.teacherName}'s {reviewPayout.month} payout</DialogTitle>
                <DialogDescription>
                  Captured attendance for these session(s) fell well short of the scheduled class. Confirm the amount
                  as-is or correct it — either way, a reason is logged and the flag clears once saved.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                {reviewPayout.items.filter((i) => i.requiresReview).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm text-muted-foreground">{item.note}</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor={`review-amount-${item.id}`}>Amount (₹)</Label>
                        <Input
                          id={`review-amount-${item.id}`}
                          type="number"
                          value={reviewAmounts[item.id] ?? ""}
                          onChange={(e) => setReviewAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor={`review-reason-${item.id}`}>Reason</Label>
                        <Textarea
                          id={`review-reason-${item.id}`}
                          rows={1}
                          placeholder="e.g. connection dropped, or confirmed full amount"
                          value={reviewReasons[item.id] ?? ""}
                          onChange={(e) => setReviewReasons((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" disabled={reviewSavingId === item.id} onClick={() => saveReviewItem(item)}>
                        {reviewSavingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </div>
                ))}
                {reviewError && <p className="text-sm font-medium text-destructive">{reviewError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReviewPayout(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
