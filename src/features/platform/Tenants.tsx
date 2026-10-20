import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { platformRequest as request, type PlatformTenant as Tenant } from "@/api/platform";
import { tenantLoginUrl } from "@/lib/tenantDiscovery";
import { AtSign, Copy, Check, Building2, CheckCircle2, PauseCircle, AlertCircle, Settings2, ListTree, ExternalLink, Search, RotateCcw, Loader2, Database, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type Draft = { code: string; name: string; databaseName: string; adminEmail: string; adminPin: string };
const empty: Draft = { code: "", name: "", databaseName: "", adminEmail: "", adminPin: "" };

export default function Tenants() {
  return <PlatformShell><TenantManagement /></PlatformShell>;
}

function TenantManagement() {
  const { token } = usePlatformAdmin();
  const [search, setSearch] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [retry, setRetry] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const portalUrl = (code: string) => `${window.location.origin}${tenantLoginUrl(code)}`;
  async function copyUrl(tenant: Tenant) {
    try { await navigator.clipboard.writeText(portalUrl(tenant.code)); setCopied(tenant.id); setTimeout(() => setCopied(c => c === tenant.id ? null : c), 2000); }
    catch { setError("Could not copy the URL to the clipboard."); }
  }
  const refresh = useCallback(async () => {
    if (!token) return;
    try { setTenants(await request<Tenant[]>("/tenants", token)); }
    catch (err) {
      setError(err instanceof Error ? err.message : "Could not load clients.");
    }
    finally { setLoaded(true); }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const body = { ...draft, databaseName: draft.databaseName.trim() || undefined,
        adminEmail: draft.adminEmail.trim() || undefined, adminPin: draft.adminPin || undefined };
      const created = await request<{ status?: string }>(retry ? `/tenants/${retry}/retry` : "/tenants", token, "POST", body);
      setNotice(created?.status === "Suspended"
        ? `${draft.name} was linked to its existing database and migrated. It is Suspended: use "Sync imported logins", then activate it.`
        : `${draft.name} is ready. Its administrator can sign in using the email and PIN you supplied.`);
      setDraft(empty); setRetry(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Provisioning failed."); }
    finally { setBusy(false); await refresh(); }
  }
  async function toggle(tenant: Tenant) {
    setBusy(true); setError("");
    try { await request(`/tenants/${tenant.id}/status`, token, "PUT", { suspended: tenant.status === "Active" }); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not change client status."); }
    finally { setBusy(false); }
  }
  async function synchronize(tenant: Tenant) {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request<{ skippedPhones?: string[] }>(`/tenants/${tenant.id}/synchronize-logins`, token, "POST");
      const skipped = result?.skippedPhones ?? [];
      setNotice(`Login directory synchronized for ${tenant.name}.`
        + (skipped.length ? ` ${skipped.length} phone number${skipped.length === 1 ? " is" : "s are"} shared by several users and was left unregistered (those users can still sign in with their email): ${skipped.map(k => k.replace("phone:", "")).join(", ")}.` : "")
        + " You can activate this client when the import is ready.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not synchronize logins."); }
    finally { setBusy(false); }
  }
  const visible = tenants.filter(t => `${t.name} ${t.code}`.toLowerCase().includes(search.toLowerCase()));
  const statusVariant: Record<string, BadgeProps["variant"]> = { Active: "success", Suspended: "warning", Failed: "destructive", Provisioning: "default" };
  const active = (t: Tenant) => t.status === "Active" || t.status === "Suspended";
  const newDatabase = !draft.databaseName.trim() && !retry;
  return <div>
    <PageHeader eyebrow="Platform" title="Tenant management" description="Create client workspaces, manage their lifecycle, and configure Simple SSO email routing from one place." />
    <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard label="Total tenants" value={String(tenants.length)} icon={Building2} loading={!loaded} />
      <KpiCard label="Active" value={String(tenants.filter(t => t.status === "Active").length)} icon={CheckCircle2} tone="success" loading={!loaded} />
      <KpiCard label="Suspended" value={String(tenants.filter(t => t.status === "Suspended").length)} icon={PauseCircle} tone="warning" loading={!loaded} />
      <KpiCard label="Needs attention" value={String(tenants.filter(t => t.status === "Failed" || t.status === "Provisioning").length)} icon={AlertCircle} tone="destructive" loading={!loaded} />
    </div>
    <div className="space-y-6">
      {error && <InlineAlert variant="error" bordered>{error}</InlineAlert>}
      {notice && <InlineAlert variant="success" bordered>{notice}</InlineAlert>}
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{retry ? <RotateCcw className="h-5 w-5" /> : <Plus className="h-5 w-5" />}</span>
          <div><CardTitle>{retry ? "Retry client setup" : "Create client"}</CardTitle><CardDescription className="mt-1">{retry ? "Finish setting up this workspace." : "Each client gets its own database, users and settings."}</CardDescription></div>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="tenant-code">Client code</Label><Input id="tenant-code" required maxLength={50} pattern="[a-z][a-z0-9-]{2,49}" title="3–50 lowercase letters, numbers or hyphens; start with a letter" readOnly={!!retry} value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="tenant-name">Client name</Label><Input id="tenant-name" required maxLength={200} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="tenant-database" className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" />{retry ? "Database" : "Existing database name (optional)"}</Label><Input id="tenant-database" maxLength={63} pattern="[a-z_][a-z0-9_]{0,62}" title="Lowercase letters, digits and underscores. Leave empty to create a new database." readOnly={!!retry} placeholder={retry ? "Uses the database already registered for this client" : "Leave empty to create a new database"} value={draft.databaseName} onChange={e => setDraft({ ...draft, databaseName: e.target.value })} /><p className="text-xs text-muted-foreground">{retry ? "A retry reuses the database already registered for this client. If it exists, its data is kept and only missing migrations are applied (the client then starts Suspended); the administrator email and PIN are only needed if a new database has to be created." : "If this database already exists on the server its data is kept and only missing migrations are applied; the client then starts Suspended."}</p></div>
              <div className="space-y-1.5"><Label htmlFor="tenant-admin-email">Administrator email{newDatabase ? "" : " (only for a new database)"}</Label><Input id="tenant-admin-email" type="email" required={newDatabase} autoComplete="off" value={draft.adminEmail} onChange={e => setDraft({ ...draft, adminEmail: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="tenant-admin-pin">Initial four-digit PIN</Label><Input id="tenant-admin-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required={newDatabase} autoComplete="new-password" value={draft.adminPin} onChange={e => setDraft({ ...draft, adminPin: e.target.value })} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={busy}>{busy && <Loader2 className="animate-spin" />}{busy ? "Setting up client…" : retry ? "Retry setup" : "Create client"}</Button>
              {retry && <Button type="button" variant="ghost" disabled={busy} onClick={() => { setRetry(null); setDraft(empty); }}>Cancel retry</Button>}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5"><CardTitle>Client workspaces</CardTitle>
          <div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search tenants" placeholder="Search tenants…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Client</th><th className="px-5 py-3 font-semibold">Code</th><th className="px-5 py-3 font-semibold">URL</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Actions</th></tr></thead>
          <tbody className="divide-y divide-border">{visible.map(t => <tr key={t.id} className="transition-colors hover:bg-muted/40">
            <td className="px-5 py-4 font-medium">{t.name}</td><td className="px-5 py-4 font-mono text-xs text-muted-foreground">{t.code}</td>
            <td className="px-5 py-4"><div className="flex items-center gap-1"><a href={tenantLoginUrl(t.code)} className="font-mono text-xs text-primary underline-offset-4 hover:underline">{tenantLoginUrl(t.code)}</a><Button type="button" variant="ghost" size="iconSm" aria-label={`Copy URL for ${t.name}`} title="Copy URL" onClick={() => { void copyUrl(t); }}>{copied === t.id ? <Check className="text-success" /> : <Copy />}</Button></div></td>
            <td className="px-5 py-4"><Badge variant={statusVariant[t.status] ?? "muted"}>{t.status}</Badge></td>
            <td className="px-5 py-4"><div className="flex flex-wrap gap-2">
              {active(t) && <>
                <Button asChild size="sm" variant="outline"><Link to={`/platform/configuration?tenant=${t.id}`}><Settings2 />Configure</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to={`/platform/menus?tenant=${t.id}`}><ListTree />Menus</Link></Button>
                <Button asChild size="sm" variant="soft"><Link to={`/platform/email-mappings?tenant=${t.id}`}><AtSign />Simple SSO</Link></Button>
              </>}
              <Button asChild size="sm" variant="outline"><a href={tenantLoginUrl(t.code)}><ExternalLink />Client portal</a></Button>
              {active(t) && <Button size="sm" variant="outline" disabled={busy} onClick={() => { void toggle(t); }}>{t.status === "Active" ? "Suspend" : "Activate"}</Button>}
              {t.status === "Suspended" && <Button size="sm" variant="outline" disabled={busy} onClick={() => { void synchronize(t); }}>Sync imported logins</Button>}
              {(t.status === "Failed" || t.status === "Provisioning") && <Button size="sm" variant="outline" disabled={busy} onClick={() => { setRetry(t.id); setDraft({ ...empty, code: t.code, name: t.name }); window.scrollTo({ top: 0, behavior: "smooth" }); }}><RotateCcw />Retry setup</Button>}
            </div></td></tr>)}</tbody>
        </table></div>
        {!loaded && <div role="status" aria-label="Loading clients" className="space-y-3 p-5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-10" />)}</div>}
        {loaded && tenants.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No clients yet. Create your first client workspace above.</p>}
        {loaded && tenants.length > 0 && visible.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No tenants match your search.</p>}
      </Card>
    </div>
  </div>;
}
