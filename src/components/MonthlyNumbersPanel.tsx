import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineAlert } from "@/components/InlineAlert";
import { apiEnabled, userMessage } from "@/lib/api";
import { getMonthlyFinanceSummary, type ApiMonthlyFinanceSummary } from "@/api/reports";
import { formatCurrency, formatNumber } from "@/lib/utils";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * The Admin/Founder dashboards' plain-number view of one month: demos, conversions and money
 * collected per admission counselor, with later installments under "Others" (client request:
 * exact figures, not charts — and the same split their salaries are calculated from).
 */
export function MonthlyNumbersPanel() {
  const usingApi = apiEnabled();
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [summary, setSummary] = useState<ApiMonthlyFinanceSummary | null>(null);
  const [loading, setLoading] = useState(usingApi);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usingApi) return;
    const [year, month] = monthValue.split("-").map(Number);
    if (!year || !month) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMonthlyFinanceSummary(year, month)
      .then((data) => !cancelled && setSummary(data))
      .catch((err: unknown) => !cancelled && setError(userMessage(err, "Could not load this month's numbers.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [usingApi, monthValue]);

  if (!usingApi) return null;

  return (
    <Card className="mt-6 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Monthly numbers</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Demos, conversions and collections for the selected month.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Month
          <Input
            type="month"
            className="w-44"
            value={monthValue}
            max={currentMonthValue()}
            onChange={(e) => e.target.value && setMonthValue(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <InlineAlert variant="warning" className="mt-4">
          {error}
        </InlineAlert>
      )}

      {loading && !summary ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : summary ? (
        <div className={loading ? "opacity-60" : undefined}>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Figure label="Demos conducted" value={formatNumber(summary.demosConducted)} />
            <Figure label="Demos converted" value={formatNumber(summary.demosConverted)} hint="Of this month's demos" />
            <Figure label="Conversion rate" value={`${summary.conversionRatePercent}%`} />
            <Figure label="Collected by counselors" value={formatCurrency(summary.counselorCollected)} />
            <Figure label="Others" value={formatCurrency(summary.othersCollected)} hint="Later installments and other collections" />
            <Figure label="Total collected" value={formatCurrency(summary.totalCollected)} />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="py-2 pr-3">Counselor</th>
                  <th className="px-3 py-2 text-right">Demos conducted</th>
                  <th className="px-3 py-2 text-right">Demos converted</th>
                  <th className="px-3 py-2 text-right">Conversion rate</th>
                  <th className="py-2 pl-3 text-right">Amount collected</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {summary.counselors.map((c) => (
                  <tr key={c.userId} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(c.demosConducted)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(c.demosConverted)}</td>
                    <td className="px-3 py-2 text-right">{c.conversionRatePercent}%</td>
                    <td className="py-2 pl-3 text-right">{formatCurrency(c.amountCollected)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium text-foreground">Others</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                  <td className="py-2 pl-3 text-right">{formatCurrency(summary.othersCollected)}</td>
                </tr>
                <tr className="font-semibold text-foreground">
                  <td className="py-2 pr-3">Total</td>
                  <td className="px-3 py-2 text-right">{formatNumber(summary.demosConducted)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(summary.demosConverted)}</td>
                  <td className="px-3 py-2 text-right">{summary.conversionRatePercent}%</td>
                  <td className="py-2 pl-3 text-right">{formatCurrency(summary.totalCollected)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            A counselor is credited with what was collected while enrolling the child. Payments received after the
            enrollment was verified are counted under Others.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
