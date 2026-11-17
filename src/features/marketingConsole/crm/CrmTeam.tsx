import { useState } from "react";
import { KeyRound, Loader2, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addCrmMember, CRM_ROLE_HELP, updateCrmMember, type CrmMember, type CrmRole } from "@/api/crm";
import { SELECT, useCrmMe, useCrmTeam, useRun } from "./hooks";

const ROLES: CrmRole[] = ["Manager", "Sales", "Viewer"];
const ROLE_LABEL: Record<CrmRole, string> = { Manager: "Manager", Sales: "Sales rep", Viewer: "Viewer" };

/** Marketing console → Team: add CRM users and set what each can do. Managers only. */
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

  if (!me.isManager) return <div><PageHeader eyebrow="CRM" title="Team" /><InlineAlert variant="info">Only a CRM manager can manage the team. You are signed in as {ROLE_LABEL[me.role]}.</InlineAlert></div>;

  async function add() {
    setBusy(true);
    const ok = await run(() => addCrmMember({ ...form, lastName: form.lastName || undefined, phone: form.phone || undefined }), `${form.firstName} added`);
    setBusy(false);
    if (ok) { setAdding(false); setForm({ firstName: "", lastName: "", email: "", phone: "", pin: "", role: "Sales" }); reload(); }
  }

  const change = (m: CrmMember, input: Parameters<typeof updateCrmMember>[1], msg: string) => void run(() => updateCrmMember(m.userId, input), msg).then((ok) => ok && reload());
  const others = (m: CrmMember) => team.filter((x) => x.active && x.userId !== m.userId);

  return (
    <div>
      <PageHeader eyebrow="CRM" title="Team" description="Everyone who signs in to the marketing console, and what their role lets them do."
        actions={<Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" />Add person</Button>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">{ROLES.map((r) => <div key={r} className="rounded-xl border bg-card p-4"><p className="font-semibold">{ROLE_LABEL[r]}</p><p className="mt-1 text-sm text-muted-foreground">{CRM_ROLE_HELP[r]}</p></div>)}</div>

      {team.length === 0 ? <p className="text-sm text-muted-foreground">No team members yet.</p> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr>{["Person", "Role", "Open leads", "Open tasks", "Status", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {team.map((m) => (
                <tr key={m.userId} className={m.active ? "" : "text-muted-foreground"}>
                  <td className="px-3 py-2"><p className="font-semibold">{m.name}{m.userId === me.userId && <span className="ms-2 text-xs font-normal text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{m.email}</p></td>
                  <td className="px-3 py-2"><select aria-label={`Role for ${m.name}`} className={`${SELECT} w-36`} value={m.role} disabled={!m.active} onChange={(e) => change(m, { role: e.target.value as CrmRole }, "Role updated")}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></td>
                  <td className="px-3 py-2 tabular-nums">{m.openLeads}</td>
                  <td className="px-3 py-2 tabular-nums">{m.openTasks}</td>
                  <td className="px-3 py-2">{m.active ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Deactivated</Badge>}</td>
                  <td className="px-3 py-2 text-end">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" title="Reset PIN" onClick={() => { setPinFor(m); setNewPin(""); }}><KeyRound className="h-4 w-4" /></Button>
                      {m.active
                        ? <Button size="sm" variant="outline" disabled={m.userId === me.userId} onClick={() => { setLeaving(m); setReassignTo(""); }}>Deactivate</Button>
                        : <Button size="sm" variant="outline" onClick={() => change(m, { active: true }, `${m.name} reactivated`)}>Reactivate</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">People sign in to the marketing console with their e-mail and 4-digit PIN. Share the PIN with them yourself; it isn't e-mailed.</p>

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
