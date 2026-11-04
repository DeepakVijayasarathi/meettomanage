import { useMemo, useState } from "react";
import { BookOpenCheck, CalendarClock, Download, FileUp, GraduationCap, Trophy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { downloadMySubmission, downloadMyWorksheet, listMyAssignments, submitAssignment, type ApiFamilyAssignment } from "@/api/assignments";

type Tab = "todo" | "done" | "results";

function bucket(a: ApiFamilyAssignment): Tab {
  if (a.marks != null || a.feedback || a.status === "Graded" || a.status === "Excused") return "results";
  if (a.kind === "Homework" && a.status === "Submitted") return "done";
  return "todo";
}

/** Parent portal: each child's homework and tests, handing work in, and released marks. */
export default function ParentHomework() {
  const { toast } = useToast();
  const { data: rows, error, reload, loading } = useApiData(() => listMyAssignments(), []);
  const [child, setChild] = useState<string>("all");
  const [tab, setTab] = useState<Tab>("todo");
  const [submitting, setSubmitting] = useState<ApiFamilyAssignment | null>(null);
  const [answer, setAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const children = useMemo(() => [...new Map(rows.map((r) => [r.childId, r.childName])).entries()], [rows]);
  const mine = child === "all" ? rows : rows.filter((r) => r.childId === child);
  const groups = { todo: mine.filter((a) => bucket(a) === "todo"), done: mine.filter((a) => bucket(a) === "done"), results: mine.filter((a) => bucket(a) === "results") };
  const overdue = groups.todo.filter((a) => a.isOverdue).length;

  const open = (a: ApiFamilyAssignment) => {
    setSubmitting(a);
    setAnswer(a.answerText ?? "");
    setFile(null);
  };

  const submit = async () => {
    if (!submitting) return;
    setBusy(true);
    try {
      await submitAssignment(submitting.submissionId, answer, file);
      toast({ variant: "success", title: "Handed in", description: "The teacher can now check it." });
      setSubmitting(null);
      reload();
    } catch (e) {
      toast({ variant: "error", title: "Couldn't hand in", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Learning" title="Homework & Tests" description="Work set by your child's teachers, what's been handed in, and results once they're shared." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="To do" value={String(groups.todo.length)} detail={overdue ? `${overdue} overdue` : "nothing overdue"} icon={CalendarClock} tone={overdue ? "destructive" : "primary"} />
        <KpiCard label="Handed in" value={String(groups.done.length)} detail="waiting for the teacher" icon={BookOpenCheck} tone="neutral" />
        <KpiCard label="Results" value={String(groups.results.length)} detail="checked or marked" icon={Trophy} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border p-0.5">
          {([["todo", "To do"], ["done", "Handed in"], ["results", "Results"]] as const).map(([key, label]) => (
            <Button key={key} size="sm" variant={tab === key ? "secondary" : "ghost"} onClick={() => setTab(key)}>{label} ({groups[key].length})</Button>
          ))}
        </div>
        {children.length > 1 && (
          <div className="inline-flex rounded-lg border p-0.5">
            <Button size="sm" variant={child === "all" ? "secondary" : "ghost"} onClick={() => setChild("all")}>All children</Button>
            {children.map(([id, name]) => <Button key={id} size="sm" variant={child === id ? "secondary" : "ghost"} onClick={() => setChild(id)}>{name.split(" ")[0]}</Button>)}
          </div>
        )}
      </div>

      {apiEnabled() && error ? (
        <Card><CardContent className="flex items-center justify-between gap-4 p-6 text-sm"><span>{error}</span><Button size="sm" variant="outline" onClick={reload}>Try again</Button></CardContent></Card>
      ) : groups[tab].length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <GraduationCap className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{loading ? "Loading…" : tab === "todo" ? "Nothing to do right now" : tab === "done" ? "Nothing waiting to be checked" : "No results yet"}</p>
          <p className="text-sm text-muted-foreground">New homework and tests appear here and in the app the moment a teacher sets them.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {groups[tab].map((a) => (
            <Card key={a.submissionId}>
              <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={a.kind === "Test" ? "secondary" : "outline"}>{a.kind}</Badge>
                    <span className="font-semibold">{a.title}</span>
                    {a.isOverdue && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.childName} · {a.batchName}{a.dueAtUtc ? ` · due ${formatDate(a.dueAtUtc, "datetime")}` : ""}
                  </p>
                  {a.instructions && tab === "todo" && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm">{a.instructions}</p>}
                  {tab === "results" && (
                    <div className="mt-2 text-sm">
                      {a.status === "Excused" ? <span className="text-muted-foreground">Excused</span> : a.marks != null && (
                        <span className="font-semibold">{a.marks}{a.maxMarks ? ` / ${a.maxMarks}` : ""}</span>
                      )}
                      {a.classAverage != null && <span className="ml-2 text-muted-foreground">Class average {a.classAverage}</span>}
                      {a.feedback && <p className="mt-1 text-muted-foreground">“{a.feedback}”</p>}
                    </div>
                  )}
                  {a.kind === "Test" && tab === "todo" && <p className="mt-1 text-xs text-muted-foreground">Marks appear here once the teacher shares results.</p>}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {a.attachmentFileName && <Button size="sm" variant="outline" onClick={() => downloadMyWorksheet(a)}><Download className="mr-1.5 h-4 w-4" />Worksheet</Button>}
                  {a.submissionFileName && <Button size="sm" variant="ghost" onClick={() => downloadMySubmission(a)}><FileUp className="mr-1.5 h-4 w-4" />Your file</Button>}
                  {a.canSubmit && <Button size="sm" onClick={() => open(a)}>{a.status === "Submitted" ? "Update" : "Hand in"}</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!submitting} onOpenChange={(o) => !o && setSubmitting(null)}>
        <DialogContent className="max-w-lg">
          {submitting && (
            <>
              <DialogHeader>
                <DialogTitle>Hand in: {submitting.title}</DialogTitle>
                <DialogDescription>For {submitting.childName}. Write an answer, attach a photo of the work, or both.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="hw-answer">Answer</Label>
                  <Textarea id="hw-answer" rows={5} maxLength={4000} value={answer} onChange={(e) => setAnswer(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hw-upload">Photo or file (up to 15 MB)</Label>
                  <Input id="hw-upload" type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,.txt" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  {submitting.submissionFileName && !file && <p className="text-xs text-muted-foreground">Already attached: {submitting.submissionFileName}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSubmitting(null)}>Cancel</Button>
                <Button onClick={submit} disabled={busy || (!answer.trim() && !file && !submitting.submissionFileName)}>{busy ? "Sending…" : "Hand in"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
