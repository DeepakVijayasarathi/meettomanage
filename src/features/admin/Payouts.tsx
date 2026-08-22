import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { CheckCircle2, Download, IndianRupee, Loader2, Settings2, UsersRound, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PAYOUTS } from "@/data/payouts";
import { getTeacherById } from "@/data/users";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { finalizePayout, listPayouts, markPayoutPaid, toFrontendPayout } from "@/api/payouts";
import { downloadReportCsv } from "@/api/reports";
import type { TeacherPayout } from "@/types";
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Could not ${action === "finalize" ? "finalize" : "mark paid"} this payout.`);
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
          <Badge
            variant={row.status === "paid" ? "success" : row.status === "finalized" ? "default" : "warning"}
            className="capitalize"
          >
            {row.status}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => {
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
        <p role="alert" className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          Could not load payouts ({payoutsError}) — the totals below don't reflect real data.{" "}
          <button type="button" className="underline" onClick={() => reloadPayouts()}>
            Retry
          </button>
        </p>
      )}

      {exportError && (
        <p role="alert" className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">{exportError}</p>
      )}

      {actionError && (
        <p role="alert" className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">{actionError}</p>
      )}

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
    </div>
  );
}
