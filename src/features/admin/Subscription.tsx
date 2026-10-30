import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, Info, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { userMessage } from "@/lib/api";
import {
  saasTenant, formatDay, formatMoney,
  type BillingInterval, type BillingProfile, type InvoiceRow, type TenantPlan, type TenantSaasStatus,
} from "@/api/saas";

const STATUS_VARIANT = { Active: "success", Trialing: "default", PastDue: "warning", Suspended: "destructive", Expired: "destructive", Cancelled: "muted" } as const;

function describe(value: number, unit: string): string {
  if (value === -1) return "Unlimited";
  if (unit === "MB" && value >= 1024) return `${(value / 1024).toLocaleString("en-IN", { maximumFractionDigits: 1 })} GB`;
  return `${value.toLocaleString("en-IN")} ${unit}`;
}

/** The client administrator's own subscription: plan, usage against limits, plan changes and invoices. */
export default function AdminSubscription() {
  const { toast } = useToast();
  const [status, setStatus] = useState<TenantSaasStatus | null>(null);
  const [plans, setPlans] = useState<TenantPlan[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [profile, setProfile] = useState<BillingProfile>({ legalName: "", billingEmail: "", billingPhone: "", gstin: "", address: "", state: "" });
  const [interval, setInterval] = useState<BillingInterval>("Month");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<{ priceId: string; label: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p, i, pr] = await Promise.all([saasTenant.status(), saasTenant.plans(), saasTenant.invoices(), saasTenant.profile()]);
      setStatus(s); setPlans(p); setInvoices(i);
      setProfile({ legalName: pr.legalName ?? "", billingEmail: pr.billingEmail ?? "", billingPhone: pr.billingPhone ?? "", gstin: pr.gstin ?? "", address: pr.address ?? "", state: pr.state ?? "" });
    } catch (err) { toast({ title: "Could not load your subscription", description: userMessage(err), variant: "error" }); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { void load(); }, [load]);

  async function act(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    try { await work(); toast({ title: success }); await load(); }
    catch (err) { toast({ title: "That did not work", description: userMessage(err), variant: "error" }); }
    finally { setBusy(false); }
  }

  async function changePlan(priceId: string) {
    setBusy(true);
    try {
      const result = await saasTenant.changePlan(priceId);
      toast({ title: result.message });
      await load();
      if (result.paymentUrl) window.open(result.paymentUrl, "_blank", "noopener");
    } catch (err) { toast({ title: "Could not change the plan", description: userMessage(err), variant: "error" }); }
    finally { setBusy(false); setConfirmPlan(null); }
  }

  async function pay(invoice: { id: string; paymentUrl: string | null }) {
    setBusy(true);
    try {
      const url = invoice.paymentUrl ?? (await saasTenant.payLink(invoice.id)).paymentUrl;
      if (url) window.open(url, "_blank", "noopener");
      else toast({ title: "Online payment is not enabled", description: "Pay by bank transfer or UPI using the invoice, then contact support to confirm it." });
    } catch (err) { toast({ title: "Could not start payment", description: userMessage(err), variant: "error" }); }
    finally { setBusy(false); }
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    void act(() => saasTenant.saveProfile(profile), "Billing details saved");
  }

  if (loading) return <div role="status" aria-label="Loading subscription" className="space-y-4">{[0, 1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />)}</div>;
  if (!status?.managed) return <><PageHeader title="My Subscription" description="Your plan, usage and invoices." />
    <Card><CardContent className="p-6 text-sm text-muted-foreground">Your workspace is not on a billing plan, so there are no limits and nothing to pay.</CardContent></Card></>;

  const s = status;
  const BannerIcon = s.banner?.level === "danger" ? AlertTriangle : Info;
  const bannerTone = s.banner?.level === "danger" ? "border-destructive/30 bg-destructive/10 text-destructive" : s.banner?.level === "warning" ? "border-warning/40 bg-warning/15" : "border-primary/20 bg-primary/5";
  const highUsage = s.limits!.filter(l => l.limit !== -1 && l.percent >= 80);
  const reachedUsage = highUsage.filter(l => l.percent >= 100);

  return <div className="space-y-6">
    <PageHeader title="My Subscription" description="Your plan, usage against your limits, plan changes and invoices." eyebrow="Billing" />
    {s.banner && <div role="status" className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${bannerTone}`}><BannerIcon className="mt-0.5 h-4 w-4 shrink-0" />{s.banner.message}</div>}

    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1"><CardContent className="space-y-3 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current plan</p>
        <div className="flex items-center gap-2"><h2 className="text-2xl font-bold">{s.planName}</h2><Badge variant={STATUS_VARIANT[s.status!] ?? "muted"}>{s.status!.replace(/([a-z])([A-Z])/g, "$1 $2")}</Badge></div>
        {s.price && <p className="text-lg font-semibold">{formatMoney(s.price.amount, s.price.currency)}<span className="text-sm font-normal text-muted-foreground"> / {s.price.interval === "Month" ? "month" : "year"} + GST</span></p>}
        <dl className="space-y-1 text-sm text-muted-foreground">
          {s.status === "Trialing" && <div className="flex justify-between"><dt>Trial ends</dt><dd className="font-medium text-foreground">{formatDay(s.trialEndsAtUtc)}</dd></div>}
          {s.currentPeriodEndUtc && <div className="flex justify-between"><dt>{s.cancelAtPeriodEnd ? "Ends on" : "Renews on"}</dt><dd className="font-medium text-foreground">{formatDay(s.currentPeriodEndUtc)}</dd></div>}
          {s.status === "PastDue" && <div className="flex justify-between"><dt>Suspension date</dt><dd className="font-medium text-destructive">{formatDay(s.graceEndsAtUtc)}</dd></div>}
          {s.pendingPlan && <div className="flex justify-between"><dt>Changes to</dt><dd className="font-medium text-foreground">{s.pendingPlan.name} at renewal</dd></div>}
        </dl>
        <div className="flex flex-wrap gap-2 pt-1">
          {s.cancelAtPeriodEnd && <Button size="sm" disabled={busy} onClick={() => { void act(() => saasTenant.resume(), "Subscription resumed"); }}>Resume subscription</Button>}
          {!s.cancelAtPeriodEnd && s.status === "Active" && s.currentPeriodEndUtc && <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmCancel(true)}>Cancel subscription</Button>}
        </div>
      </CardContent></Card>

      <Card className="lg:col-span-2"><CardContent className="space-y-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usage</p>
        {highUsage.length > 0 && <div role="alert" className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${reachedUsage.length > 0 ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/40 bg-warning/15"}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{reachedUsage.length > 0 ? "Usage limit reached" : "Approaching usage limit"}: {(reachedUsage.length > 0 ? reachedUsage : highUsage).map(l => `${l.label} (${Math.round(l.percent)}%)`).join(", ")}. {reachedUsage.length > 0 ? "Upgrade or reduce usage to continue." : "Consider upgrading before service is interrupted."}</span>
        </div>}
        {s.limits!.map(l => {
          const unlimited = l.limit === -1;
          const tone = l.percent >= 100 ? "bg-destructive" : l.percent >= 80 ? "bg-warning" : "bg-primary";
          return <div key={l.key}>
            <div className="mb-1 flex justify-between text-sm"><span>{l.label}</span>
              <span className="text-muted-foreground"><b className="text-foreground">{l.used.toLocaleString("en-IN")}</b> of {unlimited ? "Unlimited" : describe(l.limit, l.unit)}</span></div>
            <Progress value={unlimited ? 0 : l.percent} indicatorClassName={tone} aria-label={`${l.label} usage`} />
          </div>;
        })}
        <div className="flex flex-wrap gap-2 pt-1">{s.features!.map(f => <Badge key={f.key} variant={f.enabled ? "success" : "muted"}>{f.enabled ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}{f.label}{f.enabled ? "" : " (not included)"}</Badge>)}</div>
      </CardContent></Card>
    </div>

    {s.openInvoices!.length > 0 && <Card className="border-warning/50"><CardContent className="space-y-3 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment due</p>
      {s.openInvoices!.map(i => <div key={i.id} className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-medium">{i.invoiceNumber} · {formatMoney(i.total, i.currency)}</p><p className="text-xs text-muted-foreground">Due {formatDay(i.dueAtUtc)} (incl. GST)</p></div>
        <Button size="sm" disabled={busy} onClick={() => { void pay(i); }}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Pay now</Button></div>)}
    </CardContent></Card>}

    <section aria-label="Plans" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Change plan</h2>
        <div role="group" aria-label="Billing interval" className="inline-flex rounded-lg bg-muted p-1 text-sm">
          {(["Month", "Year"] as const).map(v => <button key={v} aria-pressed={interval === v} onClick={() => setInterval(v)} className={`rounded-md px-3 py-1 font-medium ${interval === v ? "bg-background shadow" : "text-muted-foreground"}`}>{v === "Month" ? "Monthly" : "Yearly"}</button>)}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map(plan => {
          const price = plan.prices.find(p => p.billingInterval === interval);
          const current = price?.id === s.planPriceId;
          if (!price) return null;
          return <Card key={plan.id} className={current ? "border-primary ring-1 ring-primary" : ""}><CardContent className="flex h-full flex-col p-6">
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{plan.name}</h3>{current && <Badge>Current</Badge>}</div>
            <p className="mt-1 text-2xl font-bold">{formatMoney(price.amount, price.currency)}<span className="text-sm font-normal text-muted-foreground"> / {interval === "Month" ? "mo" : "yr"} + GST</span></p>
            {plan.description && <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>}
            <ul className="mt-3 flex-1 space-y-1 text-sm">
              {s.limits!.map(l => { const v = plan.entitlements.find(e => e.key === l.key)?.value; return v === undefined ? null : <li key={l.key}><span className="text-muted-foreground">{l.label}:</span> <b>{describe(v, l.unit)}</b></li>; })}
            </ul>
            <Button className="mt-4" variant={current ? "outline" : "default"} disabled={busy || current} onClick={() => setConfirmPlan({ priceId: price.id, label: `${plan.name} (${interval === "Month" ? "monthly" : "yearly"})` })}>
              {current ? "Your current plan" : s.planPriceId ? "Switch to this plan" : "Choose this plan"}</Button>
          </CardContent></Card>;
        })}
      </div>
      <p className="text-xs text-muted-foreground">Upgrades start immediately; the unused part of your current period is credited. Downgrades take effect at your next renewal and need your usage to fit the smaller plan. GST at {s.taxRatePercent}% is added to every invoice.</p>
    </section>

    <Card><CardContent className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Invoices</h2>
      {invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices yet.</p> :
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2 pr-4">Invoice</th><th className="py-2 pr-4">Period</th><th className="py-2 pr-4">Total</th><th className="py-2 pr-4">Status</th><th className="py-2" /></tr></thead>
          <tbody className="divide-y">{invoices.map(i => <tr key={i.id}>
            <td className="py-2 pr-4 font-mono text-xs">{i.invoiceNumber}</td><td className="py-2 pr-4">{formatDay(i.periodStartUtc)} – {formatDay(i.periodEndUtc)}</td>
            <td className="py-2 pr-4">{formatMoney(i.total, i.currency)}</td>
            <td className="py-2 pr-4"><Badge variant={i.status === "Paid" ? "success" : i.status === "Open" ? "warning" : "muted"}>{i.status}</Badge></td>
            <td className="py-2 text-right"><Button size="sm" variant="ghost" onClick={() => { void saasTenant.downloadInvoice(i.id, i.invoiceNumber).catch(err => toast({ title: "Download failed", description: userMessage(err), variant: "error" })); }}><Download className="mr-1 h-3.5 w-3.5" />PDF</Button></td></tr>)}</tbody></table></div>}
    </CardContent></Card>

    <Card><CardContent className="p-6">
      <h2 className="mb-1 text-lg font-semibold">Billing details</h2>
      <p className="mb-4 text-sm text-muted-foreground">Printed on your invoices. Billing reminders are sent to the e-mail below.</p>
      <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="bp-legal">Legal / business name</Label><Input id="bp-legal" maxLength={200} value={profile.legalName ?? ""} onChange={e => setProfile({ ...profile, legalName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="bp-email">Billing e-mail</Label><Input id="bp-email" type="email" maxLength={256} value={profile.billingEmail ?? ""} onChange={e => setProfile({ ...profile, billingEmail: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="bp-phone">Billing phone</Label><Input id="bp-phone" maxLength={30} value={profile.billingPhone ?? ""} onChange={e => setProfile({ ...profile, billingPhone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="bp-gstin">GSTIN</Label><Input id="bp-gstin" maxLength={20} value={profile.gstin ?? ""} onChange={e => setProfile({ ...profile, gstin: e.target.value })} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="bp-address">Address</Label><Input id="bp-address" maxLength={500} value={profile.address ?? ""} onChange={e => setProfile({ ...profile, address: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="bp-state">State</Label><Input id="bp-state" maxLength={60} value={profile.state ?? ""} onChange={e => setProfile({ ...profile, state: e.target.value })} /></div>
        <div className="flex items-end"><Button disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save details</Button></div>
      </form>
    </CardContent></Card>

    <ConfirmDialog open={confirmCancel} onOpenChange={setConfirmCancel} title="Cancel your subscription?"
      description={`Your workspace stays fully available until ${formatDay(s.currentPeriodEndUtc)}. After that it is suspended, and your data is kept. You can resume any time before then.`}
      confirmLabel="Cancel at period end" onConfirm={() => { setConfirmCancel(false); void act(() => saasTenant.cancel(), "Cancellation scheduled"); }} />
    <ConfirmDialog open={!!confirmPlan} onOpenChange={o => { if (!o) setConfirmPlan(null); }} title="Change plan?"
      description={`Switch to ${confirmPlan?.label ?? ""}. An upgrade creates an invoice that you pay now; a downgrade starts at your next renewal.`}
      confirmLabel="Continue" onConfirm={() => { if (confirmPlan) void changePlan(confirmPlan.priceId); }} />
  </div>;
}
