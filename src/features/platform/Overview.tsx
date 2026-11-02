import { useCallback } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Clock, Info, Receipt, Sparkles, TrendingUp } from "lucide-react";
import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { saasPlatform, formatDay, formatMoney, type PlatformRules, type ReminderLogRow, type RevenueSummary, type SubscriptionRow } from "@/api/saas";
import { platformRequest, type PlatformTenant } from "@/api/platform";
import { needsAttention, recentSignups } from "./overviewAttention";
import { Hero, Notices, StatCard, panel, primaryButton, smallButton, useLoader } from "./saasUi";

export default function Overview() {
  return <PlatformShell><PlatformOverview /></PlatformShell>;
}

function PlatformOverview() {
  const { token } = usePlatformAdmin();
  const revenue = useLoader(useCallback(() => saasPlatform.revenue(token), [token]), null as RevenueSummary | null);
  const subs = useLoader(useCallback(() => saasPlatform.subscriptions(token), [token]), [] as SubscriptionRow[]);
  const tenants = useLoader(useCallback(() => platformRequest<PlatformTenant[]>("/tenants", token), [token]), [] as PlatformTenant[]);
  const rules = useLoader(useCallback(() => saasPlatform.rules(token).then((r) => r.rules).catch(() => null), [token]), null as PlatformRules | null);
  const reminders = useLoader(useCallback(() => saasPlatform.reminders(token).catch(() => [] as ReminderLogRow[]), [token]), [] as ReminderLogRow[]);
  const r = revenue.data;
  const attention = needsAttention(subs.data, Date.now(), tenants.data, reminders.data, rules.data ?? undefined);
  const newAcademies = recentSignups(tenants.data);
  const planOf = (id: string) => subs.data.find(s => s.tenantId === id);
  const academies = subs.data.length;

  return <div className="space-y-6">
    <Hero title="Overview" text="Your platform at a glance: how many academies you have, what they pay, and what needs your attention today." />
    <Notices error={revenue.error || subs.error} notice="" />

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Academies" value={subs.loaded ? academies : "…"} hint={r ? r.planDistribution.map(p => `${p.count} ${p.plan}`).join(" · ") : undefined} />
      <StatCard label="Monthly recurring revenue" value={r ? formatMoney(r.mrr) : "…"} hint={r ? `${r.payingTenants} paying academ${r.payingTenants === 1 ? "y" : "ies"}` : undefined} />
      <StatCard label="On a free trial" value={r ? r.trialing : "…"} hint={r ? `${r.trialConversionPercent}% of trials convert` : undefined} />
      <StatCard label="Overdue" value={r ? formatMoney(r.overdueAmount) : "…"} hint={r ? `${r.pastDue} past due · ${r.suspended} suspended` : undefined} tone={r && r.overdueAmount > 0 ? "text-amber-700" : "text-foreground"} />
    </div>

    <section className={`${panel} p-6`}>
      <h2 className="console-heading flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5 text-[hsl(var(--console-brass))]" />Needs your attention</h2>
      {!subs.loaded ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        : attention.length === 0
          ? <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Nothing needs your attention: no overdue payments, trials ending soon, unpaid invoices, closed academies, stalled signups or failed e-mails.</p>
          : <ul className="mt-4 divide-y divide-border">
            {attention.map(a => <li key={a.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex items-start gap-3">
                {a.tone === "bad" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> : a.tone === "warn" ? <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />}
                <span><span className="block text-sm font-semibold">{a.title}</span><span className="block text-xs text-muted-foreground">{a.detail}</span></span>
              </span>
              <Link to={a.to} className={smallButton}>{a.action} <ArrowRight className="h-3 w-3" /></Link>
            </li>)}
          </ul>}
    </section>

    <section className={`${panel} p-6`}>
      <h2 className="console-heading flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-[hsl(var(--console-brass))]" />New academies this week</h2>
      {!tenants.loaded ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        : newAcademies.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No new academies in the last 7 days.</p>
          : <ul className="mt-4 divide-y divide-border">
            {newAcademies.map(t => {
              const sub = planOf(t.id);
              return <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span><span className="block text-sm font-semibold">{t.name} <span className="font-mono text-xs font-normal text-muted-foreground">{t.code}</span></span>
                  <span className="block text-xs text-muted-foreground">Signed up {formatDay(t.createdAtUtc)} · {sub ? `${sub.planName}${sub.status === "Trialing" ? " (trial)" : ""}` : "No plan"}{t.status !== "Active" ? ` · ${t.status}` : ""}</span></span>
                <Link to={`/platform/operations?tenant=${t.id}`} className={smallButton}>Open <ArrowRight className="h-3 w-3" /></Link>
              </li>;
            })}
          </ul>}
    </section>

    <section className={`${panel} p-6`}>
      <h2 className="console-heading text-lg font-semibold">Quick actions</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to="/platform/tenants" className={primaryButton}><Building2 className="h-4 w-4" />Academies</Link>
        <Link to="/platform/subscriptions" className={smallButton}><Receipt className="h-3.5 w-3.5" />Subscriptions & invoices</Link>
        <Link to="/platform/revenue" className={smallButton}><TrendingUp className="h-3.5 w-3.5" />Revenue & billing cycle</Link>
      </div>
    </section>
  </div>;
}
