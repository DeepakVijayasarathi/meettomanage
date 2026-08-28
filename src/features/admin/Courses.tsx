import { useMemo, useState } from "react";
import { BookOpen, Plus, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { COURSES } from "@/data/courses";
import { DEMO_DEPARTMENTS } from "@/data/departments";
import type { Course } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { bulkImportCourses, createCourse, exportCourses, listCategories, listCourses, toFrontendCourse, type ApiCourseCategory } from "@/api/courses";
import { listDepartments, type ApiDepartment } from "@/api/departments";
import { BulkImportExportBar } from "@/components/BulkImportExportBar";

const CATEGORY_COLOR: Record<string, string> = {
  Phonics: CHART_PALETTE[3],
  Maths: CHART_PALETTE[4],
  Reading: CHART_PALETTE[0],
  Writing: CHART_PALETTE[5],
  Speaking: CHART_PALETTE[6],
};

const FALLBACK_CATEGORY_COLOR = CHART_PALETTE[1];

const STATUS_VARIANT: Record<Course["status"], "success" | "warning" | "muted"> = {
  active: "success",
  draft: "warning",
  archived: "muted",
};

export default function AdminCourses() {
  const { toast } = useToast();
  const { data: courses, error: apiError, reload } = useApiData(
    () => listCourses().then((list) => list.map(toFrontendCourse)),
    COURSES
  );
  const { data: departments } = useApiData<ApiDepartment[]>(() => listDepartments(false), DEMO_DEPARTMENTS);
  const { data: categories } = useApiData<ApiCourseCategory[]>(() => listCategories(), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [type, setType] = useState<Course["type"]>("group");
  const [duration, setDuration] = useState("30");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const effectiveDepartmentId = departmentId || departments[0]?.id || "";

  // Opens the dialog on a blank form — reopening it used to still hold the previous
  // attempt's course name and price.
  function openCreate() {
    setName("");
    setPrice("");
    setCategory("");
    setDepartmentId("");
    setSaveError(null);
    setCreateOpen(true);
  }

  async function handleCreate() {
    // Checked before the demo-mode short-circuit: the other way round, "Create Course" on
    // an empty form just closed the dialog with no message and no new row, which looks
    // exactly like a course that was created and then vanished.
    if (!name.trim()) {
      setSaveError("Course name is required.");
      return;
    }
    if (!category.trim()) {
      setSaveError("Category is required.");
      return;
    }
    if (!Number.isFinite(Number(duration)) || Number(duration) <= 0) {
      setSaveError("Duration must be a positive number of minutes.");
      return;
    }
    if (!effectiveDepartmentId) {
      setSaveError("Add a department under Academics → Departments before creating a course.");
      return;
    }

    if (!apiEnabled()) {
      setNotice("Demo mode — course not persisted.");
      setCreateOpen(false);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await createCourse({
        name: name.trim(),
        categoryName: category,
        departmentId: effectiveDepartmentId,
        type,
        durationMinutes: Number(duration),
        price: Number(price) || 0,
      });
      setCreateOpen(false);
      setName("");
      setPrice("");
      reload();
      toast({ variant: "success", title: "Course created" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the course.";
      setSaveError(message);
      toast({ variant: "error", title: "Couldn't create course", description: message });
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<Course>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Course",
        sortable: true,
        accessor: (row) => row.name,
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${CATEGORY_COLOR[row.category] ?? FALLBACK_CATEGORY_COLOR}1A`,
                color: CATEGORY_COLOR[row.category] ?? FALLBACK_CATEGORY_COLOR,
              }}
            >
              <BookOpen className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">{row.category}</p>
            </div>
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        sortable: true,
        accessor: (row) => row.type,
        render: (row) => <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold uppercase text-foreground/80">{row.type}</span>,
      },
      {
        key: "duration",
        header: "Duration",
        sortable: true,
        accessor: (row) => row.duration,
        render: (row) => <span className="text-sm text-muted-foreground">{row.duration} min</span>,
      },
      {
        key: "price",
        header: "Price",
        sortable: true,
        accessor: (row) => row.price,
        render: (row) => <span className="text-sm font-semibold text-foreground">{row.price ? formatCurrency(row.price) : "Free"}</span>,
      },
      {
        key: "activeBatches",
        header: "Active Batches",
        sortable: true,
        accessor: (row) => row.activeBatches,
        render: (row) => <span className="text-sm">{row.activeBatches}</span>,
      },
      {
        key: "totalEnrolled",
        header: "Enrolled",
        sortable: true,
        accessor: (row) => row.totalEnrolled,
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
            {formatNumber(row.totalEnrolled)}
          </span>
        ),
      },
      {
        key: "revenue",
        header: "Revenue",
        sortable: true,
        accessor: (row) => row.revenue,
        render: (row) => <span className="text-sm font-semibold text-foreground">{formatCurrency(row.revenue)}</span>,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => <Badge variant={STATUS_VARIANT[row.status]} className="capitalize">{row.status}</Badge>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Courses"
        description="Manage the course catalogue, pricing, duration and enrollment across all departments."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        }
      />

      {apiEnabled() && apiError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not reach the API ({apiError}) — showing demo data.
        </InlineAlert>
      )}

      {notice && (
        <InlineAlert variant="success" className="mb-4">
          {notice}
        </InlineAlert>
      )}

      <DataTable
        data={courses}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search courses by name or category…"
        pageSize={8}
        emptyTitle="No courses in the catalogue yet"
        emptyDescription="Add your first course, or import a batch of courses using the button above."
        error={apiEnabled() ? apiError : null}
        onRetry={reload}
        toolbar={
          <BulkImportExportBar
            entityLabel="courses"
            templateColumns={["DepartmentName", "CategoryName", "Name", "Description", "Type", "DurationMinutes", "Price", "TotalSessions", "IsActive"]}
            onImport={bulkImportCourses}
            onExport={exportCourses}
            onImported={reload}
          />
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Course</DialogTitle>
            <DialogDescription>
              {apiEnabled()
                ? "Add a new course to the catalogue."
                : "Add a new course to the catalogue. This is a mock form — no data is persisted."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="course-name">Course name</Label>
              <Input id="course-name" placeholder="e.g. Grammar Foundations" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="course-category-input">Category</Label>
                {/* Free text + suggestions instead of a fixed list: course categories are
                    admin-defined (see ensureCategory in api/courses.ts, which reuses an
                    existing category by name or creates one), not a closed set. */}
                <Input
                  id="course-category-input"
                  list="course-category-options"
                  placeholder="e.g. Reading, Grammar, or a new category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <datalist id="course-category-options">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="course-department-select">Department</Label>
                <Select value={effectiveDepartmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="course-department-select">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="course-type-select">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as Course["type"])}>
                  <SelectTrigger id="course-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="course-duration-input">Duration (min)</Label>
                <Input
                  id="course-duration-input"
                  type="number"
                  min={1}
                  step={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="course-price">Price (₹)</Label>
                <Input id="course-price" type="number" placeholder="2500" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
          </div>
          {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
