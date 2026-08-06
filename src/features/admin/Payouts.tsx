import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, IndianRupee, Loader2, Settings2, UsersRound, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PAYOUTS } from "@/data/payouts";
import { getTeacherById } from "@/data/users";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listPayouts, toFrontendPayout } from "@/api/payouts";
import { downloadReportCsv } from "@/api/reports";
import type { TeacherPayout } from "@/types";
import { formatCurrency, formatNumber, getInitials } from "@/lib/utils";

function toCsv(columns: string[], rows: (string | number)[][]) {
  const lines = [columns.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))];
  return lines.join("\n");
}

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
  const { data: payouts, error: payoutsError, reload: reloadPayouts } = useApiData(
    () => listPayouts().then((items) => items.map(toFrontendPayout)),
    PAYOUTS
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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

  const totals = useMemo(() => {
    const thisMonth = payouts.filter((p) => p.month === "July 2026");
    const paidCount = payouts.filter((p) => p.status === "paid").length;
    const pendingCount = payouts.filter((p) => p.status === "calculated").length;
    return {
      totalThisMonth: thisMonth.reduce((sum, p) => sum + p.finalAmount, 0),
      teachersPaid: paidCount,
      pendingCalculations: pendingCount,
    };
  }, [payouts]);

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
          <Badge variant={row.status === "paid" ? "success" : "warning"} className="capitalize">
            {row.status}
          </Badge>
        ),
      },
    ],
    []
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
        <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          Could not load payouts ({payoutsError}) — the totals below don't reflect real data.{" "}
          <button type="button" className="underline" onClick={() => reloadPayouts()}>
            Retry
          </button>
        </p>
      )}

      {exportError && (
        <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">{exportError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Payout — July 2026" value={formatCurrency(totals.totalThisMonth)} icon={IndianRupee} tone="primary" />
        <KpiCard label="Teachers Paid" value={formatNumber(totals.teachersPaid)} icon={UsersRound} tone="success" />
        <KpiCard label="Pending Calculations" value={formatNumber(totals.pendingCalculations)} icon={Wallet} tone="warning" />
      </div>

      <div className="mt-6">
        <DataTable
          data={payouts}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by teacher name…"
        />
      </div>
    </div>
  );
}
