import { useMemo, useState } from "react";
import { Archive, CalendarDays, Layers, Moon, Plus, Rocket, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BATCHES } from "@/data/batches";
import { getCourseById, COURSES } from "@/data/courses";
import { getTeacherById, TEACHERS } from "@/data/users";
import type { BatchStatus } from "@/types";
import { CHART_PALETTE } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import { useApiData } from "@/api/hooks";
import {
  createBatch,
  listBatches,
  listTeacherOptions,
  setBatchStatus,
  toFrontendBatch,
  updateBatchFields,
  type ApiBatch,
  type DisplayBatch,
} from "@/api/batches";
import { listCourseOptions, type ApiCourseOption } from "@/api/courses";

const STATUS_META: Record<BatchStatus, { label: string; icon: typeof Layers; empty: string }> = {
  active: { label: "Active", icon: Layers, empty: "No active batches at the moment." },
  dormant: { label: "Dormant", icon: Moon, empty: "No dormant batches right now." },
  upcoming: { label: "Upcoming", icon: Rocket, empty: "No upcoming batches scheduled." },
};

function BatchCard({ batch, index, onOpen }: { batch: DisplayBatch; index: number; onOpen: (b: DisplayBatch) => void }) {
  const courseName = apiEnabled() ? batch.courseName : getCourseById(batch.courseId)?.name;
  const teacherName = apiEnabled() ? batch.teacherName : getTeacherById(batch.teacherId)?.name;
  const color = CHART_PALETTE[index % CHART_PALETTE.length];
  const pct = Math.round((batch.enrolled / Math.max(batch.capacity, 1)) * 100);

  return (
    <Card className="flex flex-col p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1A`, color }}>
            <Layers className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{batch.name}</p>
            <p className="text-xs text-muted-foreground">{courseName ?? "—"}</p>
          </div>
        </div>
        <Badge variant="outline" className="uppercase">{batch.type}</Badge>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Capacity</span>
          <span className="font-semibold text-foreground">
            {batch.enrolled} / {batch.capacity}
          </span>
        </div>
        <Progress value={pct} className="h-2" indicatorClassName={pct >= 90 ? "bg-success" : pct >= 70 ? "bg-warning" : "bg-destructive"} />
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        {batch.schedule}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
        Teacher: <span className="font-medium text-foreground">{teacherName ?? "Unassigned"}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">
          {batch.startDate ? `Started ${formatDate(batch.startDate)}` : "No sessions scheduled"}
        </span>
        <Button variant="outline" size="sm" onClick={() => onOpen(batch)}>
          Manage
        </Button>
      </div>
    </Card>
  );
}

export default function SubAdminBatches() {
  const { toast } = useToast();
  const { hasPermission } = useSession();
  // View-level access already gates the whole page (via the menu); these gate the actual
  // CRUD actions within it against the account's specific Create/Edit grant, matching what
  // the backend itself enforces (POST needs Create, PUT/status needs Edit) — a View-only
  // grant used to still show working-looking "New Batch"/"Save Changes"/"Archive" controls
  // that would just 403 on click instead of never being offered.
  const canCreate = !apiEnabled() || hasPermission("CourseBatchManagement", "Create");
  const canEdit = !apiEnabled() || hasPermission("CourseBatchManagement", "Edit");
  const { data: batchData, error: batchError, reload } = useApiData<{ raw: ApiBatch[]; mapped: DisplayBatch[] }>(
    async () => {
      const raw = await listBatches();
      return { raw, mapped: raw.map(toFrontendBatch) };
    },
    { raw: [], mapped: BATCHES },
    { raw: [], mapped: [] }
  );
  const { data: teacherOptions } = useApiData(() => listTeacherOptions(), []);
  const { data: courseOptions } = useApiData<ApiCourseOption[]>(
    () => listCourseOptions(),
    COURSES.map((c) => ({ id: c.id, name: c.name, type: c.type === "group" ? ("Group" as const) : ("Individual" as const) }))
  );

  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<DisplayBatch | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeacher, setEditTeacher] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newCapacity, setNewCapacity] = useState("8");
  const [newStart, setNewStart] = useState("");
  const [creating, setCreating] = useState(false);
  const newCourseIsIndividual = courseOptions.find((c) => c.id === newCourse)?.type === "Individual";
  const [createError, setCreateError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  function handleNewCourseChange(courseId: string) {
    setNewCourse(courseId);
    const isIndividual = courseOptions.find((c) => c.id === courseId)?.type === "Individual";
    if (isIndividual) {
      setNewCapacity("1");
    } else if (newCapacity === "1") {
      setNewCapacity("8");
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newCourse || !newTeacher) return;
    if (!apiEnabled()) {
      setBanner(`"${newName.trim()}" created. (Demo only — not persisted.)`);
      setCreateOpen(false);
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createBatch({
        courseId: newCourse,
        teacherProfileId: newTeacher,
        name: newName.trim(),
        capacity: Math.max(1, Number(newCapacity) || 1),
        startDate: newStart || undefined,
      });
      setBanner(`Batch "${newName.trim()}" created.`);
      setCreateOpen(false);
      setNewName("");
      setNewStart("");
      reload();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create the batch.");
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return batchData.mapped;
    return batchData.mapped.filter((b) => {
      const courseName = (apiEnabled() ? b.courseName : getCourseById(b.courseId)?.name) ?? "";
      const teacherName = (apiEnabled() ? b.teacherName : getTeacherById(b.teacherId)?.name) ?? "";
      return `${b.name} ${courseName} ${teacherName}`.toLowerCase().includes(q);
    });
  }, [batchData, query]);

  const grouped = useMemo(() => {
    const map: Record<BatchStatus, DisplayBatch[]> = { active: [], dormant: [], upcoming: [] };
    filtered.forEach((b) => map[b.status].push(b));
    return map;
  }, [filtered]);

  function openDetail(b: DisplayBatch) {
    setDetail(b);
    setEditName(b.name);
    setEditTeacher(b.teacherId);
    setEditCapacity(String(b.capacity));
    setSaveError(null);
  }

  async function saveDetail() {
    if (!detail) return;
    if (!apiEnabled()) {
      toast({ variant: "success", title: "Batch updated" });
      setDetail(null);
      return;
    }
    const raw = batchData.raw.find((b) => b.id === detail.id);
    if (!raw) return;

    setSaving(true);
    setSaveError(null);
    try {
      await updateBatchFields(raw, {
        name: editName.trim(),
        teacherProfileId: editTeacher,
        capacity: Math.max(1, Number(editCapacity) || 1),
      });
      toast({ variant: "success", title: "Batch updated" });
      reload();
      setDetail(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save the batch.";
      setSaveError(message);
      toast({ variant: "error", title: "Couldn't save batch", description: message });
    } finally {
      setSaving(false);
    }
  }

  async function archiveCurrentBatch() {
    if (!detail) return;
    if (!apiEnabled()) {
      toast({ variant: "success", title: "Batch archived" });
      setDetail(null);
      return;
    }
    setArchiving(true);
    try {
      await setBatchStatus(detail.id, "Archived");
      toast({ variant: "success", title: "Batch archived" });
      reload();
      setDetail(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not archive the batch.";
      setSaveError(message);
      toast({ variant: "error", title: "Couldn't archive batch", description: message });
    } finally {
      setArchiving(false);
    }
  }

  const detailRaw = detail ? batchData.raw.find((b) => b.id === detail.id) : undefined;
  const isArchived = detailRaw?.status === "Archived";

  return (
    <div>
      <PageHeader
        eyebrow="Delegated Work"
        title="Batches"
        description="Create, edit and archive the batches assigned to you — capacity, schedule and teacher assignment."
        actions={
          canCreate ? (
            <Button onClick={() => { setCreateOpen(true); setCreateError(null); }}>
              <Plus className="h-4 w-4" /> New Batch
            </Button>
          ) : undefined
        }
      />

      {banner && <InlineAlert variant="success" bordered className="mb-5">{banner}</InlineAlert>}

      {apiEnabled() && batchError && (
        <InlineAlert variant="error" bordered className="mb-5 items-center justify-between">
          <span className="flex-1">Couldn't load batches: {batchError}. The list below may be incomplete.</span>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </InlineAlert>
      )}

      <div className="relative mb-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search batches by name, course or teacher…"
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          {(Object.keys(STATUS_META) as BatchStatus[]).map((status) => (
            <TabsTrigger key={status} value={status} className="gap-1.5">
              {STATUS_META[status].label}
              <span className="rounded-full bg-background/60 px-1.5 text-[10px] font-bold">{grouped[status].length}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(STATUS_META) as BatchStatus[]).map((status) => (
          <TabsContent key={status} value={status}>
            {grouped[status].length === 0 ? (
              <EmptyState icon={STATUS_META[status].icon} title={`No ${STATUS_META[status].label.toLowerCase()} batches`} description={STATUS_META[status].empty} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[status].map((b, i) => (
                  <BatchCard key={b.id} batch={b} index={i} onOpen={openDetail} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>{(apiEnabled() ? detail.courseName : getCourseById(detail.courseId)?.name) ?? "—"} · {detail.schedule}</DialogDescription>
              </DialogHeader>

              <Card className="bg-muted/30 p-4">
                <CardContent className="grid grid-cols-2 gap-4 p-0 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrolled</p>
                    <p className="mt-1 font-semibold text-foreground">{detail.enrolled} / {detail.capacity}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
                    <p className="mt-1 font-semibold text-foreground">{detail.duration} min</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Date</p>
                    <p className="mt-1 font-semibold text-foreground">{detail.startDate ? formatDate(detail.startDate, "long") : "Not scheduled yet"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-1 font-semibold capitalize text-foreground">{detail.status}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid min-w-0 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-batch-name">Batch name</Label>
                  <Input id="edit-batch-name" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={!canEdit} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-batch-teacher-select">Teacher</Label>
                    <Select value={editTeacher} onValueChange={setEditTeacher} disabled={!canEdit}>
                      <SelectTrigger id="edit-batch-teacher-select">
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {apiEnabled() && teacherOptions.length > 0
                          ? teacherOptions.map((t) => (
                              <SelectItem key={t.teacherProfileId} value={t.teacherProfileId}>
                                {t.fullName} {t.departmentName ? `· ${t.departmentName}` : ""}
                              </SelectItem>
                            ))
                          : TEACHERS.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name} · {t.department}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-batch-capacity">Capacity</Label>
                    <Input id="edit-batch-capacity" type="number" min={1} max={500} value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} disabled={!canEdit} />
                  </div>
                </div>
              </div>

              {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
              <DialogFooter className="items-center gap-3 sm:justify-between">
                {canEdit ? (
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={archiving || isArchived}
                    onClick={archiveCurrentBatch}
                  >
                    <Archive className="h-4 w-4" /> {isArchived ? "Archived" : archiving ? "Archiving…" : "Archive batch"}
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setDetail(null)}>
                    Close
                  </Button>
                  {canEdit && (
                    <Button onClick={saveDetail} disabled={saving || !editName.trim() || !editTeacher}>
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a batch</DialogTitle>
            <DialogDescription>Pick the course and teacher, then set capacity (1 = individual batch).</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="nb-name">Batch name</Label>
              <Input id="nb-name" placeholder="e.g. Phonics Level 1 — Evening B" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="new-batch-course-select">Course</Label>
                <Select value={newCourse} onValueChange={handleNewCourseChange}>
                  <SelectTrigger id="new-batch-course-select">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.type === "Individual" ? "(1:1)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-batch-teacher-select">Teacher</Label>
                <Select value={newTeacher} onValueChange={setNewTeacher}>
                  <SelectTrigger id="new-batch-teacher-select">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiEnabled() && teacherOptions.length > 0
                      ? teacherOptions.map((t) => (
                          <SelectItem key={t.teacherProfileId} value={t.teacherProfileId}>
                            {t.fullName} {t.departmentName ? `· ${t.departmentName}` : ""}
                          </SelectItem>
                        ))
                      : TEACHERS.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} · {t.department}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="nb-capacity">Capacity</Label>
                <Input
                  id="nb-capacity"
                  type="number"
                  min={1}
                  max={500}
                  value={newCapacity}
                  disabled={newCourseIsIndividual}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  placeholder="e.g. 12"
                />
                {newCourseIsIndividual && (
                  <p className="text-xs text-muted-foreground">This is a 1:1 course — its batches always run with a single seat.</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nb-start">Start date (optional)</Label>
                <Input id="nb-start" type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
            </div>
            {createError && <p className="text-sm font-medium text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={creating || !newName.trim() || !newCourse || !newTeacher} onClick={handleCreate}>
              {creating ? "Creating…" : "Create Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
