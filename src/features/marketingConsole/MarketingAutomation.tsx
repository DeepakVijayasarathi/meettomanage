import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck2, Flame, Loader2, Mail, Play, Timer, UserCheck, Workflow } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useApiData } from "@/api/hooks";
import { apiEnabled, userMessage } from "@/lib/api";
import { getLeadAutomation, LEAD_STAGE_LABEL, runLeadAutomation, saveLeadAutomationSettings, type ApiLeadAutomationOverview } from "@/api/marketing";

const EMPTY: ApiLeadAutomationOverview = {
  days: 90, leads: 0, funnel: [], lost: 0, medianFirstResponseHours: null, contactedWithin24hPercent: null, acknowledgedPercent: null,
  uncontactedOver24h: 0, sources: [], lostReasons: [], upcomingDemos: [], highIntent: [], recentAutomation: [], settings: {}, accountSyncAvailable: false,
};

/** Every automation, in the order a lead meets them. Keys match the server's leadAutomation.* settings. */
const AUTOMATIONS: { key: string; icon: typeof Mail; title: string; body: string }[] = [
  { key: "leadAutomation.autoAssign", icon: UserCheck, title: "Assign an owner", body: "New leads go to the active marketing user with the fewest open leads. A returning person keeps their earlier owner, who gets the new-lead alert." },
  { key: "leadAutomation.autoAcknowledge", icon: Mail, title: "Instant acknowledgement", body: "The lead gets an e-mail within seconds: who will contact them, a booking link or WhatsApp, and the live demo." },
  { key: "leadAutomation.demoReminders", icon: CalendarCheck2, title: "Demo confirmation and reminders", body: "Booking a demo on a lead e-mails a confirmation, then reminders a day before (if booked more than a day ahead) and an hour before." },
  { key: "leadAutomation.demoRecap", icon: Mail, title: "Post-demo recap", body: "Marking the demo done sends a thank-you with your one-line summary and the free-trial link. Once per lead." },
  { key: "leadAutomation.trialSync", icon: Workflow, title: "Follow leads into their trial", body: "Leads are matched to the academy account opened with the same e-mail and move to Trial, Active trial (students added and a class held) and Customer on their own." },
  { key: "leadAutomation.highIntentAlerts", icon: Flame, title: "High-intent alerts", body: "A lead who views pricing twice in a week after a demo or during a trial is flagged, and the owner and team inbox get an e-mail." },
];

const when = (iso: string | null) => iso ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "";
const pct = (v: number | null) => v === null ? "–" : `${v}%`;
const hours = (v: number | null) => v === null ? "–" : v < 1 ? `${Math.round(v * 60)} min` : v < 48 ? `${v.toFixed(1)} h` : `${Math.round(v / 24)} days`;

/** Marketing console → Lead automation: the lifecycle funnel, what the automations did, and their switches. */
export default function MarketingAutomation() {
  const { toast } = useToast();
  const live = apiEnabled();
  const [days, setDays] = useState(90);
  const { data, loading, error, reload } = useApiData(() => getLeadAutomation(days), EMPTY, EMPTY, { cacheKey: `lead-automation-${days}`, ttlMs: 30_000 });
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [bookingUrl, setBookingUrl] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSettings(data.settings);
    setBookingUrl(data.settings["leadAutomation.bookingUrl"] ?? "");
  }, [data.settings]);

  async function save(values: Record<string, string>, label: string) {
    if (!live) { toast({ variant: "error", title: "Demo mode", description: "Nothing was changed." }); return; }
    setSaving(label);
    try {
      setSettings(await saveLeadAutomationSettings(values));
      toast({ variant: "success", title: "Saved" });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't save", description: userMessage(err) });
    } finally {
      setSaving(null);
    }
  }

  async function runNow() {
    setRunning(true);
    try { await runLeadAutomation(); toast({ variant: "success", title: "Automations ran", description: "Reminders, trial matching and intent checks are up to date." }); reload(); }
    catch (err) { toast({ variant: "error", title: "Couldn't run the automations", description: userMessage(err) }); }
    finally { setRunning(false); }
  }

  const top = Math.max(1, ...data.funnel.map((f) => f.reached));

  return (
    <div>
      <PageHeader
        eyebrow="Marketing"
        title="Lead automation"
        description="What happens to a lead from the first enquiry to a paying academy, and what ran automatically. Move leads through demo stages from Demo Requests."
        actions={<div className="flex gap-2">
          <select aria-label="Period" className="h-10 rounded-md border bg-background px-3 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={180}>Last 6 months</option><option value={365}>Last 12 months</option>
          </select>
          <Button variant="outline" onClick={() => void runNow()} disabled={running || !live}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Run now</Button>
        </div>}
      />

      {live && error && <InlineAlert variant="warning" className="mb-4">Could not load lead automation ({error}). <button type="button" className="underline" onClick={() => reload()}>Retry</button></InlineAlert>}
      {loading && data.leads === 0 && !error && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Leads in period</p><p className="text-2xl font-bold">{data.leads}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Timer className="h-3.5 w-3.5" />Median first response</p><p className="text-2xl font-bold">{hours(data.medianFirstResponseHours)}</p><p className="text-xs text-muted-foreground">{pct(data.contactedWithin24hPercent)} within 24 hours</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Acknowledged instantly</p><p className="text-2xl font-bold">{pct(data.acknowledgedPercent)}</p><p className="text-xs text-muted-foreground">of leads with an e-mail address</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">New, not contacted after 24 h</p><p className={data.uncontactedOver24h ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>{data.uncontactedOver24h}</p><Link to="/marketing/demo-requests" className="text-xs font-semibold text-primary underline-offset-4 hover:underline">Open Demo Requests</Link></div>
      </div>

      <section className="mb-6 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Funnel</h2>
        <p className="mb-4 text-xs text-muted-foreground">How many leads from this period reached each stage. Lost leads ({data.lost}) are counted only under Lost.</p>
        {data.funnel.length === 0 || data.leads === 0 ? <p className="text-sm text-muted-foreground">No leads in this period yet.</p> : (
          <ol className="space-y-2">
            {data.funnel.map((step, i) => {
              const prev = i === 0 ? null : data.funnel[i - 1].reached;
              const rate = prev ? Math.round((100 * step.reached) / prev) : null;
              return (
                <li key={step.stage} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-medium">{step.label}</span>
                  <span className="h-6 overflow-hidden rounded bg-muted"><span className="block h-full rounded bg-primary/80" style={{ width: `${(100 * step.reached) / top}%` }} /></span>
                  <span className="w-28 text-end tabular-nums">{step.reached}{rate !== null && <span className="ms-2 text-xs text-muted-foreground">{rate}% of previous</span>}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Upcoming demos (7 days)</h2>
          {data.upcomingDemos.length === 0 ? <p className="text-sm text-muted-foreground">No demos booked. Book one from a lead's workspace in Demo Requests.</p> : (
            <ul className="divide-y text-sm">{data.upcomingDemos.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 py-2"><div><Link to={`/marketing/demo-requests?lead=${d.id}`} className="font-semibold hover:underline">{d.academyName}</Link><p className="text-xs text-muted-foreground">{d.fullName}{d.owner ? ` · ${d.owner}` : ""}</p></div><span className="shrink-0 text-xs font-medium">{when(d.atUtc)}</span></li>)}</ul>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Flame className="h-4 w-4 text-destructive" />Ready to buy (14 days)</h2>
          {data.highIntent.length === 0 ? <p className="text-sm text-muted-foreground">No high-intent leads right now.</p> : (
            <ul className="divide-y text-sm">{data.highIntent.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 py-2"><div><Link to={`/marketing/demo-requests?lead=${d.id}`} className="font-semibold hover:underline">{d.academyName}</Link><p className="text-xs text-muted-foreground">{d.fullName} · {LEAD_STAGE_LABEL[d.stage]}{d.owner ? ` · ${d.owner}` : ""}</p></div><span className="shrink-0 text-xs text-muted-foreground">{when(d.atUtc)}</span></li>)}</ul>
          )}
        </section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="overflow-x-auto rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">By source</h2>
          {data.sources.length === 0 ? <p className="text-sm text-muted-foreground">No leads in this period yet.</p> : (
            <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">Source</th><th className="pb-2 text-end font-medium">Leads</th><th className="pb-2 text-end font-medium">Demos</th><th className="pb-2 text-end font-medium">Trials</th><th className="pb-2 text-end font-medium">Customers</th></tr></thead>
              <tbody className="divide-y">{data.sources.map((s) => <tr key={s.source}><td className="py-1.5">{s.source}</td><td className="py-1.5 text-end tabular-nums">{s.leads}</td><td className="py-1.5 text-end tabular-nums">{s.demos}</td><td className="py-1.5 text-end tabular-nums">{s.trials}</td><td className="py-1.5 text-end tabular-nums">{s.customers}</td></tr>)}</tbody>
            </table>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Why leads were lost</h2>
          {data.lostReasons.length === 0 ? <p className="text-sm text-muted-foreground">No lost leads in this period.</p> : (
            <ul className="space-y-1.5 text-sm">{data.lostReasons.map((r) => <li key={r.label} className="flex justify-between gap-3"><span>{r.label}</span><Badge variant="outline">{r.count}</Badge></li>)}</ul>
          )}
        </section>
      </div>

      <section className="mb-6 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Automations</h2>
        <p className="mb-4 text-xs text-muted-foreground">Each one is on unless you switch it off here. Changes apply to the next lead or the next run (every 10 minutes).</p>
        <ul className="divide-y">
          {AUTOMATIONS.map((a) => {
            const on = settings[a.key] !== "false";
            const unavailable = a.key === "leadAutomation.trialSync" && !data.accountSyncAvailable;
            return (
              <li key={a.key} className="flex items-start gap-4 py-3">
                <a.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.title}{unavailable && <Badge variant="muted" className="ms-2">Needs multi-tenant mode</Badge>}</p>
                  <p className="text-sm text-muted-foreground">{a.body}</p>
                  {a.key === "leadAutomation.autoAcknowledge" && (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <Input value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="Optional booking link, e.g. https://calendly.com/your-team/demo" className="sm:max-w-md" />
                      <Button size="sm" variant="outline" disabled={saving !== null} onClick={() => void save({ "leadAutomation.bookingUrl": bookingUrl.trim() }, "booking")}>{saving === "booking" && <Loader2 className="h-4 w-4 animate-spin" />}Save link</Button>
                    </div>
                  )}
                </div>
                <Switch aria-label={`${a.title}: ${on ? "on" : "off"}`} checked={on} disabled={saving !== null || unavailable} onCheckedChange={(v) => void save({ [a.key]: v ? "true" : "false" }, a.key)} />
              </li>
            );
          })}
        </ul>
        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          Academy accounts also get two automatic e-mails from the platform: setup help when a trial has no students or classes after 2 days, and a review and referral request after 60 days of active paid use. Edit or switch them off under Platform → Email templates (<code>trial_setup_help</code>, <code>review_request</code>).
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">Recent automatic actions</h2>
        {data.recentAutomation.length === 0 ? <EmptyState icon={Workflow} title="Nothing has run yet" description="Actions such as acknowledgements, reminders and trial matches appear here as they happen." /> : (
          <ul className="divide-y text-sm">{data.recentAutomation.map((a, i) => <li key={`${a.leadId}-${i}`} className="flex items-start justify-between gap-3 py-2"><div><Link to={`/marketing/demo-requests?lead=${a.leadId}`} className="font-semibold hover:underline">{a.fullName}</Link><p className="text-muted-foreground">{a.detail}</p></div><span className="shrink-0 text-xs text-muted-foreground">{when(a.atUtc)}</span></li>)}</ul>
        )}
      </section>
    </div>
  );
}
