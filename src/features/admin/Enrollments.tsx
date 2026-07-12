import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileEdit, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { getCourseById } from "@/data/courses";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listEnrollmentForms, reviewEnrollmentForm, type ApiEnrollmentForm } from "@/api/parentPortal";
import type { Child } from "@/types";
import { getInitials } from "@/lib/utils";

/** Mock Child rows and live enrollment-form rows share one table shape. */
type EnrollmentRow = Child & { parentName?: string; formJson?: string; dob?: string };

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
  const { data: rows, reload } = useApiData<EnrollmentRow[]>(
    () => listEnrollmentForms().then((forms) => forms.map(toEnrollmentRow)),
    CHILDREN
  );
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<EnrollmentRow | null>(null);

  function isComplete(child: EnrollmentRow) {
    return child.enrollmentComplete || approvedIds.has(child.id);
  }

  function handleApprove(row: EnrollmentRow) {
    if (apiEnabled()) {
      const parts = row.name.split(" ");
      reviewEnrollmentForm(row.id, {
        approve: true,
        childFirstName: parts[0],
        childLastName: parts.slice(1).join(" ") || undefined,
        childDateOfBirth: row.dob,
      }).then(() => {
        reload();
        setDetail(null);
      });
      return;
    }
    setApprovedIds((prev) => new Set(prev).add(row.id));
    setDetail(null);
  }

  function handleDownload(row: EnrollmentRow) {
    const blob = new Blob([row.formJson ?? JSON.stringify(row, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enrollment-${row.name.replace(/[^a-z0-9]+/gi, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<EnrollmentRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Student",
        sortable: true,
        accessor: (row) => row.name,
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback style={{ backgroundColor: `${row.avatarColor}22`, color: row.avatarColor }}>{getInitials(row.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">
                {row.grade} · Age {row.age}
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
        render: (row) => <span className="text-sm text-muted-foreground">{getCourseById(row.courseId)?.name ?? "—"}</span>,
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
    [approvedIds]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Admissions"
        title="Enrollment Review"
        description="Review submitted enrollment forms — approve, edit or download as PDF."
      />

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search by student name…"
        onRowClick={(row) => setDetail(row)}
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
                    {detail.age} yrs · {detail.grade}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Course</p>
                  <p className="mt-1 font-medium text-foreground">{getCourseById(detail.courseId)?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</p>
                  <p className="mt-1 font-medium text-foreground">{getParentById(detail.parentId)?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent Contact</p>
                  <p className="mt-1 font-medium text-foreground">{getParentById(detail.parentId)?.phone ?? "—"}</p>
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

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => handleDownload(detail)}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline">
                  <FileEdit className="h-4 w-4" />
                  Edit
                </Button>
                {!isComplete(detail) && (
                  <Button onClick={() => handleApprove(detail)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
