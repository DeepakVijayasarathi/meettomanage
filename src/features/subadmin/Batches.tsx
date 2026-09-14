import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, CalendarDays, CalendarPlus, Layers, Loader2, Moon, Plus, Rocket, Search, Trash2, Wrench, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
import { usePortalBase } from "@/lib/portalBase";
import { useSession } from "@/state/session";
import { useApiData } from "@/api/hooks";
import {
  assignStudentToBatch,
  createBatch,
  deleteBatch,
  generateSchedule,
  listBatchEnrollments,
  listBatches,
  listTeacherOptions,
  listUnassignedStudents,
  reconcileStaleSessionTeachers,
  removeStudentFromBatch,
  setBatchStatus,
  toFrontendBatch,
  updateBatchFields,
  type ApiBatch,
  type ApiBatchStudent,
  type ApiUnassignedChild,
  type DisplayBatch,
} from "@/api/batches";
import { listCourseOptions, type ApiCourseOption } from "@/api/courses";

const IST_OFFSET_MINUTES = 5 * 60 + 30; // India Standard Time is UTC+5:30, no DST

/** RMs think in IST; the API stores/schedules in UTC. Converts a wall-clock
 * "HH:mm" typed as IST into the equivalent UTC time-of-day, plus whether that
 * shifted the calendar date back a day (only for classes between 12:00–05:29 AM IST). */
function istTimeToUtc(hhmm: string): { time: string; dayShift: -1 | 0 } {
  const [h, m] = hhmm.split(":").map(Number);
  let totalMin = h * 60 + m - IST_OFFSET_MINUTES;
  let dayShift: -1 | 0 = 0;
  if (totalMin < 0) {
    totalMin += 24 * 60;
    dayShift = -1;
  }
  const uh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const um = String(totalMin % 60).padStart(2, "0");
  return { time: `${uh}:${um}`, dayShift };
}

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

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
  // This page is mounted at 4 different portal prefixes (subadmin/admission/coordinator/
  // management — see App.tsx), so a link to "Users" can't be hardcoded to /subadmin/users;
  // it has to resolve against whichever portal is actually showing this page.
  const base = usePortalBase();
  // View-level access already gates the whole page (via the menu); these gate the actual
  // CRUD actions within it against the account's specific Create/Edit grant, matching what
  // the backend itself enforces (POST needs Create, PUT/status needs Edit) — a View-only
  // grant used to still show working-looking "New Batch"/"Save Changes"/"Archive" controls
  // that would just 403 on click instead of never being offered.
  const canCreate = !apiEnabled() || hasPermission("CourseBatchManagement", "Create");
  const canEdit = !apiEnabled() || hasPermission("CourseBatchManagement", "Edit");
  // Deleting a batch (DELETE /batches/{id}) is gated on its own CourseBatchManagement:Delete
  // grant — separate from Edit/Archive, since it's a stronger, harder-to-reverse action a Sub
  // Admin/RM preset might not want to hand out even to someone who can otherwise edit batches.
  const canDelete = !apiEnabled() || hasPermission("CourseBatchManagement", "Delete");
  // Generating a batch's class schedule calls POST /batches/{id}/generate-schedule, which the
  // backend gates on SessionCalendarManagement:Create (not CourseBatchManagement) — a role can
  // hold one without the other, so this needs its own check.
  const canScheduleClasses = !apiEnabled() || hasPermission("SessionCalendarManagement", "Create");
  // Moving students between batches calls POST/DELETE /batches/{id}/enrollments, which the
  // backend gates on CourseBatchManagement:Edit — same module as the batch's own fields, so
  // it rides on canEdit rather than needing a separate flag.
  const { data: batchData, error: batchError, reload } = useApiData<{ raw: ApiBatch[]; mapped: DisplayBatch[] }>(
    async () => {
      const raw = await listBatches();
      return { raw, mapped: raw.map(toFrontendBatch) };
    },
    { raw: [], mapped: BATCHES },
    { raw: [], mapped: [] }
  );
  const { data: teacherOptions } = useApiData(() => listTeacherOptions(), [], undefined, { cacheKey: "teacherOptions" });
  const { data: courseOptions } = useApiData<ApiCourseOption[]>(
    () => listCourseOptions(),
    COURSES.map((c) => ({ id: c.id, name: c.name, type: c.type === "group" ? ("Group" as const) : ("Individual" as const) }))
  );

  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<DisplayBatch | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeacher, setEditTeacher] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  // Mirrors features/admin/Batches.tsx — the batch's real start date and a per-batch class
  // duration override (both gated the same CourseBatchManagement:Edit as name/teacher/capacity
  // above), for correcting a batch that's continuing from another system.
  const [editStartDate, setEditStartDate] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  // Delete (soft-delete — removes the batch from every list; rejected while it still has an
  // active student). A separate confirm-target from `detail` so the ConfirmDialog can be shown
  // on top of the Manage dialog without closing it first.
  const [deleteTarget, setDeleteTarget] = useState<DisplayBatch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState(false);

  // One-time repair for batches reassigned before the teacher-reassignment cascade fix existed —
  // their already-generated sessions were left pointing at the old teacher (see BatchService's
  // ReconcileStaleSessionTeachersAsync). Gated behind canEdit, same as reassigning a teacher in
  // the first place. Safe to click more than once; a clean batch is a no-op.
  const [reconciling, setReconciling] = useState(false);

  async function handleReconcile() {
    setReconciling(true);
    try {
      const result = await reconcileStaleSessionTeachers();
      if (result.sessionsMoved === 0 && result.conflicts.length === 0) {
        toast({ variant: "success", title: "Nothing to repair", description: "Every batch's sessions already match their current teacher." });
      } else {
        const parts = [
          result.sessionsMoved > 0
            ? `Moved ${result.sessionsMoved} session(s) across ${result.batchesFixed} batch(es) onto their current teacher.`
            : undefined,
          result.conflicts.length > 0
            ? `${result.conflicts.length} batch(es) skipped — new teacher already booked: ${result.conflicts.map((c) => c.batchName).join(", ")}.`
            : undefined,
        ].filter(Boolean);
        toast({ variant: result.conflicts.length > 0 ? "default" : "success", title: "Repair complete", description: parts.join(" ") });
      }
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not run the repair.";
      toast({ variant: "error", title: "Repair failed", description: message });
    } finally {
      setReconciling(false);
    }
  }

  // Keyed by weekday, since a batch doesn't have to meet at the same time every day it runs —
  // e.g. Monday/Wednesday at 5 PM but Friday at noon — a day's presence as a key is what
  // selects it, and its value is that day's own time.
  const [genTimeByDay, setGenTimeByDay] = useState<Record<number, string>>({ 1: "10:00", 3: "10:00" });
  const [genStart, setGenStart] = useState("");
  // Blank means "the course's own total session count" (the only behaviour before this
  // existed) — set explicitly for a batch continuing mid-course under this portal (e.g.
  // migrated from another system with some sessions already delivered there), so only the
  // sessions actually still owed get scheduled instead of the course's full count. Mirrors
  // features/admin/Batches.tsx.
  const [genSessionCount, setGenSessionCount] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  function toggleGenDay(day: number) {
    setGenTimeByDay((prev) => {
      if (day in prev) {
        const next = { ...prev };
        delete next[day];
        return next;
      }
      const times = Object.values(prev);
      return { ...prev, [day]: times[times.length - 1] ?? "10:00" };
    });
  }

  // Assign students (inside Manage dialog) — ported from admin/Batches.tsx, WBS "Course &
  // Batch Management Flow" step 6. Previously only the Admin-only page could move a student
  // in or out of a batch even though POST/DELETE /enrollments is CourseBatchManagement:Edit,
  // a module RMs can already hold.
  const [roster, setRoster] = useState<ApiBatchStudent[]>([]);
  const [unassigned, setUnassigned] = useState<ApiUnassignedChild[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function reloadRoster(batchId: string) {
    if (!apiEnabled()) return;
    setRosterLoading(true);
    try {
      const [students, candidates] = await Promise.all([listBatchEnrollments(batchId), listUnassignedStudents(batchId)]);
      setRoster(students);
      setUnassigned(candidates);
      setRosterError(null);
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : "Could not load the student roster.");
    } finally {
      setRosterLoading(false);
    }
  }

  async function handleAssignStudent(childId: string) {
    if (!detail || !childId) return;
    setAssigning(true);
    setRosterError(null);
    try {
      await assignStudentToBatch(detail.id, childId);
      await reloadRoster(detail.id);
      reload();
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : "Could not assign this student.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveStudent(childId: string) {
    if (!detail) return;
    setRemovingId(childId);
    setRosterError(null);
    try {
      await removeStudentFromBatch(detail.id, childId);
      await reloadRoster(detail.id);
      reload();
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : "Could not remove this student.");
    } finally {
      setRemovingId(null);
    }
  }

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

  // Unpaginated, this rendered every batch as one unbroken card grid — with hundreds of
  // real batches that's an enormous page (and a growing one). Paginate per status tab,
  // independently of the others, and reset back to page 1 whenever the search/data changes
  // out from under the current page.
  const BATCHES_PAGE_SIZE = 12;
  const [pageByStatus, setPageByStatus] = useState<Record<BatchStatus, number>>({ active: 1, dormant: 1, upcoming: 1 });
  useEffect(() => {
    setPageByStatus({ active: 1, dormant: 1, upcoming: 1 });
  }, [filtered]);

  function openDetail(b: DisplayBatch) {
    setDetail(b);
    setEditName(b.name);
    setEditTeacher(b.teacherId);
    setEditCapacity(String(b.capacity));
    setEditStartDate(b.startDate || "");
    setEditDuration(b.durationOverride != null ? String(b.durationOverride) : "");
    setSaveError(null);
    setGenSessionCount("");
    setRoster([]);
    setUnassigned([]);
    setRosterError(null);
    void reloadRoster(b.id);
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
        startDate: editStartDate.trim() || null,
        durationMinutesOverride: editDuration.trim() ? Number(editDuration) : null,
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

  async function handleGenerateSchedule() {
    const genDays = Object.keys(genTimeByDay).map(Number);
    if (!detail || !genStart || genDays.length === 0) return;
    if (!apiEnabled()) {
      setGenResult("Demo mode — schedule not persisted.");
      return;
    }
    setGenBusy(true);
    setGenResult(null);
    try {
      // Computed per weekday, since different days can run at different times — that's the
      // whole point of this field — so one day needing the 12:00–05:29 AM IST shift doesn't
      // affect another that doesn't.
      const slots = genDays.map((day) => {
        const { time: utcTime, dayShift } = istTimeToUtc(genTimeByDay[day]);
        return { dayOfWeek: (day + dayShift + 7) % 7, startTimeUtc: `${utcTime}:00` };
      });
      const created = await generateSchedule(detail.id, {
        startDate: genStart,
        slots,
        sessionCount: genSessionCount.trim() ? Number(genSessionCount) : undefined,
      });
      setGenResult(`${created.length} sessions created — they now appear on the teacher's and parents' schedules.`);
      reload();
    } catch (err) {
      setGenResult(err instanceof Error ? err.message : "Could not generate the schedule.");
    } finally {
      setGenBusy(false);
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

  async function confirmDeleteBatch() {
    if (!deleteTarget) return;
    if (!apiEnabled()) {
      toast({ variant: "success", title: "Batch deleted (demo only — not persisted)" });
      setDetail(null);
      return;
    }
    setDeletingBatch(true);
    try {
      await deleteBatch(deleteTarget.id);
      toast({ variant: "success", title: "Batch deleted" });
      reload();
      setDetail(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete this batch.";
      setSaveError(message);
      toast({ variant: "error", title: "Couldn't delete batch", description: message });
    } finally {
      setDeletingBatch(false);
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
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={handleReconcile}
                disabled={reconciling}
                title="Fix any batch whose already-scheduled sessions still show a previous teacher after a reassignment"
              >
                {reconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Repair stale teacher assignments
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => { setCreateOpen(true); setCreateError(null); }}>
                <Plus className="h-4 w-4" /> New Batch
              </Button>
            )}
          </div>
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

        {(Object.keys(STATUS_META) as BatchStatus[]).map((status) => {
          const list = grouped[status];
          const totalPages = Math.max(1, Math.ceil(list.length / BATCHES_PAGE_SIZE));
          const page = Math.min(pageByStatus[status], totalPages);
          const pageRows = list.slice((page - 1) * BATCHES_PAGE_SIZE, page * BATCHES_PAGE_SIZE);
          return (
            <TabsContent key={status} value={status}>
              {list.length === 0 ? (
                <EmptyState icon={STATUS_META[status].icon} title={`No ${STATUS_META[status].label.toLowerCase()} batches`} description={STATUS_META[status].empty} />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pageRows.map((b, i) => (
                      <BatchCard key={b.id} batch={b} index={i} onOpen={openDetail} />
                    ))}
                  </div>
                  {list.length > BATCHES_PAGE_SIZE && (
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
                      <span>
                        Showing {(page - 1) * BATCHES_PAGE_SIZE + 1}–{Math.min(page * BATCHES_PAGE_SIZE, list.length)} of {list.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPageByStatus((p) => ({ ...p, [status]: page - 1 }))}
                        >
                          Previous
                        </Button>
                        <span className="font-medium text-foreground">
                          Page {page} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPageByStatus((p) => ({ ...p, [status]: page + 1 }))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          );
        })}
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
                  <Label htmlFor="edit-batch-name">Batch name <span className="text-destructive">*</span></Label>
                  <Input id="edit-batch-name" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={!canEdit} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-batch-teacher-select">Teacher <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="edit-batch-capacity">Capacity <span className="text-destructive">*</span></Label>
                    <Input id="edit-batch-capacity" type="number" min={1} max={500} value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} disabled={!canEdit} />
                  </div>
                </div>

                {apiEnabled() && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="edit-batch-start-date">Start date</Label>
                      <Input
                        id="edit-batch-start-date"
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        disabled={!canEdit}
                      />
                      <p className="text-xs text-muted-foreground">
                        The batch's real start — correct this if it's continuing from another system.
                      </p>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="edit-batch-duration">Class duration (min)</Label>
                      <Input
                        id="edit-batch-duration"
                        type="number"
                        min={1}
                        max={500}
                        placeholder={`Course default: ${detail.courseDuration ?? "—"}`}
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        disabled={!canEdit}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank to follow the course's own {detail.courseDuration ?? "—"}-minute default.
                      </p>
                    </div>
                  </div>
                )}

                {apiEnabled() && (
                  <div className="grid gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <Label htmlFor="batch-assign-student-select">Assign students</Label>
                      <span className="shrink-0 text-[11px] text-muted-foreground">Saved immediately</span>
                    </div>
                    {canEdit ? (
                      <Select value="" onValueChange={handleAssignStudent} disabled={assigning || roster.length >= detail.capacity}>
                        <SelectTrigger id="batch-assign-student-select">
                          <SelectValue
                            placeholder={
                              roster.length >= detail.capacity
                                ? "Batch is at capacity"
                                : assigning
                                  ? "Assigning…"
                                  : "Search and add a student…"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {unassigned.length === 0 ? (
                            <SelectItem value="__none" disabled>
                              No unassigned students available
                            </SelectItem>
                          ) : (
                            unassigned.map((c) => (
                              <SelectItem key={c.childId} value={c.childId}>
                                {c.childName} — {c.parentName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {roster.length} of {detail.capacity} seats filled.{" "}
                      {Math.max(0, detail.capacity - roster.length)} seat
                      {Math.max(0, detail.capacity - roster.length) === 1 ? "" : "s"} remaining.
                    </p>
                    {rosterError && <p className="text-xs font-medium text-destructive">{rosterError}</p>}

                    {rosterLoading ? (
                      <p className="text-xs text-muted-foreground">Loading roster…</p>
                    ) : roster.length > 0 ? (
                      <ul className="mt-1 flex min-w-0 flex-col gap-1.5">
                        {roster.map((s) => (
                          <li
                            key={s.enrollmentId}
                            className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-1.5 text-sm"
                          >
                            {/* Deep links to the same rich student-detail dialog Users already has
                                (email, parent details, login/credentials, RM notes, engagement) —
                                mirrors admin/Batches.tsx; this row used to be plain unclickable
                                text, leaving RM/Coordinator/Admission/Management with no way to
                                see a batch student's details from here at all. */}
                            <Link
                              to={`${base}/users?studentId=${s.childId}`}
                              className="min-w-0 flex-1 truncate text-left hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title={`View ${s.childName}'s details`}
                            >
                              {s.childName}
                              {s.academicLevel && <span className="text-xs text-muted-foreground"> · {s.academicLevel}</span>}
                            </Link>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveStudent(s.childId)}
                                disabled={removingId === s.childId}
                                title="Remove from batch"
                                aria-label={`Remove ${s.childName} from batch`}
                                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              </div>

              {canScheduleClasses && (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <CalendarPlus className="h-4 w-4" /> Generate class schedule
                    </p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">Saved immediately</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Creates sessions from a start date on the selected weekdays (holidays skipped), each at its own
                    time — e.g. Monday/Wednesday at 5 PM but Friday at noon. By default, every session of the course;
                    set a number below for a batch continuing mid-course elsewhere.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="gen-start">Start date <span className="text-destructive">*</span></Label>
                      <Input id="gen-start" type="date" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="gen-session-count">Number of sessions</Label>
                      <Input
                        id="gen-session-count"
                        type="number"
                        min={1}
                        max={500}
                        placeholder="Default: the course's full session count"
                        value={genSessionCount}
                        onChange={(e) => setGenSessionCount(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Session count: only what's actually still owed — e.g. 14, for a batch with 14 left of a 48-session course.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => (
                      <Button
                        key={d.value}
                        type="button"
                        variant="pill"
                        size="pill"
                        aria-pressed={d.value in genTimeByDay}
                        onClick={() => toggleGenDay(d.value)}
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                  {Object.keys(genTimeByDay).length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {WEEKDAYS.filter((d) => d.value in genTimeByDay).map((d) => (
                        <div key={d.value} className="flex items-center gap-2">
                          <span className="w-9 shrink-0 text-xs font-semibold text-muted-foreground">{d.label}</span>
                          <Input
                            type="time"
                            aria-label={`${d.label} class time (IST)`}
                            value={genTimeByDay[d.value]}
                            onChange={(e) => setGenTimeByDay((prev) => ({ ...prev, [d.value]: e.target.value }))}
                            className="h-8 max-w-[140px] text-sm"
                          />
                          <span className="text-xs text-muted-foreground">IST</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={genBusy || !genStart || Object.keys(genTimeByDay).length === 0}
                    onClick={handleGenerateSchedule}
                  >
                    {genBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {genBusy ? "Generating…" : "Generate sessions"}
                  </Button>
                  {genResult && <p className="mt-2 text-xs font-medium text-foreground">{genResult}</p>}
                </div>
              )}

              {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
              <DialogFooter className="items-center gap-3 sm:justify-between">
                {canEdit || canDelete ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit && (
                      <Button
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={archiving || isArchived}
                        onClick={archiveCurrentBatch}
                      >
                        <Archive className="h-4 w-4" /> {isArchived ? "Archived" : archiving ? "Archiving…" : "Archive batch"}
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(detail)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete batch
                      </Button>
                    )}
                  </div>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setDetail(null)}>
                    Close
                  </Button>
                  {canEdit && (
                    <Button onClick={saveDetail} disabled={saving || !editName.trim() || !editTeacher}>
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this batch?"
        description={
          deleteTarget ? (
            <div className="space-y-2 text-left">
              <p>
                <span className="font-medium text-foreground">"{deleteTarget.name}"</span> will be removed from
                every list. This can't be undone from here.
              </p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>
                  Teacher assigned:{" "}
                  <span className="font-medium text-foreground">{deleteTarget.teacherName ?? "Unassigned"}</span>
                </li>
                <li>
                  Course: <span className="font-medium text-foreground">{deleteTarget.courseName ?? "—"}</span>
                </li>
                <li>Any of its still-scheduled upcoming sessions will be cancelled, not deleted.</li>
              </ul>
              <p>Refused while it still has an active student — withdraw them (or move them to another batch) first.</p>
            </div>
          ) : undefined
        }
        confirmLabel={deletingBatch ? "Deleting…" : "Delete"}
        destructive
        onConfirm={confirmDeleteBatch}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a batch</DialogTitle>
            <DialogDescription>Pick the course and teacher, then set capacity (1 = individual batch).</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="nb-name">Batch name <span className="text-destructive">*</span></Label>
              <Input id="nb-name" placeholder="e.g. Phonics Level 1 — Evening B" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="new-batch-course-select">Course <span className="text-destructive">*</span></Label>
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
                <Label htmlFor="new-batch-teacher-select">Teacher <span className="text-destructive">*</span></Label>
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
                <Label htmlFor="nb-capacity">Capacity <span className="text-destructive">*</span></Label>
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
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {creating ? "Creating…" : "Create Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
