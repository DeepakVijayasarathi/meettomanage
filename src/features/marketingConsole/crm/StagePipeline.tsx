import { useState } from "react";
import { CalendarCheck2, Flame, Loader2, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled } from "@/lib/api";
import { cn } from "@/lib/utils";
import { inr } from "@/api/crm";
import { LEAD_STAGE_LABEL, setLeadStage, type ApiLeadStage, type ApiPlatformDemoRequest } from "@/api/marketing";

/** The sales path in order; Lost sits beside it. */
export const STAGE_PATH: ApiLeadStage[] = ["New", "Contacted", "DemoBooked", "DemoDone", "Trial", "ActiveTrial", "Customer"];
export const STAGE_DOT: Record<ApiLeadStage, string> = {
  New: "bg-amber-500", Contacted: "bg-sky-500", DemoBooked: "bg-indigo-500", DemoDone: "bg-violet-500",
  Trial: "bg-teal-500", ActiveTrial: "bg-emerald-500", Customer: "bg-green-600", Lost: "bg-slate-400",
};
export const LOST_REASONS = ["Price too high", "Chose another tool", "Not the right fit", "No response", "Not ready yet", "Too small / solo"];

const isOverdue = (l: ApiPlatformDemoRequest) => !!l.nextFollowUpAtUtc && new Date(l.nextFollowUpAtUtc).getTime() < Date.now() && l.stage !== "Customer" && l.stage !== "Lost";
const daysSince = (iso?: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null);
const shortDate = (iso: string) => new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

function localSlot(daysAhead: number, hour: number) {
  const d = new Date(); d.setDate(d.getDate() + daysAhead); d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/**
 * Moves a lead to a stage. Stages that need details (demo time, lost reason) or that e-mail the lead (demo done sends the
 * recap) ask first; the rest move straight away.
 */
export function StageMoveDialog({ move, onClose, onMoved }: { move: { lead: ApiPlatformDemoRequest; to: ApiLeadStage } | null; onClose: () => void; onMoved: (lead: ApiPlatformDemoRequest) => void }) {
  const { toast } = useToast();
  const [demoAt, setDemoAt] = useState(() => localSlot(1, 11));
  const [note, setNote] = useState("");
  const [recap, setRecap] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const to = move?.to;

  async function save() {
    if (!move) return;
    if (!apiEnabled()) { toast({ variant: "error", title: "Demo mode", description: "Nothing was changed." }); return; }
    setBusy(true);
    try {
      const updated = await setLeadStage(move.lead.id, {
        stage: move.to, note: note.trim() || undefined,
        demoAtUtc: move.to === "DemoBooked" ? new Date(demoAt).toISOString() : undefined,
        lostReason: move.to === "Lost" ? reason : undefined,
        recapNote: move.to === "DemoDone" ? recap.trim() || undefined : undefined,
      });
      toast({ variant: "success", title: `${move.lead.academyName} moved to ${LEAD_STAGE_LABEL[move.to]}` });
      setNote(""); setRecap(""); setReason("");
      onMoved(updated);
      onClose();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't move the lead", description: err instanceof Error ? err.message : undefined });
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={move !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to {to ? LEAD_STAGE_LABEL[to] : ""}</DialogTitle>
          <DialogDescription>{move ? `${move.lead.academyName} · ${move.lead.fullName}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {to === "DemoBooked" && <>
            <label className="block space-y-1 text-sm"><span className="font-medium">Demo date and time (your time)</span><Input type="datetime-local" value={demoAt} onChange={(e) => setDemoAt(e.target.value)} /></label>
            <p className="text-xs text-muted-foreground">{move?.lead.workEmail ? "The lead gets a confirmation e-mail, and reminders if they're switched on in Lead automation." : "No e-mail on this lead, so confirm the time on WhatsApp."}</p>
          </>}
          {to === "DemoDone" && <>
            <label className="block space-y-1 text-sm"><span className="font-medium">One line for the recap e-mail (optional, the lead sees this)</span><Input value={recap} onChange={(e) => setRecap(e.target.value)} placeholder="e.g. You run 6 abacus batches and want fee reminders." /></label>
            <p className="text-xs text-muted-foreground">The lead gets one thank-you e-mail with the free-trial link.</p>
          </>}
          {to === "Lost" && (
            <label className="block space-y-1 text-sm"><span className="font-medium">Why was it lost?</span>
              <select className="h-10 w-full rounded-md border bg-background px-3" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Choose a reason…</option>{LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
          )}
          <label className="block space-y-1 text-sm"><span className="font-medium">Note for the team (optional)</span><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant={to === "Lost" ? "destructive" : "default"} disabled={busy || (to === "Lost" && !reason) || (to === "DemoBooked" && !demoAt)} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Move</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Stages that move without asking anything. */
const NEEDS_DIALOG: ApiLeadStage[] = ["DemoBooked", "DemoDone", "Lost"];

/**
 * The lead pipeline by lifecycle stage: one column per stage with its count and deal value, drag a card to move it.
 */
export function StagePipeline({ leads, canWrite, onOpen, onWhatsApp, onChanged }: {
  leads: ApiPlatformDemoRequest[]; canWrite: boolean; onOpen: (lead: ApiPlatformDemoRequest) => void; onWhatsApp: (lead: ApiPlatformDemoRequest) => void; onChanged: () => void;
}) {
  const { toast } = useToast();
  const [showLost, setShowLost] = useState(false);
  const [dragOver, setDragOver] = useState<ApiLeadStage | null>(null);
  const [pending, setPending] = useState<{ lead: ApiPlatformDemoRequest; to: ApiLeadStage } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const columns = showLost ? [...STAGE_PATH, "Lost" as ApiLeadStage] : STAGE_PATH;
  const lostCount = leads.filter((l) => l.stage === "Lost").length;

  async function drop(id: string, to: ApiLeadStage) {
    setDragOver(null);
    const lead = leads.find((l) => l.id === id);
    if (!lead || (lead.stage ?? "New") === to) return;
    if (NEEDS_DIALOG.includes(to)) { setPending({ lead, to }); return; }
    if (!apiEnabled()) { toast({ variant: "error", title: "Demo mode", description: "Nothing was changed." }); return; }
    setBusyId(id);
    try { await setLeadStage(id, { stage: to }); toast({ variant: "success", title: `${lead.academyName} moved to ${LEAD_STAGE_LABEL[to]}` }); onChanged(); }
    catch (err) { toast({ variant: "error", title: "Couldn't move the lead", description: err instanceof Error ? err.message : undefined }); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{canWrite ? "Drag a card to another stage. Booking a demo, marking it done or losing a lead asks for details first." : "You have read-only access."}</span>
        <Button size="sm" variant="ghost" onClick={() => setShowLost((v) => !v)}>{showLost ? "Hide lost" : `Show lost (${lostCount})`}</Button>
      </div>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
        {columns.map((stage) => {
          const items = leads.filter((l) => (l.stage ?? "New") === stage);
          const value = items.reduce((s, l) => s + (l.expectedMonthlyValue ?? 0), 0);
          return (
            <section key={stage} aria-label={LEAD_STAGE_LABEL[stage]}
              className={cn("flex w-72 shrink-0 snap-start flex-col rounded-xl border bg-muted/25 p-2.5 transition", dragOver === stage && "border-primary bg-primary/5")}
              onDragOver={(e) => { if (canWrite) { e.preventDefault(); setDragOver(stage); } }} onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
              onDrop={(e) => { const id = e.dataTransfer.getData("text/lead-id"); if (id) void drop(id, stage); }}>
              <header className="mb-2 px-1">
                <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-full", STAGE_DOT[stage])} /><h2 className="text-sm font-semibold">{LEAD_STAGE_LABEL[stage]}</h2></div><Badge variant="outline">{items.length}</Badge></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{value > 0 ? `${inr(value)}/mo` : "No deal value yet"}</p>
              </header>
              <div className="flex max-h-[68vh] flex-col gap-2 overflow-y-auto">
                {items.map((lead) => {
                  const inStage = daysSince(lead.stageChangedAtUtc ?? lead.createdAtUtc);
                  return (
                    <article key={lead.id} draggable={canWrite} onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)} onClick={() => onOpen(lead)}
                      className={cn("cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition hover:shadow-md", busyId === lead.id && "opacity-50")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate font-semibold leading-tight">{lead.academyName}</p><p className="truncate text-xs text-muted-foreground">{lead.fullName}{lead.city ? ` · ${lead.city}` : ""}</p></div>
                        <Badge variant={lead.leadTemperature === "Hot" ? "destructive" : lead.leadTemperature === "Warm" ? "warning" : "muted"} title="Lead score">{lead.leadScore ?? 0}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        {lead.expectedMonthlyValue != null && <span className="font-semibold">{inr(lead.expectedMonthlyValue)}/mo</span>}
                        {lead.segment && <span className="text-muted-foreground">{lead.segment}</span>}
                        {lead.highIntentAtUtc && stage !== "Customer" && <span className="inline-flex items-center gap-0.5 font-semibold text-destructive"><Flame className="h-3 w-3" />High intent</span>}
                        {stage === "DemoBooked" && lead.demoAtUtc && <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300"><CalendarCheck2 className="h-3 w-3" />{shortDate(lead.demoAtUtc)}</span>}
                        {stage === "Lost" && lead.lostReason && <span className="text-muted-foreground">{lead.lostReason}</span>}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                        <span className="truncate">{lead.assignedTo ?? "Unassigned"}{inStage !== null && inStage > 0 ? ` · ${inStage}d here` : ""}</span>
                        <span className={isOverdue(lead) ? "shrink-0 font-semibold text-destructive" : "shrink-0"}>{lead.nextFollowUpAtUtc ? (isOverdue(lead) ? "Overdue" : shortDate(lead.nextFollowUpAtUtc)) : ""}</span>
                      </div>
                      {lead.phone && stage !== "Lost" && (
                        <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="h-7 flex-1 text-emerald-700" onClick={() => onWhatsApp(lead)}><MessageCircle className="h-3.5 w-3.5" />WhatsApp</Button>
                          <Button size="sm" variant="outline" className="h-7" asChild><a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} title={`Call ${lead.phone}`}><Phone className="h-3.5 w-3.5" /><span className="sr-only">Call</span></a></Button>
                        </div>
                      )}
                    </article>
                  );
                })}
                {items.length === 0 && <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">{canWrite ? "Drop leads here" : "None"}</div>}
              </div>
            </section>
          );
        })}
      </div>
      <StageMoveDialog move={pending} onClose={() => setPending(null)} onMoved={() => onChanged()} />
    </div>
  );
}
