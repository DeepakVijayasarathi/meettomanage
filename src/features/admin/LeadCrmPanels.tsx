import { useEffect, useState } from "react";
import { Loader2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiData } from "@/api/hooks";
import { createCrmTask, inr, listCrmTasks, logCrmInteraction, startFollowUpPlan, updateCrmDeal, type CrmTask } from "@/api/crm";
import type { ApiPlatformDemoRequest } from "@/api/marketing";
import { TaskForm, TaskList } from "@/features/marketingConsole/crm/shared";
import { localInput, planSummary, SELECT, useCrmMe, useFollowUpPlans, useRun } from "@/features/marketingConsole/crm/hooks";

const PLANS = [
  { code: "", label: "Not decided" },
  { code: "basic", label: "Basic" },
  { code: "pro", label: "Pro" },
  { code: "growth", label: "Growth" },
  { code: "own-brand", label: "Own Brand, Own Software" },
];

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

/** Expected plan, monthly value and close date, plus where the academy is and what it teaches. */
export function LeadDealPanel({ lead, onSaved }: { lead: ApiPlatformDemoRequest; onSaved: () => void }) {
  const me = useCrmMe();
  const run = useRun();
  const [form, setForm] = useState(() => ({
    expectedPlan: lead.expectedPlan ?? "", expectedMonthlyValue: lead.expectedMonthlyValue?.toString() ?? "", expectedCloseAt: toDateInput(lead.expectedCloseAtUtc),
    studentCount: lead.studentCount?.toString() ?? "", region: lead.region ?? "", city: lead.city ?? "", segment: lead.segment ?? "", website: lead.website ?? "",
  }));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[^\d.]/g, "")));
    const ok = await run(() => updateCrmDeal(lead.id, {
      expectedPlan: form.expectedPlan || null, expectedMonthlyValue: num(form.expectedMonthlyValue), studentCount: num(form.studentCount),
      expectedCloseAtUtc: form.expectedCloseAt ? new Date(`${form.expectedCloseAt}T12:00:00Z`).toISOString() : null,
      region: form.region || null, city: form.city || null, segment: form.segment || null, website: form.website || null,
    }), "Deal saved");
    setBusy(false);
    if (ok) onSaved();
  }

  const field = "space-y-1 text-sm";
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-semibold">Deal</h3>{lead.expectedMonthlyValue != null && <span className="text-sm font-semibold">{inr(lead.expectedMonthlyValue)}/month</span>}</div>
      <fieldset disabled={!me.canWrite} className="grid gap-3 sm:grid-cols-2">
        <label className={field}><span className="font-medium">Likely plan</span><select className={SELECT} value={form.expectedPlan} onChange={set("expectedPlan")}>{PLANS.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}</select></label>
        <label className={field}><span className="font-medium">Expected value (₹ / month)</span><Input inputMode="numeric" value={form.expectedMonthlyValue} onChange={set("expectedMonthlyValue")} placeholder="e.g. 2499" /></label>
        <label className={field}><span className="font-medium">Expected close</span><Input type="date" value={form.expectedCloseAt} onChange={set("expectedCloseAt")} /></label>
        <label className={field}><span className="font-medium">Students</span><Input inputMode="numeric" value={form.studentCount} onChange={set("studentCount")} placeholder="e.g. 180" /></label>
        <label className={field}><span className="font-medium">City</span><Input value={form.city} onChange={set("city")} /></label>
        <label className={field}><span className="font-medium">Region</span><Input value={form.region} onChange={set("region")} /></label>
        <label className={field}><span className="font-medium">What they teach</span><Input value={form.segment} onChange={set("segment")} placeholder="e.g. Phonics, Abacus, Tuition" /></label>
        <label className={field}><span className="font-medium">Website</span><Input value={form.website} onChange={set("website")} placeholder="https://" /></label>
      </fieldset>
      {me.canWrite && <Button className="mt-3" size="sm" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save deal</Button>}
    </div>
  );
}

const OUTCOMES: Record<string, string[]> = {
  Call: ["Connected", "No answer", "Left a message", "Interested", "Not interested", "Call back later", "Wrong number"],
  Meeting: ["Held", "No-show", "Rescheduled"],
  Email: ["Sent", "Replied"],
  WhatsApp: ["Sent", "Replied", "Interested", "Not interested"],
};

/** Log a call, meeting, e-mail or WhatsApp with its outcome, and optionally schedule the next step as a task. */
export function LeadLogPanel({ lead, onSaved }: { lead: ApiPlatformDemoRequest; onSaved: () => void }) {
  const me = useCrmMe();
  const run = useRun();
  const [type, setType] = useState<"Call" | "Meeting" | "Email" | "WhatsApp">("Call");
  const [outcome, setOutcome] = useState(OUTCOMES.Call[0]);
  const [detail, setDetail] = useState("");
  const [next, setNext] = useState("");
  const [nextAt, setNextAt] = useState(() => localInput(2));
  const [busy, setBusy] = useState(false);
  useEffect(() => setOutcome(OUTCOMES[type][0]), [type]);
  if (!me.canWrite) return null;

  async function save() {
    setBusy(true);
    const ok = await run(() => logCrmInteraction(lead.id, {
      type, outcome, detail: detail.trim() || undefined,
      nextStepTitle: next.trim() || undefined, nextStepDueAtUtc: next.trim() ? new Date(nextAt).toISOString() : undefined,
    }), `${type} logged`);
    setBusy(false);
    if (ok) { setDetail(""); setNext(""); onSaved(); }
  }

  return (
    <div className="rounded-xl border p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold"><PhoneCall className="h-4 w-4" />Log a call or meeting</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span className="font-medium">Type</span><select className={SELECT} value={type} onChange={(e) => setType(e.target.value as typeof type)}>{Object.keys(OUTCOMES).map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Outcome</span><select className={SELECT} value={outcome} onChange={(e) => setOutcome(e.target.value)}>{OUTCOMES[type].map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">What was said (optional)</span><Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. Owner wants to see fee reminders; decides with partner" /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Next step (optional)</span><Input value={next} onChange={(e) => setNext(e.target.value)} placeholder="e.g. Send Pro pricing" /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">When</span><Input type="datetime-local" value={nextAt} onChange={(e) => setNextAt(e.target.value)} disabled={!next.trim()} /></label>
      </div>
      <Button className="mt-3" size="sm" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>
    </div>
  );
}

/** The lead's open and finished tasks, with a quick add. */
export function LeadTasksPanel({ lead, version = 0 }: { lead: ApiPlatformDemoRequest; version?: number }) {
  // `version` changes when the lead's timeline grows (e.g. a call logged with a next step), which refetches the tasks.
  const { data, reload } = useApiData(() => listCrmTasks({ leadId: lead.id, status: "all" }), [] as CrmTask[], [] as CrmTask[], { cacheKey: `crm-lead-tasks-${lead.id}-${version}`, ttlMs: 5_000 });
  const me = useCrmMe();
  const run = useRun();
  const plans = useFollowUpPlans();
  const [plan, setPlan] = useState("");
  const closed = lead.stage === "Customer" || lead.stage === "Lost";

  const followUpIn = (days: number, label: string) => void run(
    () => createCrmTask({ title: `Follow up with ${lead.fullName}`, type: "FollowUp", dueAtUtc: new Date(localInput(days)).toISOString(), leadId: lead.id }),
    `Follow-up set for ${label}`).then((ok) => ok && reload());

  return (
    <div className="rounded-xl border p-4">
      <h3 className="mb-3 font-semibold">Follow-up</h3>
      {me.canWrite && !closed && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Follow up</span>
            <Button size="sm" variant="outline" onClick={() => followUpIn(1, "tomorrow")}>Tomorrow</Button>
            <Button size="sm" variant="outline" onClick={() => followUpIn(3, "in 3 days")}>In 3 days</Button>
            <Button size="sm" variant="outline" onClick={() => followUpIn(7, "next week")}>Next week</Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select aria-label="Follow-up plan" className={SELECT} value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="">Start a follow-up plan…</option>
              {plans.map((p) => <option key={p.key} value={p.key}>{p.name}: {planSummary(p)}</option>)}
            </select>
            <Button size="sm" className="shrink-0" disabled={!plan} onClick={() => void run(async () => {
              const result = await startFollowUpPlan(lead.id, plan);
              if (result.done === 0) throw new Error(result.skipped[0] ?? "The plan wasn't started.");
            }, "Follow-up plan started").then((ok) => { if (ok) { setPlan(""); reload(); } })}>Start plan</Button>
          </div>
        </div>
      )}
      <TaskForm leadId={lead.id} defaultAssignee={lead.assignedToUserId} onSaved={reload} compact />
      <div className="mt-3"><TaskList tasks={data} onChanged={reload} showContext={false} empty="No tasks for this lead yet." /></div>
    </div>
  );
}
