import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileEdit, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CHILDREN } from "@/data/children";
import { getParentById } from "@/data/users";
import { COURSES, getCourseById } from "@/data/courses";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listEnrollmentForms, reviewEnrollmentForm, updateEnrollmentForm, type ApiEnrollmentForm } from "@/api/parentPortal";
import { listCourseOptions, type ApiCourseOption } from "@/api/courses";
import { listPackagePlans, type ApiPackagePlan } from "@/api/billing";
import { listBatches, type ApiBatch } from "@/api/batches";
import type { Child } from "@/types";
import { formatCurrency, getInitials } from "@/lib/utils";

/** Mock Child rows and live enrollment-form rows share one table shape. */
type EnrollmentRow = Child & { parentName?: string; parentPhone?: string; formJson?: string; dob?: string };

/** row.grade falls back to "—" when the form never answered it — rendered as a bare dash
 * inline before "Age N" it read as a stray blank field rather than a real value. Matches
 * the "(child name pending)" wording already used for a missing name. */
function gradeLabel(grade: string): string {
  return grade === "—" ? "Grade pending" : grade;
}

function toEnrollmentRow(form: ApiEnrollmentForm): EnrollmentRow {
  let answers: Record<string, unknown> = {};
  try {
    answers = JSON.parse(form.formDataJson) as Record<string, unknown>;
  } catch {
    /* malformed answers still render as a pending row */
  }
  const dob = typeof answers.dob === "string" ? answers.dob : undefined;
  const age = dob ? Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000))) : 0;
  return {
    id: form.id,
    parentId: form.parentProfileId,
    parentName: form.parentName,
    parentPhone: typeof answers.parentPhone === "string" ? answers.parentPhone : undefined,
    name: typeof answers.childName === "string" && answers.childName ? answers.childName : "(child name pending)",
    age,
    grade: typeof answers.grade === "string" ? answers.grade : "—",
    avatarColor: "#7c5cff",
    courseId: typeof answers.courseInterest === "string" ? answers.courseInterest : "",
    batchId: "",
    classesCompleted: 0,
    classesRemaining: 0,
    attendancePercent: 0,
    feeStatus: "due",
    enrollmentComplete: form.status === "Approved",
    formJson: form.formDataJson,
    dob,
  };
}

export default function AdminEnrollments() {
  const { data: rows, error: rowsError, reload } = useApiData<EnrollmentRow[]>(
    () => listEnrollmentForms().then((forms) => forms.map(toEnrollmentRow)),
    CHILDREN
  );
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<EnrollmentRow | null>(null);

  // Edit dialog
  const [editRow, setEditRow] = useState<EnrollmentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editCourse, setEditCourse] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const { data: courseOptions } = useApiData<ApiCourseOption[]>(
    () => listCourseOptions(),
    COURSES.map((c) => ({ id: c.id, name: c.name, type: c.type === "group" ? ("Group" as const) : ("Individual" as const) }))
  );

  // Active billing plans for the approval picker; approving with one selected starts
  // the child's subscription and issues the first invoice straight away.
  const { data: activePlans } = useApiData<ApiPackagePlan[]>(
    () => listPackagePlans().then((plans) => plans.filter((p) => p.isActive)),
    []
  );
  const [approvePlanId, setApprovePlanId] = useState<string>("");
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Open batches for the approval picker; approving with one selected places the
  // child straight on that batch's roster instead of leaving them unassigned.
  const { data: allBatches } = useApiData<ApiBatch[]>(() => listBatches(), []);
  const openBatches = useMemo(
    () => allBatches.filter((b) => b.status === "Active" && b.enrolledCount < b.capacity),
    [allBatches]
  );
  const [approveBatchId, setApproveBatchId] = useState<string>("");

  function openDetail(row: EnrollmentRow) {
    // Pre-select the plan when the child's course-of-interest has exactly one —
    // the common case approves with billing in a single click.
    const courseMatches = activePlans.filter((p) => p.courseId && p.courseId === row.courseId);
    setApprovePlanId(courseMatches.length === 1 ? courseMatches[0].id : "");
    // Same idea for the batch: pre-select when exactly one open batch matches the
    // child's course-of-interest.
    const batchMatches = openBatches.filter((b) => b.courseId === row.courseId);
    setApproveBatchId(batchMatches.length === 1 ? batchMatches[0].id : "");
    setApproveError(null);
    setDetail(row);
  }

  function isComplete(child: EnrollmentRow) {
    return child.enrollmentComplete || approvedIds.has(child.id);
  }

  function openEdit(row: EnrollmentRow) {
    setEditRow(row);
    setEditName(row.name === "(child name pending)" ? "" : row.name);
    setEditDob(row.dob ?? "");
    setEditGrade(row.grade === "—" ? "" : row.grade);
    setEditCourse(row.courseId);
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editRow) return;
    // Merge edits back into the original answers so client-defined fields are preserved.
    let answers: Record<string, unknown>;
    try {
      answers = editRow.formJson ? (JSON.parse(editRow.formJson) as Record<string, unknown>) : {};
    } catch {
      answers = {};
    }
    answers.childName = editName.trim();
    answers.dob = editDob || undefined;
    answers.grade = editGrade.trim() || undefined;
    answers.courseInterest = editCourse || undefined;

    if (!apiEnabled()) {
      setBanner(`"${editName.trim() || "Enrollment"}" updated. (Demo only — not persisted.)`);
      setEditRow(null);
      return;
    }

    setSaving(true);
    setEditError(null);
    try {
      await updateEnrollmentForm(editRow.id, answers);
      setBanner(`"${editName.trim() || "Enrollment"}" updated.`);
      setEditRow(null);
      setDetail(null);
      reload();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(row: EnrollmentRow) {
    if (apiEnabled()) {
      const parts = row.name.split(" ");
      setApproving(true);
      setApproveError(null);
      try {
        await reviewEnrollmentForm(row.id, {
          approve: true,
          childFirstName: parts[0],
          childLastName: parts.slice(1).join(" ") || undefined,
          childDateOfBirth: row.dob,
          packagePlanId: approvePlanId || undefined,
          batchId: approveBatchId || undefined,
        });
        const plan = activePlans.find((p) => p.id === approvePlanId);
        const batch = openBatches.find((b) => b.id === approveBatchId);
        const billingMsg = plan
          ? `billing started on ${plan.name} (${formatCurrency(plan.price)}); the first invoice is on its way to the parent`
          : "no billing plan assigned yet — set one from Packages & Subscriptions when ready";
        const batchMsg = batch ? `placed in ${batch.name}` : "not yet placed in a batch — assign one from Batches when ready";
        setBanner(`"${row.name}" approved — ${batchMsg}; ${billingMsg}.`);
        reload();
        setDetail(null);
      } catch (e) {
        setApproveError(e instanceof Error ? e.message : "Could not approve the enrollment.");
      } finally {
        setApproving(false);
      }
      return;
    }
    setApprovedIds((prev) => new Set(prev).add(row.id));
    setDetail(null);
  }

  /** Turns a camelCase/snake_case form key into a readable label, e.g. "childName" -> "Child name". */
  function labelizeKey(key: string): string {
    const spaced = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * "Download as PDF" used to just save the raw answers JSON — a non-technical
   * admissions staffer can't do anything with that. This opens a formatted,
   * printable summary and triggers the browser's print dialog, where "Save as
   * PDF" is a native destination — a real PDF without adding a PDF-generation
   * dependency for one screen.
   */
  function handleDownload(row: EnrollmentRow) {
    let answers: Record<string, unknown> = {};
    try {
      answers = row.formJson ? (JSON.parse(row.formJson) as Record<string, unknown>) : {};
    } catch {
      /* fall back to an empty answer set below */
    }
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) return;

    const rowsHtml = Object.entries(answers)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `<tr><th>${escapeHtml(labelizeKey(key))}</th><td>${escapeHtml(String(value))}</td></tr>`)
      .join("");

    printWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Enrollment — ${escapeHtml(row.name)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p.sub { color: #666; margin-top: 0; margin-bottom: 24px; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-size: 13px; vertical-align: top; }
  th { width: 220px; color: #555; font-weight: 600; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
  <h1>Enrollment form — ${escapeHtml(row.name)}</h1>
  <p class="sub">Parent: ${escapeHtml(row.parentName ?? "—")} · Generated ${escapeHtml(new Date().toLocaleDateString())}</p>
  <table>${rowsHtml || `<tr><td colspan="2">No form answers on file.</td></tr>`}</table>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  const columns: DataTableColumn<EnrollmentRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Student",
        sortable: true,
        accessor: (row) => row.name,
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback style={{ backgroundColor: `${row.avatarColor}22`, color: row.avatarColor }}>{getInitials(row.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">
                {gradeLabel(row.grade)} · Age {row.age}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "parent",
        header: "Parent",
        accessor: (row) => row.parentName ?? getParentById(row.parentId)?.name ?? "",
        render: (row) => <span className="text-sm">{row.parentName ?? getParentById(row.parentId)?.name ?? "—"}</span>,
      },
      {
        key: "course",
        header: "Course",
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {courseOptions.find((c) => c.id === row.courseId)?.name ?? getCourseById(row.courseId)?.name ?? "Course pending"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => (isComplete(row) ? 1 : 0),
        render: (row) => (
          <Badge variant={isComplete(row) ? "success" : "warning"}>{isComplete(row) ? "Complete" : "Pending"}</Badge>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approvedIds, courseOptions]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Admissions"
        title="Enrollment Review"
        description="Review submitted enrollment forms — approve, edit or download as PDF."
      />

      {banner && (
        <InlineAlert variant="success" bordered className="mb-5">
          {banner}
        </InlineAlert>
      )}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search by student name…"
        onRowClick={openDetail}
        emptyTitle="No enrollments yet"
        emptyDescription="Enrollments will appear here once a lead converts or a parent completes registration."
        error={apiEnabled() ? rowsError : null}
        onRetry={reload}
      />

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>Enrollment form submitted for review</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age / Grade</p>
                  <p className="mt-1 font-medium text-foreground">
                    {detail.age} yrs · {gradeLabel(detail.grade)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Course</p>
                  <p className="mt-1 font-medium text-foreground">
                    {courseOptions.find((c) => c.id === detail.courseId)?.name ?? getCourseById(detail.courseId)?.name ?? "Course pending"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</p>
                  <p className="mt-1 font-medium text-foreground">{detail.parentName ?? getParentById(detail.parentId)?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent Contact</p>
                  <p className="mt-1 font-medium text-foreground">{detail.parentPhone ?? getParentById(detail.parentId)?.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fee Status</p>
                  <p className="mt-1 font-medium capitalize text-foreground">{detail.feeStatus}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Form Status</p>
                  <div className="mt-1">
                    <Badge variant={isComplete(detail) ? "success" : "warning"}>{isComplete(detail) ? "Complete" : "Pending"}</Badge>
                  </div>
                </div>
              </div>

              {!isComplete(detail) && apiEnabled() && activePlans.length > 0 && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-4">
                  <Label htmlFor="approve-plan-select">Billing plan on approval</Label>
                  <Select value={approvePlanId || "__none"} onValueChange={(v) => setApprovePlanId(v === "__none" ? "" : v)}>
                    <SelectTrigger id="approve-plan-select">
                      <SelectValue placeholder="No billing plan — assign later" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No billing plan — assign later</SelectItem>
                      {[...activePlans]
                        .sort(
                          (a, b) =>
                            Number(Boolean(b.courseId && b.courseId === detail.courseId)) -
                            Number(Boolean(a.courseId && a.courseId === detail.courseId))
                        )
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {formatCurrency(p.price)}
                            {p.billingCycle !== "OneTime" ? ` / ${p.billingCycle.toLowerCase().replace("ly", "")}` : " one-time"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Starts the subscription and issues the first invoice to the parent the moment you approve.
                  </p>
                </div>
              )}

              {!isComplete(detail) && apiEnabled() && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-4">
                  <Label htmlFor="approve-batch-select">Batch on approval</Label>
                  <Select value={approveBatchId || "__none"} onValueChange={(v) => setApproveBatchId(v === "__none" ? "" : v)}>
                    <SelectTrigger id="approve-batch-select">
                      <SelectValue placeholder="No batch — assign later" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No batch — assign later</SelectItem>
                      {[...openBatches]
                        .sort(
                          (a, b) =>
                            Number(b.courseId === detail.courseId) - Number(a.courseId === detail.courseId)
                        )
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} — {b.courseName} ({b.enrolledCount}/{b.capacity})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Places the child on this batch's roster the moment you approve.
                  </p>
                </div>
              )}

              {approveError && <p className="text-sm font-medium text-destructive">{approveError}</p>}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => handleDownload(detail)}>
                  <Download className="h-4 w-4" />
                  Print / Save PDF
                </Button>
                <Button variant="outline" disabled={isComplete(detail)} onClick={() => openEdit(detail)}>
                  <FileEdit className="h-4 w-4" />
                  Edit
                </Button>
                {!isComplete(detail) && (
                  <Button disabled={approving} onClick={() => handleApprove(detail)}>
                    <CheckCircle2 className="h-4 w-4" />
                    {approving ? "Approving…" : "Approve"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileEdit className="h-5 w-5" />
            </span>
            <DialogTitle>Edit enrollment</DialogTitle>
            <DialogDescription>Correct the submitted answers before approval.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Student name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Child's full name" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-dob">Date of birth</Label>
                <Input id="edit-dob" type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-grade">Grade</Label>
                <Input id="edit-grade" value={editGrade} onChange={(e) => setEditGrade(e.target.value)} placeholder="e.g. Grade 2" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-course-select">Course interest</Label>
              <Select value={editCourse} onValueChange={setEditCourse}>
                <SelectTrigger id="edit-course-select">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editError && <p className="text-sm font-medium text-destructive">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={handleSaveEdit}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
