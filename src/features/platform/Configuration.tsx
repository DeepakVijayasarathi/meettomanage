import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Plus, Save, Settings2 } from "lucide-react";
import PlatformShell from "./PlatformShell";
import { platformRequest } from "@/api/platform";
import type { ApiSetting, SettingCategory } from "@/api/settings";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TenantSelector, useTenantSelection } from "./TenantSelection";
import TenantIntegrations from "./TenantIntegrations";

const PORTALS = ["admin", "teacher", "parent", "subadmin", "admission", "coordinator", "management", "student"];
// Widget settings only exist in a tenant's database once someone saves them; until then the
// app treats them as "on for every portal". Show those defaults so they can be edited.
const WIDGET_DEFAULTS: Record<string, string> = {
  "widgets.floatingNotes.enabledPortals": JSON.stringify(PORTALS),
  "widgets.doubtChatbot.enabledPortals": JSON.stringify(PORTALS),
};
const isSeoKey = (key: string) => key.toLowerCase().startsWith("seo.");
const withWidgetDefaults = (list: ApiSetting[]): ApiSetting[] => [
  ...list,
  ...Object.entries(WIDGET_DEFAULTS).filter(([key]) => !list.some(s => s.key === key))
    .map(([key, value]): ApiSetting => ({ key, value, category: "Widgets", isPublic: true })),
];

const categories: SettingCategory[] = ["General", "Branding", "Notifications", "Integrations", "Widgets", "Seo"];
const categoryLabel = (category: SettingCategory) => category === "Seo" ? "SEO" : category;
const labelFor = (key: string) => key.split(".").slice(1).join(" · ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, s => s.toUpperCase()) || key;

export default function Configuration() {
  return <PlatformShell><ConfigurationPage /></PlatformShell>;
}

function ConfigurationPage() {
  const selection = useTenantSelection();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(214_52%_20%)] via-[hsl(214_52%_28%)] to-[hsl(214_52%_20%)] p-7 text-white shadow-lg sm:p-9"><div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" /><h1 className="relative font-serif text-3xl font-semibold tracking-tight">Tenant configuration</h1><p className="relative mt-2 max-w-xl text-sm leading-relaxed text-white/70">Manage organization details, branding, notifications, and workspace preferences for each client.</p></div>
    <TenantSelector {...selection} disabled={saving} onChange={id => { if (dirty) setPending(id); else selection.select(id); }} />
    {selection.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{selection.error}</p>}
    {!selection.loading && selection.tenants.length === 0 && !selection.error && <p className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-8 text-muted-foreground">Create and provision a tenant before configuring its workspace.</p>}
    {selection.tenant && <ConfigurationEditor key={selection.tenant.id} tenantId={selection.tenant.id} token={selection.token} onDirty={setDirty} onSaving={setSaving} />}
    <ConfirmDialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }} title="Discard unsaved configuration?" description="Your changes have not been saved. Switch to the other tenant and discard them?" confirmLabel="Discard and switch" onConfirm={() => { if (pending) selection.select(pending); setDirty(false); setPending(null); }} />
  </div>;
}

function ConfigurationEditor({ tenantId, token, onDirty, onSaving }: { tenantId: string; token: string; onDirty: (dirty: boolean) => void; onSaving: (saving: boolean) => void }) {
  const [settings, setSettings] = useState<ApiSetting[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<SettingCategory>("General");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const endpoint = `/tenants/${tenantId}/configuration`;
  const changed = settings.filter(setting => newKeys.has(setting.key) || draft[setting.key] !== (setting.value ?? ""));
  useEffect(() => { onDirty(changed.length > 0); }, [changed.length, onDirty]);
  useEffect(() => {
    const controller = new AbortController();
    // seo.* settings are served from their own endpoint (hidden from the general list on purpose).
    Promise.all([
      platformRequest<ApiSetting[]>(endpoint, token, "GET", undefined, controller.signal),
      platformRequest<ApiSetting[]>(`/tenants/${tenantId}/seo`, token, "GET", undefined, controller.signal),
    ]).then(([general, seo]) => withWidgetDefaults([...general, ...seo.filter(s => isSeoKey(s.key))])).then(result => {
      setSettings(result); setDraft(Object.fromEntries(result.map(s => [s.key, s.value ?? ""])));
    }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load settings."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, token]);
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); onSaving(true); setError(""); setNotice("");
    try {
      const updates = changed.map(s => ({ ...s, value: draft[s.key] }));
      const general = updates.filter(s => !isSeoKey(s.key)), seo = updates.filter(s => isSeoKey(s.key));
      const generalResult = general.length
        ? await platformRequest<ApiSetting[]>(endpoint, token, "PUT", general)
        : settings.filter(s => !isSeoKey(s.key));
      const seoResult = seo.length
        ? await platformRequest<ApiSetting[]>(`/tenants/${tenantId}/seo`, token, "PUT", seo)
        : settings.filter(s => isSeoKey(s.key));
      const result = withWidgetDefaults([...generalResult.filter(s => !isSeoKey(s.key)), ...seoResult.filter(s => isSeoKey(s.key))]);
      setSettings(result); setDraft(Object.fromEntries(result.map(s => [s.key, s.value ?? ""]))); setNotice("Tenant configuration saved.");
      setNewKeys(new Set());
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save configuration."); }
    finally { setSaving(false); onSaving(false); }
  }
  function addSetting(event: FormEvent) {
    event.preventDefault(); const key = newKey.trim();
    if (!key || key.length > 100 || key === "storage.provider" || settings.some(s => s.key === key)) { setError("Use a unique setting key. Manage storage provider changes from the client's File storage page."); return; }
    setSettings(previous => [...previous, { key, value: null, category, isPublic: false }]);
    setNewKeys(previous => new Set([...previous, key]));
    setDraft(previous => ({ ...previous, [key]: newValue }));
    setNewKey(""); setNewValue(""); setAdding(false); setError("");
  }
  if (loading) return <div role="status" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading tenant configuration…</div>;
  return <div className="space-y-4">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card"><div className="flex flex-wrap gap-1 border-b p-3" role="tablist" aria-label="Configuration categories">{categories.map(item => <button key={item} role="tab" type="button" aria-selected={category === item} onClick={() => setCategory(item)} className={`rounded-lg px-4 py-2 text-sm font-medium ${category === item ? "bg-[hsl(214_52%_20%)] text-white ring-1 ring-white/15" : "text-muted-foreground hover:bg-muted"}`}>{categoryLabel(item)}</button>)}</div>
      {category === "Integrations" ? <TenantIntegrations tenantId={tenantId} token={token} /> :
      <form onSubmit={save}><div className="flex items-center justify-between gap-4 border-b p-5"><div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-muted-foreground" /><div><h2 className="font-semibold">{categoryLabel(category)} settings</h2><p className="mt-1 text-xs text-muted-foreground">Changes affect the selected tenant only.</p></div></div><button type="button" onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><Plus className="h-4 w-4" />Add setting</button></div>
        <div className="divide-y">{settings.filter(s => s.category === category).map(setting => <div key={setting.key} className="grid gap-3 p-5 md:grid-cols-[minmax(180px,1fr)_minmax(0,1.4fr)]"><div><label htmlFor={`setting-${setting.key}`} className="text-sm font-medium">{labelFor(setting.key)}</label><p className="mt-1 break-all text-xs text-muted-foreground">{setting.key}{setting.isPublic && <span className="ml-2 rounded bg-blue-50 px-1.5 text-blue-700">Public</span>}</p></div>
          {setting.value === "true" || setting.value === "false" ? <label className="flex items-center gap-3 text-sm"><input id={`setting-${setting.key}`} type="checkbox" checked={draft[setting.key] === "true"} disabled={saving} onChange={e => setDraft({ ...draft, [setting.key]: String(e.target.checked) })} className="h-4 w-4 accent-blue-600" />{draft[setting.key] === "true" ? "Enabled" : "Disabled"}</label>
            : <textarea id={`setting-${setting.key}`} maxLength={2000} rows={(draft[setting.key]?.length ?? 0) > 100 ? 3 : 1} disabled={saving || setting.key === "storage.provider"} className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 text-sm disabled:bg-muted" value={draft[setting.key] ?? ""} onChange={e => setDraft({ ...draft, [setting.key]: e.target.value })} />}
        </div>)}{settings.filter(s => s.category === category).length === 0 && <p className="p-8 text-sm text-muted-foreground">No settings in this category yet. Add one to customize this tenant.</p>}</div>
        <div className="flex items-center justify-between gap-4 border-t bg-muted/20 p-4"><span className="text-sm text-muted-foreground">{changed.length ? `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}` : "All changes saved"}</span><button disabled={saving || changed.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-[hsl(214_52%_20%)] ring-1 ring-white/15 hover:bg-[hsl(214_52%_28%)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save configuration</button></div>
      </form>}
    </div>
    {adding && <form onSubmit={addSetting} className="space-y-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-5"><h3 className="font-semibold">Add a {categoryLabel(category).toLowerCase()} setting</h3><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Setting key</span><input required maxLength={100} placeholder="org.customPreference" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5" value={newKey} onChange={e => setNewKey(e.target.value)} /></label><label className="space-y-1 text-sm"><span>Value</span><input maxLength={2000} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5" value={newValue} onChange={e => setNewValue(e.target.value)} /></label></div><button type="submit" className="rounded-lg border px-4 py-2 text-sm font-medium">Add to configuration</button></form>}
  </div>;
}
