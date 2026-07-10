import { useMemo, useState } from "react";
import { BookOpen, Plus, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
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
import type { Course } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { createCourse, listCourses, toFrontendCourse } from "@/api/courses";

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
  const { data: courses, error: apiError, reload } = useApiData(
    () => listCourses().then((list) => list.map(toFrontendCourse)),
    COURSES
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState<Course["category"]>("Phonics");
  const [type, setType] = useState<Course["type"]>("group");
  const [duration, setDuration] = useState("30");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!apiEnabled()) {
      setCreateOpen(false);
      return;
    }

    if (!name.trim()) {
      setSaveError("Course name is required.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await createCourse({
        name: name.trim(),
        categoryName: category,
        type,
        durationMinutes: Number(duration),
        price: Number(price) || 0,
      });
      setCreateOpen(false);
      setName("");
      setPrice("");
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not create the course.");
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
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${CATEGORY_COLOR[row.category] ?? FALLBACK_CATEGORY_COLOR}1A`,
                color: CATEGORY_COLOR[row.category] ?? FALLBACK_CATEGORY_COLOR,
              }}
            >
              <BookOpen className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{row.name}</p>
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
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        }
      />

      {apiEnabled() && apiError && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Could not reach the API ({apiError}) — showing demo data.
        </p>
      )}

      <DataTable
        data={courses}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search courses by name or category…"
        pageSize={8}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as Course["category"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phonics">Phonics</SelectItem>
                    <SelectItem value="Maths">Maths</SelectItem>
                    <SelectItem value="Reading">Reading</SelectItem>
                    <SelectItem value="Writing">Writing</SelectItem>
                    <SelectItem value="Speaking">Speaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as Course["type"])}>
                  <SelectTrigger>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="course-price">Price (₹)</Label>
                <Input id="course-price" type="number" placeholder="2500" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
          </div>
          {saveError && <p className="text-sm font-medium text-red-600">{saveError}</p>}
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
