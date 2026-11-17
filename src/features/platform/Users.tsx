import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Users as UsersIcon } from "lucide-react";
import { platformRequest } from "@/api/platform";
import { ConsoleHeader as PageHeader, inputClass, panel, Pill, tableHead, td, th } from "./saasUi";
import PlatformShell from "./PlatformShell";
import { TenantSelector, useTenantSelection } from "./TenantSelection";

type TenantUser = { id: string; username: string; email: string; role: string; status: string };
type TenantUsers = { roles: { role: string; count: number }[]; users: TenantUser[] };

const roleLabel = (role: string) => role === "SubAdmin" ? "Sub Admin" : role === "AdmissionTeam" ? "Admission Team" : role;

export default function Users() { return <PlatformShell><UsersPage /></PlatformShell>; }

function UsersPage() {
  const selection = useTenantSelection();
  return <div className="space-y-6">
    <PageHeader eyebrow="Platform" title="Tenant users" description="Every login user of a tenant with their email and role. Filter by role to see who holds which access." className="mb-0" />
    <TenantSelector {...selection} onChange={selection.select} />
    {selection.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{selection.error}</p>}
    {!selection.loading && selection.tenants.length === 0 && !selection.error && <p className={`${panel} p-8 text-muted-foreground`}>Create and provision a tenant before listing its users.</p>}
    {selection.tenant && <UserDirectory key={selection.tenant.id} tenantId={selection.tenant.id} token={selection.token} />}
  </div>;
}

function UserDirectory({ tenantId, token }: { tenantId: string; token: string }) {
  const [data, setData] = useState<TenantUsers | null>(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    platformRequest<TenantUsers>(`/tenants/${tenantId}/users`, token, "GET", undefined, controller.signal)
      .then(setData).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load users."); });
    return () => controller.abort();
  }, [tenantId, token]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.users ?? []).filter(u => (role === "all" || u.role === role)
      && (!term || u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
  }, [data, role, search]);

  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (!data) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading users…</p>;

  const total = data.users.length;
  const chips = [{ role: "all", label: "All roles", count: total }, ...data.roles.map(r => ({ role: r.role, label: roleLabel(r.role), count: r.count }))];
  return <>
    <div role="radiogroup" aria-label="Filter by role" className="flex flex-wrap gap-2">
      {chips.map(c => <button key={c.role} type="button" role="radio" aria-checked={role === c.role} onClick={() => setRole(c.role)}
        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${role === c.role ? "border-primary bg-primary/[0.07] text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
        {c.label} <span className="ml-1 text-xs opacity-70">{c.count}</span></button>)}
    </div>
    <div className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{visible.length}</span> of {total} users</p>
        <label className="relative block w-full sm:w-72"><span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputClass} pl-9`} placeholder="Search username or email" value={search} onChange={e => setSearch(e.target.value)} /></label>
      </div>
      {visible.length === 0
        ? <p className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><UsersIcon className="h-4 w-4" />No users match this filter.</p>
        : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className={tableHead}><tr><th className={th}>Username</th><th className={th}>Email</th><th className={th}>Role</th><th className={th}>Status</th></tr></thead>
          <tbody className="divide-y divide-border">
            {visible.map(u => <tr key={u.id}>
              <td className={`${td} font-medium`}>{u.username}</td>
              <td className={`${td} text-muted-foreground`}>{u.email}</td>
              <td className={td}>{roleLabel(u.role)}</td>
              <td className={td}><Pill value={u.status} /></td>
            </tr>)}
          </tbody></table></div>}
    </div>
  </>;
}
