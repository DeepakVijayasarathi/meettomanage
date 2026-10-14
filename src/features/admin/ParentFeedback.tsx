import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import { listParentFeedback, type ApiParentFeedback, type ParentFeedbackKind } from "@/api/parentFeedback";
import { formatDate, cn } from "@/lib/utils";

const DEMO_ROWS: ApiParentFeedback[] = [
  { id: "pf-1", kind: "Demo", parentName: "Priya Nair", parentEmail: "priya@example.com", childName: "Aarav", subject: "Phonics", rating: 5, comment: "Aarav loved the class.", submittedAtUtc: "2026-09-18T10:00:00Z" },
  { id: "pf-2", kind: "CourseCompletion", parentName: "Rahul Mehta", parentEmail: "rahul@example.com", childName: "Zara", subject: "Public Speaking", rating: 4, comment: null, submittedAtUtc: "2026-09-15T10:00:00Z" },
];

type Filter = "all" | ParentFeedbackKind;

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("h-4 w-4", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </span>
  );
}

const average = (rows: ApiParentFeedback[]) => (rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "—");

/** Parent star ratings after the demo class and after a finished course. Shared by Admin and Admission. */
export default function ParentFeedback() {
  const { data: rows, error, reload } = useApiData(() => listParentFeedback(), DEMO_ROWS);
  const [filter, setFilter] = useState<Filter>("all");

  const demo = useMemo(() => rows.filter((r) => r.kind === "Demo"), [rows]);
  const course = useMemo(() => rows.filter((r) => r.kind === "CourseCompletion"), [rows]);
  const visible = filter === "all" ? rows : filter === "Demo" ? demo : course;

  const columns: DataTableColumn<ApiParentFeedback>[] = [
    { key: "submittedAtUtc", header: "Date", sortable: true, accessor: (r) => r.submittedAtUtc, render: (r) => <span className="text-sm text-muted-foreground">{formatDate(r.submittedAtUtc)}</span> },
    {
      key: "kind",
      header: "After",
      sortable: true,
      accessor: (r) => r.kind,
      render: (r) => <Badge variant="outline">{r.kind === "Demo" ? "Demo class" : "Course completed"}</Badge>,
    },
    {
      key: "parentName",
      header: "Parent",
      sortable: true,
      accessor: (r) => r.parentName,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{r.parentName}</p>
          <p className="truncate text-xs text-muted-foreground">{r.parentEmail}</p>
        </div>
      ),
    },
    {
      key: "childName",
      header: "Child",
      sortable: true,
      accessor: (r) => r.childName,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{r.childName}</p>
          {r.subject && <p className="truncate text-xs text-muted-foreground">{r.subject}</p>}
        </div>
      ),
    },
    { key: "rating", header: "Rating", sortable: true, accessor: (r) => r.rating, render: (r) => <Stars value={r.rating} /> },
    { key: "comment", header: "Comment", render: (r) => <span className="text-sm text-muted-foreground">{r.comment ?? "—"}</span>, className: "max-w-xs whitespace-normal" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Feedback"
        title="Parent Feedback"
        description="How parents rated us after the demo class and after finishing a course."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Demo class rating" value={average(demo)} detail={`${demo.length} response${demo.length === 1 ? "" : "s"}`} icon={Star} tone="warning" />
        <KpiCard label="Course rating" value={average(course)} detail={`${course.length} response${course.length === 1 ? "" : "s"}`} icon={Star} tone="success" />
        <KpiCard label="Total responses" value={String(rows.length)} icon={Star} tone="primary" />
      </div>

      <div className="mb-4 inline-flex rounded-lg border p-0.5">
        {([["all", "All"], ["Demo", "Demo class"], ["CourseCompletion", "Course completed"]] as const).map(([key, label]) => (
          <Button key={key} size="sm" variant={filter === key ? "secondary" : "ghost"} onClick={() => setFilter(key)}>
            {label}
          </Button>
        ))}
      </div>

      <DataTable
        data={visible}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search by parent, child or comment…"
        searchFn={(r, q) => [r.parentName, r.parentEmail, r.childName, r.subject, r.comment].some((v) => v?.toLowerCase().includes(q.toLowerCase()))}
        emptyTitle="No feedback yet"
        emptyDescription="Ratings appear here as soon as parents submit them after a demo class or a completed course."
        error={apiEnabled() ? error : null}
        onRetry={reload}
      />
    </div>
  );
}
