import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { saasPlatform, type PlatformRules } from "@/api/saas";
import { Hero, Notices, inputClass, labelClass, panel, primaryButton, useLoader } from "./saasUi";

export default function Rules() {
  return <PlatformShell><RulesForm /></PlatformShell>;
}

const PAUSE = "";

/** Operator rules: when Overview raises things, the usage warning threshold and where ended trials go. */
function RulesForm() {
  const { token } = usePlatformAdmin();
  const data = useLoader(useCallback(() => saasPlatform.rules(token), [token]), null as { rules: PlatformRules; fallbackPlans: { code: string; name: string }[] } | null);
  const [form, setForm] = useState<PlatformRules | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { if (data.data) setForm(data.data.rules); }, [data.data]);
  const set = (patch: Partial<PlatformRules>) => setForm((f) => (f ? { ...f, ...patch } : f));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await saasPlatform.saveRules(token, { ...form, trialFallbackPlanCode: form.trialFallbackPlanCode || null });
      setForm(saved);
      setNotice("Rules saved. They apply within a minute.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the rules."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <Hero title="Rules" text="How the platform behaves for every academy: when the Overview flags something, when academies are warned about plan limits, and what happens when a free trial ends." />
    <Notices error={error || data.error} notice={notice} />
    {!form ? <p className="text-sm text-muted-foreground">{data.loaded ? "" : "Loading…"}</p> : (
      <form onSubmit={save} className={`${panel} space-y-6 p-6 sm:p-7`}>
        <section className="space-y-4">
          <h2 className="console-heading text-lg font-semibold">When a free trial ends</h2>
          <label className={labelClass}><span>Move the academy to</span>
            <select className={inputClass} value={form.trialFallbackPlanCode ?? PAUSE} onChange={(e) => set({ trialFallbackPlanCode: e.target.value || null })}>
              {(data.data?.fallbackPlans ?? []).map((p) => <option key={p.code} value={p.code}>{p.name} plan (keeps working, paid modules lock)</option>)}
              <option value={PAUSE}>Nothing: pause the workspace until they pay</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">Only active plans that cost nothing can be chosen. The trial banner and e-mails follow this choice.</p>
        </section>

        <section className="space-y-4">
          <h2 className="console-heading text-lg font-semibold">Plan limit warnings</h2>
          <label className={labelClass}><span>Warn academies at this share of a limit (%)</span>
            <input type="number" min={50} max={99} className={inputClass} value={form.usageWarningPercent} onChange={(e) => set({ usageWarningPercent: Number(e.target.value) })} />
          </label>
          <p className="text-xs text-muted-foreground">Shows the "close to a plan limit" banner with an Upgrade button, and sends the usage warning e-mail. Reaching 100% always shows "limit reached".</p>
        </section>

        <section className="space-y-4">
          <h2 className="console-heading text-lg font-semibold">Overview alerts</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}><span>Flag a new academy that hasn't started after (days)</span>
              <input type="number" min={1} max={60} className={inputClass} value={form.notStartedAfterDays} onChange={(e) => set({ notStartedAfterDays: Number(e.target.value) })} />
            </label>
            <label className={labelClass}><span>Flag trials ending within (days)</span>
              <input type="number" min={1} max={30} className={inputClass} value={form.trialEndingWindowDays} onChange={(e) => set({ trialEndingWindowDays: Number(e.target.value) })} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">"Hasn't started" means a Free or trial academy with no students and no classes yet.</p>
        </section>

        <button disabled={busy} className={primaryButton}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "Saving…" : "Save rules"}</button>
      </form>
    )}
  </div>;
}
