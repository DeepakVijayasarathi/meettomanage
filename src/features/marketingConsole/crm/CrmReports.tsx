import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useApiData } from "@/api/hooks";
import { getCrmReport, inr, type CrmReport } from "@/api/crm";
import { useCrmMe } from "./hooks";

const EMPTY: CrmReport = { days: 90, owners: [], forecast: [], weightedPipeline: 0, openWithoutValue: 0, wonMonthlyValue: 0, byMonth: [] };
const hours = (v: number | null) => v === null ? "–" : v < 1 ? `${Math.round(v * 60)} min` : v < 48 ? `${v} h` : `${Math.round(v / 24)} d`;
const pct = (a: number, b: number) => (b === 0 ? "–" : `${Math.round((100 * a) / b)}%`);
const monthName = (ym: string) => new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(`${ym}-01T00:00:00`));

/** Marketing console → Reports: who is doing what, and what the pipeline is worth. */
export default function CrmReports() {
  const me = useCrmMe();
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useApiData(() => getCrmReport(days), EMPTY, EMPTY, { cacheKey: `crm-report-${days}`, ttlMs: 30_000 });
  const maxMonth = Math.max(1, ...data.byMonth.map((m) => m.weighted));

  return (
    <div>
      <PageHeader eyebrow="CRM" title="Reports" description={me.role === "Sales" ? "Your numbers and the value of your pipeline." : "Each person's leads, response time, demos and wins, and what the open pipeline is likely to bring in."}
        actions={<select aria-label="Period" className="h-10 rounded-md border bg-background px-3 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></select>} />
      {error && <InlineAlert variant="warning" className="mb-4">Couldn't load reports ({error}). <button type="button" className="underline" onClick={() => reload()}>Retry</button></InlineAlert>}
      {loading && <div className="mb-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">New monthly revenue won</p><p className="text-2xl font-bold">{inr(data.wonMonthlyValue)}</p><p className="text-xs text-muted-foreground">from leads won in this period (their expected value)</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Weighted pipeline</p><p className="text-2xl font-bold">{inr(data.weightedPipeline)}<span className="text-sm font-normal text-muted-foreground">/month</span></p><p className="text-xs text-muted-foreground">open deal values × chance of winning at their stage</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Open leads with no deal value</p><p className={data.openWithoutValue ? "text-2xl font-bold text-warning" : "text-2xl font-bold"}>{data.openWithoutValue}</p><p className="text-xs text-muted-foreground">add a likely plan and value in the lead's Deal box</p></div>
      </div>

      <section className="mb-6 overflow-x-auto rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">By person</h2>
        {data.owners.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet.</p> : (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>{["Owner", "New leads", "Contacted", "Median first reply", "Demos", "Trials", "Won", "Lost", "Won value", "Open leads", "Open value", "Overdue tasks", "Tasks done"].map((h, i) => <th key={h} className={`pb-2 font-medium ${i ? "text-end" : ""}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {data.owners.map((o) => (
                <tr key={o.ownerId ?? "none"}>
                  <td className="py-2 font-medium">{o.owner}</td>
                  <td className="py-2 text-end tabular-nums">{o.leads}</td>
                  <td className="py-2 text-end tabular-nums">{o.contacted} <span className="text-xs text-muted-foreground">{pct(o.contacted, o.leads)}</span></td>
                  <td className="py-2 text-end tabular-nums">{hours(o.medianResponseHours)}</td>
                  <td className="py-2 text-end tabular-nums">{o.demos}</td>
                  <td className="py-2 text-end tabular-nums">{o.trials}</td>
                  <td className="py-2 text-end tabular-nums font-semibold">{o.won}</td>
                  <td className="py-2 text-end tabular-nums">{o.lost}</td>
                  <td className="py-2 text-end tabular-nums">{inr(o.wonMonthlyValue)}</td>
                  <td className="py-2 text-end tabular-nums">{o.openLeads}</td>
                  <td className="py-2 text-end tabular-nums">{inr(o.openPipelineValue)}</td>
                  <td className={`py-2 text-end tabular-nums ${o.overdueTasks ? "font-semibold text-destructive" : ""}`}>{o.overdueTasks}</td>
                  <td className="py-2 text-end tabular-nums">{o.tasksDone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-muted-foreground">New leads, contacted, demos, trials and lost count leads created in the period; won counts leads that became customers in the period. Open figures are for all open leads.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Pipeline by stage</h2>
          {data.forecast.length === 0 ? <p className="text-sm text-muted-foreground">No open leads.</p> : (
            <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">Stage</th><th className="pb-2 text-end font-medium">Leads</th><th className="pb-2 text-end font-medium">Value / mo</th><th className="pb-2 text-end font-medium">Chance</th><th className="pb-2 text-end font-medium">Weighted</th></tr></thead>
              <tbody className="divide-y">{data.forecast.map((f) => <tr key={f.stage}><td className="py-1.5">{f.label}</td><td className="py-1.5 text-end tabular-nums">{f.count}</td><td className="py-1.5 text-end tabular-nums">{inr(f.value)}</td><td className="py-1.5 text-end tabular-nums">{Math.round(f.probability * 100)}%</td><td className="py-1.5 text-end tabular-nums font-semibold">{inr(f.weighted)}</td></tr>)}</tbody>
            </table>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-1 font-semibold">Expected to close, next 6 months</h2>
          <p className="mb-3 text-xs text-muted-foreground">Weighted monthly value by each lead's expected close date. Overdue close dates count in this month.</p>
          <ul className="space-y-2">
            {data.byMonth.map((m) => (
              <li key={m.month} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm">
                <span>{monthName(m.month)}</span>
                <span className="h-5 overflow-hidden rounded bg-muted"><span className="block h-full rounded bg-primary/80" style={{ width: `${(100 * m.weighted) / maxMonth}%` }} /></span>
                <span className="w-32 text-end tabular-nums">{inr(m.weighted)} <span className="text-xs text-muted-foreground">({m.deals})</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
