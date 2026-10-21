import { useCallback, useState, type FormEvent } from "react";
import { Loader2, Plus, Pencil, EyeOff } from "lucide-react";
import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { saasPlatform, formatMoney, type EntitlementDef, type PlanInput, type PlanView } from "@/api/saas";
import { Hero, Notices, Pill, inputClass, labelClass, panel, primaryButton, smallButton, useLoader, describeLimit } from "./saasUi";

type Draft = {
  id?: string; code: string; name: string; description: string; isPublic: boolean; isActive: boolean; trialDays: number; sortOrder: number;
  monthly: { id?: string; amount: string; isActive: boolean }; yearly: { id?: string; amount: string; isActive: boolean };
  values: Record<string, number>;
};

const blank = (catalog: EntitlementDef[]): Draft => ({
  code: "", name: "", description: "", isPublic: true, isActive: true, trialDays: 0, sortOrder: 10,
  monthly: { amount: "", isActive: true }, yearly: { amount: "", isActive: true },
  values: Object.fromEntries(catalog.map(d => [d.key, d.type === "Bool" ? 0 : -1])),
});

export default function Plans() {
  return <PlatformShell><PlanManagement /></PlatformShell>;
}

function PlanManagement() {
  const { token } = usePlatformAdmin();
  const plans = useLoader(useCallback(() => saasPlatform.plans(token), [token]), [] as PlanView[]);
  const catalog = useLoader(useCallback(() => saasPlatform.catalog(token), [token]), [] as EntitlementDef[]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function edit(plan: PlanView) {
    const price = (interval: "Month" | "Year") => plan.prices.find(p => p.billingInterval === interval && p.isActive);
    const values = Object.fromEntries(catalog.data.map(d => [d.key, d.type === "Bool" ? 0 : -1]));
    for (const e of plan.entitlements) values[e.key] = e.value;
    setDraft({
      id: plan.id, code: plan.code, name: plan.name, description: plan.description ?? "", isPublic: plan.isPublic, isActive: plan.isActive,
      trialDays: plan.trialDays, sortOrder: plan.sortOrder, values,
      monthly: { id: price("Month")?.id, amount: price("Month")?.amount.toString() ?? "", isActive: !!price("Month") },
      yearly: { id: price("Year")?.id, amount: price("Year")?.amount.toString() ?? "", isActive: !!price("Year") },
    });
    setError(""); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true); setError(""); setNotice("");
    const prices: PlanInput["prices"] = [];
    for (const [interval, p] of [["Month", draft.monthly], ["Year", draft.yearly]] as const) {
      if (p.amount.trim() === "" && !p.id) continue;
      prices.push({ id: p.id, billingInterval: interval, currency: "INR", amount: Number(p.amount || 0), isActive: p.isActive && p.amount.trim() !== "" });
    }
    const body: PlanInput = {
      code: draft.code.trim(), name: draft.name.trim(), description: draft.description.trim() || null, isPublic: draft.isPublic, isActive: draft.isActive,
      trialDays: draft.trialDays, sortOrder: draft.sortOrder, prices,
      entitlements: catalog.data.map(d => ({ key: d.key, value: draft.values[d.key] ?? 0 })),
    };
    try {
      if (draft.id) await saasPlatform.updatePlan(token, draft.id, body); else await saasPlatform.createPlan(token, body);
      setNotice(`${body.name} saved. A changed price applies to new buyers only; existing subscribers keep the price they signed up at.`);
      setDraft(null); await plans.reload();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the plan."); }
    finally { setBusy(false); }
  }

  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d));
  return <div className="space-y-6">
    <Hero title="Plans" text="Define what each plan costs and what it includes. Limits and features are data: change them here and they apply immediately, with no deployment." />
    <Notices error={error || plans.error || catalog.error} notice={notice} />
    {!draft && <div><button className={primaryButton} onClick={() => { setDraft(blank(catalog.data)); setError(""); setNotice(""); }}><Plus className="h-4 w-4" />New plan</button></div>}

    {draft && <form onSubmit={save} className={`${panel} space-y-5 p-6 sm:p-7`}>
      <h2 className="console-serif text-xl font-semibold">{draft.id ? `Edit ${draft.name}` : "New plan"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}><span>Code</span><input required readOnly={!!draft.id} pattern="[a-z][a-z0-9_\-]{1,49}" title="Lowercase letters, digits, - or _" className={inputClass} value={draft.code} onChange={e => set({ code: e.target.value })} /></label>
        <label className={labelClass}><span>Name</span><input required maxLength={150} className={inputClass} value={draft.name} onChange={e => set({ name: e.target.value })} /></label>
        <label className={`${labelClass} sm:col-span-2`}><span>Description</span><input maxLength={1000} className={inputClass} value={draft.description} onChange={e => set({ description: e.target.value })} /></label>
        <label className={labelClass}><span>Monthly price (INR, excl. GST)</span><input type="number" min={0} step="0.01" className={inputClass} placeholder="Leave empty if not sold monthly" value={draft.monthly.amount} onChange={e => set({ monthly: { ...draft.monthly, amount: e.target.value } })} /></label>
        <label className={labelClass}><span>Yearly price (INR, excl. GST)</span><input type="number" min={0} step="0.01" className={inputClass} placeholder="Leave empty if not sold yearly" value={draft.yearly.amount} onChange={e => set({ yearly: { ...draft.yearly, amount: e.target.value } })} /></label>
        <label className={labelClass}><span>Free-trial days (0 = no trial)</span><input type="number" min={0} max={365} className={inputClass} value={draft.trialDays} onChange={e => set({ trialDays: Number(e.target.value) })} /></label>
        <label className={labelClass}><span>Display order</span><input type="number" className={inputClass} value={draft.sortOrder} onChange={e => set({ sortOrder: Number(e.target.value) })} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isPublic} onChange={e => set({ isPublic: e.target.checked })} />Visible to buyers (untick for hidden, operator-assigned plans)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isActive} onChange={e => set({ isActive: e.target.checked })} />Plan is active</label>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Limits &amp; features</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.data.map(def => def.type === "Bool"
            ? <label key={def.key} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={draft.values[def.key] === 1} onChange={e => set({ values: { ...draft.values, [def.key]: e.target.checked ? 1 : 0 } })} />{def.label}</label>
            : <label key={def.key} className={`${labelClass} rounded-xl border border-border p-3`}><span>{def.label} <span className="font-normal text-muted-foreground">({def.unit}; -1 = unlimited)</span></span>
              <input type="number" min={-1} className={inputClass} value={draft.values[def.key] ?? -1} onChange={e => set({ values: { ...draft.values, [def.key]: Number(e.target.value) } })} /></label>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={busy} className={primaryButton}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "Saving…" : "Save plan"}</button>
        <button type="button" disabled={busy} className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline" onClick={() => setDraft(null)}>Cancel</button>
      </div>
    </form>}

    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {plans.data.map(plan => <article key={plan.id} className={`${panel} flex flex-col p-6`}>
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="console-serif text-xl font-semibold">{plan.name}</h3><p className="font-mono text-xs text-muted-foreground">{plan.code}</p></div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {!plan.isPublic && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"><EyeOff className="h-3 w-3" />Hidden</span>}
            <Pill value={plan.isActive ? "Active" : "Cancelled"} label={plan.isActive ? "Active" : "Inactive"} />
          </div>
        </div>
        {plan.description && <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>}
        <p className="mt-3 text-sm font-medium">
          {plan.prices.filter(p => p.isActive).length === 0 ? (plan.trialDays > 0 ? `${plan.trialDays}-day free trial` : "Operator-assigned")
            : plan.prices.filter(p => p.isActive).map(p => `${formatMoney(p.amount, p.currency)}/${p.billingInterval === "Month" ? "mo" : "yr"}`).join("  ·  ")}
        </p>
        <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
          {catalog.data.filter(d => d.type === "Number").map(d => {
            const v = plan.entitlements.find(e => e.key === d.key)?.value;
            return v === undefined ? null : <li key={d.key}>{d.label}: <b className="text-foreground">{describeLimit(v, d.unit)}</b></li>;
          })}
          <li>Features: {catalog.data.filter(d => d.type === "Bool" && plan.entitlements.find(e => e.key === d.key)?.value === 1).map(d => d.label).join(", ") || "none"}</li>
        </ul>
        <div className="mt-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">{plan.subscribers} subscriber{plan.subscribers === 1 ? "" : "s"}</span>
          <button className={smallButton} onClick={() => edit(plan)}><Pencil className="h-3 w-3" />Edit</button></div>
      </article>)}
    </div>
    {plans.loaded && plans.data.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No plans yet.</p>}
  </div>;
}
