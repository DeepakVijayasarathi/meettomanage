import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Loader2, Mail, Pause, Pencil, Play, Plus, Send, Settings2, Sparkles, Trash2, Upload, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { userMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  outreachApi, PROSPECT_STATUSES, prospectsFromCsv,
  type Campaign, type CampaignInput, type CampaignAiBrief, type ImportResult, type OutreachSettings, type OutreachSummary, type Prospect, type ProspectInput, type ProspectStatus,
  type OutreachAnalytics, type OutreachAiInsights, type RegionCount,
  type PipelineStage, type ProspectDetail, type RecipientFilter,
  type TodayDashboard, type ReplyItem, type ReplyInbox, type ReplyAnalysis, type ReplyThreadMessage,
  type GrowthDashboard,
} from "@/api/outreach";

const ALL = "all";
const statusLabel = (s: ProspectStatus) => PROSPECT_STATUSES.find((x) => x.value === s)?.label ?? s;
const statusVariant = (s: ProspectStatus) =>
  s === "Interested" || s === "Replied" ? "success" : s === "Unsubscribed" || s === "Bounced" || s === "NotInterested" ? "muted" : s === "Contacted" ? "secondary" : "outline";

/** Marketing console: cold e-mail to academies, with prospects, short campaigns and safe, limited sending. */
export default function MarketingOutreach() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<OutreachSummary | null>(null);
  const loadSummary = useCallback(() => outreachApi.summary().then(setSummary).catch(() => undefined), []);
  useEffect(() => { void loadSummary(); }, [loadSummary]);

  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div>
      <PageHeader eyebrow="Outreach" title="Cold email" description="Reach academies that don't know you yet: add prospects, write a short sequence and let it send a few a day." />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {summary?.ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />}
            <div className="text-sm">
              <p className="font-semibold">{summary ? (summary.ready ? "Sending is ready" : "Sending is off") : "Checking…"}</p>
              <p className="text-muted-foreground">
                {summary && (summary.ready
                  ? <>From <b>{summary.from}</b>{summary.replyTo ? <>, replies go to <b>{summary.replyTo}</b></> : null}. Sends {summary.sendingHours}, spread out.</>
                  : summary.notReadyReason)}
              </p>
            </div>
          </div>
          {summary && (
            <div className="flex items-center gap-3 text-sm">
              <span><b>{summary.sentToday}</b> of <b>{summary.dailyLimit}</b> sent today</span>
              <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}><Settings2 className="mr-1.5 h-3.5 w-3.5" />Settings</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="prospects">Leads</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="replies" className="gap-1.5">Replies<span className={`h-2 w-2 rounded-full ${summary?.replySyncReady && summary?.imapSyncReady ? "bg-success" : "bg-warning"}`} title={summary?.replySyncReady && summary?.imapSyncReady ? "Zoho mailbox synchronization ready" : "Zoho IMAP credentials are not configured"} /></TabsTrigger>
          <TabsTrigger value="regions">Analytics</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4"><TodayTab /></TabsContent>
        <TabsContent value="prospects" className="mt-4"><ProspectsTab onChange={loadSummary} /></TabsContent>
        <TabsContent value="campaigns" className="mt-4"><CampaignsTab summary={summary} onChange={loadSummary} /></TabsContent>
        <TabsContent value="replies" className="mt-4"><RepliesTab /></TabsContent>
        <TabsContent value="regions" className="mt-4"><RegionalDashboard /></TabsContent>
        <TabsContent value="growth" className="mt-4"><GrowthTab /></TabsContent>
      </Tabs>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} onSaved={() => { setSettingsOpen(false); void loadSummary(); toast({ variant: "success", title: "Cold e-mail settings saved" }); }} />}
    </div>
  );
}

const TIME_ZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Riyadh", "Europe/London", "America/New_York", "Australia/Sydney"];

/** Every cold e-mail setting: who it's from, when and how much it sends, and the compliance footer. */
function SettingsDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<OutreachSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { outreachApi.settings().then(setForm).catch((err) => setError(userMessage(err, "Couldn't load the settings."))); }, []);
  const set = <K extends keyof OutreachSettings>(k: K, v: OutreachSettings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const num = (k: keyof OutreachSettings) => (e: ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);

  async function save() {
    if (!form) return;
    setSaving(true); setError(null);
    try { await outreachApi.saveSettings({ ...form, replyTo: form.replyTo?.trim() ? form.replyTo.trim() : null }); onSaved(); }
    catch (err) { setError(userMessage(err, "Couldn't save the settings.")); }
    finally { setSaving(false); }
  }

  const zones = form && !TIME_ZONES.includes(form.timeZoneId) ? [form.timeZoneId, ...TIME_ZONES] : TIME_ZONES;
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cold e-mail settings</DialogTitle>
          <DialogDescription>Applies to every campaign. The sender address must be on a domain verified in your e-mail provider (Resend).</DialogDescription>
        </DialogHeader>
        {!form ? <p className="py-6 text-center text-sm text-muted-foreground">{error ?? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading…</>}</p> : (
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">Sender</p>
            <div className="grid gap-1.5"><Label htmlFor="s-name">Sender name</Label><Input id="s-name" maxLength={80} value={form.fromName} onChange={(e) => set("fromName", e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="s-from">Sender address</Label><Input id="s-from" type="email" value={form.fromAddress} onChange={(e) => set("fromAddress", e.target.value)} /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="s-reply">Replies go to (leave empty to use the sender address)</Label><Input id="s-reply" type="email" value={form.replyTo ?? ""} onChange={(e) => set("replyTo", e.target.value)} /></div>

            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">Sending</p>
            <div className="grid gap-1.5"><Label htmlFor="s-limit">Most e-mails per day</Label><Input id="s-limit" type="number" min={1} max={500} value={form.dailyLimit} onChange={num("dailyLimit")} /></div>
            <div className="grid gap-1.5"><Label htmlFor="s-tz">Time zone</Label>
              <Select value={form.timeZoneId} onValueChange={(v) => set("timeZoneId", v)}>
                <SelectTrigger id="s-tz"><SelectValue /></SelectTrigger>
                <SelectContent>{zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="s-start">Send from (hour, 0–23)</Label><Input id="s-start" type="number" min={0} max={23} value={form.windowStartHour} onChange={num("windowStartHour")} /></div>
            <div className="grid gap-1.5"><Label htmlFor="s-end">Send until (hour, 1–24)</Label><Input id="s-end" type="number" min={1} max={24} value={form.windowEndHour} onChange={num("windowEndHour")} /></div>
            <div className="grid gap-1.5"><Label htmlFor="s-gap">Shortest gap between e-mails (days)</Label><Input id="s-gap" type="number" min={1} max={30} value={form.minFollowUpDays} onChange={num("minFollowUpDays")} /></div>
            <div className="grid gap-1.5"><Label htmlFor="s-fail">Failed attempts before "bounced"</Label><Input id="s-fail" type="number" min={1} max={10} value={form.maxFailuresPerStep} onChange={num("maxFailuresPerStep")} /></div>

            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">Footer (added to every e-mail, above and below the unsubscribe link)</p>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="s-footer">Why they're getting this</Label><Textarea id="s-footer" rows={2} maxLength={500} value={form.footerText} onChange={(e) => set("footerText", e.target.value)} /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="s-company">Company name and location</Label><Input id="s-company" maxLength={200} value={form.companyLine} onChange={(e) => set("companyLine", e.target.value)} /></div>
            {error && <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !form} onClick={() => { void save(); }}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- AI sales copilot

function AiDraftDialog({ prospectId, purpose, title, onClose }: { prospectId: string; purpose: "first-contact" | "reply"; title: string; onClose: () => void }) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState(purpose === "reply" ? "Re: Meet to Manage" : "A simpler way to manage {{AcademyName}}");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  useEffect(() => { outreachApi.draftMessage(prospectId, purpose).then((r) => setMessage(r.message)).catch((err) => toast({ variant: "error", title: "Couldn't create AI draft", description: userMessage(err) })).finally(() => setLoading(false)); }, [prospectId, purpose, toast]);
  async function send() { if (!window.confirm("Send this reviewed email now?")) return; setSending(true); try { await outreachApi.sendProspectMessage(prospectId, purpose, subject, message); toast({ variant: "success", title: purpose === "reply" ? "Reply sent" : "Email sent", description: purpose === "first-contact" ? "The lead is now Contacted and follow-up is due in 3 days." : "The reply was recorded in the conversation." }); onClose(); } catch (err) { toast({ variant: "error", title: "Email wasn't sent", description: userMessage(err) }); } finally { setSending(false); } }
  return <Dialog open onOpenChange={(o) => !o && !sending && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>AI prepared this email from verified lead details. Edit and approve it before sending.</DialogDescription></DialogHeader>{loading ? <p className="p-8 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></p> : <div className="space-y-3"><div className="grid gap-1.5"><Label>Subject</Label><Input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} /></div><div className="grid gap-1.5"><Label>Message</Label><Textarea rows={10} value={message} onChange={(e) => setMessage(e.target.value)} /></div><p className="text-xs text-muted-foreground">An unsubscribe link and your company footer are added automatically.</p></div>}<DialogFooter><Button variant="outline" disabled={sending} onClick={onClose}>Close</Button><Button variant="outline" disabled={!message || sending} onClick={async () => { await navigator.clipboard.writeText(message); toast({ variant: "success", title: "Draft copied" }); }}>Copy</Button><Button disabled={loading || sending || !subject.trim() || !message.trim()} onClick={() => void send()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? "Sending…" : "Send approved email"}</Button></DialogFooter></DialogContent></Dialog>;
}

function TodayTab() {
  const { toast } = useToast();
  const [data, setData] = useState<TodayDashboard | null>(null);
  const [draft, setDraft] = useState<{ id: string; purpose: "first-contact" | "reply"; title: string } | null>(null);
  const load = useCallback(() => outreachApi.today().then(setData).catch((err) => toast({ variant: "error", title: "Couldn't load today's sales queue", description: userMessage(err) })), [toast]);
  useEffect(() => { void load(); }, [load]);
  if (!data) return <Card><CardContent className="p-10 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></CardContent></Card>;
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3">{[["Hot leads", data.hotLeads.length], ["Replies to handle", data.replies.length], ["Open tasks", data.tasks.length]].map(([label, n]) => <Card key={String(label)}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{n}</p></CardContent></Card>)}</div>
    <div className="grid gap-5 xl:grid-cols-2"><Card><CardContent className="p-5"><h2 className="mb-1 font-semibold">Best leads to contact</h2><p className="mb-4 text-xs text-muted-foreground">Highest-fit new and qualified academies.</p><div className="space-y-2">{data.hotLeads.map((lead) => <div key={lead.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{lead.academyName || lead.email}</p><p className="text-xs text-muted-foreground">{lead.region || "Unassigned"} · {lead.scoreReason || "Qualified profile"}</p></div><div className="flex items-center gap-2"><Badge variant="success">{lead.leadScore}</Badge><Button size="sm" onClick={() => setDraft({ id: lead.id, purpose: "first-contact", title: `AI message · ${lead.academyName || lead.email}` })}><Sparkles className="h-3.5 w-3.5" />Draft</Button></div></div>)}{data.hotLeads.length === 0 && <p className="text-sm text-muted-foreground">No qualified leads waiting.</p>}</div></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="mb-1 font-semibold">Replies needing action</h2><p className="mb-4 text-xs text-muted-foreground">Respond quickly to interested academies.</p><div className="space-y-2">{data.replies.map((lead) => <div key={lead.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{lead.academyName || lead.email}</p><p className="text-xs text-muted-foreground">{lead.region || "Unassigned"} · next action {lead.nextActionAtUtc ? formatDate(lead.nextActionAtUtc) : "now"}</p></div><Button size="sm" onClick={() => setDraft({ id: lead.id, purpose: "reply", title: `AI reply · ${lead.academyName || lead.email}` })}><Sparkles className="h-3.5 w-3.5" />Reply</Button></div>)}{data.replies.length === 0 && <p className="text-sm text-muted-foreground">No replies waiting.</p>}</div></CardContent></Card></div>
    <Card><CardContent className="p-5"><h2 className="mb-3 font-semibold">Follow-up queue</h2><div className="space-y-2">{data.tasks.map((task) => <div key={task.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><div><p className="font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{task.academyName || task.email} · {task.assignedTo || "Unassigned"} · {formatDate(task.dueAtUtc)}</p></div><Button size="sm" variant="outline" onClick={async () => { await outreachApi.completeTask(task.id); await load(); }}>Complete</Button></div>)}{data.tasks.length === 0 && <p className="text-sm text-muted-foreground">No open follow-ups.</p>}</div></CardContent></Card>{draft && <AiDraftDialog prospectId={draft.id} purpose={draft.purpose} title={draft.title} onClose={() => setDraft(null)} />}</div>;
}

function RepliesTab() {
  const { toast } = useToast();
  const [inbox, setInbox] = useState<ReplyInbox | null>(null);
  const [selected, setSelected] = useState<ReplyItem | null>(null);
  const [filter, setFilter] = useState<"open" | "all" | "handled">("open");
  const load = useCallback(() => outreachApi.replies().then(setInbox).catch((err) => toast({ variant: "error", title: "Couldn't load replies", description: userMessage(err) })), [toast]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 60000); return () => window.clearInterval(timer); }, [load]);
  const items = (inbox?.items ?? []).filter((x) => filter === "all" || (filter === "handled" ? x.handled : !x.handled));
  async function handled(reply: ReplyItem) { try { await outreachApi.markReplyHandled(reply.id); toast({ variant: "success", title: "Reply marked handled" }); await load(); } catch (err) { toast({ variant: "error", title: "Couldn't update reply", description: userMessage(err) }); } }
  if (!inbox) return <Card><CardContent className="p-10 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></CardContent></Card>;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["Needs response", inbox.needsResponse], ["Over 24 hours", inbox.overdue], ["Buying intent", inbox.interested], ["Avg. response", inbox.averageResponseHours == null ? "—" : `${inbox.averageResponseHours}h`], ["All replies", inbox.total]].map(([label, value], i) => <Card key={String(label)}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${i === 1 && Number(value) > 0 ? "text-destructive" : ""}`}>{value}</p></CardContent></Card>)}</div>
    <Card><CardContent className="p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">AI reply monitor</h2><p className="text-xs text-muted-foreground">Refreshes every minute. Incoming replies stop campaign follow-ups automatically.</p></div><div className="flex rounded-lg bg-muted p-1">{(["open", "all", "handled"] as const).map((x) => <button key={x} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${filter === x ? "bg-background shadow-sm" : "text-muted-foreground"}`} onClick={() => setFilter(x)}>{x}</button>)}</div></div>
      {items.length === 0 ? <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{filter === "open" ? "Inbox zero — no replies need attention." : "No replies in this view."}</p> : <div className="space-y-3">{items.map((reply) => <div key={reply.id} className={`rounded-xl border p-4 ${!reply.handled && reply.urgency === "High" ? "border-destructive/40 bg-destructive/[0.02]" : ""}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{reply.academyName || reply.firstName || reply.email}</p><Badge variant={reply.intent === "Interested" || reply.intent === "DemoRequest" || reply.intent === "Pricing" ? "success" : reply.intent === "Unsubscribe" || reply.intent === "NotInterested" ? "muted" : "secondary"}>{reply.intent.replace(/([A-Z])/g, " $1").trim()}</Badge>{!reply.handled && <Badge variant={reply.urgency === "High" ? "destructive" : "outline"}>{reply.urgency} priority</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{reply.email} · {reply.region || "Unassigned"} · {formatDate(reply.createdAtUtc)} · {reply.ageHours < 1 ? "less than 1 hour ago" : `${Math.round(reply.ageHours)} hours ago`}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setSelected(reply)}><Sparkles className="h-3.5 w-3.5" />Analyze & reply</Button>{!reply.handled && <Button size="sm" variant="outline" onClick={() => void handled(reply)}><CheckCircle2 className="h-3.5 w-3.5" />Mark handled</Button>}</div></div>{reply.subject && <p className="mt-3 text-sm font-medium">{reply.subject}</p>}<p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{reply.detail}</p></div>)}</div>}
    </CardContent></Card>{selected && <ReplyAnalysisDialog reply={selected} onClose={() => setSelected(null)} onHandled={async () => { await handled(selected); setSelected(null); }} />}
  </div>;
}

function ReplyAnalysisDialog({ reply, onClose, onHandled }: { reply: ReplyItem; onClose: () => void; onHandled: () => Promise<void> }) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<ReplyAnalysis | null>(null);
  const [text, setText] = useState("");
  const [thread, setThread] = useState<ReplyThreadMessage[]>([]);
  const [sending, setSending] = useState(false);
  const subject = reply.subject?.toLowerCase().startsWith("re:") ? reply.subject : `Re: ${reply.subject || "Your enquiry"}`;
  useEffect(() => { Promise.all([outreachApi.analyzeReply(reply.id), outreachApi.replyThread(reply.id)]).then(([x, messages]) => { setAnalysis(x); setText(x.suggestedReply); setThread(messages); }).catch((err) => toast({ variant: "error", title: "AI analysis unavailable", description: userMessage(err) })); }, [reply.id, toast]);
  async function send() { if (!window.confirm(`Send this reply to ${reply.email}?`)) return; setSending(true); try { await outreachApi.sendReply(reply.id, subject, text); toast({ variant: "success", title: "Reply sent", description: "The conversation and response time have been recorded." }); await onHandled(); } catch (err) { toast({ variant: "error", title: "Reply wasn't sent", description: userMessage(err) }); } finally { setSending(false); } }
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>AI reply assistant · {reply.academyName || reply.email}</DialogTitle><DialogDescription>AI prepares the response; you approve it before the platform sends anything.</DialogDescription></DialogHeader>{!analysis ? <div className="p-10 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /><p className="mt-2 text-sm text-muted-foreground">Reading the conversation and preparing a response…</p></div> : <div className="space-y-4"><div className="flex flex-wrap gap-2"><Badge variant="secondary">{analysis.intent}</Badge><Badge variant="outline">{analysis.sentiment}</Badge><Badge variant={analysis.urgency === "High" ? "destructive" : "outline"}>{analysis.urgency} priority</Badge><Badge variant="outline">{analysis.aiPowered ? "AI analyzed" : "Safe fallback"}</Badge></div><div className="rounded-lg bg-muted/50 p-3 text-sm"><p className="font-medium">Summary</p><p className="mt-1 text-muted-foreground">{analysis.summary}</p><p className="mt-3 font-medium">Recommended next action</p><p className="mt-1 text-muted-foreground">{analysis.nextAction}</p></div><div><Label>Conversation history</Label><div className="mt-1 max-h-52 space-y-2 overflow-y-auto rounded-lg border p-3">{thread.map((message) => <div key={message.id} className={`max-w-[88%] rounded-lg p-3 text-sm ${message.direction === "Inbound" ? "bg-muted" : "ml-auto bg-primary/10"}`}><div className="flex justify-between gap-3 text-xs font-medium"><span>{message.direction}</span><span className="text-muted-foreground">{formatDate(message.createdAtUtc)}</span></div>{message.subject && <p className="mt-1 font-medium">{message.subject}</p>}<p className="mt-1 whitespace-pre-wrap text-muted-foreground">{message.detail}</p></div>)}</div></div><div className="grid gap-1.5"><Label>Subject</Label><Input value={subject} readOnly /></div><div className="grid gap-1.5"><Label>Editable AI response</Label><Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} /><p className="text-xs text-muted-foreground">For demo requests, include your booking page: https://meettomanage.cloud/demo</p></div></div>}<DialogFooter><Button variant="outline" onClick={onClose}>Close</Button><Button variant="outline" disabled={!text || sending} onClick={async () => { await navigator.clipboard.writeText(text); toast({ variant: "success", title: "Reply copied" }); }}><Mail className="h-4 w-4" />Copy</Button><Button disabled={!analysis || !text.trim() || reply.handled || sending || reply.intent === "Unsubscribe"} onClick={() => void send()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send approved reply</Button></DialogFooter></DialogContent></Dialog>;
}

// ---------------------------------------------------------------- prospects

function ProspectsTab({ onChange }: { onChange: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>(ALL);
  const [region, setRegion] = useState<string>(ALL);
  const [regions, setRegions] = useState<RegionCount[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: Prospect[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [detailProspect, setDetailProspect] = useState<Prospect | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await outreachApi.prospects({ status: status === ALL ? "" : (status as ProspectStatus), region: region === ALL ? "" : region, search, page })); }
    catch (err) { toast({ variant: "error", title: "Couldn't load prospects", description: userMessage(err, "Please try again.") }); }
    finally { setLoading(false); }
  }, [status, region, search, page, toast]);
  useEffect(() => { const t = setTimeout(() => { void load(); }, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { outreachApi.regions().then(setRegions).catch(() => undefined); }, [data.total]);

  async function setProspectStatus(p: Prospect, next: ProspectStatus) {
    try { await outreachApi.updateProspect(p.id, { status: next }); void load(); onChange(); }
    catch (err) { toast({ variant: "error", title: "Couldn't update", description: userMessage(err, "Please try again.") }); }
  }

  async function remove(p: Prospect) {
    if (!window.confirm(`Remove ${p.email}? They won't be e-mailed, and can't be added again later.`)) return;
    try { await outreachApi.deleteProspect(p.id); void load(); onChange(); }
    catch (err) { toast({ variant: "error", title: "Couldn't remove", description: userMessage(err, "Please try again.") }); }
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (!ids.length || !window.confirm(`Remove ${ids.length} selected prospect${ids.length === 1 ? "" : "s"}? They will be stopped in active campaigns.`)) return;
    setBulkBusy(true);
    try {
      const result = await outreachApi.bulkDeleteProspects(ids);
      setSelected(new Set()); void load(); onChange();
      toast({ variant: "success", title: `${result.deleted} prospect${result.deleted === 1 ? "" : "s"} removed` });
    } catch (err) { toast({ variant: "error", title: "Bulk delete failed", description: userMessage(err, "Please try again.") }); }
    finally { setBulkBusy(false); }
  }

  const pageIds = data.items.map((p) => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const togglePage = () => setSelected((current) => {
    const next = new Set(current); if (allPageSelected) pageIds.forEach((id) => next.delete(id)); else pageIds.forEach((id) => next.add(id)); return next;
  });

  const pages = Math.max(1, Math.ceil(data.total / 50));
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search e-mail, name, academy or city" className="w-full sm:w-72" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {PROSPECT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={(v) => { setRegion(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All regions" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All regions</SelectItem>{regions.map((r) => <SelectItem key={r.region} value={r.region}>{r.region} ({r.count})</SelectItem>)}</SelectContent>
          </Select>
          <div className="ms-auto flex gap-2">
            {selected.size > 0 && <Button variant="destructive" disabled={bulkBusy} onClick={() => void bulkDelete()}>{bulkBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}Delete selected ({selected.size})</Button>}
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-1.5 h-4 w-4" />Import CSV</Button>
            <Button onClick={() => setAddOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" />Add prospect</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="w-10 py-2 pr-2"><input type="checkbox" aria-label="Select all prospects on this page" checked={allPageSelected} onChange={togglePage} /></th><th className="py-2 pr-3">Prospect</th><th className="py-2 pr-3">Academy</th><th className="py-2 pr-3">Score</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Last e-mailed</th><th className="py-2" /></tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 pr-2"><input type="checkbox" aria-label={`Select ${p.email}`} checked={selected.has(p.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; })} /></td>
                  <td className="py-2.5 pr-3"><div className="font-medium">{p.firstName || "—"}</div><div className="text-xs text-muted-foreground">{p.email}</div></td>
                  <td className="py-2.5 pr-3"><div>{p.academyName || "—"}</div><div className="text-xs text-muted-foreground">{[p.region, p.city, p.source].filter(Boolean).join(" · ")}</div></td>
                  <td className="py-2.5 pr-3"><Badge variant={p.leadScore >= 70 ? "success" : p.leadScore >= 45 ? "secondary" : "outline"}>{p.leadScore}</Badge></td>
                  <td className="py-2.5 pr-3">
                    {p.status === "Unsubscribed"
                      ? <Badge variant="muted">Unsubscribed</Badge>
                      : <Select value={p.status} onValueChange={(v) => { void setProspectStatus(p, v as ProspectStatus); }}>
                        <SelectTrigger className="h-8 w-40"><SelectValue>{<Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>}</SelectValue></SelectTrigger>
                        <SelectContent>{PROSPECT_STATUSES.filter((s) => s.value !== "Unsubscribed").map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{p.lastContactedAtUtc ? formatDate(p.lastContactedAtUtc) : "—"}</td>
                  <td className="py-2.5 text-right"><Button size="sm" variant="ghost" onClick={() => setDetailProspect(p)}>View</Button><Button size="sm" variant="ghost" aria-label={`Remove ${p.email}`} onClick={() => { void remove(p); }}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && data.items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No prospects yet. Add one, or import a CSV with an "Email" column.</p>}
          {loading && <p className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading…</p>}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.total} prospect{data.total === 1 ? "" : "s"}</span>
          {pages > 1 && <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span>Page {page} / {pages}</span>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>}
        </div>
      </CardContent>
      <AddProspectDialog open={addOpen} onOpenChange={setAddOpen} onAdded={() => { void load(); onChange(); }} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => { void load(); onChange(); }} />
      {detailProspect && <ProspectDetailDialog prospect={detailProspect} onClose={() => setDetailProspect(null)} onChanged={() => { void load(); onChange(); }} />}
    </Card>
  );
}

function AddProspectDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; onAdded: () => void }) {
  const { toast } = useToast();
  const empty: ProspectInput = { email: "", firstName: "", academyName: "", city: "", region: "", phone: "", source: "" };
  const [form, setForm] = useState<ProspectInput>(empty);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof ProspectInput) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    try { await outreachApi.addProspect(form); toast({ variant: "success", title: "Prospect added" }); setForm(empty); onOpenChange(false); onAdded(); }
    catch (err) { toast({ variant: "error", title: "Couldn't add", description: userMessage(err, "Please try again.") }); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add prospect</DialogTitle><DialogDescription>Someone at an academy who may want the platform.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="p-email">E-mail *</Label><Input id="p-email" type="email" value={form.email} onChange={set("email")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="p-name">First name</Label><Input id="p-name" value={form.firstName ?? ""} onChange={set("firstName")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="p-academy">Academy</Label><Input id="p-academy" value={form.academyName ?? ""} onChange={set("academyName")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="p-city">City</Label><Input id="p-city" value={form.city ?? ""} onChange={set("city")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="p-region">Region</Label><Input id="p-region" placeholder="e.g. Chennai, Delhi NCR" value={form.region ?? ""} onChange={set("region")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="p-phone">Phone</Label><Input id="p-phone" value={form.phone ?? ""} onChange={set("phone")} /></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="p-source">Where you found them</Label><Input id="p-source" placeholder="e.g. Justdial, event, referral" value={form.source ?? ""} onChange={set("source")} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving || !form.email.trim()} onClick={() => { void save(); }}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PIPELINE_STAGES: PipelineStage[] = ["New", "Qualified", "Contacted", "Replied", "DemoBooked", "Trial", "Negotiation", "Won", "Lost"];

function ProspectDetailDialog({ prospect, onClose, onChanged }: { prospect: Prospect; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const [data, setData] = useState<ProspectDetail | null>(null);
  const [note, setNote] = useState("");
  const [task, setTask] = useState({ title: "", assignedTo: prospect.assignedTo ?? "", due: "" });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<"first-contact" | "reply" | null>(null);
  const [edit, setEdit] = useState<{ pipelineStage: PipelineStage; assignedTo: string; nextAction: string }>({ pipelineStage: "New", assignedTo: "", nextAction: "" });
  const load = useCallback(() => outreachApi.prospectDetail(prospect.id).then(setData).catch((err) => toast({ variant: "error", title: "Couldn't load prospect", description: userMessage(err) })), [prospect.id, toast]);
  useEffect(() => { void load(); }, [load]);
  const toLocalInput = (utc: string | null | undefined) => { if (!utc) return ""; const d = new Date(utc); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); };
  useEffect(() => { if (!data) return; const stage = PIPELINE_STAGES.includes(data.prospect.pipelineStage) ? data.prospect.pipelineStage : "New"; setEdit({ pipelineStage: stage, assignedTo: data.prospect.assignedTo ?? "", nextAction: toLocalInput(data.prospect.nextActionAtUtc) }); setTask((t) => ({ ...t, assignedTo: data.prospect.assignedTo ?? t.assignedTo })); }, [data]);
  async function update(patch: Parameters<typeof outreachApi.updateProspect>[1]) { setBusy(true); setSaved(false); try { await outreachApi.updateProspect(prospect.id, patch); await load(); onChanged(); setSaved(true); setTimeout(() => setSaved(false), 2500); } catch (err) { toast({ variant: "error", title: "Couldn't save changes", description: userMessage(err) }); } finally { setBusy(false); } }
  async function saveProfile() { await update({ pipelineStage: edit.pipelineStage, assignedTo: edit.assignedTo, ...(edit.nextAction ? { nextActionAtUtc: new Date(edit.nextAction).toISOString() } : {}) }); }
  async function addNote() { if (!note.trim()) return; setBusy(true); try { await outreachApi.addNote(prospect.id, note.trim()); setNote(""); await load(); toast({ variant: "success", title: "Note added" }); } catch (err) { toast({ variant: "error", title: "Couldn't add note", description: userMessage(err) }); } finally { setBusy(false); } }
  async function addTask() { if (!task.title.trim() || !task.due) return; setBusy(true); try { await outreachApi.addTask(prospect.id, task.title.trim(), new Date(task.due).toISOString(), task.assignedTo); setTask({ ...task, title: "", due: "" }); await load(); onChanged(); toast({ variant: "success", title: "Task created" }); } catch (err) { toast({ variant: "error", title: "Couldn't create task", description: userMessage(err) }); } finally { setBusy(false); } }
  async function rescore() { setBusy(true); try { await outreachApi.rescore(prospect.id); await load(); onChanged(); toast({ variant: "success", title: "AI qualification refreshed" }); } catch (err) { toast({ variant: "error", title: "Couldn't refresh qualification", description: userMessage(err) }); } finally { setBusy(false); } }
  const hasReply = data?.activities.some((a) => a.type === "ReplyReceived") ?? false;
  const score = data?.prospect.leadScore ?? prospect.leadScore ?? 0;
  return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-h-[94vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto p-0 sm:w-full">
    <div className="sticky top-0 z-10 border-b bg-background px-5 py-4 sm:px-6"><DialogHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:pr-8"><div><DialogTitle>{data?.prospect.academyName || prospect.email}</DialogTitle><DialogDescription className="mt-1">{prospect.email} · {[data?.prospect.region, data?.prospect.city].filter(Boolean).join(" · ") || "Region unassigned"}</DialogDescription></div>{data && <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setDraft(hasReply ? "reply" : "first-contact")}><Sparkles className="h-4 w-4" />{hasReply ? "Draft reply" : "Generate email"}</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void update({ pipelineStage: "DemoBooked" })}>Mark demo booked</Button></div>}</div></DialogHeader></div>
    {!data ? <p className="p-12 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></p> : <div className="space-y-6 p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_2fr]"><div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI qualification</p><p className="mt-1 text-3xl font-bold">{score}<span className="text-sm font-normal text-muted-foreground">/100</span></p></div><Badge variant={score >= 70 ? "success" : score >= 45 ? "secondary" : "outline"}>{score >= 70 ? "Strong fit" : score >= 45 ? "Good fit" : "Research"}</Badge></div><p className="mt-3 text-sm text-muted-foreground">{data.prospect.scoreReason || "Add more business information to improve qualification."}</p><Button className="mt-3" size="sm" variant="outline" disabled={busy} onClick={() => void rescore()}><Sparkles className="h-3.5 w-3.5" />Refresh AI analysis</Button></div>
        <div className="rounded-xl border p-4"><p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sales details</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="grid gap-1.5"><Label>Pipeline stage</Label><Select value={edit.pipelineStage} onValueChange={(v) => setEdit({ ...edit, pipelineStage: v as PipelineStage })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s.replace(/([A-Z])/g, " $1").trim()}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-1.5"><Label>Owner</Label><Input value={edit.assignedTo} placeholder="Team member" onChange={(e) => setEdit({ ...edit, assignedTo: e.target.value })} /></div><div className="grid gap-1.5"><Label>Next action</Label><Input type="datetime-local" value={edit.nextAction} onChange={(e) => setEdit({ ...edit, nextAction: e.target.value })} /></div></div><div className="mt-3 flex items-center justify-end gap-2"><span className="text-xs text-success">{saved ? "Saved" : ""}</span><Button size="sm" disabled={busy} onClick={() => void saveProfile()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save changes</Button></div></div></div>
      <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{data.prospect.phone || "Not available"}</p></div><div><p className="text-xs text-muted-foreground">Status</p><Badge className="mt-1" variant={statusVariant(data.prospect.status)}>{statusLabel(data.prospect.status)}</Badge></div><div><p className="text-xs text-muted-foreground">Last contacted</p><p className="font-medium">{data.prospect.lastContactedAtUtc ? formatDate(data.prospect.lastContactedAtUtc) : "Not contacted"}</p></div><div><p className="text-xs text-muted-foreground">Source</p>{data.prospect.source?.startsWith("http") ? <a className="font-medium text-primary hover:underline" href={data.prospect.source} target="_blank" rel="noreferrer">Open source ↗</a> : <p className="font-medium">{data.prospect.source || "Not recorded"}</p>}</div></div>
      <div className="grid gap-6 lg:grid-cols-2"><section><h3 className="mb-3 font-semibold">Tasks</h3><div className="mb-3 space-y-2 rounded-xl border p-3"><Input placeholder="What needs to happen next?" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} /><div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Owner" value={task.assignedTo} onChange={(e) => setTask({ ...task, assignedTo: e.target.value })} /><Input type="datetime-local" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} /></div><div className="flex justify-end"><Button size="sm" disabled={busy || !task.title || !task.due} onClick={() => void addTask()}>Create task</Button></div></div><div className="space-y-2">{data.tasks.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No tasks yet. Create the next sales action above.</p> : data.tasks.map((t) => <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><div><p className={t.completedAtUtc ? "line-through text-muted-foreground" : "font-medium"}>{t.title}</p><p className="text-xs text-muted-foreground">{t.assignedTo || "Unassigned"} · {formatDate(t.dueAtUtc)}</p></div>{!t.completedAtUtc && <Button size="sm" variant="outline" onClick={async () => { await outreachApi.completeTask(t.id); await load(); }}>Complete</Button>}</div>)}</div></section>
        <section><h3 className="mb-3 font-semibold">Activity timeline</h3><div className="mb-3 rounded-xl border p-3"><Textarea rows={3} placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} /><div className="mt-2 flex justify-end"><Button size="sm" disabled={busy || !note.trim()} onClick={() => void addNote()}>Add note</Button></div></div><div className="max-h-80 space-y-2 overflow-y-auto">{data.activities.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No activity yet. Generate an email, add a note, or create a follow-up task.</p> : data.activities.map((a) => <div key={a.id} className={`rounded-xl border border-l-4 p-3 text-sm ${a.type === "ReplyReceived" ? "border-l-success" : a.type === "EmailSent" ? "border-l-primary" : "border-l-muted-foreground/40"}`}><div className="flex justify-between gap-3"><Badge variant="outline">{a.type.replace(/([A-Z])/g, " $1").trim()}</Badge><span className="text-xs text-muted-foreground">{formatDate(a.createdAtUtc)}</span></div>{a.subject && <p className="mt-2 font-medium">{a.subject}</p>}<p className="mt-1 whitespace-pre-wrap text-muted-foreground">{a.detail}</p>{a.createdBy && <p className="mt-1 text-xs text-muted-foreground">by {a.createdBy}</p>}</div>)}</div></section></div>
    </div>}<div className="sticky bottom-0 flex justify-end border-t bg-background px-5 py-3 sm:px-6"><Button variant="outline" onClick={onClose}>Close</Button></div>{draft && <AiDraftDialog prospectId={prospect.id} purpose={draft} title={`${draft === "reply" ? "AI reply" : "AI email"} · ${data?.prospect.academyName || prospect.email}`} onClose={() => setDraft(null)} />}</DialogContent></Dialog>;
}

function ImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (o: boolean) => void; onImported: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const parsed = prospectsFromCsv(text);

  async function readFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setText(await file.text());
  }

  async function run() {
    setBusy(true);
    try {
      const r = await outreachApi.importProspects(parsed.rows, source.trim());
      setResult(r); onImported();
      toast({ variant: "success", title: `${r.added} added, ${r.restored} restored`, description: r.skipped.length ? `${r.skipped.length} skipped` : undefined });
    } catch (err) { toast({ variant: "error", title: "Import failed", description: userMessage(err, "Please try again.") }); }
    finally { setBusy(false); }
  }

  const close = (o: boolean) => { if (busy) return; onOpenChange(o); if (!o) { setText(""); setResult(null); setSource(""); } };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import prospects</DialogTitle>
          <DialogDescription>A CSV with a header row. Columns are matched by name: Email (required), First name, Academy, City, Region, Phone, Source and Notes. Region-wise files can be imported directly.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-2 text-sm">
            <p><b>{result.added}</b> added, <b>{result.restored}</b> restored, <b>{result.skipped.length}</b> skipped.</p>
            {result.skipped.length > 0 && <ul className="max-h-48 overflow-y-auto rounded-md border p-2 text-xs">{result.skipped.map((s, i) => <li key={i}><span className="font-mono">{s.email || "(blank)"}</span>: {s.reason}</li>)}</ul>}
          </div>
        ) : (
          <div className="space-y-3">
            <Input type="file" accept=".csv,text/csv" onChange={(e) => { void readFile(e); }} />
            <Textarea rows={7} placeholder={"Email,First name,Academy,City,Region\nanita@sunriseabacus.in,Anita,Sunrise Abacus,Chennai,Chennai"} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" />
            <div className="grid gap-1.5"><Label htmlFor="imp-source">Where these contacts came from (for rows without a Source)</Label><Input id="imp-source" placeholder="e.g. Justdial, Chennai, Nov 2026" value={source} onChange={(e) => setSource(e.target.value)} /></div>
            <p className={`text-xs ${parsed.missingEmailColumn ? "text-destructive" : "text-muted-foreground"}`}>
              {parsed.missingEmailColumn ? "No \"Email\" column found in the header row." : `${parsed.rows.length} row${parsed.rows.length === 1 ? "" : "s"} ready to import.`}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => close(false)}>{result ? "Done" : "Cancel"}</Button>
          {!result && <Button disabled={busy || parsed.rows.length === 0} onClick={() => { void run(); }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import {parsed.rows.length || ""}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- regional analytics

function RegionalDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<OutreachAnalytics | null>(null);
  const [insights, setInsights] = useState<OutreachAiInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  useEffect(() => {
    outreachApi.analytics().then(setData).catch((err) => toast({ variant: "error", title: "Couldn't load regional analytics", description: userMessage(err) })).finally(() => setLoading(false));
  }, [toast]);
  async function analyze() {
    setAnalyzing(true);
    try { setInsights(await outreachApi.analyticsInsights()); }
    catch (err) { toast({ variant: "error", title: "AI analysis unavailable", description: userMessage(err) }); }
    finally { setAnalyzing(false); }
  }
  if (loading) return <Card><CardContent className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading regional performance…</CardContent></Card>;
  if (!data) return null;
  const rate = (value: number, total: number) => total ? `${Math.round(value * 1000 / total) / 10}%` : "0%";
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {[["Prospects", data.totals.total], ["Contacted", data.totals.contacted], ["Replies", data.totals.replied], ["Interested", data.totals.interested], ["Bounced", data.totals.bounced]].map(([label, value]) =>
        <Card key={String(label)}><CardContent className="p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></CardContent></Card>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardContent className="p-5"><h2 className="mb-3 font-semibold">Sales pipeline</h2><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{(data.pipeline ?? []).map((p) => <div key={p.stage} className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-xl font-bold">{p.count}</p><p className="text-xs text-muted-foreground">{p.stage.replace(/([A-Z])/g, " $1").trim()}</p></div>)}</div></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="mb-3 font-semibold">Overdue team tasks</h2>{(data.overdueTasks ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No overdue follow-ups.</p> : <div className="max-h-52 space-y-2 overflow-y-auto">{data.overdueTasks.map((t) => <div key={t.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><div><p className="font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{t.academyName || t.email} · {t.region || "Unassigned"} · {t.assignedTo || "Unassigned"}</p></div><Button size="sm" variant="outline" onClick={async () => { await outreachApi.completeTask(t.id); setData(await outreachApi.analytics()); }}>Complete</Button></div>)}</div>}</CardContent></Card></div>
    <Card><CardContent className="p-5">
      <div className="mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Performance by region</h2><p className="text-xs text-muted-foreground">Use volume and response rates together when choosing the next campaign.</p></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Region</th><th className="text-right">Leads</th><th className="text-right">New</th><th className="text-right">Contacted</th><th className="text-right">Replies</th><th className="text-right">Reply rate</th><th className="text-right">Interested</th><th className="text-right">Bounced</th></tr></thead><tbody className="divide-y">{data.regions.map((r) => <tr key={r.region}><td className="py-2.5 font-medium">{r.region}</td><td className="text-right">{r.total}</td><td className="text-right">{r.newCount}</td><td className="text-right">{r.contacted}</td><td className="text-right">{r.replied}</td><td className="text-right font-medium">{rate(r.replied + r.interested, r.contacted + r.replied + r.interested)}</td><td className="text-right">{r.interested}</td><td className="text-right">{r.bounced}</td></tr>)}</tbody></table></div>
    </CardContent></Card>
    <Card><CardContent className="p-5">
      <div className="mb-4"><h2 className="font-semibold">Recent replies</h2><p className="text-xs text-muted-foreground">Prospects marked Replied or Interested appear here for follow-up.</p></div>
      {(data.recentReplies ?? []).length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No replies recorded yet. Change a prospect's status to Replied when an email response arrives.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Contact</th><th>Academy</th><th>Region</th><th>Status</th><th>Updated</th></tr></thead><tbody className="divide-y">{data.recentReplies.map((reply) => <tr key={reply.id}><td className="py-2.5"><div className="font-medium">{reply.firstName || "—"}</div><div className="text-xs text-muted-foreground">{reply.email}</div></td><td>{reply.academyName || "—"}</td><td>{reply.region || reply.city || "Unassigned"}</td><td><Badge variant={reply.status === "Interested" ? "success" : "secondary"}>{statusLabel(reply.status)}</Badge></td><td className="text-muted-foreground">{formatDate(reply.repliedAtUtc)}</td></tr>)}</tbody></table></div>}
    </CardContent></Card>
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] to-card"><CardContent className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" />AI regional analysis</h2><p className="mt-1 text-xs text-muted-foreground">Uses aggregate regional counts only—no names, emails, or phone numbers are sent to AI.</p></div><Button size="sm" onClick={() => void analyze()} disabled={analyzing}>{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{insights ? "Refresh analysis" : "Analyze regions"}</Button></div>
      {!insights ? <p className="mt-4 text-sm text-muted-foreground">Generate targeting priorities, observations, and recommended next actions.</p> : <div className="mt-4 space-y-4 text-sm"><div className="flex flex-wrap gap-2"><p className="font-medium">{insights.summary}</p><Badge variant="outline">{insights.aiPowered ? "Hetzner AI" : "Data fallback"}</Badge></div><div className="grid gap-4 md:grid-cols-2"><div><h3 className="mb-2 font-semibold">What the data says</h3><ul className="list-disc space-y-1.5 ps-5 text-muted-foreground">{insights.observations.map((x) => <li key={x}>{x}</li>)}</ul></div><div><h3 className="mb-2 font-semibold">Recommended actions</h3><ol className="list-decimal space-y-1.5 ps-5 text-muted-foreground">{insights.nextActions.map((x) => <li key={x}>{x}</li>)}</ol></div></div></div>}
    </CardContent></Card>
  </div>;
}

// ---------------------------------------------------------------- growth automation

function GrowthTab() {
  const { toast } = useToast();
  const [data, setData] = useState<GrowthDashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiPlan, setAiPlan] = useState<OutreachAiInsights | null>(null);
  const [planning, setPlanning] = useState(false);
  const load = useCallback(() => outreachApi.growth().then(setData).catch((err) => toast({ variant: "error", title: "Couldn't load growth intelligence", description: userMessage(err) })), [toast]);
  useEffect(() => { void load(); }, [load]);
  async function reactivate() { if (!data?.dormant.length) return; setBusy(true); try { const result = await outreachApi.reactivate(data.dormant.map((x) => x.id)); toast({ variant: "success", title: `${result.queued} leads added to the sales queue` }); await load(); } catch (err) { toast({ variant: "error", title: "Couldn't queue reactivation", description: userMessage(err) }); } finally { setBusy(false); } }
  async function plan() { setPlanning(true); try { setAiPlan(await outreachApi.growthAiPlan()); } catch (err) { toast({ variant: "error", title: "AI growth plan unavailable", description: userMessage(err) }); } finally { setPlanning(false); } }
  if (!data) return <Card><CardContent className="p-10 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></CardContent></Card>;
  const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: data.forecast.currency, maximumFractionDigits: 0 }).format(data.forecast.weightedRevenue);
  const rate = (n: number, total: number) => total ? `${Math.round(n * 1000 / total) / 10}%` : "0%";
  return <div className="space-y-5">
    <Card className="border-primary/20 bg-primary/[0.025]"><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" />AI Growth Coach</h2><p className="mt-1 text-xs text-muted-foreground">Creates a seven-day sales plan from aggregate pipeline data. No names, emails, or phone numbers are shared.</p></div><Button disabled={planning} onClick={() => void plan()}>{planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{aiPlan ? "Refresh weekly plan" : "Build my weekly plan"}</Button></div>{!aiPlan ? <p className="mt-4 text-sm text-muted-foreground">Generate a focused plan for sources, segments, demos, replies, deliverability, and dormant opportunities.</p> : <div className="mt-5 space-y-4"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{aiPlan.summary}</p><Badge variant="outline">{aiPlan.aiPowered ? "AI generated" : "Safe data plan"}</Badge></div><div className="grid gap-4 lg:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold">What needs attention</h3><ul className="space-y-2">{aiPlan.observations.map((x) => <li key={x} className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">{x}</li>)}</ul></div><div><h3 className="mb-2 text-sm font-semibold">Seven-day action plan</h3><ol className="space-y-2">{aiPlan.nextActions.map((x, i) => <li key={x} className="flex gap-3 rounded-lg border bg-background p-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span><span>{x}</span></li>)}</ol></div></div></div>}</CardContent></Card>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Weighted pipeline</p><p className="mt-1 text-2xl font-bold">{money}</p><p className="mt-1 text-xs text-muted-foreground">{data.forecast.expectedWins} expected wins × {new Intl.NumberFormat("en-IN").format(data.forecast.averageCustomerValue)}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Healthy contacts</p><p className="mt-1 text-2xl font-bold">{data.deliverability.healthy}</p><p className="mt-1 text-xs text-muted-foreground">{data.deliverability.bounced} bounced · {data.deliverability.unsubscribed} unsubscribed</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Dormant opportunities</p><p className="mt-1 text-2xl font-bold">{data.dormant.length}</p><p className="mt-1 text-xs text-muted-foreground">Inactive for at least 30 days</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Profiles to enrich</p><p className="mt-1 text-2xl font-bold">{data.deliverability.incompleteProfiles}</p><p className="mt-1 text-xs text-muted-foreground">Missing academy or region</p></CardContent></Card></div>
    <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]"><Card><CardContent className="p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Lead-source attribution</h2><p className="text-xs text-muted-foreground">Follow each source from lead to reply, demo, and won customer.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Source</th><th className="text-right">Leads</th><th className="text-right">Replies</th><th className="text-right">Reply rate</th><th className="text-right">Demos</th><th className="text-right">Won</th></tr></thead><tbody className="divide-y">{data.sourcePerformance.map((x) => <tr key={x.source}><td className="py-2.5 font-medium">{x.source}</td><td className="text-right">{x.leads}</td><td className="text-right">{x.replies}</td><td className="text-right">{rate(x.replies, x.contacted)}</td><td className="text-right">{x.demos}</td><td className="text-right font-semibold">{x.won}</td></tr>)}</tbody></table></div></CardContent></Card>
      <Card><CardContent className="p-5"><h2 className="font-semibold">Recommended next moves</h2><p className="mb-4 text-xs text-muted-foreground">Prioritized from your live pipeline.</p><ol className="space-y-3">{data.recommendedActions.map((x, i) => <li key={x} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span><span>{x}</span></li>)}</ol>{data.recommendedActions.length === 0 && <p className="text-sm text-muted-foreground">No urgent growth actions detected.</p>}</CardContent></Card></div>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardContent className="p-5"><h2 className="mb-1 font-semibold">Audience segments</h2><p className="mb-4 text-xs text-muted-foreground">Use these groups for targeted nurture campaigns and truthful personalization.</p><div className="space-y-2">{data.segments.map((x) => <div key={x.segment} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border p-3 text-sm"><span className="font-medium">{x.segment}</span><Badge variant="outline">{x.qualified}/{x.leads} qualified</Badge><span className="text-xs text-muted-foreground">{x.replies} replies</span></div>)}</div></CardContent></Card><Card><CardContent className="p-5"><h2 className="mb-1 font-semibold">Objection intelligence</h2><p className="mb-4 text-xs text-muted-foreground">Common themes detected in actual inbound replies.</p><div className="space-y-2">{data.objections.map((x) => <div key={x.name} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm font-medium">{x.name}</span><Badge variant={x.count ? "secondary" : "outline"}>{x.count}</Badge></div>)}</div><p className="mt-4 text-xs text-muted-foreground">Open a reply to generate a context-specific AI objection response.</p></CardContent></Card></div>
    <Card><CardContent className="p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Lost-lead reactivation</h2><p className="text-xs text-muted-foreground">Creates a due-now task; it never sends automatically.</p></div><Button disabled={busy || data.dormant.length === 0} onClick={() => void reactivate()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Queue {data.dormant.length} for reactivation</Button></div>{data.dormant.length === 0 ? <p className="text-sm text-muted-foreground">No eligible dormant leads.</p> : <div className="grid gap-2 md:grid-cols-2">{data.dormant.slice(0, 10).map((x) => <div key={x.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">{x.academyName || x.email}</p><p className="text-xs text-muted-foreground">{x.region || "Unassigned"} · inactive since {formatDate(x.inactiveSinceUtc)}</p></div><Badge variant="success">{x.leadScore}</Badge></div>)}</div>}</CardContent></Card>
    <Card><CardContent className="p-5"><h2 className="mb-3 font-semibold">Automation coverage</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{["AI daily sales queue", "Source attribution", "Segment nurturing", "Demo booking links", "Reply monitoring", "Objection assistance", "Referral source tracking", "Campaign recipient preview", "Deliverability protection", "Reactivation queue", "Revenue forecasting"].map((x) => <div key={x} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" />{x}</div>)}<div className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm"><span>WhatsApp follow-up</span><Badge variant="outline">Provider required</Badge></div><div className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm"><span>Public-site enrichment</span><Badge variant="outline">Review required</Badge></div></div><p className="mt-3 text-xs text-muted-foreground">WhatsApp sending stays disabled until an approved provider, consent record, and message template are configured. Website facts must be reviewed before personalization is sent.</p></CardContent></Card>
  </div>;
}

// ---------------------------------------------------------------- campaigns

function CampaignsTab({ summary, onChange }: { summary: OutreachSummary | null; onChange: () => void }) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [audienceCampaign, setAudienceCampaign] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCampaigns(await outreachApi.campaigns()); }
    catch (err) { toast({ variant: "error", title: "Couldn't load campaigns", description: userMessage(err, "Please try again.") }); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { void load(); }, [load]);

  async function act(id: string, fn: () => Promise<unknown>, done: string) {
    setBusyId(id);
    try { await fn(); toast({ variant: "success", title: done }); await load(); onChange(); }
    catch (err) { toast({ variant: "error", title: "That didn't work", description: userMessage(err, "Please try again.") }); }
    finally { setBusyId(null); }
  }

  const newCount = summary?.prospects.find((p) => p.status === "New")?.count ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEditing("new")}><Plus className="mr-1.5 h-4 w-4" />New campaign</Button></div>
      {loading && <p className="text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading…</p>}
      {!loading && campaigns.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No campaigns yet. Write a short first e-mail and one or two follow-ups.</CardContent></Card>}
      {campaigns.map((c) => (
        <Card key={c.id}>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold">{c.name}
                  <Badge variant={c.status === "Active" ? "success" : c.status === "Completed" ? "secondary" : "outline"}>{c.status}</Badge></p>
                <p className="text-xs text-muted-foreground">{c.steps.length} e-mail{c.steps.length === 1 ? "" : "s"}: {c.steps.map((s) => (s.order === 1 ? "first" : `+${s.delayDays} days`)).join(" → ")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => setEditing(c)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                <Button size="sm" variant="outline" disabled={busyId === c.id || newCount === 0} title={newCount === 0 ? "No New prospects to add" : undefined} onClick={() => setAudienceCampaign(c)}>
                  <UserPlus className="mr-1 h-3.5 w-3.5" />Choose audience
                </Button>
                <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => {
                  const to = window.prompt("Send a test of the first e-mail to:", "");
                  if (to) void act(c.id, () => outreachApi.test(c.id, to), "Test e-mail sent");
                }}><Send className="mr-1 h-3.5 w-3.5" />Test</Button>
                {c.status === "Active"
                  ? <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => { void act(c.id, () => outreachApi.setStatus(c.id, "Paused"), "Campaign paused"); }}><Pause className="mr-1 h-3.5 w-3.5" />Pause</Button>
                  : c.status !== "Completed" && <Button size="sm" disabled={busyId === c.id || !summary?.ready} title={summary?.ready ? undefined : summary?.notReadyReason ?? undefined}
                    onClick={() => { void act(c.id, () => outreachApi.setStatus(c.id, "Active"), "Campaign started"); }}><Play className="mr-1 h-3.5 w-3.5" />Start</Button>}
                {c.status !== "Active" && <Button size="sm" variant="ghost" aria-label="Delete campaign" disabled={busyId === c.id}
                  onClick={() => { if (window.confirm(`Delete "${c.name}"? Scheduled e-mails are cancelled.`)) void act(c.id, () => outreachApi.deleteCampaign(c.id), "Campaign deleted"); }}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
              {[["Enrolled", c.enrolled], ["Waiting", c.scheduled], ["Sent", c.sent], ["Finished", c.completed], ["Stopped", c.stopped], ["Failed", c.failed]].map(([label, n]) => (
                <div key={label as string} className="rounded-lg bg-muted/50 p-2"><div className="text-base font-semibold">{n}</div><div className="text-muted-foreground">{label}</div></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {editing && <CampaignEditor campaign={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
      {audienceCampaign && <AudienceDialog campaign={audienceCampaign} onClose={() => setAudienceCampaign(null)} onEnrolled={() => { setAudienceCampaign(null); void load(); onChange(); }} />}
    </div>
  );
}

function AudienceDialog({ campaign, onClose, onEnrolled }: { campaign: Campaign; onClose: () => void; onEnrolled: () => void }) {
  const { toast } = useToast();
  const [regions, setRegions] = useState<RegionCount[]>([]);
  const [filter, setFilter] = useState<RecipientFilter>({ region: null, minScore: 40, stages: ["New", "Qualified"] });
  const [preview, setPreview] = useState<{ count: number; sample: { id: string; email: string; academyName: string | null; region: string | null; leadScore: number }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { outreachApi.regions().then(setRegions).catch(() => undefined); }, []);
  const runPreview = useCallback(async () => { setBusy(true); try { setPreview(await outreachApi.previewRecipients(campaign.id, filter)); } catch (err) { toast({ variant: "error", title: "Couldn't preview audience", description: userMessage(err) }); } finally { setBusy(false); } }, [campaign.id, filter, toast]);
  useEffect(() => { void runPreview(); }, [runPreview]);
  async function enroll() { setBusy(true); try { const result = await outreachApi.enroll(campaign.id, [], filter); toast({ variant: "success", title: `${result.enrolled} prospects enrolled` }); onEnrolled(); } catch (err) { toast({ variant: "error", title: "Couldn't enroll audience", description: userMessage(err) }); } finally { setBusy(false); } }
  return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Audience · {campaign.name}</DialogTitle><DialogDescription>Target qualified prospects and preview the exact audience before enrollment.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label>Region</Label><Select value={filter.region || ALL} onValueChange={(v) => setFilter({ ...filter, region: v === ALL ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All regions</SelectItem>{regions.map((r) => <SelectItem key={r.region} value={r.region}>{r.region} ({r.count})</SelectItem>)}</SelectContent></Select></div><div className="grid gap-1.5"><Label>Minimum lead score</Label><Input type="number" min={0} max={100} value={filter.minScore ?? 0} onChange={(e) => setFilter({ ...filter, minScore: Number(e.target.value) })} /></div></div>
    <div><Label>Pipeline stages</Label><div className="mt-2 flex flex-wrap gap-2">{PIPELINE_STAGES.slice(0, 4).map((stage) => <label key={stage} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"><input type="checkbox" checked={filter.stages?.includes(stage) ?? false} onChange={(e) => setFilter({ ...filter, stages: e.target.checked ? [...(filter.stages ?? []), stage] : (filter.stages ?? []).filter((x) => x !== stage) })} />{stage}</label>)}</div></div>
    <div className="rounded-lg border p-4"><p className="font-semibold">{busy && !preview ? "Calculating…" : `${preview?.count ?? 0} matching prospects`}</p><div className="mt-3 max-h-48 space-y-2 overflow-y-auto">{preview?.sample.map((p) => <div key={p.id} className="flex justify-between text-sm"><span>{p.academyName || p.email} <span className="text-muted-foreground">· {p.region || "Unassigned"}</span></span><Badge variant="outline">{p.leadScore}</Badge></div>)}</div></div>
    <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy || !preview?.count} onClick={() => void enroll()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Enroll {preview?.count ?? 0}</Button></DialogFooter></DialogContent></Dialog>;
}

const STARTER: CampaignInput = {
  name: "",
  steps: [
    { delayDays: 0, subject: "Quick question about {{AcademyName}}", body: "Hi {{FirstName}},\n\nI came across {{AcademyName}} and wanted to ask: how do you run your live classes, fee reminders and parent updates today?\n\nMeet to Manage puts all of that in one place for coaching centres, and there's a free plan to try it: https://meettomanage.cloud/signup?plan=free\n\nWould it help if I showed you in 15 minutes?\n\nThanks,\nThe Meet to Manage team" },
    { delayDays: 3, subject: "Re: Quick question about {{AcademyName}}", body: "Hi {{FirstName}},\n\nJust bringing this back up in case it got buried. Happy to set up {{AcademyName}} for you on the free plan if you'd like to see it with your own batches.\n\nThanks" },
  ],
};

function CampaignEditor({ campaign, onClose, onSaved }: { campaign: Campaign | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<CampaignInput>(() => campaign
    ? { name: campaign.name, steps: campaign.steps.map((s) => ({ delayDays: s.delayDays, subject: s.subject, body: s.body })) }
    : STARTER);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [strategy, setStrategy] = useState("");
  const [brief, setBrief] = useState<CampaignAiBrief>({ audience: "Children's reading, phonics, storytelling and tutoring academies", region: "", goal: "Book a 15-minute Meet to Manage product demo", offer: "Free plan and a personalized walkthrough", tone: "Warm" });
  const setStep = (i: number, patch: Partial<CampaignInput["steps"][number]>) => setForm({ ...form, steps: form.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const valid = form.name.trim() && form.steps.every((s) => s.subject.trim() && s.body.trim());

  async function save() {
    setSaving(true);
    try {
      if (campaign) await outreachApi.updateCampaign(campaign.id, form); else await outreachApi.createCampaign(form);
      toast({ variant: "success", title: campaign ? "Campaign saved" : "Campaign created", description: campaign ? undefined : "Next: add prospects, send yourself a test, then start it." });
      onSaved();
    } catch (err) { toast({ variant: "error", title: "Couldn't save", description: userMessage(err, "Please try again.") }); }
    finally { setSaving(false); }
  }

  async function generateCampaign() {
    if (!brief.audience.trim() || !brief.goal.trim()) return;
    setGenerating(true);
    try {
      const draft = await outreachApi.draftCampaign({ ...brief, region: brief.region?.trim() || null, offer: brief.offer?.trim() || null });
      setForm({ name: draft.name, steps: draft.steps });
      setStrategy(draft.strategy);
      toast({ variant: "success", title: draft.aiPowered ? "AI campaign generated" : "Campaign template prepared", description: "Review and edit every email before saving." });
    } catch (err) { toast({ variant: "error", title: "Couldn't generate campaign", description: userMessage(err, "Please try again.") }); }
    finally { setGenerating(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit campaign" : "AI campaign setup"}</DialogTitle>
          <DialogDescription>Describe who you want to reach and AI will prepare a complete three-email sequence. Nothing is sent until you review, save, choose the audience and start it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!campaign && <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
            <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2"><Sparkles className="h-4 w-4 text-primary" /></div><div><p className="font-semibold">AI campaign brief</p><p className="text-xs text-muted-foreground">AI uses this brief only—no prospect names or email addresses are shared.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2"><Label>Who are you targeting?</Label><Input placeholder="e.g. Phonics academies and online tutors" value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Region</Label><Input placeholder="e.g. Chennai or Pan India" value={brief.region || ""} onChange={(e) => setBrief({ ...brief, region: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Tone</Label><Select value={brief.tone} onValueChange={(tone: CampaignAiBrief["tone"]) => setBrief({ ...brief, tone })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Warm">Warm</SelectItem><SelectItem value="Professional">Professional</SelectItem><SelectItem value="Direct">Direct</SelectItem></SelectContent></Select></div>
              <div className="grid gap-1.5 sm:col-span-2"><Label>Campaign goal</Label><Input value={brief.goal} onChange={(e) => setBrief({ ...brief, goal: e.target.value })} /></div>
              <div className="grid gap-1.5 sm:col-span-2"><Label>Offer or key message</Label><Input placeholder="What should prospects know?" value={brief.offer || ""} onChange={(e) => setBrief({ ...brief, offer: e.target.value })} /></div>
            </div>
            <Button type="button" disabled={generating || !brief.audience.trim() || !brief.goal.trim()} onClick={() => void generateCampaign()}>{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{generating ? "Writing campaign…" : form.name ? "Regenerate with AI" : "Generate campaign with AI"}</Button>
          </div>}
          {strategy && <div className="rounded-lg border bg-muted/40 p-3 text-sm"><span className="font-semibold">AI strategy: </span><span className="text-muted-foreground">{strategy}</span></div>}
          <div className="grid gap-1.5"><Label htmlFor="c-name">Campaign name</Label><Input id="c-name" placeholder="e.g. Abacus centres, Chennai" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <p className="text-xs text-muted-foreground">Personalize with {"{{FirstName}}"}, {"{{AcademyName}}"} and {"{{City}}"}. Replies and unsubscribes automatically stop all follow-ups.</p>
          {form.steps.map((s, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold"><Mail className="h-4 w-4" />{i === 0 ? "First e-mail" : `Follow-up ${i}`}</p>
                <div className="flex items-center gap-2">
                  {i > 0 && <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Send
                    <Input type="number" min={1} max={60} className="h-8 w-16" value={s.delayDays} onChange={(e) => setStep(i, { delayDays: Number(e.target.value) })} />days later</label>}
                  {i > 0 && <Button size="sm" variant="ghost" aria-label="Remove follow-up" onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
              <Input placeholder="Subject" value={s.subject} onChange={(e) => setStep(i, { subject: e.target.value })} />
              <Textarea rows={6} placeholder="Message" value={s.body} onChange={(e) => setStep(i, { body: e.target.value })} />
            </div>
          ))}
          {form.steps.length < 3 && <Button variant="outline" size="sm" onClick={() => setForm({ ...form, steps: [...form.steps, { delayDays: 4, subject: "", body: "" }] })}><Plus className="mr-1 h-3.5 w-3.5" />Add follow-up</Button>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !valid} onClick={() => { void save(); }}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
