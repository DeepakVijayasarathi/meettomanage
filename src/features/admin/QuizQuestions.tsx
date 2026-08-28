import { useMemo, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import { listDepartments, type ApiDepartment } from "@/api/departments";
import { listCourses, type ApiCourse } from "@/api/courses";
import {
  listQuizQuestions,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  bulkImportQuizQuestions,
  exportQuizQuestions,
  type ApiQuizQuestion,
} from "@/api/quizQuestions";
import { BulkImportExportBar } from "@/components/BulkImportExportBar";

/** One editable option row in the dialog — a fresh id per row (not persisted) just keys the list. */
interface DraftOption {
  key: string;
  text: string;
  isCorrect: boolean;
}

const EMPTY_OPTIONS: DraftOption[] = [
  { key: "o-1", text: "", isCorrect: true },
  { key: "o-2", text: "", isCorrect: false },
];

export default function AdminQuizQuestions() {
  const { toast } = useToast();
  const { data: questions, error: loadError, reload } = useApiData<ApiQuizQuestion[]>(() => listQuizQuestions(), []);
  const { data: departments } = useApiData<ApiDepartment[]>(() => listDepartments(false), []);
  const { data: courses } = useApiData<ApiCourse[]>(() => listCourses(), []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiQuizQuestion | null>(null);
  const [prompt, setPrompt] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState<string>("__none__");
  const [options, setOptions] = useState<DraftOption[]>(EMPTY_OPTIONS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiQuizQuestion | null>(null);
  const [deleting, setDeleting] = useState(false);

  // A course scopes the question tighter than its own department, so once one is picked
  // the department field just follows it — editing department directly only makes sense
  // for a department-wide (no specific course) question.
  const coursesInDepartment = useMemo(
    () => courses.filter((c) => !departmentId || c.departmentId === departmentId),
    [courses, departmentId]
  );

  function openAdd() {
    setEditing(null);
    setPrompt("");
    setDepartmentId(departments[0]?.id ?? "");
    setCourseId("__none__");
    setOptions(EMPTY_OPTIONS.map((o) => ({ ...o })));
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(question: ApiQuizQuestion) {
    setEditing(question);
    setPrompt(question.prompt);
    setDepartmentId(question.departmentId);
    setCourseId(question.courseId ?? "__none__");
    setOptions(
      question.options.length > 0
        ? question.options.map((o, i) => ({ key: `${question.id}-${i}`, text: o.text, isCorrect: o.isCorrect }))
        : EMPTY_OPTIONS.map((o) => ({ ...o }))
    );
    setError(null);
    setDialogOpen(true);
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { key: `o-${Date.now()}`, text: "", isCorrect: false }]);
  }

  function removeOption(key: string) {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const next = prev.filter((o) => o.key !== key);
      // Losing the only correct option would silently produce an unscorable question —
      // default back to the first remaining one instead.
      return next.some((o) => o.isCorrect) ? next : next.map((o, i) => (i === 0 ? { ...o, isCorrect: true } : o));
    });
  }

  function setCorrect(key: string) {
    setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: o.key === key })));
  }

  function validate(): string | null {
    if (!prompt.trim()) return "Enter the question prompt.";
    if (courseId === "__none__" && !departmentId) return "Choose a department (or a specific course).";
    const filled = options.filter((o) => o.text.trim());
    if (filled.length < 2) return "Add at least 2 options.";
    if (!options.some((o) => o.isCorrect && o.text.trim())) return "Mark one option as correct.";
    return null;
  }

  async function save() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!apiEnabled()) {
      setNotice("Demo mode — changes not persisted.");
      setDialogOpen(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
        departmentId: courseId === "__none__" ? departmentId : undefined,
        courseId: courseId === "__none__" ? undefined : courseId,
        prompt: prompt.trim(),
        options: options.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
      };
      if (editing) {
        await updateQuizQuestion(editing.id, input);
      } else {
        await createQuizQuestion(input);
      }
      setDialogOpen(false);
      reload();
      toast({ variant: "success", title: editing ? "Question updated" : "Question created" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save the question.";
      setError(message);
      toast({ variant: "error", title: "Couldn't save question", description: message });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (!apiEnabled()) {
      setNotice("Demo mode — nothing was actually deleted.");
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteQuizQuestion(deleteTarget.id);
      setDeleteTarget(null);
      reload();
      toast({ variant: "success", title: "Question deleted" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete that question.";
      setNotice(message);
      toast({ variant: "error", title: "Couldn't delete question", description: message });
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<ApiQuizQuestion>[] = [
    {
      key: "prompt",
      header: "Question",
      render: (q) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground" title={q.prompt}>{q.prompt}</p>
            <p className="text-xs text-muted-foreground">{q.options.length} options</p>
          </div>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (q) =>
        q.courseName ? (
          <Badge variant="secondary">{q.courseName}</Badge>
        ) : (
          <Badge variant="outline">{q.departmentName} (all courses)</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (q) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEdit(q)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(q)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Academics"
        title="Quiz Bank"
        description="Live-quiz questions teachers launch during class — scope one to a specific course, or leave it department-wide to share across every course in that department. A Demo class only ever draws from its department's shared questions."
        actions={
          <div className="flex items-center gap-2">
            <BulkImportExportBar
              entityLabel="quiz questions"
              templateColumns={["DepartmentName", "CourseName", "Prompt", "Option1", "Option2", "Option3", "Option4", "Option5", "Option6", "CorrectOptionNumber"]}
              onImport={bulkImportQuizQuestions}
              onExport={exportQuizQuestions}
              onImported={reload}
            />
            <Button onClick={openAdd} disabled={departments.length === 0}>
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          </div>
        }
      />

      {apiEnabled() && loadError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not reach the API ({loadError}).
        </InlineAlert>
      )}

      {notice && (
        <InlineAlert variant="success" className="mb-4">
          {notice}
        </InlineAlert>
      )}

      {questions.length === 0 && !loadError ? (
        <EmptyState
          icon={Sparkles}
          title="No quiz questions yet"
          description="Classes launching a live quiz will see an empty bank until some are added here."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          }
        />
      ) : (
        <DataTable
          data={questions}
          columns={columns}
          rowKey={(q) => q.id}
          searchPlaceholder="Search questions…"
          searchFn={(q, query) => q.prompt.toLowerCase().includes(query.toLowerCase())}
          error={apiEnabled() ? loadError : null}
          onRetry={reload}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit question" : "Add a quiz question"}</DialogTitle>
            <DialogDescription>
              Leave course unset to share this question across every course in the department (and any demo class there).
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid gap-1.5">
              <Label htmlFor="qq-prompt">Question</Label>
              <Input id="qq-prompt" placeholder="e.g. Which letter makes the /f/ sound in 'phone'?" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="qq-department">Department</Label>
                <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setCourseId("__none__"); }}>
                  <SelectTrigger id="qq-department">
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="qq-course">Course (optional)</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="qq-course">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">All courses in department</SelectItem>
                    {coursesInDepartment.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label id="qq-options-label">Options (mark the correct one)</Label>
                <Button size="sm" variant="ghost" onClick={addOption} disabled={options.length >= 6}>
                  <Plus className="h-3.5 w-3.5" /> Add option
                </Button>
              </div>
              <div role="group" aria-labelledby="qq-options-label" className="grid gap-2">
              {options.map((option, idx) => (
                <div key={option.key} className="flex items-center gap-2">
                  <Checkbox
                    checked={option.isCorrect}
                    onCheckedChange={() => setCorrect(option.key)}
                    aria-label={`Mark "${option.text || "this option"}" as correct`}
                  />
                  <Input
                    placeholder="Option text"
                    aria-label={`Option ${idx + 1} text`}
                    value={option.text}
                    onChange={(e) => setOptions((prev) => prev.map((o) => (o.key === option.key ? { ...o, text: e.target.value } : o)))}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeOption(option.key)}
                    disabled={options.length <= 2}
                    aria-label="Remove option"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              </div>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this question?"
        description={deleteTarget ? `"${deleteTarget.prompt}" will no longer appear in any class's live quiz.` : ""}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
