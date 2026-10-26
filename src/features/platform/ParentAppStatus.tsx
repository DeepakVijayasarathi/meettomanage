import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, Bell, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Smartphone, Users } from "lucide-react";
import { platformRequest } from "@/api/platform";

type Status = {
  generatedAtUtc: string; windowDays: number; health: "operational" | "stale" | "no-data" | "disabled"; accessGranted: boolean; eligibleFamilies: number;
  active: { installations24h: number; installations7d: number; installations30d: number; families30d: number; lastSeenAtUtc: string | null; lastSuccessfulSyncAtUtc: string | null };
  adoption: { latestVersion: string | null; latestVersionPercent: number; notificationOptInPercent: number; biometricOptInPercent: number };
  platforms: { platform: string; installations: number }[];
  versions: { version: string; platform: string; installations: number; lastSeenAtUtc: string }[];
  errors: { category: string; installations: number; lastSeenAtUtc: string }[];
  trend: { date: string; activeFamilies: number }[];
  readiness: { access: boolean; branding: boolean; portal: boolean; support: boolean; welcome: boolean };
};

const healthStyle = {
  operational: { label: "Operational", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  stale: { label: "Stale data", className: "bg-amber-100 text-amber-900", icon: Clock3 },
  "no-data": { label: "Awaiting first heartbeat", className: "bg-slate-100 text-slate-700", icon: Activity },
  disabled: { label: "Access disabled", className: "bg-red-100 text-red-800", icon: AlertCircle },
};

const relative = (iso: string | null) => {
  if (!iso) return "Never";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
};

export default function ParentAppStatus({ tenantId, token }: { tenantId: string; token: string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true); setError("");
    platformRequest<Status>(`/tenants/${tenantId}/app-status?days=${days}`, token)
      .then(setData).catch(err => setError(err instanceof Error ? err.message : "Could not load app status."))
      .finally(() => setLoading(false));
  };
  useEffect(load, [days, tenantId, token]);
  // Treat arrays as optional at the network boundary so a rolling deployment (or a cached
  // response from the previous API version) cannot take down the whole configuration page.
  const trend = data?.trend ?? [];
  const platforms = data?.platforms ?? [];
  const versions = data?.versions ?? [];
  const errors = data?.errors ?? [];
  const maxTrend = useMemo(() => Math.max(1, ...trend.map(x => x.activeFamilies)), [trend]);

  if (loading && !data) return <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground" role="status">Loading real-time mobile app status…</div>;
  if (error && !data) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5"><p className="text-sm text-red-800">{error}</p><button type="button" onClick={load} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-800"><RefreshCw className="h-4 w-4" />Retry</button></div>;
  if (!data) return null;
  const health = healthStyle[data.health] ?? healthStyle["no-data"];
  const HealthIcon = health.icon;
  const active = data.active ?? { installations24h: 0, installations7d: 0, installations30d: 0, families30d: 0, lastSeenAtUtc: null, lastSuccessfulSyncAtUtc: null };
  const adoptionStats = data.adoption ?? { latestVersion: null, latestVersionPercent: 0, notificationOptInPercent: 0, biometricOptInPercent: 0 };
  const eligibleFamilies = data.eligibleFamilies ?? 0;
  const adoption = eligibleFamilies ? Math.min(100, Math.round(active.families30d * 100 / eligibleFamilies)) : 0;
  const totalPlatforms = platforms.reduce((sum, x) => sum + x.installations, 0);

  return <section className="space-y-5 rounded-2xl border border-border bg-muted/20 p-5" aria-labelledby="mobile-monitor-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h3 id="mobile-monitor-title" className="font-semibold">App monitor</h3></div><p className="mt-1 text-xs text-muted-foreground">Tenant-isolated heartbeat and adoption data. Updated {relative(data.generatedAtUtc)}.</p></div>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${health.className}`}><HealthIcon className="h-3.5 w-3.5" />{health.label}</span>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border bg-card p-2 text-muted-foreground hover:text-foreground" aria-label="Refresh app status"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi icon={Smartphone} label="Active today" value={active.installations24h} note={`${active.installations7d} active in 7 days`} />
      <Kpi icon={Users} label="Family adoption" value={`${adoption}%`} note={`${active.families30d} of ${eligibleFamilies} eligible`} />
      <Kpi icon={Bell} label="Notifications enabled" value={`${adoptionStats.notificationOptInPercent}%`} note="Active installations, 30 days" />
      <Kpi icon={ShieldCheck} label="Biometric lock" value={`${adoptionStats.biometricOptInPercent}%`} note={`Latest app ${adoptionStats.latestVersion ?? "—"}`} />
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold">Active families</h4><p className="text-xs text-muted-foreground">Unique daily heartbeat users</p></div><div className="flex rounded-lg bg-muted p-1">{[7, 30, 90].map(n => <button type="button" key={n} onClick={() => setDays(n)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${days === n ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{n}d</button>)}</div></div>
        <div className="mt-5 flex h-28 items-end gap-1" role="img" aria-label={`Daily active families over ${days} days`}>
          {trend.map(point => <div key={point.date} title={`${point.date}: ${point.activeFamilies}`} className="min-w-0 flex-1 rounded-t bg-primary/70 transition-all" style={{ height: `${Math.max(point.activeFamilies ? 8 : 2, point.activeFamilies / maxTrend * 100)}%` }} />)}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{trend[0]?.date}</span><span>{trend.at(-1)?.date}</span></div>
      </div>
      <div className="rounded-xl border bg-card p-4"><h4 className="text-sm font-semibold">Platform mix</h4><div className="mt-4 space-y-3">{platforms.length ? platforms.map(row => <div key={row.platform}><div className="flex justify-between text-xs"><span className="capitalize">{row.platform}</span><span className="font-semibold">{row.installations}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${totalPlatforms ? row.installations / totalPlatforms * 100 : 0}%` }} /></div></div>) : <Empty text="No installation data yet" />}</div></div>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="overflow-hidden rounded-xl border bg-card"><div className="border-b px-4 py-3"><h4 className="text-sm font-semibold">Version adoption</h4><p className="text-xs text-muted-foreground">Latest-version adoption: {adoptionStats.latestVersionPercent}%</p></div><div className="divide-y">{versions.length ? versions.slice(0, 8).map(row => <div key={`${row.platform}-${row.version}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-xs"><div><span className="font-semibold">v{row.version}</span><span className="ml-2 capitalize text-muted-foreground">{row.platform}</span></div><span>{row.installations} installs</span><span className="text-muted-foreground">{relative(row.lastSeenAtUtc)}</span></div>) : <Empty text="Versions appear after the updated app reports in" />}</div></div>
      <div className="overflow-hidden rounded-xl border bg-card"><div className="border-b px-4 py-3"><h4 className="text-sm font-semibold">Operational signals</h4><p className="text-xs text-muted-foreground">Last sync {relative(active.lastSuccessfulSyncAtUtc)}</p></div><div className="divide-y">{errors.length ? errors.map(row => <div key={row.category} className="flex items-center justify-between gap-3 px-4 py-3 text-xs"><span className="inline-flex items-center gap-2 capitalize"><AlertCircle className="h-4 w-4 text-amber-600" />{row.category}</span><span>{row.installations} installs · {relative(row.lastSeenAtUtc)}</span></div>) : <Empty text="No installation-level error signals in this period" />}</div></div>
    </div>
    <p className="text-[11px] text-muted-foreground">Privacy: aggregates use random app installation IDs. Hardware identifiers, family names, contacts, tokens, messages, and form content are not collected.</p>
  </section>;
}

function Kpi({ icon: Icon, label, value, note }: { icon: typeof Activity; label: string; value: string | number; note: string }) {
  return <div className="rounded-xl border bg-card p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></div>;
}
function Empty({ text }: { text: string }) { return <p className="px-4 py-6 text-center text-xs text-muted-foreground">{text}</p>; }
