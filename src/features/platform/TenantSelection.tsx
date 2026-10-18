import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { platformRequest, type PlatformTenant } from "@/api/platform";
import { usePlatformAdmin } from "./PlatformShell";

export function useTenantSelection() {
  const { token } = usePlatformAdmin();
  const [search, setSearch] = useSearchParams();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    platformRequest<PlatformTenant[]>("/tenants", token, "GET", undefined, controller.signal)
      .then(setTenants).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load tenants."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);
  const available = tenants.filter(t => t.status === "Active" || t.status === "Suspended");
  const requested = search.get("tenant");
  const tenant = requested ? available.find(t => t.id === requested) : available[0];
  return { token, tenant, tenants: available, loading, error: error || (!loading && requested && !tenant ? "The selected tenant is unavailable or has not completed setup." : ""),
    select: (id: string) => { const next = new URLSearchParams(search); next.set("tenant", id); setSearch(next); } };
}

export function TenantSelector({ tenant, tenants, loading, onChange, disabled = false }: {
  tenant?: PlatformTenant; tenants: PlatformTenant[]; loading: boolean; onChange: (id: string) => void; disabled?: boolean;
}) {
  return <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-5">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Building2 className="h-5 w-5" /></span><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected tenant</p><p className="mt-1 font-semibold">{tenant?.name ?? (loading ? "Loading tenants…" : "Choose a tenant")}</p>{tenant && <p className="mt-0.5 text-xs text-muted-foreground">{tenant.code} · {tenant.status}</p>}</div></div>
    <label className="flex items-center gap-2 text-sm"><span className="sr-only">Select tenant</span>{loading && <Loader2 className="h-4 w-4 animate-spin" />}<select aria-label="Select tenant" className="min-w-52 rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5.5" disabled={disabled || loading || tenants.length === 0} value={tenant?.id ?? ""} onChange={e => onChange(e.target.value)}><option value="" disabled>Choose a tenant</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}</select></label>
  </div>;
}
