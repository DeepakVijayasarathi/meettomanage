import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Pause, Pencil, Play, Plus, Send, Settings2, Trash2, Upload, UserPlus } from "lucide-react";
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
  type Campaign, type CampaignInput, type ImportResult, type OutreachSettings, type OutreachSummary, type Prospect, type ProspectInput, type ProspectStatus,
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

      <Tabs defaultValue="prospects">
        <TabsList>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>
        <TabsContent value="prospects" className="mt-4"><ProspectsTab onChange={loadSummary} /></TabsContent>
        <TabsContent value="campaigns" className="mt-4"><CampaignsTab summary={summary} onChange={loadSummary} /></TabsContent>
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

// ---------------------------------------------------------------- prospects

function ProspectsTab({ onChange }: { onChange: () => void }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: Prospect[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await outreachApi.prospects({ status: status === ALL ? "" : (status as ProspectStatus), search, page })); }
    catch (err) { toast({ variant: "error", title: "Couldn't load prospects", description: userMessage(err, "Please try again.") }); }
    finally { setLoading(false); }
  }, [status, search, page, toast]);
  useEffect(() => { const t = setTimeout(() => { void load(); }, 250); return () => clearTimeout(t); }, [load]);

  async function setProspectStatus(p: Prospect, next: ProspectStatus) {
    try { await outreachApi.updateProspect(p.id, { status: next }); void load(); onChange(); }
    catch (err) { toast({ variant: "error", title: "Couldn't update", description: userMessage(err, "Please try again.") }); }
  }

  async function remove(p: Prospect) {
    if (!window.confirm(`Remove ${p.email}? They won't be e-mailed, and can't be added again later.`)) return;
    try { await outreachApi.deleteProspect(p.id); void load(); onChange(); }
    catch (err) { toast({ variant: "error", title: "Couldn't remove", description: userMessage(err, "Please try again.") }); }
  }

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
          <div className="ms-auto flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-1.5 h-4 w-4" />Import CSV</Button>
            <Button onClick={() => setAddOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" />Add prospect</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-2 pr-3">Prospect</th><th className="py-2 pr-3">Academy</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Last e-mailed</th><th className="py-2" /></tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 pr-3"><div className="font-medium">{p.firstName || "—"}</div><div className="text-xs text-muted-foreground">{p.email}</div></td>
                  <td className="py-2.5 pr-3"><div>{p.academyName || "—"}</div><div className="text-xs text-muted-foreground">{[p.city, p.source].filter(Boolean).join(" · ")}</div></td>
                  <td className="py-2.5 pr-3">
                    {p.status === "Unsubscribed"
                      ? <Badge variant="muted">Unsubscribed</Badge>
                      : <Select value={p.status} onValueChange={(v) => { void setProspectStatus(p, v as ProspectStatus); }}>
                        <SelectTrigger className="h-8 w-40"><SelectValue>{<Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>}</SelectValue></SelectTrigger>
                        <SelectContent>{PROSPECT_STATUSES.filter((s) => s.value !== "Unsubscribed").map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{p.lastContactedAtUtc ? formatDate(p.lastContactedAtUtc) : "—"}</td>
                  <td className="py-2.5 text-right"><Button size="sm" variant="ghost" aria-label={`Remove ${p.email}`} onClick={() => { void remove(p); }}><Trash2 className="h-4 w-4" /></Button></td>
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
    </Card>
  );
}

function AddProspectDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; onAdded: () => void }) {
  const { toast } = useToast();
  const empty: ProspectInput = { email: "", firstName: "", academyName: "", city: "", phone: "", source: "" };
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
      toast({ variant: "success", title: `${r.added} prospect${r.added === 1 ? "" : "s"} added`, description: r.skipped.length ? `${r.skipped.length} skipped` : undefined });
    } catch (err) { toast({ variant: "error", title: "Import failed", description: userMessage(err, "Please try again.") }); }
    finally { setBusy(false); }
  }

  const close = (o: boolean) => { if (busy) return; onOpenChange(o); if (!o) { setText(""); setResult(null); setSource(""); } };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import prospects</DialogTitle>
          <DialogDescription>A CSV with a header row. Columns are matched by name: Email (required), First name, Academy, City, Phone, Source. Duplicates and anyone who unsubscribed are skipped.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-2 text-sm">
            <p><b>{result.added}</b> added, <b>{result.skipped.length}</b> skipped.</p>
            {result.skipped.length > 0 && <ul className="max-h-48 overflow-y-auto rounded-md border p-2 text-xs">{result.skipped.map((s, i) => <li key={i}><span className="font-mono">{s.email || "(blank)"}</span>: {s.reason}</li>)}</ul>}
          </div>
        ) : (
          <div className="space-y-3">
            <Input type="file" accept=".csv,text/csv" onChange={(e) => { void readFile(e); }} />
            <Textarea rows={7} placeholder={"Email,First name,Academy,City\nanita@sunriseabacus.in,Anita,Sunrise Abacus,Chennai"} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" />
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

// ---------------------------------------------------------------- campaigns

function CampaignsTab({ summary, onChange }: { summary: OutreachSummary | null; onChange: () => void }) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
                <Button size="sm" variant="outline" disabled={busyId === c.id || newCount === 0} title={newCount === 0 ? "No New prospects to add" : undefined}
                  onClick={() => { void act(c.id, () => outreachApi.enroll(c.id).then((r) => { if (r.enrolled === 0) throw new Error("No New prospects to add."); }), "New prospects added"); }}>
                  <UserPlus className="mr-1 h-3.5 w-3.5" />Add {newCount} New
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
    </div>
  );
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

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit campaign" : "New campaign"}</DialogTitle>
          <DialogDescription>Keep it short and personal. Use {"{{FirstName}}"}, {"{{AcademyName}}"} and {"{{City}}"}. An unsubscribe line is added to every e-mail automatically. Follow-ups stop as soon as someone replies (mark them Replied) or unsubscribes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-1.5"><Label htmlFor="c-name">Campaign name</Label><Input id="c-name" placeholder="e.g. Abacus centres, Chennai" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
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
