import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { saasPlatform, type EmailTemplateRow, type ReminderLogRow } from "@/api/saas";
import { Hero, Notices, Pill, TabBar, inputClass, labelClass, panel, primaryButton, td, th, useLoader } from "./saasUi";

export default function Reminders() {
  return <PlatformShell><ReminderCenter /></PlatformShell>;
}

function ReminderCenter() {
  const { token } = usePlatformAdmin();
  const [tab, setTab] = useState<"log" | "templates">("log");
  const log = useLoader(useCallback(() => saasPlatform.reminders(token), [token]), [] as ReminderLogRow[]);
  const templates = useLoader(useCallback(() => saasPlatform.templates(token), [token]), [] as EmailTemplateRow[]);
  const [editing, setEditing] = useState<EmailTemplateRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save() {
    if (!editing) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await saasPlatform.saveTemplate(token, editing.key, { subject: editing.subject, body: editing.body, isActive: editing.isActive });
      setNotice(`${editing.title} saved.`); setEditing(null); await templates.reload();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the template."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <Hero title="Auto-reminders" text="Every billing and lifecycle e-mail the platform sends, with exactly who received what and when. Edit the wording of any message." />
    <Notices error={error || log.error || templates.error} notice={notice} />
    <TabBar tabs={[{ id: "log", label: "Delivery log" }, { id: "templates", label: "Templates" }]} value={tab} onChange={setTab} />

    {tab === "log" && <section className={`${panel} overflow-hidden`}><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-white/5"><tr><th className={th}>When</th><th className={th}>Client</th><th className={th}>Reminder</th><th className={th}>Sent to</th><th className={th}>Status</th></tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-white/10">{log.data.map(r => <tr key={r.id}>
        <td className={`${td} text-xs text-slate-600`}>{new Date(r.createdAtUtc).toLocaleString("en-IN")}</td>
        <td className={td}>{r.tenantName}</td>
        <td className={`${td} font-mono text-xs`}>{r.ruleKey}</td>
        <td className={`${td} text-xs`}>{r.recipient ?? "-"}</td>
        <td className={td}><Pill value={r.status} />{r.error && <div className="mt-1 max-w-xs text-xs text-slate-500">{r.error}</div>}{r.attempts > 1 && <div className="text-xs text-slate-500">attempt {r.attempts}</div>}</td></tr>)}</tbody></table></div>
      {log.loaded && log.data.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No reminders have been sent yet.</p>}</section>}

    {tab === "templates" && !editing && <section className={`${panel} divide-y divide-slate-100 dark:divide-white/10`}>
      {templates.data.map(t => <div key={t.key} className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="font-medium">{t.title} {!t.isActive && <Pill value="Cancelled" label="Off" />}</p><p className="text-xs text-slate-500">{t.subject}</p></div>
        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary" onClick={() => setEditing({ ...t })}>Edit</button></div>)}
    </section>}

    {tab === "templates" && editing && <section className={`${panel} space-y-4 p-6`}>
      <h2 className="font-serif text-xl font-semibold">{editing.title}</h2>
      <label className={labelClass}><span>Subject</span><input className={inputClass} value={editing.subject} onChange={e => setEditing({ ...editing, subject: e.target.value })} /></label>
      <label className={labelClass}><span>Body (HTML)</span><textarea rows={10} className={`${inputClass} font-mono text-xs`} value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} /></label>
      <p className="text-xs text-slate-500">Placeholders: {"{{tenant_name}} {{plan_name}} {{amount}} {{invoice_number}} {{due_date}} {{trial_end_date}} {{period_end_date}} {{grace_end_date}} {{portal_url}} {{pay_block}} {{support_email}}"}. Values are escaped automatically.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} />Send this reminder</label>
      <div className="flex gap-4"><button disabled={busy} className={primaryButton} onClick={() => { void save(); }}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save template</button>
        <button className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline" onClick={() => setEditing(null)}>Cancel</button></div>
    </section>}
  </div>;
}
