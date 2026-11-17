import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, Loader2, MessageCircle, Phone, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { completeCrmTask, createCrmTask, deleteCrmTask, TASK_TYPE_LABEL, updateCrmTask, whatsAppUrl, type CrmTask, type CrmTaskType } from "@/api/crm";
import { localInput, SELECT, useCrmMe, useCrmTeam, useRun, when } from "./hooks";

/** Add-a-task form, for a lead, a customer or on its own. */
export function TaskForm({ leadId, tenantId, defaultAssignee, onSaved, compact }: { leadId?: string; tenantId?: string; defaultAssignee?: string | null; onSaved: () => void; compact?: boolean }) {
  const me = useCrmMe();
  const { active } = useCrmTeam();
  const run = useRun();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CrmTaskType>("FollowUp");
  const [due, setDue] = useState(() => localInput(1));
  const [assignee, setAssignee] = useState<string>(defaultAssignee ?? "");
  const [busy, setBusy] = useState(false);
  if (!me.canWrite) return null;

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    const ok = await run(() => createCrmTask({ title: title.trim(), type, dueAtUtc: new Date(due).toISOString(), leadId, tenantId, assignedToUserId: assignee || null }), "Task added");
    setBusy(false);
    if (ok) { setTitle(""); onSaved(); }
  }

  return (
    <div className={cn("grid gap-2", compact ? "sm:grid-cols-[1fr_auto]" : "sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.2fr_1.2fr_auto]")}>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call back about pricing" aria-label="Task" onKeyDown={(e) => { if (e.key === "Enter") void save(); }} />
      {!compact && <select aria-label="Type" className={SELECT} value={type} onChange={(e) => setType(e.target.value as CrmTaskType)}>{Object.entries(TASK_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
      {!compact && <Input aria-label="Due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />}
      {!compact && <select aria-label="Owner" className={SELECT} value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={me.role === "Sales"}>
        <option value="">{me.role === "Sales" ? "Me" : "Lead owner / me"}</option>
        {active.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
      </select>}
      {compact && <Input aria-label="Due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="sm:col-span-1" />}
      <Button onClick={() => void save()} disabled={busy || !title.trim()} className={compact ? "sm:col-span-2" : ""}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add task</Button>
    </div>
  );
}

/** A list of tasks with done (and an optional outcome), reopen and delete. */
export function TaskList({ tasks, onChanged, showContext = true, empty = "No tasks." }: { tasks: CrmTask[]; onChanged: () => void; showContext?: boolean; empty?: string }) {
  const me = useCrmMe();
  const run = useRun();
  const [closing, setClosing] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("");
  const now = Date.now();
  if (tasks.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <ul className="divide-y">
      {tasks.map((t) => {
        const overdue = !t.completedAtUtc && new Date(t.dueAtUtc).getTime() < now;
        return (
          <li key={t.id} className="py-2.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", t.completedAtUtc && "text-muted-foreground line-through")}>{t.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant="outline">{TASK_TYPE_LABEL[t.type]}</Badge>
                  <span className={overdue ? "font-semibold text-destructive" : ""}>{overdue ? "Overdue · " : ""}{when(t.dueAtUtc)}</span>
                  {t.assignedTo && <span>· {t.assignedTo}</span>}
                  {showContext && t.leadId && <Link className="text-primary hover:underline" to={`/marketing/demo-requests?lead=${t.leadId}`}>· {t.leadLabel}</Link>}
                  {showContext && t.tenantId && <Link className="text-primary hover:underline" to={`/marketing/customers?open=${t.tenantId}`}>· {t.customerName ?? "Customer"}</Link>}
                </p>
                {t.outcome && <p className="mt-1 text-sm text-muted-foreground">Outcome: {t.outcome}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {/* One tap to reach the lead: the phone dialler on mobile, WhatsApp anywhere. */}
                {!t.completedAtUtc && t.leadPhone && <>
                  <Button size="sm" variant="ghost" asChild title={`Call ${t.leadPhone}`}><a href={`tel:${t.leadPhone.replace(/[^\d+]/g, "")}`}><Phone className="h-4 w-4" /><span className="sr-only">Call</span></a></Button>
                  <Button size="sm" variant="ghost" asChild title="WhatsApp" className="text-emerald-700"><a href={whatsAppUrl(t.leadPhone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /><span className="sr-only">WhatsApp</span></a></Button>
                </>}
                {me.canWrite && !t.completedAtUtc && <Button size="sm" variant="ghost" title="Move to tomorrow" onClick={() => void run(() => updateCrmTask(t.id, {
                  title: t.title, type: t.type, dueAtUtc: new Date(localInput(1, new Date(t.dueAtUtc).getHours() || 10)).toISOString(),
                  assignedToUserId: t.assignedToUserId, leadId: t.leadId, tenantId: t.tenantId, notes: t.notes ?? undefined,
                }), "Moved to tomorrow").then((ok) => ok && onChanged())}><Clock3 className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Tomorrow</span></Button>}
                {me.canWrite && (t.completedAtUtc
                  ? <Button size="sm" variant="ghost" title="Reopen" onClick={() => void run(() => completeCrmTask(t.id, { reopen: true }), "Task reopened").then((ok) => ok && onChanged())}><RotateCcw className="h-4 w-4" /></Button>
                  : <Button size="sm" variant="outline" onClick={() => { setClosing(closing === t.id ? null : t.id); setOutcome(""); }}><CheckCircle2 className="h-4 w-4" />Done</Button>)}
                {me.canWrite && <Button size="sm" variant="ghost" title="Delete task" onClick={() => void run(() => deleteCrmTask(t.id), "Task deleted").then((ok) => ok && onChanged())}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
            {closing === t.id && (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input autoFocus value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Outcome (optional), e.g. Sent quote for Pro yearly" onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget.nextSibling as HTMLButtonElement | null)?.click(); }} />
                <Button size="sm" onClick={() => void run(() => completeCrmTask(t.id, { outcome: outcome.trim() || undefined }), "Task done").then((ok) => { if (ok) { setClosing(null); onChanged(); } })}>Mark done</Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
