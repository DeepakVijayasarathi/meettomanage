import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { platformRequest as request, type PlatformTenant as Tenant } from "@/api/platform";
import { Building2, CheckCircle2, PauseCircle, AlertCircle, Settings2, ListTree } from "lucide-react";

type Draft = { code: string; name: string; adminEmail: string; adminPin: string };
const empty: Draft = { code: "", name: "", adminEmail: "", adminPin: "" };

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
  const refresh = useCallback(async () => {
    if (!token) return;
    try { setTenants(await request<Tenant[]>("/tenants", token)); }
    catch (err) {
      setError(err instanceof Error ? err.message : "Could not load clients.");
    }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await request(retry ? `/tenants/${retry}/retry` : "/tenants", token, "POST", draft);
      setNotice(`${draft.name} is ready. Its administrator can sign in using the email and PIN you supplied.`);
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
      await request(`/tenants/${tenant.id}/synchronize-logins`, token, "POST");
      setNotice(`Login directory synchronized for ${tenant.name}. You can activate this client when the import is ready.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not synchronize logins."); }
    finally { setBusy(false); }
  }
  const inputClass = "w-full rounded-md border bg-background px-3 py-2";
  const visible = tenants.filter(t => `${t.name} ${t.code}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold tracking-tight">Tenant management</h1><p className="mt-2 text-muted-foreground">Create client workspaces and manage their lifecycle.</p></div>
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[
      { label: "Total tenants", count: tenants.length, icon: Building2 },
      { label: "Active", count: tenants.filter(t => t.status === "Active").length, icon: CheckCircle2 },
      { label: "Suspended", count: tenants.filter(t => t.status === "Suspended").length, icon: PauseCircle },
      { label: "Needs attention", count: tenants.filter(t => t.status === "Failed" || t.status === "Provisioning").length, icon: AlertCircle },
    ].map(card => <div key={card.label} className="rounded-2xl border bg-background p-5"><div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{card.label}<card.icon className="h-4 w-4" /></div><p className="mt-3 text-3xl font-semibold">{card.count}</p></div>)}</div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <form onSubmit={create} className="space-y-4 rounded-2xl border bg-background p-6">
        <h2 className="text-lg font-medium">{retry ? "Retry client setup" : "Create client"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1"><span>Client code</span><input required maxLength={50} pattern="[a-z][a-z0-9-]{2,49}" title="3–50 lowercase letters, numbers or hyphens; start with a letter" readOnly={!!retry} className={inputClass} value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} /></label>
          <label className="space-y-1"><span>Client name</span><input required maxLength={200} className={inputClass} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="space-y-1"><span>Administrator email</span><input type="email" required autoComplete="off" className={inputClass} value={draft.adminEmail} onChange={e => setDraft({ ...draft, adminEmail: e.target.value })} /></label>
          <label className="space-y-1"><span>Initial four-digit PIN</span><input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" className={inputClass} value={draft.adminPin} onChange={e => setDraft({ ...draft, adminPin: e.target.value })} /></label>
        </div>
        <button disabled={busy} className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? "Setting up client…" : retry ? "Retry setup" : "Create client"}</button>
        {retry && <button type="button" disabled={busy} className="ml-4 underline" onClick={() => { setRetry(null); setDraft(empty); }}>Cancel retry</button>}
      </form>
      <section className="overflow-x-auto rounded-2xl border bg-background"><div className="flex items-center justify-between gap-4 border-b p-4"><h2 className="font-semibold">Client workspaces</h2><input aria-label="Search tenants" placeholder="Search tenants?" className="rounded-lg border bg-background px-3 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} /></div><table className="w-full text-left"><caption className="sr-only">Clients</caption>
        <thead><tr className="border-b"><th className="p-3">Client</th><th className="p-3">Code</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
        <tbody>{visible.map(t => <tr key={t.id} className="border-b"><td className="p-3">{t.name}</td><td className="p-3">{t.code}</td><td className="p-3">{t.status}</td><td className="space-x-4 p-3">
          {(t.status === "Active" || t.status === "Suspended") && <><Link to={`/platform/configuration?tenant=${t.id}`} className="inline-flex items-center gap-1 text-sm underline"><Settings2 className="h-3 w-3" />Configure</Link><Link to={`/platform/menus?tenant=${t.id}`} className="inline-flex items-center gap-1 text-sm underline"><ListTree className="h-3 w-3" />Menus</Link></>}
          <a href={`/t/${t.code}/login`} className="underline">Client portal</a>
          {(t.status === "Active" || t.status === "Suspended") && <button disabled={busy} className="underline" onClick={() => { void toggle(t); }}>{t.status === "Active" ? "Suspend" : "Activate"}</button>}
          {t.status === "Suspended" && <button disabled={busy} className="underline" onClick={() => { void synchronize(t); }}>Sync imported logins</button>}
          {(t.status === "Failed" || t.status === "Provisioning") && <button disabled={busy} className="underline" onClick={() => { setRetry(t.id); setDraft({ ...empty, code: t.code, name: t.name }); }}>Retry setup</button>}
        </td></tr>)}</tbody>
      </table>{tenants.length === 0 && <p className="p-4 text-muted-foreground">No clients yet.</p>}</section>
  </div>;
}
