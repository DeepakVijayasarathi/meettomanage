import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { AI_FEATURE_LABELS, formatTokens, recentMonths, saasPlatform, type AiFeatureRow, type PlatformAiUsage } from "@/api/saas";
import { ConsoleHeader, Notices, Pill, StatStrip, inputClass, panel, td, th, useLoader } from "./saasUi";

export default function AiUsage() {
  return <PlatformShell><AiUsageDashboard /></PlatformShell>;
}

const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const featureLabel = (feature: string) => AI_FEATURE_LABELS[feature] ?? feature;

function Features({ items }: { items: AiFeatureRow[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">No AI use</span>;
  return <ul className="space-y-0.5 text-xs text-muted-foreground">
    {items.map(f => <li key={f.feature}>{featureLabel(f.feature)}: <span className="font-medium text-foreground">{formatTokens(f.totalTokens)}</span> · {f.requests.toLocaleString("en-IN")} calls</li>)}
  </ul>;
}

function Allowance({ used, limit, percent }: { used: number; limit: number | null; percent: number | null }) {
  if (limit === null) return <span className="text-xs text-muted-foreground">Unlimited (no plan limit set)</span>;
  if (limit === 0) return <Pill value="Void" label="Not in plan" />;
  const pct = Math.min(100, percent ?? 0);
  const tone = pct >= 100 ? "bg-red-600" : pct >= 80 ? "bg-amber-500" : "bg-[hsl(214_52%_28%)]";
  return <div className="min-w-[9rem]">
    <div className="flex justify-between text-xs"><span>{formatTokens(used)} of {formatTokens(limit)}</span><span className="text-muted-foreground">{percent ?? 0}%</span></div>
    <div className="mt-1 h-1.5 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of monthly AI allowance used">
      <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${pct}%` }} /></div>
  </div>;
}

function AiUsageDashboard() {
  const { token } = usePlatformAdmin();
  const months = useMemo(() => recentMonths(), []);
  const [month, setMonth] = useState(months[0]);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const usage = useLoader(useCallback(() => saasPlatform.aiUsage(token, month), [token, month]), null as PlatformAiUsage | null);

  const data = usage.data;
  const term = search.trim().toLowerCase();
  const rows = (data?.tenants ?? [])
    .filter(t => !activeOnly || t.usedTokens > 0)
    .filter(t => !term || t.name.toLowerCase().includes(term) || t.code.includes(term))
    .sort((a, b) => b.usedTokens - a.usedTokens || a.name.localeCompare(b.name));
  const overLimit = (data?.tenants ?? []).filter(t => t.limit !== null && t.limit > 0 && t.usedTokens >= t.limit).length;
  const nearLimit = (data?.tenants ?? []).filter(t => t.percentUsed !== null && t.percentUsed >= 80 && t.percentUsed < 100).length;

  return <div className="space-y-6">
    <ConsoleHeader title="AI usage" description="Tokens used on the platform AI key. Each academy is counted against its plan's monthly AI allowance; the marketing site runs on its own key and is counted separately."
      actions={<label className="text-sm"><span className="sr-only">Month</span>
        <select className={inputClass} value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>} />
    <Notices error={usage.error} notice="" />
    {data && <>
      <StatStrip items={[
        { label: "Academies", value: formatTokens(data.tenantTotalTokens), hint: `${data.tenants.filter(t => t.usedTokens > 0).length} used AI in ${monthLabel(data.month)}` },
        { label: "Marketing site", value: formatTokens(data.marketing.usedTokens), hint: `${data.marketing.requests.toLocaleString("en-IN")} calls, never charged to an academy` },
        { label: "At allowance", value: overLimit, hint: "AI paused until the 1st or an upgrade", tone: overLimit > 0 ? "bad" : "default" },
        { label: "Above 80%", value: nearLimit, hint: "Close to their monthly allowance", tone: nearLimit > 0 ? "warn" : "default" },
      ]} />
      {data.marketing.features.length > 0 && <section className={`${panel} p-5`}>
        <h2 className="console-heading text-lg font-semibold">Marketing site</h2>
        <div className="mt-2"><Features items={data.marketing.features} /></div>
      </section>}
      <section className={`${panel} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} />Only academies that used AI</label>
          <label className="relative block w-full sm:w-72"><span className="sr-only">Search academies</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className={`${inputClass} pl-9`} placeholder="Search name or code" value={search} onChange={e => setSearch(e.target.value)} /></label>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground"><tr><th className={th}>Academy</th><th className={th}>Allowance</th><th className={th}>By feature</th></tr></thead>
          <tbody className="divide-y divide-border">{rows.map(t => <tr key={t.tenantId}>
            <td className={td}><div className="font-medium">{t.name}</div><div className="text-xs text-muted-foreground">{t.code}{t.plan ? ` · ${t.plan}` : ""}</div>{t.status !== "Active" && <div className="mt-1"><Pill value={t.status} /></div>}</td>
            <td className={td}><Allowance used={t.usedTokens} limit={t.limit} percent={t.percentUsed} /></td>
            <td className={td}><Features items={t.features} /></td>
          </tr>)}</tbody></table></div>
        {rows.length === 0 && <p className="p-6 text-sm text-muted-foreground">{activeOnly || term ? "No academies match." : "No academies yet."}</p>}
      </section>
      {data.removedTenantTokens > 0 && <p className="text-xs text-muted-foreground">{formatTokens(data.removedTenantTokens)} tokens this month belong to academies that have since been deleted.</p>}
      <p className="text-xs text-muted-foreground">Set each plan's limit on <b>Plans</b> under "AI tokens per month". A plan without a value is unlimited; 0 switches AI off for that plan.</p>
    </>}
  </div>;
}
