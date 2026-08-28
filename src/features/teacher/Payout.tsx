import { useState } from "react";
import { parse } from "date-fns";
import { Banknote, CalendarCheck, GraduationCap, Lock, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPayoutsForTeacher } from "@/data/payouts";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listMyPayouts, toFrontendPayout } from "@/api/payouts";
import { useSession } from "@/state/session";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { TeacherPayout, TeacherPayoutItem } from "@/types";

const TEACHER_ID = "t-1";

const ITEM_TYPE_LABEL: Record<string, string> = {
  SessionEarning: "Class Earning",
  StudentNoShowWaiting: "Student No-Show (Waiting Pay)",
  TeacherNoShowDeduction: "Teacher No-Show Deduction",
  Penalty: "Penalty",
  Bonus: "Bonus",
  Adjustment: "Adjustment",
};

function parseMonth(month: string) {
  return parse(month, "MMMM yyyy", new Date());
}

export default function TeacherPayout() {
  const { userName } = useSession();
  const { data: fetchedPayouts, loading: payoutsLoading, error: payoutsError, reload: reloadPayouts } = useApiData(
    () => listMyPayouts().then((items) => items.map(toFrontendPayout)),
    getPayoutsForTeacher(TEACHER_ID)
  );
  const payouts = [...fetchedPayouts].sort((a, b) => parseMonth(b.month).getTime() - parseMonth(a.month).getTime());
  const latest = payouts[0];
  const lifetimeTotal = payouts.reduce((sum, p) => sum + p.finalAmount, 0);
  const lifetimeSessions = payouts.reduce((sum, p) => sum + p.sessionsCompleted, 0);
  const [selectedPayout, setSelectedPayout] = useState<TeacherPayout | null>(null);

  const columns: DataTableColumn<TeacherPayout>[] = [
    {
      key: "month",
      header: "Month",
      accessor: (row) => parseMonth(row.month).getTime(),
      sortable: true,
      render: (row) => <span className="font-semibold text-foreground">{row.month}</span>,
    },
    {
      key: "sessions",
      header: "Sessions",
      accessor: (row) => row.sessionsCompleted,
      sortable: true,
      render: (row) => <span className="text-sm">{row.sessionsCompleted}</span>,
    },
    {
      key: "base",
      header: "Base Amount",
      accessor: (row) => row.baseAmount,
      sortable: true,
      render: (row) => <span className="text-sm">{formatCurrency(row.baseAmount)}</span>,
    },
    {
      key: "deductions",
      header: "Deductions",
      accessor: (row) => row.deductions,
      sortable: true,
      render: (row) => <span className={cn("text-sm", row.deductions > 0 ? "text-destructive" : "text-muted-foreground")}>{formatCurrency(row.deductions)}</span>,
    },
    {
      key: "waiting",
      header: "Waiting Added",
      accessor: (row) => row.waitingAmountAdded,
      sortable: true,
      render: (row) => <span className={cn("text-sm", row.waitingAmountAdded > 0 ? "text-success" : "text-muted-foreground")}>{formatCurrency(row.waitingAmountAdded)}</span>,
    },
    {
      key: "final",
      header: "Final Amount",
      accessor: (row) => row.finalAmount,
      sortable: true,
      render: (row) => <span className="font-semibold text-foreground">{formatCurrency(row.finalAmount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === "paid" ? "success" : row.status === "finalized" ? "default" : "warning"}>
          {row.status === "paid" ? "Paid" : row.status === "finalized" ? "Finalized" : "Pending"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Payout"
        description="Your monthly payout calculation and history. This view is private to you — teachers cannot see each other's payouts."
        eyebrow="My Account"
      />

      {apiEnabled() && payoutsError && (
        <InlineAlert variant="warning" className="mb-4 text-xs">
          Could not load your payout history ({payoutsError}).{" "}
          <button type="button" className="underline" onClick={() => reloadPayouts()}>
            Retry
          </button>
        </InlineAlert>
      )}

      {payoutsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* tone has no effect while loading=true (KpiCard's skeleton branch ignores it) —
              set to neutral rather than a hardcoded "warning" since the real card's tone
              below is conditional on paid status, not fixed. */}
          <KpiCard label="This Month Payout" value="" icon={Wallet} tone="neutral" loading />
          <KpiCard label="Sessions This Month" value="" icon={CalendarCheck} tone="primary" loading />
          <KpiCard label="Lifetime Payout" value="" icon={TrendingUp} tone="neutral" loading />
          <KpiCard label="Lifetime Sessions" value="" icon={Banknote} tone="success" loading />
        </div>
      ) : payouts.length === 0 ? (
        payoutsError ? null : (
          <EmptyState icon={Wallet} title="No payout records yet" description="Your payout history will appear here once your first month is processed." />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={`${latest.month} Payout`}
              value={formatCurrency(latest.finalAmount)}
              icon={Wallet}
              tone={latest.status === "paid" ? "success" : "warning"}
            />
            <KpiCard label="Sessions This Month" value={String(latest.sessionsCompleted)} icon={CalendarCheck} tone="primary" />
            <KpiCard label="Lifetime Payout" value={formatCurrency(lifetimeTotal)} icon={TrendingUp} tone="neutral" />
            <KpiCard label="Lifetime Sessions" value={String(lifetimeSessions)} icon={Banknote} tone="success" />
          </div>

          <Card className="mt-6 border-dashed">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              You're viewing payout records for <strong className="text-foreground">{userName} (you)</strong> only. Other teachers' payout data is
              never visible from this screen.
            </CardContent>
          </Card>

          <div className="mt-6">
            <h2 className="mb-3 text-base font-semibold text-foreground">Payout History</h2>
            <p className="mb-3 text-xs text-muted-foreground">Click a month to see its class-wise earnings breakdown.</p>
            <DataTable
              data={payouts}
              columns={columns}
              rowKey={(row) => row.id}
              searchPlaceholder="Search by month…"
              pageSize={12}
              onRowClick={(row) => setSelectedPayout(row)}
              emptyTitle="No payouts yet"
              emptyDescription="Your monthly payout will appear here once your first sessions are calculated."
              error={apiEnabled() ? payoutsError : null}
              onRetry={reloadPayouts}
            />
          </div>
        </>
      )}

      <Dialog open={selectedPayout !== null} onOpenChange={(open) => !open && setSelectedPayout(null)}>
        <DialogContent className="max-w-lg">
          {selectedPayout && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPayout.month} — Class-Wise Breakdown</DialogTitle>
                <DialogDescription>Every class and adjustment that made up this month's {formatCurrency(selectedPayout.finalAmount)} payout.</DialogDescription>
              </DialogHeader>
              <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
                {selectedPayout.items.length === 0 && (
                  <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">No line-item detail on record for this month.</p>
                )}
                {selectedPayout.items.map((item: TeacherPayoutItem) => {
                  const dateLabel = item.sessionDate
                    ? formatDate(item.sessionDate, "short")
                    : formatDate(item.createdAtUtc, "short");
                  const typeLabel = ITEM_TYPE_LABEL[item.type] ?? item.type;
                  const isNegative = item.amount < 0;
                  return (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <GraduationCap className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.className ?? typeLabel}</p>
                          <p className="text-xs text-muted-foreground">{item.className ? `${typeLabel} · ${dateLabel}` : dateLabel}</p>
                          {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
                        </div>
                      </div>
                      <span className={cn("shrink-0 text-sm font-bold", isNegative ? "text-destructive" : "text-success")}>
                        {isNegative ? "-" : "+"}
                        {formatCurrency(Math.abs(item.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
