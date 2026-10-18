import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { platformRequest } from "@/api/platform";

type Integration = {
  id: string; key: string; name: string; category: string | number; description?: string | null;
  isEnabled: boolean; config: Record<string, string | null>; isSystem: boolean;
};
const secretLike = /secret|password|token|key|pass/i;

/** The selected client's integrations, read from and saved to that client's own database. */
export default function TenantIntegrations({ tenantId, token }: { tenantId: string; token: string }) {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endpoint = `/tenants/${tenantId}/integrations`;

  useEffect(() => {
    const controller = new AbortController();
    platformRequest<Integration[]>(endpoint, token, "GET", undefined, controller.signal)
      .then(setItems)
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load integrations."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, token]);

  const patch = (id: string, change: (item: Integration) => Integration) =>
    setItems(previous => previous.map(item => item.id === id ? change(item) : item));

  async function save(item: Integration) {
    setBusyId(item.id); setError(""); setNotice("");
    try {
      const saved = await platformRequest<Integration>(`${endpoint}/${item.id}`, token, "PUT", {
        key: item.key, name: item.name, category: item.category, description: item.description,
        isEnabled: item.isEnabled, config: item.config,
      });
      patch(item.id, () => saved); setNotice(`${item.name} saved.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the integration."); }
    finally { setBusyId(""); }
  }

  if (loading) return <div role="status" className="flex items-center gap-3 p-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading integrations…</div>;
  return <div>
    <div className="border-b p-5"><h2 className="font-semibold">Integrations</h2><p className="mt-1 text-xs text-muted-foreground">Email, payment gateways and other services configured for this tenant. They hold live credentials — double-check before saving.</p></div>
    {error && <p role="alert" className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="m-5 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
    <div className="divide-y">
      {items.map(item => <div key={item.id} className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold">{item.name}</h3>{item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.isEnabled} disabled={busyId === item.id} onChange={e => patch(item.id, x => ({ ...x, isEnabled: e.target.checked }))} />Enabled</label>
        </div>
        {Object.keys(item.config).length > 0 && <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(item.config).map(([field, value]) => <label key={field} className="space-y-1 text-sm"><span className="text-muted-foreground">{field}</span>
            <input type={secretLike.test(field) ? "password" : "text"} autoComplete="off" disabled={busyId === item.id} value={value ?? ""} maxLength={2000}
              onChange={e => patch(item.id, x => ({ ...x, config: { ...x.config, [field]: e.target.value } }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>)}
        </div>}
        <button type="button" disabled={busyId === item.id} onClick={() => { void save(item); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50">
          {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save {item.name}</button>
      </div>)}
      {items.length === 0 && <p className="p-8 text-sm text-muted-foreground">This tenant has no integrations yet.</p>}
    </div>
  </div>;
}
