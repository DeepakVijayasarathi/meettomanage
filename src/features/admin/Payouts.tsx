import { useMemo, useState } from "react";
import { CheckCircle2, IndianRupee, Settings2, UsersRound, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAYOUTS } from "@/data/payouts";
import { getTeacherById } from "@/data/users";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listPayouts, savePayoutRate, toFrontendPayout } from "@/api/payouts";
import type { TeacherPayout } from "@/types";
import { formatCurrency, formatNumber, getInitials } from "@/lib/utils";

export default function AdminPayouts() {
  const { data: payouts } = useApiData(
    () => listPayouts().then((items) => items.map(toFrontendPayout)),
    PAYOUTS
  );
  const [rateTarget, setRateTarget] = useState<TeacherPayout | null>(null);
  const [rateSaved, setRateSaved] = useState(false);
  const [rates, setRates] = useState<Record<30 | 45 | 60, number>>({ 30: 900, 45: 1100, 60: 1400 });

  function handleSaveRates() {
    if (!apiEnabled() || !rateTarget) {
      setRateSaved(true);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    Promise.all(
      ([30, 45, 60] as const).map((duration) =>
        savePayoutRate({
          teacherProfileId: rateTarget.teacherId,
          durationMinutes: duration,
          ratePerSession: rates[duration],
          effectiveFrom: today,
        })
      )
    ).then(() => setRateSaved(true));
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
      {
        key: "actions",
        header: "",
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setRateTarget(row);
              setRateSaved(false);
            }}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configure Rate
          </Button>
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
        description="Monthly payout calculation, per-duration rate configuration, and payment history."
      />

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

      <Dialog open={!!rateTarget} onOpenChange={(open) => !open && setRateTarget(null)}>
        <DialogContent>
          {rateTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Configure Rate — {rateTarget.teacherName}</DialogTitle>
                <DialogDescription>
                  Set per-session payout rates by class duration.
                  {!apiEnabled() && " This is a mock form — no data is persisted."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                {([30, 45, 60] as const).map((duration) => (
                  <div key={duration} className="grid gap-1.5">
                    <Label htmlFor={`rate-${duration}`}>{duration}-minute session rate (₹)</Label>
                    <Input
                      id={`rate-${duration}`}
                      type="number"
                      value={rates[duration]}
                      onChange={(e) => setRates((prev) => ({ ...prev, [duration]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRateTarget(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRates}>
                  {rateSaved ? <CheckCircle2 className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                  {rateSaved ? "Rates Saved" : "Save Rates"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
