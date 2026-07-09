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
import type { Child } from "@/types";
import { getInitials } from "@/lib/utils";

export default function AdminEnrollments() {
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Child | null>(null);

  function isComplete(child: Child) {
    return child.enrollmentComplete || approvedIds.has(child.id);
  }

  const columns: DataTableColumn<Child>[] = useMemo(
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
        accessor: (row) => getParentById(row.parentId)?.name ?? "",
        render: (row) => <span className="text-sm">{getParentById(row.parentId)?.name ?? "—"}</span>,
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
        data={CHILDREN}
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
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <FileEdit className="h-4 w-4" />
                  Edit
                </Button>
                {!isComplete(detail) && (
                  <Button
                    onClick={() => {
                      setApprovedIds((prev) => new Set(prev).add(detail.id));
                      setDetail(null);
                    }}
                  >
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
