import { useCallback, useState } from "react";
import { FileText, Link2, Loader2, X } from "lucide-react";
import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import {
  saasPlatform, openPlatformInvoicePdf, formatDay, formatMoney,
  type EntitlementDef, type InvoiceRow, type PlanView, type SubscriptionDetail, type SubscriptionRow,
} from "@/api/saas";
import { Hero, Notices, Pill, TabBar, inputClass, labelClass, panel, smallButton, td, th, useLoader } from "./saasUi";

const STATUSES = ["", "Trialing", "Active", "PastDue", "Suspended", "Expired", "Cancelled"];

export default function Subscriptions() {
  return <PlatformShell><SubscriptionManagement /></PlatformShell>;
}

function SubscriptionManagement() {
  const { token } = usePlatformAdmin();
  const [tab, setTab] = useState<"subs" | "invoices">("subs");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const subs = useLoader(useCallback(() => saasPlatform.subscriptions(token, filter || undefined), [token, filter]), [] as SubscriptionRow[]);
  const invoices = useLoader(useCallback(() => saasPlatform.invoices(token), [token]), [] as InvoiceRow[]);
  const plans = useLoader(useCallback(() => saasPlatform.plans(token), [token]), [] as PlanView[]);

  async function run(work: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); setNotice(success); await Promise.all([subs.reload(), invoices.reload()]); }
    catch (err) { setError(err instanceof Error ? err.message : "The action failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <Hero title="Subscriptions & invoices" text="See every client's plan, status and usage; extend trials, assign plans, override limits and settle invoices." />
    <Notices error={error || subs.error || invoices.error} notice={notice} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <TabBar tabs={[{ id: "subs", label: "Subscriptions" }, { id: "invoices", label: "Invoices" }]} value={tab} onChange={setTab} />
      {tab === "subs" && <select aria-label="Filter by status" className={`${inputClass} w-48`} value={filter} onChange={e => setFilter(e.target.value)}>
        {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace(/([a-z])([A-Z])/g, "$1 $2") : "All statuses"}</option>)}</select>}
    </div>

    {tab === "subs" && <section className={`${panel} overflow-hidden`}><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5"><tr>
        <th className={th}>Client</th><th className={th}>Plan</th><th className={th}>Status</th><th className={th}>Renews / ends</th><th className={th}>Usage</th><th className={th}>Open</th><th className={th} /></tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-white/10">{subs.data.map(s => <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
        <td className={td}><div className="font-medium">{s.tenantName}</div><div className="font-mono text-xs text-slate-500">{s.tenantCode}</div></td>
        <td className={td}>{s.planName}{s.price && <div className="text-xs text-slate-500">{formatMoney(s.price.amount, s.price.currency)}/{s.price.interval === "Month" ? "mo" : "yr"}</div>}</td>
        <td className={td}><Pill value={s.status} />{s.cancelAtPeriodEnd && <div className="mt-1 text-xs text-amber-700">ending</div>}{s.tenantStatus === "Suspended" && <div className="mt-1 text-xs text-red-700">tenant suspended</div>}</td>
        <td className={td}>{s.status === "Trialing" ? `Trial ends ${formatDay(s.trialEndsAtUtc)}` : s.status === "PastDue" ? `Grace until ${formatDay(s.graceEndsAtUtc)}` : s.currentPeriodEndUtc ? formatDay(s.currentPeriodEndUtc) : "No renewal"}</td>
        <td className={`${td} text-xs text-slate-600`}>{s.usage ? <>{s.usage.activeStudents} students<br />{s.usage.staffCount} staff · {s.usage.storageMb} MB</> : "-"}</td>
        <td className={td}>{s.openInvoices > 0 ? <span className="font-medium text-amber-700">{s.openInvoices} · {formatMoney(s.openAmount)}</span> : "-"}</td>
        <td className={td}><button className={smallButton} onClick={() => setSelected(s.tenantId)}>Manage</button></td></tr>)}</tbody>
    </table></div>
      {!subs.loaded && <p className="p-6 text-sm text-slate-500">Loading…</p>}
      {subs.loaded && subs.data.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No subscriptions match.</p>}</section>}

    {tab === "invoices" && <section className={`${panel} overflow-hidden`}><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5"><tr>
        <th className={th}>Invoice</th><th className={th}>Client</th><th className={th}>Total</th><th className={th}>Status</th><th className={th}>Due</th><th className={th}>Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-white/10">{invoices.data.map(i => <tr key={i.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
        <td className={`${td} font-mono text-xs`}>{i.invoiceNumber}<div className="font-sans text-slate-500">{formatDay(i.periodStartUtc)} → {formatDay(i.periodEndUtc)}</div></td>
        <td className={td}>{i.tenantName}</td>
        <td className={td}>{formatMoney(i.total, i.currency)}<div className="text-xs text-slate-500">GST {formatMoney(i.taxAmount, i.currency)}</div></td>
        <td className={td}>{i.overdue ? <Pill value="Overdue" /> : <Pill value={i.status} />}{i.paidAtUtc && <div className="text-xs text-slate-500">{formatDay(i.paidAtUtc)}</div>}</td>
        <td className={td}>{formatDay(i.dueAtUtc)}</td>
        <td className={td}><div className="flex flex-wrap gap-2">
          <button className={smallButton} onClick={() => { void openPlatformInvoicePdf(token, i.id).catch(err => setError(err.message)); }}><FileText className="h-3 w-3" />PDF</button>
          {i.status === "Open" && <>
            <button disabled={busy} className={smallButton} onClick={() => { const ref = window.prompt("Payment reference (UPI/bank ref, optional):", ""); if (ref !== null) void run(() => saasPlatform.markPaid(token, i.id, ref || undefined), `${i.invoiceNumber} marked as paid.`); }}>Mark paid</button>
            <button disabled={busy} className={smallButton} onClick={() => { void run(async () => { const r = await saasPlatform.paymentLink(token, i.id); if (r.paymentUrl) await navigator.clipboard?.writeText(r.paymentUrl); }, "Payment link created and copied (when the gateway is enabled).") }}><Link2 className="h-3 w-3" />Link</button>
            <button disabled={busy} className={smallButton} onClick={() => { if (window.confirm(`Void ${i.invoiceNumber}? It can no longer be paid.`)) void run(() => saasPlatform.voidInvoice(token, i.id), `${i.invoiceNumber} voided.`); }}>Void</button></>}
        </div></td></tr>)}</tbody>
    </table></div>
      {invoices.loaded && invoices.data.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No invoices have been issued yet.</p>}</section>}

    {selected && <Detail tenantId={selected} token={token} plans={plans.data} busy={busy} run={run} onClose={() => setSelected(null)} />}
  </div>;
}

function Detail({ tenantId, token, plans, busy, run, onClose }: {
  tenantId: string; token: string; plans: PlanView[]; busy: boolean; onClose: () => void;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const detail = useLoader(useCallback(() => saasPlatform.subscription(token, tenantId), [token, tenantId]), null as SubscriptionDetail | null);
  const catalog = useLoader(useCallback(() => saasPlatform.catalog(token), [token]), [] as EntitlementDef[]);
  const [mode, setMode] = useState<"invoice" | "complimentary" | "trial">("invoice");
  const [priceId, setPriceId] = useState("");
  const [planCode, setPlanCode] = useState("trial");
  const [days, setDays] = useState(14);
  const [overrideKey, setOverrideKey] = useState("");
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const d = detail.data;
  const withReload = async (work: () => Promise<unknown>, success: string) => { await run(work, success); await detail.reload(); };
  const priced = plans.flatMap(p => p.prices.filter(x => x.isActive).map(x => ({ id: x.id, label: `${p.name} · ${formatMoney(x.amount, x.currency)}/${x.billingInterval === "Month" ? "mo" : "yr"}` })));

  async function saveOverride() {
    if (!d || !overrideKey) return;
    const next = [...d.overrides.filter(o => o.key !== overrideKey).map(o => ({ key: o.key, value: o.value, expiresAtUtc: o.expiresAtUtc, reason: o.reason })),
      { key: overrideKey, value: Number(overrideValue), reason: overrideReason || null }];
    await withReload(() => saasPlatform.setOverrides(token, tenantId, next), "Override saved.");
    setOverrideKey(""); setOverrideValue(""); setOverrideReason("");
  }

  return <section className={`${panel} space-y-6 p-6`} aria-label="Subscription details">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="font-serif text-xl font-semibold">{d?.tenantName ?? "Loading…"}</h2>{d && <p className="text-sm text-slate-500">{d.planName} · <Pill value={d.status} /></p>}</div>
      <button className={smallButton} onClick={onClose} aria-label="Close"><X className="h-3 w-3" />Close</button>
    </div>
    {detail.error && <p role="alert" className="text-sm text-red-700">{detail.error}</p>}
    {d && <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Assign a plan</h3>
          <TabBar tabs={[{ id: "invoice", label: "Invoice" }, { id: "complimentary", label: "Complimentary" }, { id: "trial", label: "Trial" }]} value={mode} onChange={setMode} />
          {mode !== "trial" && <label className={labelClass}><span>Plan &amp; price</span>
            <select className={inputClass} value={priceId} onChange={e => setPriceId(e.target.value)}><option value="">{mode === "complimentary" ? "Choose a priced plan, or pick a plan code below" : "Choose…"}</option>{priced.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>}
          {mode !== "invoice" && <label className={labelClass}><span>Plan code{mode === "trial" ? " (trial plan)" : " (used when no price is chosen)"}</span>
            <select className={inputClass} value={planCode} onChange={e => setPlanCode(e.target.value)}>{plans.map(p => <option key={p.id} value={p.code}>{p.name} ({p.code})</option>)}</select></label>}
          {mode === "trial" && <label className={labelClass}><span>Trial days</span><input type="number" min={1} max={365} className={inputClass} value={days} onChange={e => setDays(Number(e.target.value))} /></label>}
          <p className="text-xs text-slate-500">{mode === "invoice" ? "Issues an invoice; the plan changes once it is paid." : mode === "complimentary" ? "Active immediately, never invoiced or renewed." : "Starts a fresh trial and reactivates a billing-suspended client."}</p>
          <button disabled={busy || (mode === "invoice" && !priceId)} className={smallButton} onClick={() => { void withReload(() => saasPlatform.assign(token, tenantId, { mode, planCode: mode === "invoice" ? undefined : planCode, planPriceId: priceId || undefined, trialDays: mode === "trial" ? days : undefined }), "Plan assigned."); }}>
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}Apply</button>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className={smallButton} onClick={() => { const v = window.prompt("Extend the trial by how many days?", "7"); if (v) void withReload(() => saasPlatform.extendTrial(token, tenantId, Number(v)), "Trial extended."); }}>Extend trial</button>
            <button disabled={busy} className={smallButton} onClick={() => { void withReload(() => saasPlatform.resume(token, tenantId), "Subscription resumed."); }}>Resume</button>
            <button disabled={busy} className={smallButton} onClick={() => { if (window.confirm("Cancel at the end of the current period?")) void withReload(() => saasPlatform.cancel(token, tenantId, false), "Cancellation scheduled."); }}>Cancel at period end</button>
            <button disabled={busy} className={smallButton} onClick={() => { if (window.confirm("Cancel NOW and suspend this client? Its data is kept.")) void withReload(() => saasPlatform.cancel(token, tenantId, true), "Subscription cancelled."); }}>Cancel now</button>
          </div>
          <h3 className="pt-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Limit &amp; feature overrides</h3>
          <ul className="space-y-1 text-sm">{d.overrides.length === 0 && <li className="text-slate-500">None. The client gets exactly what its plan includes.</li>}
            {d.overrides.map(o => <li key={o.key} className="flex items-center justify-between gap-2"><span><b>{catalog.data.find(c => c.key === o.key)?.label ?? o.key}</b>: {o.value}{o.reason ? ` (${o.reason})` : ""}</span>
              <button className={smallButton} disabled={busy} onClick={() => { void withReload(() => saasPlatform.setOverrides(token, tenantId, d.overrides.filter(x => x.key !== o.key)), "Override removed."); }}>Remove</button></li>)}</ul>
          <div className="grid gap-2 sm:grid-cols-[1fr_90px_1fr_auto]">
            <select aria-label="Override entitlement" className={inputClass} value={overrideKey} onChange={e => setOverrideKey(e.target.value)}><option value="">Entitlement…</option>{catalog.data.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
            <input aria-label="Override value" type="number" min={-1} placeholder="Value" className={inputClass} value={overrideValue} onChange={e => setOverrideValue(e.target.value)} />
            <input aria-label="Override reason" placeholder="Reason" className={inputClass} value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
            <button disabled={busy || !overrideKey || overrideValue === ""} className={smallButton} onClick={() => { void saveOverride(); }}>Set</button>
          </div>
          <p className="text-xs text-slate-500">Features: 1 = on, 0 = off. Limits: -1 = unlimited.</p>
        </div>
      </div>
      <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">History</h3>
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-white/10">{d.events.map((e, i) => <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
          <span><b>{e.eventType.replace(/_/g, " ")}</b>{e.detail ? <span className="text-slate-600"> · {e.detail}</span> : null}</span><span className="text-xs text-slate-500">{e.actor} · {new Date(e.createdAtUtc).toLocaleString("en-IN")}</span></li>)}</ul></div>
    </>}
  </section>;
}
