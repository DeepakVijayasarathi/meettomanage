import { IndianRupee, Loader2, PiggyBank, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiData } from "@/api/hooks";
import { formatStaffPayoutPeriod, getMyStaffEarnings, type ApiStaffEarnings, type ApiStaffPayout } from "@/api/staffPayouts";
import { apiEnabled, userMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const EMPTY: ApiStaffEarnings = {
  currentMonth: { id: null, userId: "", staffName: null, periodYear: 0, periodMonth: 0, basis: "FixedMonthly", amount: 0, collectionAmountRaw: null, collectionAmountRounded: null, appliedPercentage: null, appliedFixedAmount: null, isFinalized: false, status: null, paidAtUtc: null },
  history: [],
};

function basisDetail(p: ApiStaffPayout): string | null {
  if (p.basis === "PercentOfMonthlyCollection") {
    if (p.collectionAmountRaw === null) return null;
    return `${p.appliedPercentage ?? 0}% of ${formatCurrency(p.collectionAmountRounded ?? 0)} (collected ${formatCurrency(p.collectionAmountRaw)}, floored to the nearest ₹10,000)`;
  }
  return null;
}

/**
 * "My Salary" for non-teacher staff (Coordinator, Relationship Manager, Admission, Admin) —
 * fixed monthly amount or a percentage of the month's own collection, per client requirement.
 * Shared across every admin-team portal, same idiom as subadmin/MyLeave.tsx.
 */
export default function MySalary() {
  const { data, loading, error, reload } = useApiData(() => getMyStaffEarnings(), EMPTY);
  const current = data.currentMonth;

  return (
    <div>
      <PageHeader
        eyebrow="Payroll"
        title="My Salary"
        description="Your monthly compensation, set by Admin/Management. This view is private to you."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error && apiEnabled() ? (
        <EmptyState icon={Wallet} title="Couldn't load your salary" description={userMessage(error, "Please try again.")} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              label={`${formatStaffPayoutPeriod(current.periodYear, current.periodMonth)} (this month, live)`}
              value={formatCurrency(current.amount)}
              icon={IndianRupee}
              tone="primary"
            />
            <KpiCard
              label={current.basis === "PercentOfMonthlyCollection" ? "Basis" : "Basis"}
              value={current.basis === "PercentOfMonthlyCollection" ? "% of monthly collection" : "Fixed monthly"}
              icon={PiggyBank}
              tone="neutral"
            />
          </div>

          {basisDetail(current) && (
            <InlineAlert variant="info" className="mt-4">{basisDetail(current)}</InlineAlert>
          )}

          {current.amount === 0 && current.appliedFixedAmount === 0 && data.history.length === 0 && (
            <InlineAlert variant="warning" className="mt-4">
              No compensation is configured for your account yet — contact Admin/Management.
            </InlineAlert>
          )}

          <div className="mt-6">
            <h2 className="mb-3 text-base font-semibold text-foreground">History</h2>
            {data.history.length === 0 ? (
              <EmptyState icon={Wallet} title="No past months yet" description="Once a month completes, it shows up here and stays even if your compensation is later changed." />
            ) : (
              <Card className="overflow-hidden p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.history.map((p) => (
                      <TableRow key={`${p.periodYear}-${p.periodMonth}`}>
                        <TableCell className="font-medium text-foreground">{formatStaffPayoutPeriod(p.periodYear, p.periodMonth)}</TableCell>
                        <TableCell className="font-semibold text-foreground">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "Paid" ? "success" : "default"}>{p.status === "Paid" ? "Paid" : "Finalized"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>

          {apiEnabled() && error && (
            <InlineAlert variant="warning" className="mt-4">
              Could not refresh ({error}).{" "}
              <button type="button" className="underline" onClick={() => reload()}>Retry</button>
            </InlineAlert>
          )}
        </>
      )}
    </div>
  );
}
