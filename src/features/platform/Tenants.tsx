import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { platformRequest as request, type PlatformTenant as Tenant } from "@/api/platform";
import { AtSign, Building2, CheckCircle2, PauseCircle, AlertCircle, Settings2, ListTree, ExternalLink, Search, RotateCcw, Loader2, Database, Plus } from "lucide-react";

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
  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 read-only:dark:bg-white/5";
  const labelClass = "space-y-1.5 text-sm font-medium text-slate-700 dark:text-foreground";
  const visible = tenants.filter(t => `${t.name} ${t.code}`.toLowerCase().includes(search.toLowerCase()));
  const statusStyle: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Suspended: "bg-amber-50 text-amber-800 ring-amber-600/20",
    Failed: "bg-red-50 text-red-700 ring-red-600/20",
    Provisioning: "bg-blue-50 text-blue-700 ring-blue-600/20",
  };
  const action = "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-foreground";
  const stats = [
    { label: "Total tenants", count: tenants.length, icon: Building2, tone: "bg-[hsl(214_52%_20%)] text-sky-300" },
    { label: "Active", count: tenants.filter(t => t.status === "Active").length, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Suspended", count: tenants.filter(t => t.status === "Suspended").length, icon: PauseCircle, tone: "bg-amber-50 text-amber-600" },
    { label: "Needs attention", count: tenants.filter(t => t.status === "Failed" || t.status === "Provisioning").length, icon: AlertCircle, tone: "bg-red-50 text-red-600" },
  ];
  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(214_52%_20%)] via-[hsl(214_52%_28%)] to-[hsl(214_52%_20%)] p-7 text-white shadow-lg sm:p-9">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
      <h1 className="relative font-serif text-3xl font-semibold tracking-tight">Tenant management</h1>
      <p className="relative mt-2 max-w-xl text-sm leading-relaxed text-white/70">Create client workspaces and manage their lifecycle: set up, suspend, activate and sync logins.</p>
    </div>
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{stats.map(card => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
      <div className="flex items-center justify-between gap-2"><span className="text-sm text-slate-500">{card.label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}><card.icon className="h-4 w-4" /></span></div>
      <p className="mt-3 font-serif text-4xl font-semibold">{card.count}</p></div>)}</div>
    {error && <p role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
    {notice && <p role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
      <form onSubmit={create} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card sm:p-7">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(214_52%_20%)] text-sky-300">{retry ? <RotateCcw className="h-5 w-5" /> : <Plus className="h-5 w-5" />}</span>
          <div><h2 className="font-serif text-xl font-semibold">{retry ? "Retry client setup" : "Create client"}</h2><p className="text-xs text-slate-500">{retry ? "Finish setting up this workspace." : "Each client gets its own database, users and settings."}</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}><span>Client code</span><input required maxLength={50} pattern="[a-z][a-z0-9-]{2,49}" title="3–50 lowercase letters, numbers or hyphens; start with a letter" readOnly={!!retry} className={inputClass} value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} /></label>
          <label className={labelClass}><span>Client name</span><input required maxLength={200} className={inputClass} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className={`${labelClass} sm:col-span-2`}><span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" />{retry ? "Database" : "Existing database name (optional)"}</span><input maxLength={63} pattern="[a-z_][a-z0-9_]{0,62}" title="Lowercase letters, digits and underscores. Leave empty to create a new database." readOnly={!!retry} placeholder={retry ? "Uses the database already registered for this client" : "Leave empty to create a new database"} className={inputClass} value={draft.databaseName} onChange={e => setDraft({ ...draft, databaseName: e.target.value })} /><span className="block text-xs font-normal text-slate-500">{retry ? "A retry reuses the database already registered for this client. If it exists, its data is kept and only missing migrations are applied (the client then starts Suspended); the administrator email and PIN are only needed if a new database has to be created." : "If this database already exists on the server its data is kept and only missing migrations are applied; the client then starts Suspended."}</span></label>
          <label className={labelClass}><span>Administrator email{draft.databaseName.trim() || retry ? " (only for a new database)" : ""}</span><input type="email" required={!draft.databaseName.trim() && !retry} autoComplete="off" className={inputClass} value={draft.adminEmail} onChange={e => setDraft({ ...draft, adminEmail: e.target.value })} /></label>
          <label className={labelClass}><span>Initial four-digit PIN</span><input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required={!draft.databaseName.trim() && !retry} autoComplete="new-password" className={inputClass} value={draft.adminPin} onChange={e => setDraft({ ...draft, adminPin: e.target.value })} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[hsl(214_52%_20%)] px-5 py-2.5 text-sm font-semibold text-white shadow-md ring-1 ring-white/15 transition hover:bg-[hsl(214_52%_28%)] disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "Setting up client…" : retry ? "Retry setup" : "Create client"}</button>
          {retry && <button type="button" disabled={busy} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline" onClick={() => { setRetry(null); setDraft(empty); }}>Cancel retry</button>}
        </div>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10"><h2 className="font-serif text-xl font-semibold">Client workspaces</h2>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search tenants" placeholder="Search tenants…" className="w-64 rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5" value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5"><tr><th className="px-5 py-3 font-semibold">Client</th><th className="px-5 py-3 font-semibold">Code</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">{visible.map(t => <tr key={t.id} className="transition hover:bg-slate-50/70 dark:hover:bg-white/5">
            <td className="px-5 py-4 font-medium">{t.name}</td><td className="px-5 py-4 font-mono text-xs text-slate-600">{t.code}</td>
            <td className="px-5 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle[t.status] ?? "bg-slate-100 text-slate-700 ring-slate-500/20"}`}>{t.status}</span></td>
            <td className="px-5 py-4"><div className="flex flex-wrap gap-2">
              {(t.status === "Active" || t.status === "Suspended") && <><Link to={`/platform/configuration?tenant=${t.id}`} className={action}><Settings2 className="h-3 w-3" />Configure</Link><Link to={`/platform/menus?tenant=${t.id}`} className={action}><ListTree className="h-3 w-3" />Menus</Link><Link to={`/platform/email-mappings?tenant=${t.id}`} className={action}><AtSign className="h-3 w-3" />Login emails</Link></>}
              <a href={`/t/${t.code}/login`} className={action}><ExternalLink className="h-3 w-3" />Client portal</a>
              {(t.status === "Active" || t.status === "Suspended") && <button disabled={busy} className={action} onClick={() => { void toggle(t); }}>{t.status === "Active" ? "Suspend" : "Activate"}</button>}
              {t.status === "Suspended" && <button disabled={busy} className={action} onClick={() => { void synchronize(t); }}>Sync imported logins</button>}
              {(t.status === "Failed" || t.status === "Provisioning") && <button disabled={busy} className={action} onClick={() => { setRetry(t.id); setDraft({ ...empty, code: t.code, name: t.name }); window.scrollTo({ top: 0, behavior: "smooth" }); }}><RotateCcw className="h-3 w-3" />Retry setup</button>}
            </div></td></tr>)}</tbody>
        </table></div>
        {!loaded && <div role="status" aria-label="Loading clients" className="space-y-3 p-5">{[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none dark:bg-white/10" />)}</div>}
        {loaded && tenants.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No clients yet. Create your first client workspace above.</p>}
        {loaded && tenants.length > 0 && visible.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No tenants match your search.</p>}
      </section>
  </div>;
}
