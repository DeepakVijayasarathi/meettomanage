import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AtSign, Building2, Check, Copy, CreditCard, Database, ExternalLink, ListTree, Loader2,
  MoreHorizontal, PauseCircle, Play, Plus, RefreshCw, RotateCcw, Search, Settings2, Users,
} from "lucide-react";

import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { platformRequest as request, type PlatformTenant as Tenant } from "@/api/platform";
import { saasPlatform, formatDay, formatMoney, type PlanView, type SubscriptionRow } from "@/api/saas";
import { tenantLoginUrl } from "@/lib/tenantDiscovery";
import { ConsoleHeader, Pill, Segmented, StatStrip, panel } from "./saasUi";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type Draft = { code: string; name: string; databaseName: string; adminEmail: string; adminPin: string; planCode: string };
const empty: Draft = { code: "", name: "", databaseName: "", adminEmail: "", adminPin: "", planCode: "" };

type Filter = "all" | "active" | "suspended" | "setup";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" }, { id: "active", label: "Active" }, { id: "suspended", label: "Suspended" }, { id: "setup", label: "Needs setup" },
];


const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
const needsSetup = (t: Tenant) => t.status === "Failed" || t.status === "Provisioning";
const isLive = (t: Tenant) => t.status === "Active" || t.status === "Suspended";

/** One-line billing summary for a tenant card. */
function billingLine(s: SubscriptionRow): string {
  if (s.status === "Trialing") return `Trial ends ${formatDay(s.trialEndsAtUtc)}`;
  if (s.status === "PastDue") return `Payment overdue, suspends ${formatDay(s.graceEndsAtUtc)}`;
  if (s.status === "Expired") return "Trial ended";
  if (s.cancelAtPeriodEnd) return `Ends ${formatDay(s.currentPeriodEndUtc)}`;
  if (s.currentPeriodEndUtc) return `Renews ${formatDay(s.currentPeriodEndUtc)}`;
  return "No renewal";
}

export default function Tenants() {
  return <PlatformShell><TenantManagement /></PlatformShell>;
}

function TenantManagement() {
  const { token } = usePlatformAdmin();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subs, setSubs] = useState<Record<string, SubscriptionRow>>({});
  const [plans, setPlans] = useState<PlanView[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [retry, setRetry] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    try { setTenants(await request<Tenant[]>("/tenants", token)); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load clients."); }
    finally { setLoaded(true); }
    // Billing details enrich the cards; the page still works without them.
    try { setSubs(Object.fromEntries((await saasPlatform.subscriptions(token)).map(s => [s.tenantId, s]))); } catch { setSubs({}); }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (token) void saasPlatform.plans(token).then(setPlans).catch(() => setPlans([])); }, [token]);

  const copyUrl = async (tenant: Tenant) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${tenantLoginUrl(tenant.code)}`);
      setCopied(tenant.id); setTimeout(() => setCopied(c => (c === tenant.id ? null : c)), 2000);
    } catch { setError("Could not copy the URL to the clipboard."); }
  };

  function openCreate() { setRetry(null); setDraft(empty); setFormError(""); setDialogOpen(true); }
  function openRetry(tenant: Tenant) { setRetry(tenant.id); setDraft({ ...empty, code: tenant.code, name: tenant.name }); setFormError(""); setDialogOpen(true); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setFormError(""); setError(""); setNotice("");
    try {
      const body = {
        ...draft, databaseName: draft.databaseName.trim() || undefined, adminEmail: draft.adminEmail.trim() || undefined,
        adminPin: draft.adminPin || undefined, planCode: draft.planCode || undefined,
      };
      const created = await request<{ status?: string }>(retry ? `/tenants/${retry}/retry` : "/tenants", token, "POST", body);
      setNotice(created?.status === "Suspended"
        ? `${draft.name} was linked to its existing database and migrated. It is Suspended: use "Sync imported logins", then activate it.`
        : `${draft.name} is ready. Its administrator can sign in using the email and PIN you supplied.`);
      setDialogOpen(false); setDraft(empty); setRetry(null);
    } catch (err) { setFormError(err instanceof Error ? err.message : "Provisioning failed."); }
    finally { setBusy(false); await refresh(); }
  }

  async function run(work: () => Promise<unknown>, failure: string, success?: string) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); if (success) setNotice(success); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : failure); }
    finally { setBusy(false); }
  }
  const toggle = (t: Tenant) => run(() => request(`/tenants/${t.id}/status`, token, "PUT", { suspended: t.status === "Active" }), "Could not change client status.");
  const synchronize = (t: Tenant) => run(async () => {
    const result = await request<{ skippedPhones?: string[] }>(`/tenants/${t.id}/synchronize-logins`, token, "POST");
    const skipped = result?.skippedPhones ?? [];
    setNotice(`Login directory synchronized for ${t.name}.`
      + (skipped.length ? ` ${skipped.length} phone number${skipped.length === 1 ? " is" : "s are"} shared by several users and was left unregistered (those users can still sign in with their email): ${skipped.map(k => k.replace("phone:", "")).join(", ")}.` : "")
      + " You can activate this client when the import is ready.");
  }, "Could not synchronize logins.");

  const counts = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(t => t.status === "Active").length,
    trial: tenants.filter(t => subs[t.id]?.status === "Trialing").length,
    attention: tenants.filter(t => needsSetup(t) || t.status === "Suspended" || subs[t.id]?.status === "PastDue").length,
  }), [tenants, subs]);

  const visible = tenants.filter(t => {
    if (!`${t.name} ${t.code}`.toLowerCase().includes(search.toLowerCase())) return false;
    return filter === "all" || (filter === "active" && t.status === "Active") || (filter === "suspended" && t.status === "Suspended") || (filter === "setup" && needsSetup(t));
  });

  const newDatabase = !draft.databaseName.trim() && !retry;
  const sellable = plans.filter(p => p.isActive);

  return <div className="space-y-6">
    <ConsoleHeader title="Tenant management"
      description="Create client workspaces, see where each one stands on its plan, and manage their lifecycle from one place."
      actions={<>
        <Button asChild variant="outline"><Link to="/platform/email-mappings"><AtSign />Simple SSO</Link></Button>
        <Button onClick={openCreate}><Plus />New client</Button>
      </>} />

    <StatStrip items={[
      { label: "Total clients", value: loaded ? counts.total : "–" },
      { label: "Active", value: loaded ? counts.active : "–", tone: "good" },
      { label: "On free trial", value: loaded ? counts.trial : "–" },
      { label: "Needs attention", value: loaded ? counts.attention : "–", hint: "Suspended, overdue or not set up", tone: counts.attention > 0 ? "warn" : "default" },
    ]} />

    {error && <InlineAlert variant="error" bordered>{error}</InlineAlert>}
    {notice && <InlineAlert variant="success" bordered>{notice}</InlineAlert>}

    <section className={`${panel} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-6">
        <Segmented label="Filter clients" options={FILTERS} value={filter} onChange={setFilter} />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search tenants" placeholder="Search by name or code…" className="bg-card pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {!loaded && <div role="status" aria-label="Loading clients" className="space-y-3 p-6">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>}

      {loaded && tenants.length === 0 && <div className="p-8"><EmptyState icon={Building2} title="No clients yet"
        description="Each client gets its own workspace, database, users and settings. Create the first one to get started."
        action={<Button onClick={openCreate}><Plus />Create your first client</Button>} /></div>}

      {loaded && tenants.length > 0 && visible.length === 0 && <div className="p-8"><EmptyState icon={Search} title="No clients match"
        description="Try a different search or filter." action={<Button variant="outline" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</Button>} /></div>}

      <ul className="divide-y divide-border">
        {visible.map(t => {
          const sub = subs[t.id];
          return <li key={t.id} className="grid gap-4 px-4 py-5 transition-colors hover:bg-muted/30 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <span aria-hidden className="console-serif flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-base font-semibold text-primary">{initials(t.name)}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[15px] font-semibold">{t.name}</h3>
                  <Pill value={t.status} />
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-mono">{t.code}</span><span aria-hidden>·</span>
                  <a href={tenantLoginUrl(t.code)} className="min-w-0 truncate font-mono text-primary underline-offset-4 hover:underline">{tenantLoginUrl(t.code)}</a>
                  <Button type="button" variant="ghost" size="iconSm" aria-label={`Copy URL for ${t.name}`} title="Copy URL" onClick={() => { void copyUrl(t); }}>
                    {copied === t.id ? <Check className="text-success" /> : <Copy />}</Button>
                </div>
              </div>
            </div>

            <div className="min-w-0 text-sm">
              {sub ? <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-medium"><CreditCard className="h-3.5 w-3.5 text-muted-foreground" />{sub.planName}</span>
                  {sub.price && <span className="text-muted-foreground">{formatMoney(sub.price.amount, sub.price.currency)}/{sub.price.interval === "Month" ? "mo" : "yr"}</span>}
                  <Pill value={sub.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{billingLine(sub)}{sub.usage && <><span aria-hidden> · </span><Users className="mb-0.5 inline h-3 w-3" /> {sub.usage.activeStudents} students · {sub.usage.staffCount} staff</>}</p>
              </> : <p className="text-xs text-muted-foreground">{isLive(t) ? "No plan information yet." : "Finish setup to assign a plan."}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {isLive(t) && <Button asChild size="sm"><a href={tenantLoginUrl(t.code)}><ExternalLink />Open portal</a></Button>}
              {isLive(t) && <Button asChild size="sm" variant="outline"><Link to={`/platform/configuration?tenant=${t.id}`}><Settings2 />Configure</Link></Button>}
              {needsSetup(t) && <Button size="sm" disabled={busy} onClick={() => openRetry(t)}><RotateCcw />Retry setup</Button>}
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" aria-label={`More actions for ${t.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isLive(t) && <>
                    <DropdownMenuItem asChild><Link to={`/platform/menus?tenant=${t.id}`}><ListTree className="h-4 w-4" />Menus</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to={`/platform/email-mappings?tenant=${t.id}`}><AtSign className="h-4 w-4" />Simple SSO</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/platform/subscriptions"><CreditCard className="h-4 w-4" />Subscription &amp; invoices</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>}
                  <DropdownMenuItem onSelect={() => { void copyUrl(t); }}><Copy className="h-4 w-4" />Copy sign-in URL</DropdownMenuItem>
                  {isLive(t) && <DropdownMenuItem disabled={busy} onSelect={() => { void toggle(t); }}>
                    {t.status === "Active" ? <><PauseCircle className="h-4 w-4" />Suspend client</> : <><Play className="h-4 w-4" />Activate client</>}</DropdownMenuItem>}
                  {t.status === "Suspended" && <DropdownMenuItem disabled={busy} onSelect={() => { void synchronize(t); }}><RefreshCw className="h-4 w-4" />Sync imported logins</DropdownMenuItem>}
                  {needsSetup(t) && <DropdownMenuItem disabled={busy} onSelect={() => openRetry(t)}><RotateCcw className="h-4 w-4" />Retry setup</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>;
        })}
      </ul>
    </section>

    <Dialog open={dialogOpen} onOpenChange={o => { if (!busy) setDialogOpen(o); }}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{retry ? "Retry client setup" : "Create client"}</DialogTitle>
            <DialogDescription>{retry ? "Finish setting up this workspace." : "Each client gets its own database, users and settings."}</DialogDescription>
          </DialogHeader>
          {formError && <InlineAlert variant="error" bordered>{formError}</InlineAlert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="tenant-code">Client code</Label><Input id="tenant-code" required maxLength={50} pattern="[a-z][a-z0-9-]{2,49}" title="3–50 lowercase letters, numbers or hyphens; start with a letter" readOnly={!!retry} value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tenant-name">Client name</Label><Input id="tenant-name" required maxLength={200} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tenant-database" className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" />{retry ? "Database" : "Existing database name (optional)"}</Label>
              <Input id="tenant-database" maxLength={63} pattern="[a-z_][a-z0-9_]{0,62}" title="Lowercase letters, digits and underscores. Leave empty to create a new database." readOnly={!!retry} placeholder={retry ? "Uses the database already registered for this client" : "Leave empty to create a new database"} value={draft.databaseName} onChange={e => setDraft({ ...draft, databaseName: e.target.value })} />
              <p className="text-xs text-muted-foreground">{retry ? "A retry reuses the database already registered for this client. If it exists, its data is kept and only missing migrations are applied (the client then starts Suspended); the administrator email and PIN are only needed if a new database has to be created." : "If this database already exists on the server its data is kept and only missing migrations are applied; the client then starts Suspended."}</p>
            </div>
            <div className="space-y-1.5"><Label htmlFor="tenant-admin-email">Administrator email{newDatabase ? "" : " (only for a new database)"}</Label><Input id="tenant-admin-email" type="email" required={newDatabase} autoComplete="off" value={draft.adminEmail} onChange={e => setDraft({ ...draft, adminEmail: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tenant-admin-pin">Initial four-digit PIN</Label><Input id="tenant-admin-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required={newDatabase} autoComplete="new-password" value={draft.adminPin} onChange={e => setDraft({ ...draft, adminPin: e.target.value })} /></div>
            {sellable.length > 0 && <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tenant-plan">Starting plan</Label>
              <select id="tenant-plan" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={draft.planCode} onChange={e => setDraft({ ...draft, planCode: e.target.value })}>
                <option value="">Default ({draft.databaseName.trim() ? "legacy, unlimited" : "free trial"})</option>
                {sellable.map(p => <option key={p.id} value={p.code}>{p.name}{p.trialDays > 0 ? ` (${p.trialDays}-day trial)` : ""}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">A paid plan chosen here is complimentary until you invoice it from Subscriptions &amp; invoices.</p>
            </div>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={busy}>{busy && <Loader2 className="animate-spin" />}{busy ? "Setting up client…" : retry ? "Retry setup" : "Create client"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
