import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarPlus, Layers, Loader2, Moon, Plus, Rocket, Search, X } from "lucide-react";
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
import { COURSES, getCourseById } from "@/data/courses";
import { getTeacherById, TEACHERS } from "@/data/users";
import type { BatchStatus } from "@/types";
import { CHART_PALETTE } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  assignStudentToBatch,
  createBatch,
  generateSchedule,
  listBatchEnrollments,
  listBatches,
  listTeacherOptions,
  listUnassignedStudents,
  removeStudentFromBatch,
  toFrontendBatch,
  updateBatchFields,
  type ApiBatch,
  type ApiBatchStudent,
  type ApiUnassignedChild,
  type DisplayBatch,
} from "@/api/batches";
import { listCourseOptions, type ApiCourseOption } from "@/api/courses";

const IST_OFFSET_MINUTES = 5 * 60 + 30; // India Standard Time is UTC+5:30, no DST

/** Admins think in IST; the API stores/schedules in UTC. Converts a wall-clock
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
  // API rows carry their own resolved names; the mock lookups are demo-only
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
        {/* High fill is the good outcome (a near-full batch), matching every other
            percentage-fill indicator in the app (management/Performance.tsx's
            utilization bars, parent/Dashboard.tsx's progress rings) — this used to
            run the opposite direction, reading a nearly-sold-out batch as "danger". */}
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
          {/* batch.startDate is "" when no schedule has been generated yet (api/batches.ts
              coerces the API's null to ""), which formatDate rendered as the literal text
              "Started Invalid Date" instead of a real placeholder. */}
          {batch.startDate ? `Started ${formatDate(batch.startDate)}` : "No sessions scheduled"}
        </span>
        <Button variant="outline" size="sm" onClick={() => onOpen(batch)}>
          Manage
        </Button>
      </div>
    </Card>
  );
}

export default function AdminBatches() {
  const { toast } = useToast();
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
  const [teacherAssignment, setTeacherAssignment] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Both were previously read-only display fields with no way to correct them: a batch's real
  // start date (e.g. one continuing mid-course from another system) could only ever be set once,
  // by whichever date "Generate class schedule" happened to be run with; duration followed the
  // course for every batch, with no way for one specific (e.g. smaller/paired) batch to run
  // shorter sessions than the rest of that course's batches.
  const [editStartDate, setEditStartDate] = useState("");
  const [editDuration, setEditDuration] = useState("");
  // Renaming a batch — the API already supported it (updateBatchFields' name field), the
  // detail dialog just never exposed an input for it.
  const [editName, setEditName] = useState("");

  // New-batch dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newCapacity, setNewCapacity] = useState("8");
  const [newStart, setNewStart] = useState("");
  const [creating, setCreating] = useState(false);
  // Individual (1:1) courses always run a single-seat batch — BatchService.CreateAsync
  // forces Capacity to 1 for them server-side no matter what's submitted. Tracking the
  // selected course's type here lets the Capacity field say so up front instead of
  // silently overriding whatever number the admin typed (e.g. "10").
  const newCourseIsIndividual = courseOptions.find((c) => c.id === newCourse)?.type === "Individual";

  function handleNewCourseChange(courseId: string) {
    setNewCourse(courseId);
    const isIndividual = courseOptions.find((c) => c.id === courseId)?.type === "Individual";
    if (isIndividual) {
      setNewCapacity("1");
    } else if (newCapacity === "1") {
      // Coming back from an Individual course — "1" was forced, not chosen, so restore
      // the usual group default rather than leaving a 1-seat group batch.
      setNewCapacity("8");
    }
  }
  const [createError, setCreateError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Generate-schedule (inside Manage dialog). Keyed by weekday, since a batch doesn't have to
  // meet at the same time every day it runs -- e.g. Monday/Wednesday at 5 PM but Friday at
  // noon -- a day's presence as a key is what selects it, and its value is that day's own time.
  const [genTimeByDay, setGenTimeByDay] = useState<Record<number, string>>({ 1: "10:00", 3: "10:00" });
  const [genStart, setGenStart] = useState("");
  // Blank means "the course's own total session count" (the only behaviour before this
  // existed) — set explicitly for a batch continuing mid-course under this portal (e.g.
  // migrated from another system with some sessions already delivered there), so only the
  // sessions actually still owed get scheduled instead of the course's full count.
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
      // A newly-added day defaults to whichever time was picked last, for convenience when
      // most days share a time and only one or two need to differ.
      const times = Object.values(prev);
      return { ...prev, [day]: times[times.length - 1] ?? "10:00" };
    });
  }

  // Assign students (inside Manage dialog) — WBS "Course & Batch Management Flow" step 6.
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
      setBanner(`Batch "${newName.trim()}" created. Open Manage → Generate schedule to create its sessions.`);
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
      // Admins type each day's own class time in IST; the API schedules in UTC. A class
      // between 12:00–05:29 AM IST falls on the previous UTC calendar date — computed per
      // weekday, since different days can run at different times (that's the whole point of
      // this field), so one day needing the shift doesn't affect another that doesn't.
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
    setTeacherAssignment(b.teacherId);
    setEditName(b.name);
    setEditStartDate(b.startDate || "");
    setEditDuration(b.durationOverride != null ? String(b.durationOverride) : "");
    setSaved(false);
    setSavingDetail(false);
    setSaveError(null);
    setGenResult(null);
    setGenStart(b.startDate && b.startDate > new Date().toISOString().slice(0, 10) ? b.startDate : "");
    setGenSessionCount("");
    setRoster([]);
    setUnassigned([]);
    setRosterError(null);
    void reloadRoster(b.id);
  }

  async function saveDetail() {
    if (!detail) return;

    if (!apiEnabled()) {
      setSaved(true);
      setTimeout(() => setDetail(null), 700);
      return;
    }

    const raw = batchData.raw.find((b) => b.id === detail.id);
    if (!raw) return;

    setSavingDetail(true);
    try {
      await updateBatchFields(raw, {
        name: editName.trim() || undefined,
        teacherProfileId: teacherAssignment,
        startDate: editStartDate.trim() || null,
        durationMinutesOverride: editDuration.trim() ? Number(editDuration) : null,
      });
      setSaved(true);
      reload();
      toast({ variant: "success", title: "Batch updated" });
      setTimeout(() => setDetail(null), 700);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save the batch.";
      setSaveError(message);
      toast({ variant: "error", title: "Couldn't save batch", description: message });
    } finally {
      setSavingDetail(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Batches"
        description="View and manage active, dormant and upcoming batches — capacity, schedule and teacher assignment."
        actions={
          <Button onClick={() => { setCreateOpen(true); setCreateError(null); }}>
            <Plus className="h-4 w-4" /> New Batch
          </Button>
        }
      />

      {banner && (
        <InlineAlert variant="success" bordered className="mb-5">{banner}</InlineAlert>
      )}

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
        <DialogContent className="max-w-xl">
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
                    <p className="mt-1 font-semibold text-foreground">
                      {apiEnabled() ? roster.length : detail.enrolled} / {detail.capacity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-1 font-semibold capitalize text-foreground">{detail.status}</p>
                  </div>
                  {!apiEnabled() && (
                    <>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
                        <p className="mt-1 font-semibold text-foreground">{detail.duration} min</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Date</p>
                        {/* detail.startDate is "" until a schedule's been generated (same empty
                            value the card view above already guards) — formatDate on "" rendered
                            the literal text "Invalid Date" instead of a real placeholder. */}
                        <p className="mt-1 font-semibold text-foreground">{detail.startDate ? formatDate(detail.startDate, "long") : "Not scheduled yet"}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {apiEnabled() && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="batch-name">Batch name</Label>
                    <Input id="batch-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="batch-start-date">Start date</Label>
                    <Input id="batch-start-date" type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      The batch's real start — correct this if it's continuing from another system.
                    </p>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="batch-duration">Class duration (min)</Label>
                    <Input
                      id="batch-duration"
                      type="number"
                      min={1}
                      max={500}
                      placeholder={`Course default: ${detail.courseDuration ?? "—"}`}
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to follow the course's own {detail.courseDuration ?? "—"}-minute default.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid min-w-0 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="batch-assign-teacher-select">Assign teacher</Label>
                  <Select value={teacherAssignment} onValueChange={setTeacherAssignment}>
                    <SelectTrigger id="batch-assign-teacher-select">
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
                {apiEnabled() ? (
                  <div className="grid gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <Label htmlFor="batch-assign-student-select">Assign students</Label>
                      <span className="shrink-0 text-[11px] text-muted-foreground">Saved immediately</span>
                    </div>
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
                            {/* Deep links to the same rich student-detail dialog Admin → Users
                                already has (email, parent details, login/credentials, RM notes,
                                engagement) — nothing here duplicates that view, since clicking a
                                name previously did nothing at all. */}
                            <Link
                              to={`/admin/users?studentId=${s.childId}`}
                              className="min-w-0 flex-1 truncate text-left hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title={`View ${s.childName}'s details`}
                            >
                              {s.childName}
                              {s.academicLevel && <span className="text-xs text-muted-foreground"> · {s.academicLevel}</span>}
                            </Link>
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
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    <Label>Assign students</Label>
                    <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                      Demo mode — connect the API (VITE_API_BASE_URL) to assign real students to this batch.
                    </p>
                  </div>
                )}
              </div>

              {/* Session plan: bulk-creates every course session on the chosen weekdays (skips holidays) */}
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
                  {genBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {genBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {genBusy ? "Generating…" : "Generate sessions"}
                </Button>
                {genResult && <p className="mt-2 text-xs font-medium text-foreground">{genResult}</p>}
              </div>

              {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
              <DialogFooter className="items-center gap-3 sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Applies the teacher, start date and duration above — student roster and schedule changes are already saved.
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setDetail(null)}>
                    Close
                  </Button>
                  <Button onClick={saveDetail} disabled={savingDetail}>
                    {savingDetail && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {saved ? "Saved!" : savingDetail ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New batch */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a batch</DialogTitle>
            <DialogDescription>Pick the course and teacher, set capacity (1 = individual batch), then generate its schedule from Manage.</DialogDescription>
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
                  <p className="text-xs text-muted-foreground">
                    This is a 1:1 course — its batches always run with a single seat.
                  </p>
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
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {creating ? "Creating…" : "Create Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
