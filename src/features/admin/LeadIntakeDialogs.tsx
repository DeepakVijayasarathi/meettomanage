import { useState } from "react";
import { CheckCircle2, ClipboardPaste, Download, FileSpreadsheet, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { bulkCrmLeads, createCrmLead, importCrmLeads, LEAD_TEMPLATE_CSV, parseLeadCsv, type CrmBulkResult, type CrmImportResult, type CrmLeadRow } from "@/api/crm";
import { planSummary, SELECT, useCrmMe, useCrmTeam, useFollowUpPlans, useRun } from "@/features/marketingConsole/crm/hooks";

function OwnerSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const me = useCrmMe();
  const { active } = useCrmTeam();
  if (me.role === "Sales") return <p className="text-sm text-muted-foreground">These leads will be assigned to you.</p>;
  return (
    <label className="block space-y-1 text-sm"><span className="font-medium">Owner</span>
      <select className={SELECT} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Unassigned</option>
        {active.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
      </select>
    </label>
  );
}

/** Pick one or more people; leads are shared out between them in turn. Managers only. */
function OwnersPicker({ value, onChange, label = "Give these leads to" }: { value: string[]; onChange: (v: string[]) => void; label?: string }) {
  const me = useCrmMe();
  const { active } = useCrmTeam();
  if (me.role === "Sales") return <p className="text-sm text-muted-foreground">These leads will be assigned to you.</p>;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <fieldset className="space-y-1.5 text-sm">
      <legend className="font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {active.map((m) => (
          <button key={m.userId} type="button" onClick={() => toggle(m.userId)} aria-pressed={value.includes(m.userId)}
            className={cn("rounded-full border px-3 py-1.5 text-sm transition", value.includes(m.userId) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {m.name}<span className="ms-1 text-xs opacity-70">({m.openLeads})</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{value.length === 0 ? "Nobody picked: the leads stay unassigned." : value.length === 1 ? "All leads go to this person." : `Shared out evenly between ${value.length} people, in turn.`} Numbers show each person's open leads.</p>
    </fieldset>
  );
}

/** Choose a ready-made follow-up plan (or none). */
export function PlanPicker({ value, onChange, label = "Follow-up plan" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const plans = useFollowUpPlans();
  const chosen = plans.find((p) => p.key === value);
  return (
    <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span>
      <select className={SELECT} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">No plan, I'll follow up myself</option>
        {plans.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
      </select>
      <span className="block text-xs text-muted-foreground">{chosen ? `${chosen.description} Creates tasks: ${planSummary(chosen)}. Stops on its own when the lead books a demo, buys or is lost.` : "A plan creates the call and WhatsApp tasks for you, due at 10:00 on each day."}</span>
    </label>
  );
}

/** Add one lead by hand (a phone enquiry, a walk-in, a referral). No e-mail is sent to them. */
export function AddLeadDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const run = useRun();
  const me = useCrmMe();
  const blank: CrmLeadRow = { fullName: "", email: "", phone: "", academyName: "", city: "", region: "", segment: "", source: "Phone enquiry", notes: "" };
  const [form, setForm] = useState<CrmLeadRow>(blank);
  const [owner, setOwner] = useState("");
  const [plan, setPlan] = useState("new-lead");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof CrmLeadRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    let id = "";
    const ok = await run(async () => {
      if (plan) {
        // The import path adds the lead and starts the plan in one go.
        const result = await importCrmLeads({ rows: [form], assignedToUserId: owner || (me.role === "Sales" ? null : me.userId), followUpPlan: plan, source: form.source });
        if (result.created === 0) throw new Error(result.skipped[0]?.reason ?? "The lead wasn't added.");
        id = result.createdIds[0];
      } else {
        id = (await createCrmLead({ ...form, assignedToUserId: owner || null })).id;
      }
    }, "Lead added");
    setBusy(false);
    if (ok) { setForm(blank); onOpenChange(false); onCreated(id); }
  }

  const f = "space-y-1 text-sm";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
      <DialogHeader><DialogTitle>Add a lead</DialogTitle><DialogDescription>For enquiries that didn't come through the website. Needs a name or academy, and an e-mail or phone.</DialogDescription></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={f}><span className="font-medium">Contact name</span><Input value={form.fullName} onChange={set("fullName")} autoFocus /></label>
        <label className={f}><span className="font-medium">Academy</span><Input value={form.academyName} onChange={set("academyName")} /></label>
        <label className={f}><span className="font-medium">Phone / WhatsApp</span><Input type="tel" value={form.phone} onChange={set("phone")} /></label>
        <label className={f}><span className="font-medium">E-mail</span><Input type="email" value={form.email} onChange={set("email")} /></label>
        <label className={f}><span className="font-medium">City</span><Input value={form.city} onChange={set("city")} /></label>
        <label className={f}><span className="font-medium">What they teach</span><Input value={form.segment} onChange={set("segment")} placeholder="Phonics, Abacus, Tuition…" /></label>
        <label className={f}><span className="font-medium">Source</span>
          <select className={SELECT} value={form.source} onChange={set("source")}>{["Phone enquiry", "Walk-in", "Referral", "Event", "Instagram", "Facebook", "LinkedIn", "Other"].map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <OwnerSelect value={owner} onChange={setOwner} />
        <label className={`${f} sm:col-span-2`}><span className="font-medium">Notes</span><Input value={form.notes} onChange={set("notes")} placeholder="e.g. 120 students, uses Excel for fees" /></label>
        <div className="sm:col-span-2"><PlanPicker value={plan} onChange={setPlan} /></div>
      </div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add lead</Button></div>
    </DialogContent></Dialog>
  );
}

function downloadTemplate() {
  // The BOM makes Excel recognise the sample as UTF-8 (including ₹ and non-English names).
  const url = URL.createObjectURL(new Blob([`\ufeff${LEAD_TEMPLATE_CSV}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "meet-to-manage-lead-import-sample.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Import leads from a CSV file or by pasting cells copied from Excel / Google Sheets, with a preview. Leads can be
 * shared out between several people and put straight onto a follow-up plan. Duplicates are skipped and listed.
 */
export function ImportLeadsDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (v: boolean) => void; onImported: () => void }) {
  const run = useRun();
  const me = useCrmMe();
  const [mode, setMode] = useState<"paste" | "file">("file");
  const [fileName, setFileName] = useState("");
  const [pasted, setPasted] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseLeadCsv> | null>(null);
  const [source, setSource] = useState("");
  const [owners, setOwners] = useState<string[]>([]);
  const [plan, setPlan] = useState("imported");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CrmImportResult | null>(null);

  function reset() { setFileName(""); setPasted(""); setParsed(null); setResult(null); setSource(""); }

  async function readFile(file: File) {
    setResult(null);
    setFileName(file.name);
    setSource(file.name.replace(/\.(csv|txt)$/i, ""));
    setParsed(parseLeadCsv(await file.text()));
  }

  function readPaste(text: string) {
    setPasted(text);
    setResult(null);
    setParsed(text.trim() ? parseLeadCsv(text) : null);
    if (!source) setSource(`Pasted list ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" })}`);
  }

  async function doImport() {
    if (!parsed?.rows.length) return;
    setBusy(true);
    await run(async () => {
      setResult(await importCrmLeads({ rows: parsed.rows, source: source.trim() || undefined, ownerUserIds: me.role === "Sales" ? undefined : owners, followUpPlan: plan || undefined }));
      onImported();
    });
    setBusy(false);
  }

  const preview = parsed?.rows.slice(0, 5) ?? [];
  const tab = (m: typeof mode, icon: React.ReactNode, label: string) => (
    <button type="button" onClick={() => { setMode(m); reset(); }} className={cn("inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium", mode === m ? "bg-background shadow-sm" : "text-muted-foreground")}>{icon}{label}</button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>Import leads</DialogTitle><DialogDescription>Copy rows from your spreadsheet and paste them, or upload a CSV. The first row must be the column names. Nobody is e-mailed.</DialogDescription></DialogHeader>
      {!result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileSpreadsheet className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold">Start with the sample lead sheet</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Download it, replace the example row with your leads, then upload the saved CSV here.</p>
                </div>
              </div>
              <Button variant="outline" className="shrink-0 bg-background" onClick={downloadTemplate}><Download className="h-4 w-4" />Download sample CSV</Button>
            </div>
            <div className="mt-3 grid gap-2 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-3">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /><b className="text-foreground">1.</b> Keep the heading row</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /><b className="text-foreground">2.</b> Add one lead per row</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /><b className="text-foreground">3.</b> Save or download as CSV</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1">{tab("paste", <ClipboardPaste className="h-4 w-4" />, "Paste from a spreadsheet")}{tab("file", <FileUp className="h-4 w-4" />, "Upload a CSV")}</div>
            <p className="text-xs text-muted-foreground">Recognised: Name, Academy, Phone, Email, City, Region, Category, Students, Website, Source, Notes</p>
          </div>

          {mode === "paste" ? (
            <label className="block space-y-1 text-sm"><span className="font-medium">Paste here (include the header row)</span>
              <Textarea rows={6} value={pasted} onChange={(e) => readPaste(e.target.value)} placeholder={"Name\tAcademy\tPhone\tCity\nAsha Rao\tBright Abacus\t98765 43210\tPune"} className="font-mono text-xs" />
              <span className="block text-xs text-muted-foreground">In Excel or Google Sheets, select the rows including the headings, press Ctrl+C, then click here and press Ctrl+V.</span>
            </label>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-7 text-center text-sm transition hover:border-primary/50 hover:bg-primary/[0.025]">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted"><FileUp className="h-5 w-5 text-muted-foreground" /></span>
              <span className="font-semibold">{fileName || "Choose your completed CSV"}</span>
              <span className="text-xs text-muted-foreground">In Excel: File → Save As → CSV. In Google Sheets: File → Download → CSV.</span>
              <span className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium">Browse files</span>
              <input type="file" accept=".csv,.txt,text/csv" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void readFile(file); }} />
            </label>
          )}

          {parsed && (parsed.rows.length === 0
            ? <p className="text-sm text-destructive">No rows found. Check the first row has column names (Name, Academy, Phone…) and there's at least one lead under it.</p>
            : <>
              <p className="text-sm"><b>{parsed.rows.length}</b> leads found. Columns used: {parsed.mapped.join(", ")}.{parsed.ignored.length > 0 && <span className="text-muted-foreground"> Ignored: {parsed.ignored.join(", ")}.</span>}</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs"><thead className="bg-muted/50 text-left"><tr>{["Name", "Academy", "Phone", "Email", "City", "Category"].map((h) => <th key={h} className="px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                  <tbody>{preview.map((r, i) => <tr key={i} className="border-t"><td className="px-2 py-1.5">{r.fullName ?? <span className="text-muted-foreground">({r.academyName} team)</span>}</td><td className="px-2 py-1.5">{r.academyName}</td><td className="px-2 py-1.5">{r.phone}</td><td className="px-2 py-1.5">{r.email}</td><td className="px-2 py-1.5">{r.city}</td><td className="px-2 py-1.5">{r.segment}</td></tr>)}</tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && <p className="text-xs text-muted-foreground">Showing the first 5.</p>}
              <OwnersPicker value={owners} onChange={setOwners} />
              <div className="grid gap-3 sm:grid-cols-2">
                <PlanPicker value={plan} onChange={setPlan} />
                <label className="block space-y-1 text-sm"><span className="font-medium">Source label</span><Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Bengaluru list Nov" /><span className="block text-xs text-muted-foreground">Shows on each lead and in reports by source.</span></label>
              </div>
              {parsed.rows.length > 2000 && <p className="text-sm text-destructive">Up to 2,000 rows at a time. Split the list and import it in parts.</p>}
            </>)}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={busy || !parsed?.rows.length || parsed.rows.length > 2000} onClick={() => void doImport()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Import {parsed?.rows.length ?? 0} leads</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-lg font-semibold">{result.created} lead{result.created === 1 ? "" : "s"} added{plan && result.created > 0 ? ", with follow-up tasks scheduled" : ""}.</p>
          {plan && result.created > 0 && <p className="text-sm text-muted-foreground">The first tasks are in each owner's My day.</p>}
          {result.skipped.length > 0 && <>
            <p className="text-sm">{result.skipped.length} skipped:</p>
            <ul className="max-h-60 overflow-y-auto rounded-lg border text-sm">{result.skipped.map((s) => { const r = parsed?.rows[s.row]; return <li key={s.row} className="border-b px-3 py-1.5 last:border-0"><b>Row {s.row + 2}</b> {r?.academyName ?? r?.fullName ?? ""}: <span className="text-muted-foreground">{s.reason}</span></li>; })}</ul>
          </>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={reset}>Import more</Button><Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button></div>
        </div>
      )}
    </DialogContent></Dialog>
  );
}

/** For leads selected in the list: share them out between people and/or start a follow-up plan. */
export function BulkLeadsDialog({ leadIds, open, onOpenChange, onDone }: { leadIds: string[]; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const run = useRun();
  const me = useCrmMe();
  const [owners, setOwners] = useState<string[]>([]);
  const [plan, setPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CrmBulkResult | null>(null);

  async function apply() {
    setBusy(true);
    await run(async () => { setResult(await bulkCrmLeads({ leadIds, ownerUserIds: me.isManager ? owners : undefined, followUpPlan: plan || undefined })); onDone(); }, "Leads updated");
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setResult(null); setOwners([]); setPlan(""); } onOpenChange(v); }}><DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>{leadIds.length} selected lead{leadIds.length === 1 ? "" : "s"}</DialogTitle><DialogDescription>Share them out and put them on a follow-up plan in one step.</DialogDescription></DialogHeader>
      {!result ? (
        <div className="space-y-4">
          {me.isManager && <OwnersPicker value={owners} onChange={setOwners} label="Assign to" />}
          <PlanPicker value={plan} onChange={setPlan} label="Start a follow-up plan" />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={busy || (owners.length === 0 && !plan)} onClick={() => void apply()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Apply</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-semibold">Done for {result.done} lead{result.done === 1 ? "" : "s"}.</p>
          {result.skipped.length > 0 && <ul className="max-h-48 overflow-y-auto rounded-lg border text-sm">{result.skipped.map((s) => <li key={s} className="border-b px-3 py-1.5 last:border-0">{s}</li>)}</ul>}
          <div className="flex justify-end"><Button onClick={() => onOpenChange(false)}>Close</Button></div>
        </div>
      )}
    </DialogContent></Dialog>
  );
}
