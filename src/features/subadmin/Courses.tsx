import { useMemo, useState } from "react";
import { BookOpen, Loader2, Pencil, Plus, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
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
import { apiEnabled, userMessage } from "@/lib/api";
import { useSession } from "@/state/session";
import { useApiData } from "@/api/hooks";
import {
  bulkImportCourses,
  createCourse,
  exportCourses,
  getCourse,
  listCategories,
  listCourses,
  toFrontendCourse,
  updateCourse,
  type ApiCourse,
  type ApiCourseCategory,
} from "@/api/courses";
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

/**
 * Delegated-portal Courses — ported from admin/Courses.tsx. CoursesController's endpoints are
 * [HasPermission(PermissionModule.CourseBatchManagement, ...)] (GET/list/options are View,
 * POST/bulk-import are Create, PUT is Edit, GET export is View) — Edit is now wired up below
 * (previously the only screen where a role's Create/Edit grant had nothing to attach to).
 */
export default function SubAdminCourses() {
  const { toast } = useToast();
  const { hasPermission } = useSession();
  // View-level access already gates the whole page (via the menu); these gate the actual
  // CRUD/import/export controls against the account's specific grant, matching the backend.
  const canCreate = !apiEnabled() || hasPermission("CourseBatchManagement", "Create");
  const canEdit = !apiEnabled() || hasPermission("CourseBatchManagement", "Edit");
  const { data: courses, error: apiError, reload } = useApiData(
    () => listCourses().then((list) => list.map(toFrontendCourse)),
    COURSES
  );
  const { data: departments } = useApiData<ApiDepartment[]>(() => listDepartments(false), DEMO_DEPARTMENTS);
  const { data: categories } = useApiData<ApiCourseCategory[]>(() => listCategories(), []);
  const [formOpen, setFormOpen] = useState(false);
  // Set only when editing an existing course; carries totalSessions along untouched (the
  // duration/type/category/department fields above are user-editable, but UpdateAsync rejects
  // a TotalSessions change once a batch on this course already has a generated schedule).
  const [editingCourse, setEditingCourse] = useState<ApiCourse | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [type, setType] = useState<Course["type"]>("group");
  const [duration, setDuration] = useState("30");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function openCreate() {
    setEditingCourse(null);
    setName("");
    setPrice("");
    setCategory("");
    setDepartmentId("");
    setType("group");
    setDuration("30");
    setIsActive(true);
    setSaveError(null);
    setFormOpen(true);
  }

  async function openEdit(row: Course) {
    setSaveError(null);
    setFormOpen(true);
    if (!apiEnabled()) {
      // Demo mode has no per-course record to fetch — best-effort populate from the row
      // already on screen; Save below just shows the "not persisted" notice, same as Create.
      setEditingCourse({
        id: row.id,
        courseCategoryId: "",
        categoryName: row.category,
        name: row.name,
        description: null,
        type: row.type === "group" ? "Group" : "Individual",
        durationMinutes: row.duration,
        price: row.price,
        totalSessions: 12,
        departmentId: "",
        departmentName: "",
        isActive: row.status !== "archived",
        activeBatches: row.activeBatches,
        totalEnrolled: row.totalEnrolled,
        revenue: row.revenue,
      });
      setName(row.name);
      setPrice(String(row.price));
      setCategory(row.category);
      setDepartmentId("");
      setType(row.type);
      setDuration(String(row.duration));
      setIsActive(row.status !== "archived");
      return;
    }

    setEditLoading(true);
    try {
      const full = await getCourse(row.id);
      setEditingCourse(full);
      setName(full.name);
      setPrice(String(full.price));
      setCategory(full.categoryName);
      setDepartmentId(full.departmentId);
      setType(full.type === "Individual" ? "1:1" : "group");
      setDuration(String(full.durationMinutes));
      setIsActive(full.isActive);
    } catch (err) {
      const message = userMessage(err, "Could not load this course.");
      setSaveError(message);
      toast({ variant: "error", title: "Couldn't load course", description: message });
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSave() {
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
    if (!departmentId) {
      setSaveError(
        departments.length === 0
          ? "Add a department under Academics → Departments before creating a course."
          : "Department is required."
      );
      return;
    }

    if (!apiEnabled()) {
      setNotice(editingCourse ? "Demo mode — changes not persisted." : "Demo mode — course not persisted.");
      setFormOpen(false);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, {
          name: name.trim(),
          categoryName: category,
          departmentId,
          type,
          durationMinutes: Number(duration),
          price: Number(price) || 0,
          totalSessions: editingCourse.totalSessions,
          isActive,
        });
        toast({ variant: "success", title: "Course updated" });
      } else {
        await createCourse({
          name: name.trim(),
          categoryName: category,
          departmentId,
          type,
          durationMinutes: Number(duration),
          price: Number(price) || 0,
        });
        toast({ variant: "success", title: "Course created" });
      }
      setFormOpen(false);
      setName("");
      setPrice("");
      reload();
    } catch (err) {
      const message = userMessage(err, "Could not save the course.");
      setSaveError(message);
      toast({ variant: "error", title: "Couldn't save course", description: message });
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
      {
        key: "actions",
        header: "",
        render: (row) =>
          canEdit ? (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); void openEdit(row); }}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Courses"
        description="Manage the course catalogue, pricing, duration and enrollment across all departments."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create Course
            </Button>
          ) : undefined
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
        onRowClick={canEdit ? openEdit : undefined}
        toolbar={
          <BulkImportExportBar
            entityLabel="courses"
            templateColumns={["DepartmentName", "CategoryName", "Name", "Description", "Type", "DurationMinutes", "Price", "TotalSessions", "IsActive"]}
            onImport={bulkImportCourses}
            onExport={exportCourses}
            onImported={reload}
            canImport={canCreate}
          />
        }
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "Create Course"}</DialogTitle>
            <DialogDescription>
              {editingCourse
                ? "Update this course's catalogue details."
                : apiEnabled()
                  ? "Add a new course to the catalogue."
                  : "Add a new course to the catalogue. This is a mock form — no data is persisted."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="course-name">Course name <span className="text-destructive">*</span></Label>
              <Input id="course-name" placeholder="e.g. Grammar Foundations" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="course-category-input">Category <span className="text-destructive">*</span></Label>
                <Combobox
                  id="course-category-input"
                  value={category}
                  onValueChange={setCategory}
                  options={categories.map((c) => c.name)}
                  placeholder="e.g. Reading, Grammar, or a new category"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="course-department-select">Department <span className="text-destructive">*</span></Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
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
            {editingCourse && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
                Course is active (visible for new enrollment)
              </label>
            )}
          </div>
          {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || editLoading}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {saving ? "Saving…" : editingCourse ? "Save changes" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
