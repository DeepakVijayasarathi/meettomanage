import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCrmLead, importCrmLeads, parseLeadCsv, type CrmImportResult, type CrmLeadRow } from "@/api/crm";
import { SELECT, useCrmMe, useCrmTeam, useRun } from "@/features/marketingConsole/crm/hooks";

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

/** Add one lead by hand (a phone enquiry, a walk-in, a referral). No e-mail is sent to them. */
export function AddLeadDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const run = useRun();
  const me = useCrmMe();
  const blank: CrmLeadRow = { fullName: "", email: "", phone: "", academyName: "", city: "", region: "", segment: "", source: "Phone enquiry", notes: "" };
  const [form, setForm] = useState<CrmLeadRow>(blank);
  const [owner, setOwner] = useState(me.role === "Sales" ? "" : me.userId ?? "");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof CrmLeadRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    let id = "";
    const ok = await run(async () => { id = (await createCrmLead({ ...form, assignedToUserId: owner || null })).id; }, "Lead added");
    setBusy(false);
    if (ok) { setForm(blank); onOpenChange(false); onCreated(id); }
  }

  const f = "space-y-1 text-sm";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Add a lead</DialogTitle><DialogDescription>For enquiries that didn't come through the website. Needs a name or academy, and an e-mail or phone.</DialogDescription></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={f}><span className="font-medium">Contact name</span><Input value={form.fullName} onChange={set("fullName")} /></label>
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
      </div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add lead</Button></div>
    </DialogContent></Dialog>
  );
}

/** Import a spreadsheet of leads (CSV) with a preview; duplicates and incomplete rows are skipped and listed. */
export function ImportLeadsDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (v: boolean) => void; onImported: () => void }) {
  const run = useRun();
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseLeadCsv> | null>(null);
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CrmImportResult | null>(null);

  function reset() { setFileName(""); setParsed(null); setResult(null); setSource(""); }

  async function readFile(file: File) {
    setResult(null);
    setFileName(file.name);
    setSource(file.name.replace(/\.csv$/i, ""));
    setParsed(parseLeadCsv(await file.text()));
  }

  async function doImport() {
    if (!parsed?.rows.length) return;
    setBusy(true);
    await run(async () => { setResult(await importCrmLeads({ rows: parsed.rows, source: source.trim() || undefined, assignedToUserId: owner || null })); onImported(); });
    setBusy(false);
  }

  const preview = parsed?.rows.slice(0, 5) ?? [];
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>Import leads from a CSV</DialogTitle><DialogDescription>Export your spreadsheet as CSV. Columns such as Name, Email, Phone, Academy, City, Region, Category and Notes are recognised. Nobody is e-mailed.</DialogDescription></DialogHeader>
      {!result ? (
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm hover:bg-muted/40">
            <FileUp className="h-6 w-6 text-muted-foreground" />
            <span className="font-medium">{fileName || "Choose a .csv file"}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void readFile(file); }} />
          </label>
          {parsed && (parsed.rows.length === 0
            ? <p className="text-sm text-destructive">No rows found. Check the file has a header row and at least one lead.</p>
            : <>
              <p className="text-sm"><b>{parsed.rows.length}</b> rows. Using columns: {parsed.mapped.join(", ")}.{parsed.ignored.length > 0 && <span className="text-muted-foreground"> Ignoring: {parsed.ignored.join(", ")}.</span>}</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs"><thead className="bg-muted/50 text-left"><tr>{["Name", "Academy", "Email", "Phone", "City", "Category"].map((h) => <th key={h} className="px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                  <tbody>{preview.map((r, i) => <tr key={i} className="border-t"><td className="px-2 py-1.5">{r.fullName ?? <span className="text-muted-foreground">({r.academyName} team)</span>}</td><td className="px-2 py-1.5">{r.academyName}</td><td className="px-2 py-1.5">{r.email}</td><td className="px-2 py-1.5">{r.phone}</td><td className="px-2 py-1.5">{r.city}</td><td className="px-2 py-1.5">{r.segment}</td></tr>)}</tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && <p className="text-xs text-muted-foreground">Showing the first 5.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm"><span className="font-medium">Source label</span><Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Bengaluru list Nov" /></label>
                <OwnerSelect value={owner} onChange={setOwner} />
              </div>
              {parsed.rows.length > 2000 && <p className="text-sm text-destructive">Up to 2,000 rows at a time. Split the file and import it in parts.</p>}
            </>)}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={busy || !parsed?.rows.length || parsed.rows.length > 2000} onClick={() => void doImport()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Import {parsed?.rows.length ?? 0} leads</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-lg font-semibold">{result.created} lead{result.created === 1 ? "" : "s"} added.</p>
          {result.skipped.length > 0 && <>
            <p className="text-sm">{result.skipped.length} skipped:</p>
            <ul className="max-h-60 overflow-y-auto rounded-lg border text-sm">{result.skipped.map((s) => { const r = parsed?.rows[s.row]; return <li key={s.row} className="border-b px-3 py-1.5 last:border-0"><b>Row {s.row + 2}</b> {r?.academyName ?? r?.fullName ?? ""}: <span className="text-muted-foreground">{s.reason}</span></li>; })}</ul>
          </>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={reset}>Import another file</Button><Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button></div>
        </div>
      )}
    </DialogContent></Dialog>
  );
}
