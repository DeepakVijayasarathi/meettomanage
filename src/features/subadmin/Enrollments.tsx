import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileEdit, GraduationCap, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { apiEnabled, userMessage } from "@/lib/api";
import { formatSchedulePreference, readSchedulePreference } from "@/lib/schedulePreference";
import { useSession } from "@/state/session";
import { useApiData } from "@/api/hooks";
import { listEnrollmentForms, reviewEnrollmentForm, updateEnrollmentForm, type ApiEnrollmentForm } from "@/api/parentPortal";
import { listCourseOptions, type ApiCourseOption } from "@/api/courses";
import { listPackagePlans, type ApiPackagePlan } from "@/api/billing";
import { listBatches, type ApiBatch } from "@/api/batches";
import type { Child } from "@/types";
import { formatCurrency, getInitials } from "@/lib/utils";

/** One row of the Payment Tracking table — a real invoice in API mode, a demo payment link
 * otherwise. The optional fields beyond parentName/parentPhone/formJson/dob mirror every other
 * answer the parent enrollment form (features/parent/Enrollment.tsx) collects, so the RM's Edit
 * dialog below can correct any of it, not just name/DOB/grade/course. */
type EnrollmentRow = Child & {
  parentName?: string;
  parentPhone?: string;
  formJson?: string;
  formStatus?: ApiEnrollmentForm["status"];
  dob?: string;
  batchType?: "group" | "individual" | "";
  gender?: string;
  schoolName?: string;
  priorExperience?: string;
  relationship?: string;
  parentEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  preferredDays?: string[];
  preferredTime?: string;
  /** Per-day preferred start times from the parent's schedule preference, e.g. { Mon: "16:00" }. */
  dayTimes?: Record<string, string>;
  daysPerWeek?: number | null;
  allergies?: string;
  notes?: string;
};

// Same set the parent enrollment form offers (features/parent/Enrollment.tsx) — the RM's
// Edit dialog corrects into the exact same value space the parent picked from.
const EDIT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function gradeLabel(grade: string): string {
  return grade === "—" ? "Grade pending" : grade;
}

function batchTypeLabel(batchType: EnrollmentRow["batchType"]): string {
  if (batchType === "group") return "Group Batch";
  if (batchType === "individual") return "Individual Batch";
  return "Not selected";
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
  const str = (key: string): string | undefined => (typeof answers[key] === "string" ? (answers[key] as string) : undefined);
  return {
    id: form.id,
    parentId: form.parentProfileId,
    parentName: form.parentName,
    parentPhone: str("parentPhone"),
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
    formStatus: form.status,
    dob,
    batchType: answers.batchType === "group" || answers.batchType === "individual" ? answers.batchType : "",
    gender: str("gender"),
    schoolName: str("schoolName"),
    priorExperience: str("priorExperience"),
    relationship: str("relationship"),
    parentEmail: str("parentEmail"),
    emergencyContactName: str("emergencyContactName"),
    emergencyContactPhone: str("emergencyContactPhone"),
    address: str("address"),
    preferredDays: Array.isArray(answers.preferredDays) ? (answers.preferredDays as string[]) : [],
    preferredTime: str("preferredTime"),
    dayTimes: readSchedulePreference(answers).dayTimes,
    daysPerWeek: readSchedulePreference(answers).daysPerWeek,
    allergies: str("allergies"),
    notes: str("notes"),
  };
}

/**
 * Delegated-portal Enrollment Review — ported from admin/Enrollments.tsx.
 * EnrollmentFormsController gates List on Admission:View, Review (approve) on
 * Admission:Approve, and Update (edit) on Admission:Edit
 * (EnrollmentFormsController.cs:48,58,69) — a distinct module from BillingFinance, since
 * these forms carry raw family/child JSON (see the comment at
 * EnrollmentFormsController.cs:43-46 on why this isn't folded into UserManagement). The
 * "Download" button never calls the backend — it renders a printable summary from the
 * form data already loaded for the list, so it only needs the page's own View access.
 */
export default function SubAdminEnrollments() {
  const { hasPermission } = useSession();
  const canApprove = !apiEnabled() || hasPermission("Admission", "Approve");
  const canEdit = !apiEnabled() || hasPermission("Admission", "Edit");
  // GET /api/batches requires CourseBatchManagement:View server-side — an account that can
  // approve enrollments (Admission:Approve) doesn't necessarily also have that grant (e.g.
  // Admission role). Confirmed live via a fresh AdmissionTeam test account: 403 console noise
  // and a silently-empty "place on batch" picker in the approval dialog.
  const canSeeBatches = !apiEnabled() || hasPermission("CourseBatchManagement", "View");
  // GET /api/package-plans requires BillingFinance:View — also a separate grant from
  // Admission:Approve/Edit. Admission's own default set does include BillingFinance so this
  // doesn't 403 there, but a Coordinator/Management account reaching /coordinator/enrollments
  // or /management/enrollments without that grant hits the same silently-empty picker.
  const canSeeBillingPlans = !apiEnabled() || hasPermission("BillingFinance", "View");

  const { data: allRows, error: rowsError, reload } = useApiData<EnrollmentRow[]>(
    // A rejected submission (duplicate, or wrong details later refiled correctly) has no
    // reason to stay in this working queue — rejecting it already clears it from here.
    () => listEnrollmentForms().then((forms) => forms.map(toEnrollmentRow)),
    CHILDREN
  );
  const rows = useMemo(() => allRows.filter((r) => r.formStatus !== "Rejected"), [allRows]);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<EnrollmentRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EnrollmentRow | null>(null);

  // Edit dialog
  const [editRow, setEditRow] = useState<EnrollmentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editCourse, setEditCourse] = useState("");
  // Every other field the parent enrollment form collects — RMs correct parent mistakes
  // here, not just name/DOB/grade/course (see the EnrollmentRow comment above).
  const [editBatchType, setEditBatchType] = useState<"group" | "individual" | "">("");
  const [editGender, setEditGender] = useState("");
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editPriorExperience, setEditPriorExperience] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editEmergencyContactName, setEditEmergencyContactName] = useState("");
  const [editEmergencyContactPhone, setEditEmergencyContactPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPreferredDays, setEditPreferredDays] = useState<string[]>([]);
  const [editPreferredTime, setEditPreferredTime] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editNotes, setEditNotes] = useState("");
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
    () => (canSeeBillingPlans ? listPackagePlans().then((plans) => plans.filter((p) => p.isActive)) : Promise.resolve([])),
    []
  );
  const [approvePlanId, setApprovePlanId] = useState<string>("");
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Open batches for the approval picker; approving with one selected places the
  // child straight on that batch's roster instead of leaving them unassigned.
  const { data: allBatches } = useApiData<ApiBatch[]>(() => (canSeeBatches ? listBatches() : Promise.resolve([])), []);
  const openBatches = useMemo(
    () => allBatches.filter((b) => b.status === "Active" && b.enrolledCount < b.capacity),
    [allBatches]
  );
  const [approveBatchId, setApproveBatchId] = useState<string>("");

  function openDetail(row: EnrollmentRow) {
    const courseMatches = activePlans.filter((p) => p.courseId && p.courseId === row.courseId);
    setApprovePlanId(courseMatches.length === 1 ? courseMatches[0].id : "");
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
    setEditBatchType(row.batchType ?? "");
    setEditGender(row.gender ?? "");
    setEditSchoolName(row.schoolName ?? "");
    setEditPriorExperience(row.priorExperience ?? "");
    setEditRelationship(row.relationship ?? "");
    setEditParentName(row.parentName ?? "");
    setEditParentPhone(row.parentPhone ?? "");
    setEditParentEmail(row.parentEmail ?? "");
    setEditEmergencyContactName(row.emergencyContactName ?? "");
    setEditEmergencyContactPhone(row.emergencyContactPhone ?? "");
    setEditAddress(row.address ?? "");
    setEditPreferredDays(row.preferredDays ?? []);
    setEditPreferredTime(row.preferredTime ?? "");
    setEditAllergies(row.allergies ?? "");
    setEditNotes(row.notes ?? "");
    setEditError(null);
  }

  function toggleEditPreferredDay(day: string) {
    setEditPreferredDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleSaveEdit() {
    if (!editRow) return;
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
    answers.batchType = editBatchType || undefined;
    answers.gender = editGender || undefined;
    answers.schoolName = editSchoolName.trim() || undefined;
    answers.priorExperience = editPriorExperience || undefined;
    answers.relationship = editRelationship || undefined;
    answers.parentName = editParentName.trim() || undefined;
    answers.parentPhone = editParentPhone.trim() || undefined;
    answers.parentEmail = editParentEmail.trim() || undefined;
    answers.emergencyContactName = editEmergencyContactName.trim() || undefined;
    answers.emergencyContactPhone = editEmergencyContactPhone.trim() || undefined;
    answers.address = editAddress.trim() || undefined;
    answers.preferredDays = editPreferredDays;
    answers.preferredTime = editPreferredTime || undefined;
    // Keep the per-day times in step with the (possibly edited) day list: drop times for days no
    // longer selected; a day added here simply has no time until the parent or RM sets one.
    const keptTimes = Object.fromEntries(
      Object.entries(readSchedulePreference(answers).dayTimes).filter(([d]) => editPreferredDays.includes(d))
    );
    answers.dayTimes = Object.keys(keptTimes).length > 0 ? keptTimes : undefined;
    answers.daysPerWeek = editPreferredDays.length > 0 ? editPreferredDays.length : undefined;
    answers.allergies = editAllergies.trim() || undefined;
    answers.notes = editNotes.trim() || undefined;

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
      setEditError(userMessage(e, "Could not save changes."));
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
        setApproveError(userMessage(e, "Could not approve the enrollment."));
      } finally {
        setApproving(false);
      }
      return;
    }
    setApprovedIds((prev) => new Set(prev).add(row.id));
    setDetail(null);
  }

  // Rethrows on failure — ConfirmDialog's own onConfirm contract keeps the dialog open and
  // shows the error inline when the promise it's given rejects.
  async function handleReject() {
    if (!rejectTarget) return;
    const name = rejectTarget.name;
    if (apiEnabled()) {
      await reviewEnrollmentForm(rejectTarget.id, { approve: false });
      reload();
    }
    setBanner(`"${name}" removed from the review queue.${apiEnabled() ? "" : " Demo mode — nothing actually changed."}`);
    setRejectTarget(null);
    setDetail(null);
  }

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
        key: "batchType",
        header: "Batch Type",
        sortable: true,
        accessor: (row) => batchTypeLabel(row.batchType),
        render: (row) =>
          row.batchType ? (
            <Badge variant="muted">{batchTypeLabel(row.batchType)}</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Batch Type</p>
                  <p className="mt-1 font-medium text-foreground">{batchTypeLabel(detail.batchType)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule Preference</p>
                  <p className="mt-1 font-medium text-foreground">
                    {detail.daysPerWeek ? `${detail.daysPerWeek} day${detail.daysPerWeek === 1 ? "" : "s"}/week · ` : ""}
                    {formatSchedulePreference({
                      daysPerWeek: detail.daysPerWeek ?? null,
                      days: detail.preferredDays ?? [],
                      dayTimes: detail.dayTimes ?? {},
                      legacyTime: detail.preferredTime ?? "",
                    })}
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

              {!isComplete(detail) && apiEnabled() && canApprove && activePlans.length > 0 && (
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

              {!isComplete(detail) && apiEnabled() && canApprove && (
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

              <DialogFooter className="flex-wrap">
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => handleDownload(detail)}>
                  <Download className="h-4 w-4" />
                  Print / Save PDF
                </Button>
                {canEdit && (
                  <Button variant="outline" disabled={isComplete(detail)} onClick={() => openEdit(detail)}>
                    <FileEdit className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                {!isComplete(detail) && canApprove && (
                  <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setRejectTarget(detail)}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
                {!isComplete(detail) && canApprove && (
                  <Button disabled={approving} onClick={() => handleApprove(detail)}>
                    {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {approving ? "Approving…" : "Approve"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Remove this enrollment?"
        description={
          rejectTarget
            ? `"${rejectTarget.name}" will be removed from the review queue — use this for a duplicate or wrong submission. The parent can resubmit if it was a mistake.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={handleReject}
      />

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-gender">Gender</Label>
                <Select value={editGender || "__unset"} onValueChange={(v) => setEditGender(v === "__unset" ? "" : v)}>
                  <SelectTrigger id="edit-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unset">Not set</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-school">Current school</Label>
                <Input id="edit-school" value={editSchoolName} onChange={(e) => setEditSchoolName(e.target.value)} placeholder="e.g. Green Valley School" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-batch-type">Batch type</Label>
                <Select value={editBatchType || "__unset"} onValueChange={(v) => setEditBatchType(v === "__unset" ? "" : (v as "group" | "individual"))}>
                  <SelectTrigger id="edit-batch-type">
                    <SelectValue placeholder="Select batch type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unset">Not set</SelectItem>
                    <SelectItem value="group">Group Batch</SelectItem>
                    <SelectItem value="individual">Individual Batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-prior-experience">Prior experience</Label>
              <Select value={editPriorExperience || "__unset"} onValueChange={(v) => setEditPriorExperience(v === "__unset" ? "" : v)}>
                <SelectTrigger id="edit-prior-experience">
                  <SelectValue placeholder="Select level (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset">Not set</SelectItem>
                  <SelectItem value="none">Complete beginner</SelectItem>
                  <SelectItem value="some">Some exposure</SelectItem>
                  <SelectItem value="confident">Confident / advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent &amp; contact</p>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-parent-name">Parent / guardian name</Label>
                    <Input id="edit-parent-name" value={editParentName} onChange={(e) => setEditParentName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-relationship">Relationship to student</Label>
                    <Select value={editRelationship || "__unset"} onValueChange={(v) => setEditRelationship(v === "__unset" ? "" : v)}>
                      <SelectTrigger id="edit-relationship">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unset">Not set</SelectItem>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-parent-phone">Contact number</Label>
                    <Input id="edit-parent-phone" value={editParentPhone} onChange={(e) => setEditParentPhone(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-parent-email">Email</Label>
                    <Input id="edit-parent-email" type="email" value={editParentEmail} onChange={(e) => setEditParentEmail(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-emergency-name">Emergency contact name</Label>
                    <Input id="edit-emergency-name" value={editEmergencyContactName} onChange={(e) => setEditEmergencyContactName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-emergency-phone">Emergency contact number</Label>
                    <Input id="edit-emergency-phone" value={editEmergencyContactPhone} onChange={(e) => setEditEmergencyContactPhone(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-address">Home address</Label>
                  <Textarea id="edit-address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Street, city, state, PIN" />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule preferences</p>
              <div className="flex flex-col gap-4">
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-sm font-medium leading-none text-foreground/90">Preferred class days</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {EDIT_DAYS.map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant="pill"
                        size="pill"
                        aria-pressed={editPreferredDays.includes(d)}
                        onClick={() => toggleEditPreferredDay(d)}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-preferred-time">Preferred time slot</Label>
                  <Select value={editPreferredTime || "__unset"} onValueChange={(v) => setEditPreferredTime(v === "__unset" ? "" : v)}>
                    <SelectTrigger id="edit-preferred-time">
                      <SelectValue placeholder="Select a time slot (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset">Not set</SelectItem>
                      <SelectItem value="morning">Morning (8am–12pm)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12pm–4pm)</SelectItem>
                      <SelectItem value="evening">Evening (4pm–8pm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-allergies">Allergies or medical notes</Label>
                  <Textarea id="edit-allergies" value={editAllergies} onChange={(e) => setEditAllergies(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-notes">Anything else we should know?</Label>
                  <Textarea id="edit-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                </div>
              </div>
            </div>

            {editError && <p className="text-sm font-medium text-destructive">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={handleSaveEdit}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
