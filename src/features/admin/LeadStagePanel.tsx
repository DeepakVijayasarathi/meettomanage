import { useState } from "react";
import { CalendarCheck2, CheckCircle2, Flame, Loader2, Mail, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STAGE_LABEL, setLeadStage, type ApiLeadStage, type ApiPlatformDemoRequest } from "@/api/marketing";
import { useCrmMe } from "@/features/marketingConsole/crm/hooks";

const STAGE_VARIANT: Record<ApiLeadStage, "warning" | "default" | "success" | "outline" | "muted" | "destructive"> = {
  New: "warning", Contacted: "default", DemoBooked: "default", DemoDone: "default",
  Trial: "success", ActiveTrial: "success", Customer: "success", Lost: "muted",
};

export function LeadStageBadge({ stage }: { stage?: ApiLeadStage }) {
  const s = stage ?? "New";
  return <Badge variant={STAGE_VARIANT[s]}>{LEAD_STAGE_LABEL[s]}</Badge>;
}

const fmt = (iso?: string | null) => iso ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : null;

function hoursBetween(from: string, to: string) {
  const h = (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(1)} h` : `${Math.round(h / 24)} days`;
}

/** Tomorrow at 11:00 local, as a datetime-local value: a sensible default for a demo slot. */
function defaultDemoSlot() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

type Mode = null | "book" | "done" | "lost";

/**
 * The lifecycle controls inside the lead workspace. Booking a demo e-mails the lead a confirmation (and the server
 * sends reminders a day and an hour before); marking it done sends the recap with the trial link. Trial, active trial
 * and customer are normally set automatically once the lead opens an academy account.
 */
export function LeadStagePanel({ lead, live, onChanged, onError }: { lead: ApiPlatformDemoRequest; live: boolean; onChanged: (lead: ApiPlatformDemoRequest, message: string) => void; onError: (title: string, message: string) => void }) {
  const stage = lead.stage ?? "New";
  const { canWrite } = useCrmMe();
  const [mode, setMode] = useState<Mode>(null);
  const [demoAt, setDemoAt] = useState(defaultDemoSlot);
  const [note, setNote] = useState("");
  const [recap, setRecap] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function move(input: Parameters<typeof setLeadStage>[1], message: string) {
    if (!live) { onError("Demo mode", "Nothing was changed."); return; }
    setBusy(true);
    try {
      const updated = await setLeadStage(lead.id, input);
      setMode(null); setNote(""); setRecap(""); setReason("");
      onChanged(updated, message);
    } catch (err) {
      onError("Couldn't update the lead", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const facts = [
    lead.acknowledgedAtUtc && { icon: Mail, text: `Acknowledgement e-mailed ${fmt(lead.acknowledgedAtUtc)}` },
    lead.firstContactedAtUtc && { icon: CheckCircle2, text: `First response after ${hoursBetween(lead.createdAtUtc, lead.firstContactedAtUtc)}` },
    lead.demoAtUtc && { icon: CalendarCheck2, text: `${stage === "DemoBooked" ? "Demo booked for" : "Demo was"} ${fmt(lead.demoAtUtc)}` },
    lead.tenantCode && { icon: CheckCircle2, text: `Academy account: ${lead.tenantCode}` },
    lead.highIntentAtUtc && { icon: Flame, text: `High intent since ${fmt(lead.highIntentAtUtc)}: kept checking pricing` },
    stage === "Lost" && lead.lostReason && { icon: XCircle, text: `Lost: ${lead.lostReason}` },
  ].filter(Boolean) as { icon: typeof Mail; text: string }[];

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Lifecycle</h3>
        <LeadStageBadge stage={stage} />
      </div>
      {facts.length > 0 && <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">{facts.map((f) => <li key={f.text} className="flex items-start gap-2"><f.icon className="mt-0.5 h-4 w-4 shrink-0" />{f.text}</li>)}</ul>}

      {canWrite && <div className="mt-4 flex flex-wrap gap-2">
        {stage === "New" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void move({ stage: "Contacted" }, "Marked contacted")}>Mark contacted</Button>}
        {stage !== "Customer" && <Button size="sm" variant={mode === "book" ? "default" : "outline"} disabled={busy} onClick={() => setMode(mode === "book" ? null : "book")}><CalendarCheck2 className="h-4 w-4" />{stage === "DemoBooked" ? "Reschedule demo" : "Book demo"}</Button>}
        {(stage === "DemoBooked" || stage === "Contacted") && <Button size="sm" variant={mode === "done" ? "default" : "outline"} disabled={busy} onClick={() => setMode(mode === "done" ? null : "done")}><CheckCircle2 className="h-4 w-4" />Demo done</Button>}
        {stage !== "Customer" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void move({ stage: "Customer" }, "Marked as customer")}>Mark customer</Button>}
        {stage !== "Lost" && stage !== "Customer" && <Button size="sm" variant={mode === "lost" ? "destructive" : "outline"} disabled={busy} onClick={() => setMode(mode === "lost" ? null : "lost")}><XCircle className="h-4 w-4" />Lost</Button>}
        {stage === "Lost" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void move({ stage: "Contacted" }, "Lead reopened")}>Reopen</Button>}
      </div>}

      {mode === "book" && (
        <div className="mt-4 space-y-3 rounded-lg bg-muted/40 p-3">
          <label className="block space-y-1 text-sm"><span className="font-medium">Demo date and time (your time)</span><Input type="datetime-local" value={demoAt} onChange={(e) => setDemoAt(e.target.value)} /></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">Note for the team (optional)</span><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Wants to see fee reminders and the parent app" /></label>
          <p className="text-xs text-muted-foreground">{lead.workEmail ? `${lead.fullName} gets a confirmation e-mail now and reminders a day and an hour before (when switched on in Lead automation).` : "This lead has no e-mail address, so no confirmation or reminders can be sent. Confirm on WhatsApp."}</p>
          <Button size="sm" disabled={busy || !demoAt} onClick={() => void move({ stage: "DemoBooked", demoAtUtc: new Date(demoAt).toISOString(), note: note.trim() || undefined }, stage === "DemoBooked" ? "Demo rescheduled" : "Demo booked")}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{stage === "DemoBooked" ? "Save new time" : "Book and send confirmation"}</Button>
        </div>
      )}

      {mode === "done" && (
        <div className="mt-4 space-y-3 rounded-lg bg-muted/40 p-3">
          <label className="block space-y-1 text-sm"><span className="font-medium">Needs, objections and next step (team only)</span><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 180 students, 2 branches. Worried about moving fee history. Decision by owner + accountant." /></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">One line for the recap e-mail (optional, the lead sees this)</span><Input value={recap} onChange={(e) => setRecap(e.target.value)} placeholder="e.g. You run 6 abacus batches and want automatic fee reminders." /></label>
          <p className="text-xs text-muted-foreground">The lead gets a thank-you e-mail with a link to start the free trial. It's sent once per lead.</p>
          <Button size="sm" disabled={busy} onClick={() => void move({ stage: "DemoDone", note: note.trim() || undefined, recapNote: recap.trim() || undefined }, "Demo marked done")}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save and send recap</Button>
        </div>
      )}

      {mode === "lost" && (
        <div className="mt-4 space-y-3 rounded-lg bg-muted/40 p-3">
          <label className="block space-y-1 text-sm"><span className="font-medium">Why was it lost?</span>
            <select className="h-10 w-full rounded-md border bg-background px-3" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose a reason…</option>
              {["Price too high", "Chose another tool", "Not the right fit", "No response", "Not ready yet", "Too small / solo"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <Button size="sm" variant="destructive" disabled={busy || !reason} onClick={() => void move({ stage: "Lost", lostReason: reason }, "Marked lost")}>Mark lost</Button>
        </div>
      )}
    </div>
  );
}
