import { useMemo, useState } from "react";
import { Check, KeyRound, Loader2, Minus, Search, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { addCrmMember, CRM_ROLE_HELP, getCrmReport, inr, updateCrmMember, type CrmMember, type CrmOwnerRow, type CrmReport, type CrmRole } from "@/api/crm";
import { SELECT, useCrmMe, useCrmTeam, useRun } from "./hooks";

const ROLES: CrmRole[] = ["Manager", "Sales", "Viewer"];
const ROLE_LABEL: Record<CrmRole, string> = { Manager: "Manager", Sales: "Sales rep", Viewer: "Viewer" };
const ROLE_PLURAL: Record<CrmRole, string> = { Manager: "managers", Sales: "sales reps", Viewer: "viewers" };
const EMPTY_REPORT: CrmReport = { days: 30, owners: [], forecast: [], weightedPipeline: 0, openWithoutValue: 0, wonMonthlyValue: 0, byMonth: [] };

/** What each role can do. true = yes, false = no, text = partly. Mirrors the server's CRM role checks. */
const PERMISSIONS: { label: string; Manager: boolean | string; Sales: boolean | string; Viewer: boolean | string }[] = [
  { label: "See leads", Manager: "All leads", Sales: "Own + unassigned", Viewer: "All leads" },
  { label: "See customers (academy accounts)", Manager: true, Sales: true, Viewer: true },
  { label: "Add, import and edit leads", Manager: true, Sales: true, Viewer: false },
  { label: "Log calls, WhatsApp and notes", Manager: true, Sales: true, Viewer: false },
  { label: "Move leads through stages, book demos", Manager: true, Sales: true, Viewer: false },
  { label: "Create and finish tasks", Manager: true, Sales: "For themselves", Viewer: false },
  { label: "Assign leads and tasks to others", Manager: true, Sales: false, Viewer: false },
  { label: "Delete leads", Manager: true, Sales: false, Viewer: false },
  { label: "Reports", Manager: "Whole team", Sales: "Own numbers", Viewer: "Whole team" },
  { label: "Lead automation settings", Manager: true, Sales: false, Viewer: false },
  { label: "Manage the team and PINs", Manager: true, Sales: false, Viewer: false },
];

function Access({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Yes" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/60" aria-label="No" />;
  return <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{value}</span>;
}

const hours = (v: number | null | undefined) => (v == null ? "–" : v < 1 ? `${Math.round(v * 60)} min` : v < 48 ? `${Math.round(v)} h` : `${Math.round(v / 24)} d`);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

/** Marketing console → Team: who signs in, what their role lets them do, and how each person is performing. Managers only. */
export default function CrmTeam() {
  const me = useCrmMe();
  const { team, reload } = useCrmTeam();
  const run = useRun();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", pin: "", role: "Sales" as CrmRole });
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<CrmMember | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [pinFor, setPinFor] = useState<CrmMember | null>(null);
  const [newPin, setNewPin] = useState("");
  const [days, setDays] = useState(30);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [roleFilter, setRoleFilter] = useState<CrmRole | "">("");
  const { data: report } = useApiData(() => getCrmReport(days), EMPTY_REPORT, EMPTY_REPORT, { cacheKey: `crm-report-${days}`, ttlMs: 30_000 });
  const stats = useMemo(() => new Map<string, CrmOwnerRow>(report.owners.filter((o) => o.ownerId).map((o) => [o.ownerId as string, o])), [report]);

  if (!me.isManager) return <div><PageHeader eyebrow="CRM" title="Team" /><InlineAlert variant="info">Only a CRM manager can manage the team. You are signed in as {ROLE_LABEL[me.role]}.</InlineAlert></div>;

  const unassigned = report.owners.find((o) => !o.ownerId);
  const activeMembers = team.filter((m) => m.active);
  const shown = team.filter((m) => (status === "all" || (status === "active") === m.active) && (!roleFilter || m.role === roleFilter)
    && (!query.trim() || `${m.name} ${m.email}`.toLowerCase().includes(query.trim().toLowerCase())));
  const totalOpen = team.reduce((n, m) => n + m.openLeads, 0);
  const totalOverdue = report.owners.reduce((n, o) => n + o.overdueTasks, 0);
  const totalWon = report.owners.reduce((n, o) => n + o.won, 0);

  async function add() {
    setBusy(true);
    const ok = await run(() => addCrmMember({ ...form, lastName: form.lastName || undefined, phone: form.phone || undefined }), `${form.firstName} added`);
    setBusy(false);
    if (ok) { setAdding(false); setForm({ firstName: "", lastName: "", email: "", phone: "", pin: "", role: "Sales" }); reload(); }
  }

  const change = (m: CrmMember, input: Parameters<typeof updateCrmMember>[1], msg: string) => void run(() => updateCrmMember(m.userId, input), msg).then((ok) => ok && reload());
  const others = (m: CrmMember) => team.filter((x) => x.active && x.userId !== m.userId && x.role !== "Viewer");

  return (
    <div>
      <PageHeader eyebrow="CRM" title="Team" description="Everyone who signs in to the marketing console, what their role lets them do, and how each person is doing."
        actions={<Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" />Add person</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Active people</p><p className="text-2xl font-bold">{activeMembers.length}</p><p className="text-xs text-muted-foreground">{ROLES.map((r) => `${activeMembers.filter((m) => m.role === r).length} ${ROLE_PLURAL[r]}`).join(" · ")}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Open leads owned</p><p className="text-2xl font-bold">{totalOpen}</p>{unassigned && unassigned.openLeads > 0 && <p className="text-xs text-warning">{unassigned.openLeads} not assigned to anyone</p>}</div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Won, last {days} days</p><p className="text-2xl font-bold">{totalWon}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">New monthly revenue won</p><p className="text-2xl font-bold">{inr(report.wonMonthlyValue)}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Overdue tasks</p><p className={totalOverdue ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>{totalOverdue}</p></div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search name or e-mail…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Role" className="h-10 rounded-md border bg-background px-3 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as CrmRole | "")}><option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
          <select aria-label="Status" className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="active">Active</option><option value="inactive">Deactivated</option><option value="all">Everyone</option></select>
          <select aria-label="Period" className="h-10 rounded-md border bg-background px-3 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></select>
        </div>
      </div>

      {shown.length === 0 ? <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{team.length === 0 ? "No team members yet." : "No one matches these filters."}</p> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr>
              {["Person", "Role", "Open leads", "Open value", "New leads", "First reply", "Demos", "Won", "Win rate", "Won value", "Tasks open / overdue", "Status", ""].map((h, i) => <th key={h || `c${i}`} className={`px-3 py-2 font-medium ${i >= 2 && i <= 10 ? "text-end" : ""}`}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y">
              {shown.map((m) => {
                const o = stats.get(m.userId);
                const decided = (o?.won ?? 0) + (o?.lost ?? 0);
                return (
                  <tr key={m.userId} className={m.active ? "" : "text-muted-foreground"}>
                    <td className="px-3 py-2"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(m.name)}</span><div className="min-w-0"><p className="font-semibold">{m.name}{m.userId === me.userId && <span className="ms-2 text-xs font-normal text-muted-foreground">(you)</span>}</p><p className="truncate text-xs text-muted-foreground">{m.email}</p></div></div></td>
                    <td className="px-3 py-2"><select aria-label={`Role for ${m.name}`} className={`${SELECT} w-32`} value={m.role} disabled={!m.active} onChange={(e) => change(m, { role: e.target.value as CrmRole }, "Role updated")}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></td>
                    <td className="px-3 py-2 text-end tabular-nums">{m.openLeads}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{o ? inr(o.openPipelineValue) : "–"}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{o?.leads ?? 0}</td>
                    <td className="px-3 py-2 text-end tabular-nums" title="Median time to first reply">{hours(o?.medianResponseHours)}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{o?.demos ?? 0}</td>
                    <td className="px-3 py-2 text-end font-semibold tabular-nums">{o?.won ?? 0}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{decided ? `${Math.round((100 * (o?.won ?? 0)) / decided)}%` : "–"}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{o ? inr(o.wonMonthlyValue) : "–"}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{m.openTasks} / <span className={o?.overdueTasks ? "font-semibold text-destructive" : "text-muted-foreground"}>{o?.overdueTasks ?? 0}</span></td>
                    <td className="px-3 py-2">{m.active ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Deactivated</Badge>}</td>
                    <td className="px-3 py-2 text-end">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" title="Reset PIN" onClick={() => { setPinFor(m); setNewPin(""); }}><KeyRound className="h-4 w-4" /><span className="sr-only">Reset PIN</span></Button>
                        {m.active
                          ? <Button size="sm" variant="outline" disabled={m.userId === me.userId} onClick={() => { setLeaving(m); setReassignTo(""); }}>Deactivate</Button>
                          : <Button size="sm" variant="outline" onClick={() => change(m, { active: true }, `${m.name} reactivated`)}>Reactivate</Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">New leads, demos and won count the selected period. Open leads, open value and tasks are as of now. Win rate is won ÷ (won + lost) in the period.</p>
      <p className="mt-1 text-xs text-muted-foreground">People sign in to the marketing console with their e-mail and 4-digit PIN. Share the PIN with them yourself; it isn't e-mailed.</p>

      <section className="mt-8 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">What each role can do</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Change someone's role in the table above. It applies the next time their page loads.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">Can…</th>{ROLES.map((r) => <th key={r} className="w-40 pb-2 text-center font-medium"><p className="text-sm font-semibold text-foreground">{ROLE_LABEL[r]}</p><p className="font-normal">{activeMembers.filter((m) => m.role === r).length} active</p></th>)}</tr></thead>
            <tbody className="divide-y">{PERMISSIONS.map((p) => <tr key={p.label}><td className="py-2">{p.label}</td>{ROLES.map((r) => <td key={r} className="py-2 text-center"><Access value={p[r]} /></td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">{ROLES.map((r) => <p key={r} className="text-xs text-muted-foreground"><b className="text-foreground">{ROLE_LABEL[r]}:</b> {CRM_ROLE_HELP[r]}</p>)}</div>
      </section>

      <Dialog open={adding} onOpenChange={setAdding}><DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Add a person</DialogTitle><DialogDescription>They sign in to the marketing console with this e-mail and PIN.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm"><span className="font-medium">First name</span><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
          <label className="space-y-1 text-sm"><span className="font-medium">Last name</span><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
          <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">E-mail</span><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="space-y-1 text-sm"><span className="font-medium">Phone (optional)</span><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="space-y-1 text-sm"><span className="font-medium">4-digit PIN</span><Input inputMode="numeric" maxLength={4} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} /></label>
          <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">Role</span><select className={SELECT} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as CrmRole })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select><span className="block text-xs text-muted-foreground">{CRM_ROLE_HELP[form.role]}</span></label>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={busy || !form.firstName.trim() || !form.email.trim() || form.pin.length !== 4} onClick={() => void add()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add person</Button></div>
      </DialogContent></Dialog>

      <Dialog open={!!leaving} onOpenChange={(v) => { if (!v) setLeaving(null); }}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Deactivate {leaving?.name}?</DialogTitle><DialogDescription>They can no longer sign in. Their history stays.</DialogDescription></DialogHeader>
        {leaving && (leaving.openLeads > 0 || leaving.openTasks > 0) && (
          <label className="block space-y-1 text-sm"><span className="font-medium">Hand over their {leaving.openLeads} open leads and {leaving.openTasks} open tasks to</span>
            <select className={SELECT} value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}><option value="">Keep them where they are</option>{others(leaving).map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}</select>
          </label>
        )}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setLeaving(null)}>Cancel</Button><Button variant="destructive" onClick={() => { if (leaving) change(leaving, { active: false, reassignTo: reassignTo || undefined }, `${leaving.name} deactivated`); setLeaving(null); }}>Deactivate</Button></div>
      </DialogContent></Dialog>

      <Dialog open={!!pinFor} onOpenChange={(v) => { if (!v) setPinFor(null); }}><DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New PIN for {pinFor?.name}</DialogTitle><DialogDescription>Share it with them yourself.</DialogDescription></DialogHeader>
        <Input inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="4 digits" />
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPinFor(null)}>Cancel</Button><Button disabled={newPin.length !== 4} onClick={() => { if (pinFor) change(pinFor, { pin: newPin }, "PIN reset"); setPinFor(null); }}>Save PIN</Button></div>
      </DialogContent></Dialog>
    </div>
  );
}
