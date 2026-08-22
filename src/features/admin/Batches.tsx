import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, Layers, Moon, Plus, Rocket, Search, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
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
  updateBatch,
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

function shiftDateString(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
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
    COURSES.map((c) => ({ id: c.id, name: c.name }))
  );

  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<DisplayBatch | null>(null);
  const [teacherAssignment, setTeacherAssignment] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // New-batch dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newCapacity, setNewCapacity] = useState("8");
  const [newStart, setNewStart] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Generate-schedule (inside Manage dialog)
  const [genDays, setGenDays] = useState<number[]>([1, 3]);
  const [genStart, setGenStart] = useState("");
  const [genTime, setGenTime] = useState("10:00");
  const [genBusy, setGenBusy] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

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
    if (!detail || !genStart || genDays.length === 0) return;
    if (!apiEnabled()) {
      setGenResult("Demo mode — schedule not persisted.");
      return;
    }
    setGenBusy(true);
    setGenResult(null);
    try {
      // Admins type the class time in IST; the API schedules in UTC. A class between
      // 12:00–05:29 AM IST falls on the previous UTC calendar date, so the start date
      // and selected weekdays shift back a day together to keep the intended IST
      // weekday correct (e.g. "every Tuesday at 12:30 AM IST" is Monday evening UTC).
      const { time: utcTime, dayShift } = istTimeToUtc(genTime);
      const created = await generateSchedule(detail.id, {
        startDate: dayShift < 0 ? shiftDateString(genStart, dayShift) : genStart,
        daysOfWeek: dayShift < 0 ? genDays.map((d) => (d + 6) % 7) : genDays,
        startTimeUtc: `${utcTime}:00`,
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

  function openDetail(b: DisplayBatch) {
    setDetail(b);
    setTeacherAssignment(b.teacherId);
    setSaved(false);
    setSavingDetail(false);
    setSaveError(null);
    setGenResult(null);
    setGenStart(b.startDate && b.startDate > new Date().toISOString().slice(0, 10) ? b.startDate : "");
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
      await updateBatch(raw, teacherAssignment);
      setSaved(true);
      reload();
      setTimeout(() => setDetail(null), 700);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the batch.");
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
        <div role="status" className="mb-5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-medium text-success">{banner}</div>
      )}

      {apiEnabled() && batchError && (
        <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <span>Couldn't load batches: {batchError}. The list below may be incomplete.</span>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </div>
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
        <DialogContent>
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
                    <p className="mt-1 font-semibold text-foreground">{detail.duration} min</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Date</p>
                    <p className="mt-1 font-semibold text-foreground">{formatDate(detail.startDate, "long")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-1 font-semibold capitalize text-foreground">{detail.status}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="batch-assign-teacher-select">Assign teacher</Label>
                  <Select value={teacherAssignment} onValueChange={setTeacherAssignment}>
                    <SelectTrigger id="batch-assign-teacher-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {apiEnabled() && teacherOptions.length > 0
                        ? teacherOptions.map((t) => (
                            <SelectItem key={t.teacherProfileId} value={t.teacherProfileId}>
                              {t.fullName} {t.department ? `· ${t.department}` : ""}
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
                    <div className="flex items-center justify-between">
                      <Label>Assign students</Label>
                      <span className="text-[11px] text-muted-foreground">Saved immediately</span>
                    </div>
                    <Select value="" onValueChange={handleAssignStudent} disabled={assigning || roster.length >= detail.capacity}>
                      <SelectTrigger>
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
                      <ul className="mt-1 flex flex-col gap-1.5">
                        {roster.map((s) => (
                          <li
                            key={s.enrollmentId}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-1.5 text-sm"
                          >
                            <span className="truncate">
                              {s.childName}
                              {s.academicLevel && <span className="text-xs text-muted-foreground"> · {s.academicLevel}</span>}
                            </span>
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
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <CalendarPlus className="h-4 w-4" /> Generate class schedule
                  </p>
                  <span className="text-[11px] text-muted-foreground">Saved immediately</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Creates all of this batch's course sessions from a start date on the selected weekdays (holidays skipped).
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="gen-start">Start date</Label>
                    <Input id="gen-start" type="date" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="gen-time">Class time (IST)</Label>
                    <Input id="gen-time" type="time" value={genTime} onChange={(e) => setGenTime(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const { time, dayShift } = istTimeToUtc(genTime);
                        return `= ${time} UTC${dayShift < 0 ? " (previous day)" : ""}`;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => (
                    <Button
                      key={d.value}
                      type="button"
                      variant="pill"
                      size="pill"
                      aria-pressed={genDays.includes(d.value)}
                      onClick={() =>
                        setGenDays((prev) => (prev.includes(d.value) ? prev.filter((v) => v !== d.value) : [...prev, d.value]))
                      }
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={genBusy || !genStart || genDays.length === 0}
                  onClick={handleGenerateSchedule}
                >
                  {genBusy ? "Generating…" : "Generate sessions"}
                </Button>
                {genResult && <p className="mt-2 text-xs font-medium text-foreground">{genResult}</p>}
              </div>

              {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
              <DialogFooter className="items-center gap-3 sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Only applies the teacher assignment above — student roster and schedule changes are already saved.
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setDetail(null)}>
                    Close
                  </Button>
                  <Button onClick={saveDetail} disabled={savingDetail}>
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
              <Label htmlFor="nb-name">Batch name</Label>
              <Input id="nb-name" placeholder="e.g. Phonics Level 1 — Evening B" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="new-batch-course-select">Course</Label>
                <Select value={newCourse} onValueChange={setNewCourse}>
                  <SelectTrigger id="new-batch-course-select">
                    <SelectValue placeholder="Select course" />
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
                            {t.fullName} {t.department ? `· ${t.department}` : ""}
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
                <Input id="nb-capacity" type="number" min={1} max={500} value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
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
