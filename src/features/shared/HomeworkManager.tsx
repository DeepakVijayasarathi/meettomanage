import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CheckCircle2, ClipboardList, Download, FileUp, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  createAssignment, deleteAssignment, downloadAssignmentAttachment, downloadSubmissionFile, getAssignment, gradeSubmission,
  listAssignableBatches, listAssignments, releaseResults, updateAssignment,
  type ApiAssignment, type ApiAssignmentDetail, type ApiSubmission, type AssignmentKind,
} from "@/api/assignments";

const ALL = "all";
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/** "2026-11-05T10:30" in the viewer's local time, for a datetime-local input. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function KindBadge({ kind }: { kind: AssignmentKind }) {
  return <Badge variant={kind === "Test" ? "secondary" : "outline"}>{kind === "Test" ? "Test" : "Homework"}</Badge>;
}

function statusOf(a: ApiAssignment): { label: string; tone: "default" | "secondary" | "outline" | "destructive" } {
  if (a.kind === "Test") {
    if (a.resultsReleasedAtUtc) return { label: "Results released", tone: "default" };
    return a.gradedCount === a.studentCount && a.studentCount > 0 ? { label: "Ready to release", tone: "secondary" } : { label: `${a.gradedCount}/${a.studentCount} marked`, tone: "outline" };
  }
  const waiting = a.submittedCount - Math.min(a.submittedCount, a.gradedCount);
  if (waiting > 0) return { label: `${waiting} to check`, tone: "secondary" };
  if (a.dueAtUtc && new Date(a.dueAtUtc) < new Date() && a.submittedCount < a.studentCount) return { label: "Past due", tone: "destructive" };
  return { label: `${a.submittedCount}/${a.studentCount} handed in`, tone: "outline" };
}

interface FormState {
  id: string | null;
  batchId: string;
  kind: AssignmentKind;
  title: string;
  instructions: string;
  topic: string;
  due: string;
  maxMarks: string;
  file: File | null;
  existingFile: string | null;
}

const emptyForm = (batchId = ""): FormState => ({
  id: null, batchId, kind: "Homework", title: "", instructions: "", topic: "", due: "", maxMarks: "", file: null, existingFile: null,
});

/**
 * Homework and tests for Teacher (own batches) and Admin / Sub Admin (every batch). The backend decides scope,
 * so the same screen serves both portals.
 */
export default function HomeworkManager({ scope }: { scope: "teacher" | "staff" }) {
  const { toast } = useToast();
  const [batchFilter, setBatchFilter] = useState<string>(ALL);
  const { data: batches } = useApiData(() => listAssignableBatches(), []);
  const { data: rows, error, reload } = useApiData(() => listAssignments(), []);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => (batchFilter === ALL ? rows : rows.filter((r) => r.batchId === batchFilter)), [rows, batchFilter]);
  const toCheck = rows.reduce((n, a) => n + (a.kind === "Homework" ? Math.max(0, a.submittedCount - a.gradedCount) : 0), 0);
  const toRelease = rows.filter((a) => a.kind === "Test" && !a.resultsReleasedAtUtc).length;
  const upcoming = rows.filter((a) => a.dueAtUtc && new Date(a.dueAtUtc) > new Date()).length;

  const save = async () => {
    if (!form) return;
    if (!form.batchId || !form.title.trim()) {
      toast({ variant: "error", title: "Choose a batch and add a title" });
      return;
    }
    const maxMarks = form.maxMarks.trim() ? Number(form.maxMarks) : null;
    if (form.kind === "Test" && !maxMarks) {
      toast({ variant: "error", title: "Set the maximum marks for a test" });
      return;
    }
    setSaving(true);
    try {
      const input = {
        batchId: form.batchId, kind: form.kind, title: form.title.trim(), instructions: form.instructions, topic: form.topic,
        dueAtUtc: form.due ? new Date(form.due).toISOString() : null, maxMarks, file: form.file,
      };
      if (form.id) await updateAssignment(form.id, input);
      else await createAssignment(input);
      toast({ variant: "success", title: form.id ? "Saved" : `${form.kind === "Test" ? "Test" : "Homework"} set`, description: form.id ? undefined : "Families have been notified." });
      setForm(null);
      reload();
    } catch (e) {
      toast({ variant: "error", title: "Couldn't save", description: errorText(e) });
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<ApiAssignment>[] = [
    {
      key: "title", header: "Work", sortable: true, accessor: (a) => a.title,
      render: (a) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2"><KindBadge kind={a.kind} /><span className="truncate font-semibold">{a.title}</span></div>
          {a.topic && <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.topic}</p>}
        </div>
      ),
    },
    { key: "batchName", header: "Batch", sortable: true, accessor: (a) => a.batchName, render: (a) => <span className="text-sm">{a.batchName}</span> },
    { key: "dueAtUtc", header: "Due", sortable: true, accessor: (a) => a.dueAtUtc ?? "", render: (a) => <span className="text-sm text-muted-foreground">{a.dueAtUtc ? formatDate(a.dueAtUtc, "datetime") : "—"}</span> },
    { key: "status", header: "Progress", render: (a) => { const s = statusOf(a); return <Badge variant={s.tone}>{s.label}</Badge>; } },
    { key: "averageMarks", header: "Average", accessor: (a) => a.averageMarks ?? -1, sortable: true, render: (a) => <span className="text-sm">{a.averageMarks == null ? "—" : `${a.averageMarks}${a.maxMarks ? ` / ${a.maxMarks}` : ""}`}</span> },
    { key: "open", header: "", render: (a) => <Button size="sm" variant="outline" onClick={() => setOpenId(a.id)}>Open</Button> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Teaching"
        title="Homework & Tests"
        description={scope === "teacher" ? "Set work for your batches, check what students hand in and share test results." : "Homework and tests across every batch."}
        actions={<Button onClick={() => setForm(emptyForm(batchFilter === ALL ? batches[0]?.id ?? "" : batchFilter))} disabled={!batches.length}><Plus className="mr-1.5 h-4 w-4" />Set homework or test</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Due soon" value={String(upcoming)} detail="with a future due date" icon={ClipboardList} tone="primary" />
        <KpiCard label="Waiting to check" value={String(toCheck)} detail="homework handed in" icon={CheckCircle2} tone={toCheck ? "warning" : "success"} />
        <KpiCard label="Tests to release" value={String(toRelease)} detail="results not yet shared" icon={Megaphone} tone={toRelease ? "warning" : "neutral"} />
      </div>

      {batches.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger aria-label="Filter by batch"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All batches</SelectItem>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <DataTable
        data={visible}
        columns={columns}
        rowKey={(a) => a.id}
        searchPlaceholder="Search by title, topic or batch…"
        searchFn={(a, q) => [a.title, a.topic, a.batchName].some((v) => v?.toLowerCase().includes(q.toLowerCase()))}
        emptyTitle={batches.length ? "No homework or tests yet" : "No active batches"}
        emptyDescription={batches.length ? "Set the first piece of work and families are notified in the app straight away." : "Homework can be set once you have an active batch."}
        error={apiEnabled() ? error : null}
        onRetry={reload}
      />

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-w-lg">
          {form && (
            <>
              <DialogHeader>
                <DialogTitle>{form.id ? "Edit work" : "Set homework or a test"}</DialogTitle>
                <DialogDescription>Every active student in the batch gets it. Test marks stay private until you release results.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Type</Label>
                    <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as AssignmentKind })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Homework">Homework</SelectItem><SelectItem value="Test">Test</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Batch</Label>
                    <Select value={form.batchId} onValueChange={(v) => setForm({ ...form, batchId: v })} disabled={!!form.id}>
                      <SelectTrigger><SelectValue placeholder="Choose batch" /></SelectTrigger>
                      <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.studentCount})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hw-title">Title</Label>
                  <Input id="hw-title" maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Worksheet 4 — long vowels" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hw-instructions">Instructions</Label>
                  <Textarea id="hw-instructions" maxLength={4000} rows={4} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="hw-due">Due</Label>
                    <Input id="hw-due" type="datetime-local" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="hw-marks">Max marks{form.kind === "Homework" && " (optional)"}</Label>
                    <Input id="hw-marks" type="number" min={1} step="0.5" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hw-topic">Topic (helps Mito explain mistakes)</Label>
                  <Input id="hw-topic" maxLength={120} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Fractions" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hw-file">Worksheet (PDF, photo or Word, up to 15 MB)</Label>
                  <Input id="hw-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,.txt" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
                  {form.existingFile && !form.file && <p className="text-xs text-muted-foreground">Current: {form.existingFile}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving…" : form.id ? "Save" : "Set work"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {openId && (
        <AssignmentDetailDialog
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={reload}
          onEdit={(a) => {
            setOpenId(null);
            setForm({
              id: a.id, batchId: a.batchId, kind: a.kind, title: a.title, instructions: a.instructions ?? "", topic: a.topic ?? "",
              due: toLocalInput(a.dueAtUtc), maxMarks: a.maxMarks == null ? "" : String(a.maxMarks), file: null, existingFile: a.attachmentFileName,
            });
          }}
        />
      )}
    </div>
  );
}

function AssignmentDetailDialog({ id, onClose, onChanged, onEdit }: { id: string; onClose: () => void; onChanged: () => void; onEdit: (a: ApiAssignmentDetail) => void }) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<ApiAssignmentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => getAssignment(id).then(setDetail).catch((e) => setLoadError(errorText(e)));
  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast({ variant: "success", title: success });
      await load();
      onChanged();
    } catch (e) {
      toast({ variant: "error", title: "Couldn't update", description: errorText(e) });
    }
  };

  const remove = async () => {
    if (!detail || !window.confirm(`Delete "${detail.title}"? Families will no longer see it.`)) return;
    try {
      await deleteAssignment(detail.id);
      onChanged();
      onClose();
    } catch (e) {
      toast({ variant: "error", title: "Couldn't delete", description: errorText(e) });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {!detail ? (
          <p className="p-6 text-sm text-muted-foreground">{loadError ?? "Loading…"}</p>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><KindBadge kind={detail.kind} />{detail.title}</DialogTitle>
              <DialogDescription>
                {detail.batchName}{detail.dueAtUtc ? ` · due ${formatDate(detail.dueAtUtc, "datetime")}` : ""}{detail.maxMarks ? ` · out of ${detail.maxMarks}` : ""}
              </DialogDescription>
            </DialogHeader>
            {detail.instructions && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{detail.instructions}</p>}
            <div className="flex flex-wrap gap-2">
              {detail.attachmentFileName && <Button size="sm" variant="outline" onClick={() => downloadAssignmentAttachment(detail)}><Download className="mr-1.5 h-4 w-4" />{detail.attachmentFileName}</Button>}
              <Button size="sm" variant="outline" onClick={() => onEdit(detail)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
              {detail.kind === "Test" && !detail.resultsReleasedAtUtc && (
                <Button size="sm" onClick={() => act(() => releaseResults(detail.id), "Results released to families")}><Megaphone className="mr-1.5 h-4 w-4" />Release results</Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
            </div>

            <div className="divide-y rounded-lg border">
              {detail.submissions.length === 0 && <p className="p-4 text-sm text-muted-foreground">No students were enrolled in this batch when the work was set.</p>}
              {detail.submissions.map((s) => (
                <SubmissionRow key={s.id} submission={s} assignment={detail} onSave={(body, msg) => act(() => gradeSubmission(s.id, body), msg)} />
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubmissionRow({ submission: s, assignment, onSave }: {
  submission: ApiSubmission;
  assignment: ApiAssignmentDetail;
  onSave: (body: { marks?: number | null; feedback?: string | null; excused?: boolean }, message: string) => void;
}) {
  const [marks, setMarks] = useState(s.marks == null ? "" : String(s.marks));
  const [feedback, setFeedback] = useState(s.feedback ?? "");
  const locked = assignment.kind === "Test" && !!assignment.resultsReleasedAtUtc;
  const statusLabel = s.status === "Pending" ? (assignment.kind === "Test" ? "Not marked" : "Not handed in") : s.status === "Submitted" ? "Handed in" : s.status;

  return (
    <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{s.childName}</span>
          <Badge variant={s.status === "Submitted" ? "secondary" : "outline"}>{statusLabel}</Badge>
          {s.isLate && <Badge variant="destructive">Late</Badge>}
          {s.submittedAtUtc && <span className="text-xs text-muted-foreground">{formatDate(s.submittedAtUtc, "datetime")}</span>}
        </div>
        {s.answerText && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.answerText}</p>}
        {s.attachmentFileName && (
          <Button size="sm" variant="link" className="h-auto px-0" onClick={() => downloadSubmissionFile(s)}><FileUp className="mr-1 h-3.5 w-3.5" />{s.attachmentFileName}</Button>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2 md:w-[360px]">
        <Input aria-label={`Marks for ${s.childName}`} className="w-20" type="number" min={0} max={assignment.maxMarks ?? undefined} step="0.5" placeholder="Marks" value={marks} disabled={locked} onChange={(e) => setMarks(e.target.value)} />
        <Input aria-label={`Feedback for ${s.childName}`} className="min-w-0 flex-1" placeholder="Feedback" maxLength={2000} value={feedback} disabled={locked} onChange={(e) => setFeedback(e.target.value)} />
        <Button size="sm" disabled={locked} onClick={() => onSave({ marks: marks.trim() ? Number(marks) : null, feedback: feedback.trim() || null }, `${s.childName} graded`)}>
          <BookOpenCheck className="mr-1 h-4 w-4" />Save
        </Button>
        {s.status !== "Excused" && !locked && (
          <Button size="sm" variant="ghost" onClick={() => onSave({ excused: true, feedback: feedback.trim() || null }, `${s.childName} excused`)}>Excuse</Button>
        )}
      </div>
    </div>
  );
}
