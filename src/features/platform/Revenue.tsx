import { useCallback, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { saasPlatform, formatDay, formatMoney, type BillingSettings, type RevenueSummary, type SubscriptionRow } from "@/api/saas";
import { Hero, Notices, Pill, StatCard, panel, primaryButton, td, th, useLoader } from "./saasUi";

export default function Revenue() {
  return <PlatformShell><RevenueDashboard /></PlatformShell>;
}

function RevenueDashboard() {
  const { token } = usePlatformAdmin();
  const summary = useLoader(useCallback(() => saasPlatform.revenue(token), [token]), null as RevenueSummary | null);
  const queue = useLoader(useCallback(() => saasPlatform.subscriptions(token, "PastDue"), [token]), [] as SubscriptionRow[]);
  const settings = useLoader(useCallback(() => saasPlatform.settings(token), [token]), null as BillingSettings | null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function runCycle() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await saasPlatform.runCycle(token);
      setNotice(result.billingRan ? "Billing cycle and usage collection ran." : "Another instance is already running the cycle; try again shortly.");
      await Promise.all([summary.reload(), queue.reload()]);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not run the cycle."); }
    finally { setBusy(false); }
  }

  const s = summary.data;
  const total = s ? s.planDistribution.reduce((a, b) => a + b.count, 0) : 0;
  return <div className="space-y-6">
    <Hero title="Revenue" text="Recurring revenue, trial conversion, churn and collections across all clients." />
    <Notices error={error || summary.error} notice={notice} />
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={busy} className={primaryButton} onClick={() => { void runCycle(); }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Run billing cycle now</button>
      {settings.data && <p className="text-xs text-slate-500">Gateway: <b>{settings.data.gateway}</b> · Reminder e-mail: <b className={settings.data.smtpConfigured ? "text-emerald-700" : "text-amber-700"}>{settings.data.smtpConfigured ? "configured" : "SMTP not configured, reminders are logged but not delivered"}</b> · Grace: {settings.data.graceDays} days · GST {settings.data.taxRatePercent}% · Self-signup: {settings.data.signupEnabled ? "on" : "off"}</p>}
    </div>
    {s && <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="MRR" value={formatMoney(s.mrr)} hint={`ARR ${formatMoney(s.arr)}`} />
        <StatCard label="Paying clients" value={s.payingTenants} hint={`ARPA ${formatMoney(s.arpa)}`} />
        <StatCard label="Collected (30 days)" value={formatMoney(s.collected30d)} tone="text-emerald-700" />
        <StatCard label="Overdue invoices" value={formatMoney(s.overdueAmount)} tone={s.overdueAmount > 0 ? "text-amber-700" : undefined} />
        <StatCard label="Trialing" value={s.trialing} hint={`Trial → paid: ${s.trialConversionPercent}% (90 days)`} />
        <StatCard label="New paid (30 days)" value={s.newPaid30d} />
        <StatCard label="Churn (30 days)" value={`${s.churnRatePercent}%`} hint={`${s.churned30d} cancelled`} tone={s.churned30d > 0 ? "text-amber-700" : undefined} />
        <StatCard label="Failed payments (30 days)" value={s.failedPayments30d} tone={s.failedPayments30d > 0 ? "text-red-700" : undefined} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${panel} p-6`}><h2 className="font-serif text-xl font-semibold">Plan distribution</h2>
          <ul className="mt-4 space-y-3">{s.planDistribution.map(p => <li key={p.plan}><div className="flex justify-between text-sm"><span>{p.plan}</span><span className="text-slate-500">{p.count}</span></div>
            <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-white/10"><div className="h-2 rounded-full bg-[hsl(214_52%_28%)]" style={{ width: `${total ? (p.count / total) * 100 : 0}%` }} /></div></li>)}</ul>
          <p className="mt-4 text-xs text-slate-500">Past due {s.pastDue} · Suspended {s.suspended} · Expired {s.expired} · Cancelled {s.cancelled}</p></section>
        <section className={`${panel} overflow-hidden`}><h2 className="p-6 pb-3 font-serif text-xl font-semibold">Collections queue</h2>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5"><tr><th className={th}>Client</th><th className={th}>Owes</th><th className={th}>Suspends</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">{queue.data.map(q => <tr key={q.id}><td className={td}>{q.tenantName}<div><Pill value={q.status} /></div></td><td className={td}>{formatMoney(q.openAmount)}</td><td className={td}>{formatDay(q.graceEndsAtUtc)}</td></tr>)}</tbody></table></div>
          {queue.loaded && queue.data.length === 0 && <p className="p-6 pt-2 text-sm text-slate-500">No overdue clients.</p>}</section>
      </div>
    </>}
  </div>;
}
