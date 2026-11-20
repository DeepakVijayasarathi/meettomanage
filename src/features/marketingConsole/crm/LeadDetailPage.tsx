import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Bot, Footprints, CalendarCheck2, Check, CheckCircle2, Copy, Globe, Loader2, Mail, MapPin, MessageCircle, Phone, PhoneCall,
  Sparkles, StickyNote, Trash2, Users, Workflow, XCircle,
} from "lucide-react";
import { InlineAlert } from "@/components/InlineAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { inr } from "@/api/crm";
import {
  deletePlatformDemoRequest, getMarketingLead, getMarketingVisitorDetail, type ApiMarketingVisitorDetail, getMarketingLeadRecommendation, LEAD_STAGE_LABEL, logMarketingLeadActivity, setLeadStage,
  updatePlatformDemoRequest, type ApiLeadStage, type ApiMarketingLeadActivity, type ApiMarketingLeadDetail,
} from "@/api/marketing";
import { LeadStageBadge, LeadStagePanel } from "@/features/admin/LeadStagePanel";
import { LeadDealPanel, LeadLogPanel, LeadTasksPanel } from "@/features/admin/LeadCrmPanels";
import { STAGE_PATH, StageMoveDialog } from "./StagePipeline";
import { WhatsAppDialog } from "./WhatsAppDialog";
import { SELECT, useCrmMe, useCrmTeam, when } from "./hooks";
import { useCrmStuck } from "./Insights";



const toLocalInput = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");
function ago(iso?: string | null) {
  if (!iso) return "–";
  const m = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (m < 0) return when(iso);
  return m < 60 ? `${Math.max(1, Math.round(m))} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
}

/** Groups timeline entries so the filter chips stay meaningful whatever the server names them. */
type Kind = "contact" | "stage" | "note" | "auto";
function kindOf(a: ApiMarketingLeadActivity): Kind {
  const t = a.type.toLowerCase();
  if (t.includes("stage")) return "stage";
  if (t.includes("note") || t.includes("reply")) return "note";
  if (t.includes("call") || t.includes("whatsapp") || t.includes("meeting") || t.includes("email") || t.includes("e-mail")) return "contact";
  return "auto";
}
const KIND_ICON: Record<Kind, typeof Phone> = { contact: PhoneCall, stage: Workflow, note: StickyNote, auto: Bot };
const KIND_TINT: Record<Kind, string> = {
  contact: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", stage: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  note: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", auto: "bg-muted text-muted-foreground",
};
const FILTERS: { key: Kind | "all"; label: string }[] = [{ key: "all", label: "All" }, { key: "contact", label: "Calls & messages" }, { key: "stage", label: "Stage changes" }, { key: "note", label: "Notes" }, { key: "auto", label: "Automatic" }];

function Fact({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" }) {
  return <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={cn("mt-0.5 truncate font-semibold", tone === "danger" && "text-destructive")}>{value}</p></div>;
}

function Row({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return <li className="flex items-start gap-2.5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1 break-words">{children}</div></li>;
}

/** Marketing console → a lead's full workspace: who they are, where they are in the sale, everything that happened and what to do next. */
export default function LeadDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const me = useCrmMe();
  const { active: team } = useCrmTeam();
  const live = apiEnabled();
  const [detail, setDetail] = useState<ApiMarketingLeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [owner, setOwner] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [notes, setNotes] = useState("");
  const [update, setUpdate] = useState("");
  const [updateType, setUpdateType] = useState("Note");
  const [recommendation, setRecommendation] = useState<Awaited<ReturnType<typeof getMarketingLeadRecommendation>> | null>(null);
  const [thinking, setThinking] = useState(false);
  const [whatsApp, setWhatsApp] = useState(false);
  const [move, setMove] = useState<ApiLeadStage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { stuck, reload: reloadStuck } = useCrmStuck();

  const load = useCallback(async () => {
    if (!live) { setError("Lead details need the live server."); return; }
    try {
      const value = await getMarketingLead(id);
      setDetail(value); setError(null);
      setOwner(value.lead.assignedToUserId ?? ""); setFollowUp(toLocalInput(value.lead.nextFollowUpAtUtc)); setNotes(value.lead.internalNotes ?? "");
    } catch (err) { setError(userMessage(err)); }
  }, [id, live]);
  useEffect(() => { setDetail(null); setRecommendation(null); void load(); }, [load]);

  async function run(work: () => Promise<unknown>, success: string) {
    if (!live) { toast({ variant: "error", title: "Demo mode", description: "Nothing was changed." }); return false; }
    try { await work(); toast({ variant: "success", title: success }); await load(); reloadStuck(); return true; }
    catch (err) { toast({ variant: "error", title: "Couldn't save", description: userMessage(err) }); return false; }
  }

  const activity = useMemo(() => [...(detail?.activity ?? [])].sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc)), [detail]);
  const shown = filter === "all" ? activity : activity.filter((a) => kindOf(a) === filter);

  if (error) return <div className="space-y-4"><BackLink /><InlineAlert variant="warning">{error} <button type="button" className="underline" onClick={() => void load()}>Retry</button></InlineAlert></div>;
  if (!detail) return <div className="space-y-4"><BackLink /><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></div>;

  const lead = detail.lead;
  const stage = lead.stage ?? "New";
  const stageIndex = STAGE_PATH.indexOf(stage);
  const closed = stage === "Customer" || stage === "Lost";
  const overdue = !!lead.nextFollowUpAtUtc && !closed && new Date(lead.nextFollowUpAtUtc).getTime() < Date.now();
  const inStageDays = Math.floor((Date.now() - new Date(lead.stageChangedAtUtc ?? lead.createdAtUtc).getTime()) / 86_400_000);
  const contactsMade = activity.filter((a) => kindOf(a) === "contact").length;
  const phoneDigits = lead.phone.replace(/[^\d+]/g, "");
  const stuckReason = stuck.find((x) => x.id === lead.id);
  const initials = lead.academyName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  function copy(text: string, what: string) { void navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); }

  async function stepTo(target: ApiLeadStage) {
    if (!me.canWrite || target === stage) return;
    if (target === "DemoBooked" || target === "DemoDone" || target === "Lost") { setMove(target); return; }
    await run(() => setLeadStage(lead.id, { stage: target }), `Moved to ${LEAD_STAGE_LABEL[target]}`);
  }

  async function analyze() {
    setThinking(true);
    try { setRecommendation(await getMarketingLeadRecommendation(lead.id)); }
    catch (err) { toast({ variant: "error", title: "Couldn't analyse the lead", description: userMessage(err) }); }
    finally { setThinking(false); }
  }

  return (
    <div className="space-y-5">
      <BackLink />

      {/* Header: who, where in the sale, and one-tap ways to reach them. */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">{initials || "?"}</div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{lead.academyName}</h1>
              <p className="text-sm text-muted-foreground">{lead.fullName}{lead.city ? ` · ${lead.city}` : ""}{lead.segment ? ` · ${lead.segment}` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <LeadStageBadge stage={stage} />
                <Badge variant={lead.leadTemperature === "Hot" ? "destructive" : lead.leadTemperature === "Warm" ? "warning" : "muted"}>{lead.leadTemperature ?? "Cold"} · {lead.leadScore ?? 0}</Badge>
                {lead.highIntentAtUtc && !closed && <Badge variant="destructive">High intent</Badge>}
                {lead.isDuplicate && <Badge variant="warning">Possible duplicate</Badge>}
                {lead.archivedAtUtc && <Badge variant="muted">Archived</Badge>}
                {lead.tenantCode && <Badge variant="success">Account {lead.tenantCode}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {lead.phone && <Button asChild variant="outline"><a href={`tel:${phoneDigits}`}><Phone className="h-4 w-4" />Call</a></Button>}
            {lead.phone && <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setWhatsApp(true)}><MessageCircle className="h-4 w-4" />WhatsApp</Button>}
            {lead.workEmail && <Button asChild variant="outline"><a href={`mailto:${lead.workEmail}?subject=${encodeURIComponent(`Meet to Manage for ${lead.academyName}`)}`}><Mail className="h-4 w-4" />E-mail</a></Button>}
            {me.isManager && <Button variant="ghost" title="Delete lead" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4 text-destructive" /><span className="sr-only">Delete</span></Button>}
          </div>
        </div>

        {/* Stage path: click a step to move the lead there. */}
        <div className="mt-5">
          <ol className="grid grid-cols-7 gap-1" aria-label="Sales stage">
            {STAGE_PATH.map((s, i) => {
              const done = stage !== "Lost" && i < stageIndex;
              const current = s === stage;
              return (
                <li key={s}>
                  <button type="button" disabled={!me.canWrite || current} onClick={() => void stepTo(s)} title={me.canWrite && !current ? `Move to ${LEAD_STAGE_LABEL[s]}` : LEAD_STAGE_LABEL[s]}
                    className={cn("flex h-9 w-full items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition sm:text-xs",
                      current ? "bg-primary text-primary-foreground" : done ? "bg-primary/15 text-primary hover:bg-primary/25" : "bg-muted text-muted-foreground hover:bg-muted/70",
                      "disabled:cursor-default")}>
                    {done && <Check className="hidden h-3.5 w-3.5 sm:block" />}<span className="truncate">{LEAD_STAGE_LABEL[s]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{stage === "Lost" ? `Lost${lead.lostReason ? `: ${lead.lostReason}` : ""}` : `In ${LEAD_STAGE_LABEL[stage]} for ${inStageDays} day${inStageDays === 1 ? "" : "s"}`}</span>
            {me.canWrite && (stage === "Lost"
              ? <Button size="sm" variant="outline" onClick={() => void run(() => setLeadStage(lead.id, { stage: "Contacted" }), "Lead reopened")}>Reopen lead</Button>
              : stage !== "Customer" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setMove("Lost")}><XCircle className="h-4 w-4" />Mark lost</Button>)}
          </div>
        </div>
      </section>

      {stuckReason && <InlineAlert variant="warning"><span><b>Stuck for {stuckReason.days} day{stuckReason.days === 1 ? "" : "s"}:</b> {stuckReason.reason}. Log a call, send a WhatsApp or move it to the right stage.</span></InlineAlert>}

      {/* Key numbers at a glance. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Fact label="Deal value" value={lead.expectedMonthlyValue != null ? `${inr(lead.expectedMonthlyValue)}/mo` : "Not set"} />
        <Fact label="Expected close" value={lead.expectedCloseAtUtc ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(lead.expectedCloseAtUtc)) : "Not set"} />
        <Fact label="Next follow-up" value={lead.nextFollowUpAtUtc ? (overdue ? `Overdue · ${ago(lead.nextFollowUpAtUtc)}` : when(lead.nextFollowUpAtUtc)) : "Not scheduled"} tone={overdue ? "danger" : undefined} />
        <Fact label="Last contacted" value={ago(lead.lastContactedAtUtc)} />
        <Fact label="Touches logged" value={contactsMade} />
        <Fact label="Lead age" value={ago(lead.createdAtUtc).replace(" ago", "")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main work area. */}
        <Tabs defaultValue="activity" className="min-w-0">
          <TabsList className="mb-3 flex w-full flex-wrap justify-start">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="tasks">Tasks & follow-up</TabsTrigger>
            <TabsTrigger value="deal">Deal & company</TabsTrigger>
            <TabsTrigger value="lifecycle">Demo & lifecycle</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <LeadLogPanel lead={lead} onSaved={() => void load()} />
            {me.canWrite && (
              <div className="rounded-xl border p-4">
                <h3 className="mb-2 font-semibold">Add to the timeline</h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select aria-label="Entry type" className={cn(SELECT, "sm:w-44")} value={updateType} onChange={(e) => setUpdateType(e.target.value)}>
                    <option value="Note">Note</option><option value="WhatsApp reply">Their WhatsApp reply</option><option value="Email reply">Their e-mail reply</option>
                  </select>
                  <Textarea rows={2} className="flex-1" value={update} onChange={(e) => setUpdate(e.target.value)} placeholder="e.g. Asked for a demo on Friday at 4 PM; wants to see fee reminders" />
                </div>
                <Button className="mt-2" size="sm" disabled={!update.trim()} onClick={() => void run(() => logMarketingLeadActivity(lead.id, { type: updateType, detail: update.trim() }), "Added to the timeline").then((ok) => ok && setUpdate(""))}>Add</Button>
              </div>
            )}
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Timeline</h3>
                <div className="flex flex-wrap gap-1">{FILTERS.map((f) => <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setFilter(f.key)}>{f.label}</Button>)}</div>
              </div>
              {shown.length === 0 ? <p className="text-sm text-muted-foreground">Nothing here yet.</p> : (
                <ol className="relative space-y-4 border-s ps-6">
                  {shown.map((a) => { const k = kindOf(a); const Icon = KIND_ICON[k]; return (
                    <li key={a.id} className="relative">
                      <span className={cn("absolute -start-[37px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background", KIND_TINT[k])}><Icon className="h-3.5 w-3.5" /></span>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3"><p className="text-sm font-semibold">{a.type}</p><time className="text-xs text-muted-foreground" title={when(a.createdAtUtc)}>{ago(a.createdAtUtc)}</time></div>
                      {a.detail && <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{a.detail}</p>}
                    </li>
                  ); })}
                  <li className="relative"><span className="absolute -start-[37px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary ring-4 ring-background"><Sparkles className="h-3.5 w-3.5" /></span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3"><p className="text-sm font-semibold">Lead created · {lead.source ?? "Direct"}</p><time className="text-xs text-muted-foreground">{when(lead.createdAtUtc)}</time></div>
                    {lead.message && <p className="mt-0.5 text-sm text-muted-foreground">“{lead.message}”</p>}
                  </li>
                </ol>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks"><LeadTasksPanel key={`tasks-${lead.id}`} lead={lead} version={detail.activity.length} /></TabsContent>
          <TabsContent value="deal"><LeadDealPanel key={`deal-${lead.id}-${lead.expectedMonthlyValue}-${lead.region}-${lead.city}`} lead={lead} onSaved={() => void load()} /></TabsContent>
          <TabsContent value="lifecycle"><LeadStagePanel lead={lead} live={live} onError={(title, description) => toast({ variant: "error", title, description })} onChanged={(_, message) => { toast({ variant: "success", title: message }); void load(); }} /></TabsContent>
        </Tabs>

        {/* Side panel: contact, ownership, source, AI and private notes. */}
        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 font-semibold">Contact</h3>
            <ul className="space-y-2.5 text-sm">
              <Row icon={Users}>{lead.fullName}</Row>
              {lead.phone && <Row icon={Phone}><div className="flex items-center justify-between gap-2"><a className="hover:underline" href={`tel:${phoneDigits}`}>{lead.phone}</a><button type="button" className="text-muted-foreground hover:text-foreground" title="Copy phone" onClick={() => copy(lead.phone, "phone")}>{copied === "phone" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button></div></Row>}
              {lead.workEmail && <Row icon={Mail}><div className="flex items-center justify-between gap-2"><a className="truncate hover:underline" href={`mailto:${lead.workEmail}`}>{lead.workEmail}</a><button type="button" className="text-muted-foreground hover:text-foreground" title="Copy e-mail" onClick={() => copy(lead.workEmail, "email")}>{copied === "email" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button></div></Row>}
              {lead.website && <Row icon={Globe}><a className="text-primary hover:underline" href={/^https?:\/\//.test(lead.website) ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer">{lead.website.replace(/^https?:\/\//, "")}</a></Row>}
              {(lead.city || lead.region) && <Row icon={MapPin}>{[lead.city, lead.region].filter(Boolean).join(", ")}</Row>}
              {lead.studentCount != null && <Row icon={Users}>{lead.studentCount} students</Row>}
              {lead.demoAtUtc && <Row icon={CalendarCheck2}>Demo {stage === "DemoBooked" ? "on" : "was"} {when(lead.demoAtUtc)}</Row>}
            </ul>
          </section>

          <WebsiteJourney visitorId={lead.visitorId} />

          <section className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 font-semibold">Owner & follow-up</h3>
            <div className="space-y-3">
              <label className="block space-y-1 text-sm"><span className="font-medium">Owner</span>
                <select className={SELECT} value={owner} onChange={(e) => setOwner(e.target.value)} disabled={!me.canWrite}>
                  <option value="">{lead.assignedTo && !lead.assignedToUserId ? lead.assignedTo : "Unassigned"}</option>
                  {team.filter((m) => me.role !== "Sales" || m.userId === me.userId).map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                </select>
              </label>
              <label className="block space-y-1 text-sm"><span className="font-medium">Next follow-up</span><Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} disabled={!me.canWrite} /></label>
              {me.canWrite && <Button size="sm" onClick={() => void run(() => { const m = team.find((x) => x.userId === owner); return updatePlatformDemoRequest(lead.id, { ...(m ? { assignedToUserId: m.userId, assignedTo: m.name } : {}), nextFollowUpAtUtc: followUp ? new Date(followUp).toISOString() : undefined }); }, "Saved")}>Save</Button>}
            </div>
          </section>

          <section className="rounded-xl border bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">AI next action</h3><Button size="sm" variant="outline" disabled={thinking} onClick={() => void analyze()}>{thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{recommendation ? "Again" : "Analyse"}</Button></div>
            {recommendation ? (
              <div className="mt-3 space-y-2 text-sm">
                <p>{recommendation.summary}</p>
                <p><b>Next:</b> {recommendation.nextAction}</p>
                <div className="rounded-lg border bg-background p-2.5"><p className="mb-1 text-xs font-medium text-muted-foreground">Suggested {recommendation.suggestedChannel} message</p><p className="whitespace-pre-wrap">{recommendation.suggestedMessage}</p>
                  <Button size="sm" variant="ghost" className="mt-1 h-7 px-2" onClick={() => copy(recommendation.suggestedMessage, "ai")}>{copied === "ai" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}Copy</Button></div>
              </div>
            ) : <p className="mt-2 text-xs text-muted-foreground">Reads the timeline and suggests the best next step and message.</p>}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 font-semibold">Why this score</h3>
            {lead.scoreReasons && lead.scoreReasons.length > 0 ? <ul className="space-y-1.5 text-sm">{lead.scoreReasons.map((r) => <li key={r} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{r}</li>)}</ul> : <p className="text-sm text-muted-foreground">No scoring signals yet.</p>}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 font-semibold">Where they came from</h3>
            <dl className="grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Source</dt><dd>{lead.source ?? "Direct"}</dd>
              {lead.medium && <><dt className="text-muted-foreground">Medium</dt><dd>{lead.medium}</dd></>}
              {lead.campaign && <><dt className="text-muted-foreground">Campaign</dt><dd>{lead.campaign}</dd></>}
              {lead.landingPath && <><dt className="text-muted-foreground">Landing page</dt><dd className="break-all font-mono text-xs">{lead.landingPath}</dd></>}
              <dt className="text-muted-foreground">Created</dt><dd>{when(lead.createdAtUtc)}</dd>
              {lead.firstContactedAtUtc && <><dt className="text-muted-foreground">First reply</dt><dd>{when(lead.firstContactedAtUtc)}</dd></>}
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 font-semibold">Private notes</h3>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!me.canWrite} placeholder="Anything the team should know: decision makers, budget, objections…" />
            {me.canWrite && <Button className="mt-2" size="sm" disabled={notes === (lead.internalNotes ?? "")} onClick={() => void run(() => updatePlatformDemoRequest(lead.id, { internalNotes: notes }), "Notes saved")}>Save notes</Button>}
          </section>
        </aside>
      </div>

      <WhatsAppDialog lead={whatsApp ? lead : null} onOpenChange={setWhatsApp} onTracked={() => void load()} />
      <StageMoveDialog move={move ? { lead, to: move } : null} onClose={() => setMove(null)} onMoved={() => void load()} />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this lead?" description="It is removed from every list. An audit record is kept for administrators." confirmLabel="Delete lead" destructive
        onConfirm={async () => {
          try { await deletePlatformDemoRequest(lead.id); toast({ variant: "success", title: "Lead deleted" }); navigate("/marketing/demo-requests"); }
          catch (err) { toast({ variant: "error", title: "Couldn't delete the lead", description: userMessage(err) }); }
        }} />
    </div>
  );
}

/** What the lead looked at on the website before (and after) enquiring, from their visitor journey. */
function WebsiteJourney({ visitorId }: { visitorId?: string | null }) {
  const [data, setData] = useState<ApiMarketingVisitorDetail | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setData(null); setFailed(false);
    if (!visitorId || !apiEnabled()) return;
    getMarketingVisitorDetail(visitorId).then(setData, () => setFailed(true));
  }, [visitorId]);

  const pages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of data?.visits ?? []) for (const p of v.pages) counts.set(p.path, (counts.get(p.path) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);
  const pricing = pages.filter(([path]) => /pric|plan/i.test(path)).reduce((n, [, c]) => n + c, 0);

  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold"><Footprints className="h-4 w-4" />Website journey</h3>
      {!visitorId ? <p className="text-sm text-muted-foreground">Added by hand or imported, so there's no website visit to show.</p>
        : failed ? <p className="text-sm text-muted-foreground">Couldn't load the journey. <Link className="text-primary hover:underline" to={`/marketing/journeys/${encodeURIComponent(visitorId)}`}>Open it</Link></p>
        : !data ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 p-2"><p className="text-lg font-bold">{data.visits.length}</p><p className="text-xs text-muted-foreground">visits</p></div>
              <div className="rounded-lg bg-muted/50 p-2"><p className="text-lg font-bold">{data.pageViews}</p><p className="text-xs text-muted-foreground">page views</p></div>
              <div className={cn("rounded-lg p-2", pricing ? "bg-amber-100 dark:bg-amber-950" : "bg-muted/50")}><p className="text-lg font-bold">{pricing}</p><p className="text-xs text-muted-foreground">pricing views</p></div>
            </div>
            {pages.length > 0 && <div><p className="mb-1 text-xs font-medium text-muted-foreground">Pages they read most</p>
              <ul className="space-y-1">{pages.slice(0, 6).map(([path, n]) => <li key={path} className="flex justify-between gap-2"><span className="truncate font-mono text-xs">{path}</span><span className="shrink-0 text-xs text-muted-foreground">{n}×</span></li>)}</ul></div>}
            <p className="text-xs text-muted-foreground">First visit {ago(data.firstSeenUtc)}, last {ago(data.lastSeenUtc)}{data.country ? ` · ${data.country}` : ""}{data.chats.length ? ` · ${data.chats.length} chat${data.chats.length === 1 ? "" : "s"}` : ""}</p>
            <Link className="inline-block text-sm text-primary hover:underline" to={`/marketing/journeys/${encodeURIComponent(visitorId)}`}>Open the full journey →</Link>
          </div>
        )}
    </section>
  );
}

function BackLink() {
  return <Link to="/marketing/demo-requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All leads</Link>;
}
