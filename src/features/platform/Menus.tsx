import { useEffect, useState, type FormEvent } from "react";
import { Eye, ListTree, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { platformRequest } from "@/api/platform";
import { MENU_ICONS, resolveMenuIcon, type ApiMenuItem, type SaveMenuItemRequest } from "@/api/menus";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import PlatformShell from "./PlatformShell";
import { TenantSelector, useTenantSelection } from "./TenantSelection";

const portals = ["admin", "teacher", "parent", "subadmin", "admission", "coordinator", "management", "student", "itadmin", "executive"];
const empty = (portal: string): SaveMenuItemRequest => ({ portal, section: "", sectionOrder: 0, label: "", path: `/${portal}/`, icon: "LayoutDashboard", sortOrder: 0, isActive: true, requiredModule: null });

export default function Menus() { return <PlatformShell><MenusPage /></PlatformShell>; }

function MenusPage() {
  const selection = useTenantSelection();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1437] via-[#14205a] to-[#0B1437] p-7 text-white shadow-lg sm:p-9"><div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#D4AF37]/20 blur-3xl" /><h1 className="relative font-serif text-3xl font-semibold tracking-tight">Menu management</h1><p className="relative mt-2 max-w-xl text-sm leading-relaxed text-white/70">Organize each tenant's navigation, portal visibility, and permission gates.</p></div>
    <TenantSelector {...selection} disabled={saving} onChange={id => { if (dirty) setPending(id); else selection.select(id); }} />
    {selection.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{selection.error}</p>}
    {!selection.loading && selection.tenants.length === 0 && !selection.error && <p className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-8 text-muted-foreground">Create and provision a tenant before managing its menus.</p>}
    {selection.tenant && <MenuEditor key={selection.tenant.id} tenantId={selection.tenant.id} token={selection.token} onDirty={setDirty} onSaving={setSaving} />}
    <ConfirmDialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }} title="Discard this menu draft?" description="Switching tenants will discard the unsaved menu changes." confirmLabel="Discard and switch" onConfirm={() => { if (pending) selection.select(pending); setDirty(false); setPending(null); }} />
  </div>;
}

function MenuEditor({ tenantId, token, onDirty, onSaving }: { tenantId: string; token: string; onDirty: (dirty: boolean) => void; onSaving: (saving: boolean) => void }) {
  const [items, setItems] = useState<ApiMenuItem[]>([]);
  const [modules, setModules] = useState<{ key: string; label: string }[]>([]);
  const [portal, setPortal] = useState("admin");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<SaveMenuItemRequest | null>(null);
  const [baseline, setBaseline] = useState("");
  const [deleting, setDeleting] = useState<ApiMenuItem | null>(null);
  const endpoint = `/tenants/${tenantId}`;
  useEffect(() => { onDirty(draft !== null && JSON.stringify(draft) !== baseline); }, [draft, baseline, onDirty]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      platformRequest<ApiMenuItem[]>(`${endpoint}/menus`, token, "GET", undefined, controller.signal),
      platformRequest<{ key: string; label: string }[]>(`${endpoint}/permission-modules`, token, "GET", undefined, controller.signal),
    ]).then(([menus, catalog]) => { setItems(menus); setModules(catalog); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load menus."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, token]);
  function edit(item?: ApiMenuItem) {
    const value: SaveMenuItemRequest = item ? { portal: item.portal, section: item.section, sectionOrder: item.sectionOrder, label: item.label, path: item.path, icon: item.icon, sortOrder: item.sortOrder, isActive: item.isActive, requiredModule: item.requiredModule } : empty(portal);
    setEditing(item?.id ?? null); setDraft(value); setBaseline(JSON.stringify(value)); setNotice("");
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return;
    setSaving(true); onSaving(true); setError(""); setNotice("");
    try {
      const result = await platformRequest<ApiMenuItem>(`${endpoint}/menus${editing ? `/${editing}` : ""}`, token, editing ? "PUT" : "POST", draft);
      setItems(previous => editing ? previous.map(item => item.id === editing ? result : item) : [...previous, result]);
      setDraft(null); setEditing(null); setNotice("Tenant menu saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this menu."); }
    finally { setSaving(false); onSaving(false); }
  }
  async function remove() {
    if (!deleting) return;
    setSaving(true); onSaving(true);
    try {
      await platformRequest(`${endpoint}/menus/${deleting.id}`, token, "DELETE");
      setItems(previous => previous.filter(item => item.id !== deleting.id));
      if (editing === deleting.id) { setEditing(null); setDraft(null); }
      setNotice("Tenant menu removed.");
    } finally { setSaving(false); onSaving(false); }
  }
  const portalItems = items.filter(item => item.portal === portal).sort((a, b) => a.sectionOrder - b.sectionOrder || a.sortOrder - b.sortOrder);
  const visible = portalItems.filter(item => `${item.label} ${item.path} ${item.section ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/20 dark:border-white/15 dark:bg-white/5 text-sm";
  if (loading) return <div role="status" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading tenant menus…</div>;
  return <div className="space-y-4">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-3 text-sm font-medium">Portal<select aria-label="Portal" className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/20 dark:border-white/15 dark:bg-white/5 capitalize" disabled={!!draft || saving} value={portal} onChange={e => setPortal(e.target.value)}>{portals.map(key => <option key={key} value={key}>{key}</option>)}</select></label><div className="flex gap-2"><input aria-label="Search menus" placeholder="Search menus…" className={input} value={search} onChange={e => setSearch(e.target.value)} /><button disabled={!!draft || saving} onClick={() => edit()} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#0B1437] ring-1 ring-[#D4AF37]/50 hover:bg-[#14205a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add menu</button></div></div>
    {draft && <form onSubmit={save} className="space-y-4 rounded-2xl border border-blue-200 bg-background p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{editing ? "Edit menu item" : "New menu item"}</h2><button disabled={saving} type="button" className="text-sm underline" onClick={() => setDraft(null)}>Cancel</button></div><fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label className="space-y-1 text-sm"><span>Menu label</span><input required maxLength={100} className={input} value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} /></label>
      <label className="space-y-1 text-sm"><span>Route path</span><input required maxLength={200} pattern="/[^/].*" title="Enter an internal route such as /admin/courses" className={input} value={draft.path} onChange={e => setDraft({ ...draft, path: e.target.value })} /></label>
      <label className="space-y-1 text-sm"><span>Icon</span><select className={input} value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })}>{Object.keys(MENU_ICONS).map(icon => <option key={icon}>{icon}</option>)}</select></label>
      <label className="space-y-1 text-sm"><span>Section</span><input maxLength={64} className={input} value={draft.section ?? ""} onChange={e => setDraft({ ...draft, section: e.target.value })} /></label>
      <label className="space-y-1 text-sm"><span>Section order</span><input type="number" step={1} className={input} value={draft.sectionOrder} onChange={e => setDraft({ ...draft, sectionOrder: Number(e.target.value) })} /></label>
      <label className="space-y-1 text-sm"><span>Menu order</span><input type="number" step={1} className={input} value={draft.sortOrder} onChange={e => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /></label>
      <label className="space-y-1 text-sm"><span>Required permission module</span><select className={input} value={draft.requiredModule ?? ""} onChange={e => setDraft({ ...draft, requiredModule: e.target.value || null })}><option value="">No module gate</option>{modules.map(module => <option key={module.key} value={module.key}>{module.label}</option>)}</select></label>
      <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={draft.isActive} onChange={e => setDraft({ ...draft, isActive: e.target.checked })} />Visible in navigation</label>
    </fieldset><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0B1437] ring-1 ring-[#D4AF37]/50 hover:bg-[#14205a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save menu</button></form>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px]"><section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card"><div className="flex items-center gap-2 border-b p-4 font-semibold"><ListTree className="h-4 w-4" />Menu items <span className="text-xs font-normal text-muted-foreground">{portalItems.length} configured</span></div><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="p-3">Menu</th><th className="p-3">Section / order</th><th className="p-3">Visibility</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(item => { const Icon = resolveMenuIcon(item.icon); return <tr key={item.id} className="border-b"><td className="p-3"><div className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-muted-foreground" />{item.label}</div><p className="mt-1 break-all text-xs text-muted-foreground">{item.path}</p>{item.requiredModule && <p className="mt-1 text-xs text-muted-foreground">{item.requiredModule}</p>}</td><td className="p-3 text-muted-foreground">{item.section || "Ungrouped"}<p className="mt-1 text-xs">{item.sectionOrder} / {item.sortOrder}</p></td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.isActive ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>{item.isActive ? "Visible" : "Hidden"}</span></td><td className="p-3"><div className="flex gap-2"><button aria-label={`Edit ${item.label}`} disabled={saving || !!draft} onClick={() => edit(item)} className="rounded-lg border p-2 disabled:opacity-40"><Pencil className="h-4 w-4" /></button><button aria-label={`Delete ${item.label}`} disabled={saving} onClick={() => setDeleting(item)} className="rounded-lg border p-2 text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div></td></tr>; })}</tbody></table>{visible.length === 0 && <p className="p-8 text-sm text-muted-foreground">No menu items match this view.</p>}</section>
      <aside className="self-start rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4" />Navigation preview</h2><p className="my-3 text-xs text-muted-foreground">Active items; each user's permissions also control visibility.</p><div className="space-y-1">{portalItems.filter(item => item.isActive && item.requiredModule !== "SystemMonitoring").map((item, index, all) => { const Icon = resolveMenuIcon(item.icon); return <div key={item.id}>{item.section && (index === 0 || all[index - 1].section !== item.section) && <p className="pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.section}</p>}<div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs"><Icon className="h-4 w-4 text-muted-foreground" />{item.label}</div></div>; })}</div></aside>
    </div>
    <ConfirmDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }} title="Remove menu item?" description={`Remove “${deleting?.label ?? ""}” from this tenant's navigation?`} confirmLabel="Remove menu" destructive onConfirm={remove} />
  </div>;
}
