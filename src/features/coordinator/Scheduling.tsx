import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Plus, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SESSIONS } from "@/data/sessions";
import { BATCHES, getBatchById } from "@/data/batches";
import { COURSES, getCourseById } from "@/data/courses";
import { TEACHERS, getTeacherById } from "@/data/users";
import type { ClassDuration, ClassSession, SessionStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { cancelSession, listSessions, rescheduleSession, scheduleSession, toFrontendSession } from "@/api/sessions";
import { listBatches, listTeacherOptions } from "@/api/batches";
import { listCourseOptions } from "@/api/courses";

interface Opt {
  id: string;
  label: string;
}

const STATUS_OPTIONS: { value: SessionStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "noshow", label: "No-Show" },
  { value: "demo", label: "Demo" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "holiday", label: "Holiday" },
  { value: "leave", label: "Teacher Leave" },
];

const DURATION_OPTIONS: ClassDuration[] = [30, 45, 60];

const NOT_ACTIONABLE: SessionStatus[] = ["cancelled", "completed", "holiday", "leave"];

const NEW_SESSION_DEFAULTS = {
  courseId: "",
  batchId: "none",
  teacherId: "",
  date: "2026-07-20",
  time: "16:00",
  duration: "30" as string,
};

export default function CoordinatorScheduling() {
  const usingApi = apiEnabled();
  const { data: apiSessions, reload } = useApiData<ClassSession[]>(
    () => listSessions().then((s) => s.map(toFrontendSession)),
    SESSIONS
  );
  const { data: apiBatches } = useApiData(() => listBatches(), []);
  const { data: apiTeachers } = useApiData(() => listTeacherOptions(), []);
  const { data: apiCourses } = useApiData(() => listCourseOptions(), []);

  const [demoSessions, setDemoSessions] = useState<ClassSession[]>(SESSIONS);
  const sessions = usingApi ? apiSessions : demoSessions;

  const [statusFilter, setStatusFilter] = useState<SessionStatus | "all">("all");
  const [rescheduleTarget, setRescheduleTarget] = useState<ClassSession | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClassSession | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(NEW_SESSION_DEFAULTS);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const filtered = useMemo(
    () => (statusFilter === "all" ? sessions : sessions.filter((s) => s.status === statusFilter)),
    [sessions, statusFilter]
  );

  // Unified dropdown options (real in API mode, mock otherwise).
  const courseOpts: Opt[] = usingApi
    ? apiCourses.map((c) => ({ id: c.id, label: c.name }))
    : COURSES.filter((c) => c.status === "active").map((c) => ({ id: c.id, label: `${c.name} (${c.type})` }));
  const teacherOpts: Opt[] = usingApi
    ? apiTeachers.map((t) => ({ id: t.teacherProfileId, label: `${t.fullName}${t.department ? ` · ${t.department}` : ""}` }))
    : TEACHERS.filter((t) => t.status === "active").map((t) => ({ id: t.id, label: `${t.name} · ${t.department}` }));
  const batchOpts: Opt[] = form.courseId
    ? usingApi
      ? apiBatches.filter((b) => b.courseId === form.courseId).map((b) => ({ id: b.id, label: b.name }))
      : BATCHES.filter((b) => b.courseId === form.courseId).map((b) => ({ id: b.id, label: b.name }))
    : [];

  const canSubmit = !!form.courseId && !!form.teacherId && !!form.date && !!form.time;

  function resetForm() {
    setForm(NEW_SESSION_DEFAULTS);
  }

  async function handleCreateSession() {
    if (!canSubmit) return;

    if (usingApi) {
      const start = new Date(`${form.date}T${form.time}:00`);
      const end = new Date(start.getTime() + Number(form.duration) * 60000);
      try {
        await scheduleSession({
          batchId: form.batchId !== "none" ? form.batchId : undefined,
          teacherProfileId: form.teacherId,
          type: form.batchId !== "none" ? "Regular" : "Demo",
          scheduledStartAtUtc: start.toISOString(),
          scheduledEndAtUtc: end.toISOString(),
        });
        reload();
        setCreateOpen(false);
        resetForm();
        setConfirmation(`Session scheduled for ${formatDate(form.date, "long")} at ${form.time}.`);
        window.setTimeout(() => setConfirmation(null), 5000);
      } catch (err) {
        setConfirmation(err instanceof Error ? err.message : "Could not schedule the session.");
      }
      return;
    }

    const course = getCourseById(form.courseId);
    const teacher = getTeacherById(form.teacherId);
    const batch = form.batchId !== "none" ? getBatchById(form.batchId) : undefined;
    const title = batch ? `${batch.name} · New Session` : `${course?.name ?? "Session"} · ${teacher?.name ?? "New Teacher"}`;

    const newSession: ClassSession = {
      id: `s-new-${Date.now()}`,
      title,
      batchId: batch?.id,
      courseId: course?.id,
      teacherId: form.teacherId,
      teacherName: teacher?.name ?? "Unassigned",
      childIds: [],
      date: form.date,
      startTime: form.time,
      duration: Number(form.duration) as ClassDuration,
      status: "scheduled",
      type: course?.type ?? "group",
    };

    setDemoSessions((prev) => [newSession, ...prev]);
    setCreateOpen(false);
    resetForm();
    setConfirmation(`"${title}" scheduled for ${formatDate(form.date, "long")} at ${form.time}.`);
    window.setTimeout(() => setConfirmation(null), 5000);
  }

  async function doReschedule(session: ClassSession) {
    if (!usingApi) {
      setDemoSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, status: "rescheduled" } : s)));
      return;
    }
    const start = new Date(`${session.date}T${session.startTime}:00`);
    const newStart = new Date(start.getTime() + 7 * 86400_000);
    const newEnd = new Date(newStart.getTime() + session.duration * 60000);
    await rescheduleSession(session.id, newStart.toISOString(), newEnd.toISOString());
    reload();
  }

  async function doCancel(session: ClassSession) {
    if (!usingApi) {
      setDemoSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, status: "cancelled" } : s)));
      return;
    }
    await cancelSession(session.id, "Cancelled by coordinator");
    reload();
  }

  const columns: DataTableColumn<ClassSession>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Session",
        sortable: true,
        accessor: (row) => row.title,
        render: (row) => (
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_PALETTE[row.title.length % CHART_PALETTE.length]}1A`, color: CHART_PALETTE[row.title.length % CHART_PALETTE.length] }}
            >
              <CalendarClock className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{row.title}</p>
              <p className="text-xs capitalize text-muted-foreground">{row.type} class</p>
            </div>
          </div>
        ),
      },
      {
        key: "datetime",
        header: "Date & Time",
        sortable: true,
        accessor: (row) => `${row.date} ${row.startTime}`,
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.date)} · {row.startTime}
          </span>
        ),
      },
      {
        key: "teacher",
        header: "Teacher",
        sortable: true,
        accessor: (row) => row.teacherName,
        render: (row) => <span className="text-sm">{row.teacherName}</span>,
      },
      {
        key: "batch",
        header: "Batch",
        sortable: true,
        accessor: (row) => (row.batchId ? getBatchById(row.batchId)?.name ?? "" : ""),
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {row.batchId ? getBatchById(row.batchId)?.name ?? "—" : "1:1 / Standalone"}
          </span>
        ),
      },
      {
        key: "students",
        header: "Students",
        sortable: true,
        accessor: (row) => row.childIds.length,
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users2 className="h-3.5 w-3.5" />
            {row.childIds.length}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => <SessionStatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={NOT_ACTIONABLE.includes(row.status)}
              onClick={(e) => {
                e.stopPropagation();
                setRescheduleTarget(row);
              }}
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={NOT_ACTIONABLE.includes(row.status)}
              onClick={(e) => {
                e.stopPropagation();
                setCancelTarget(row);
              }}
            >
              Cancel
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="Coordination"
        title="Scheduling"
        description="Schedule new sessions, and reschedule or cancel existing ones. Every change here is immediately reflected on the academic calendar."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Schedule New Session
          </Button>
        }
      />

      {confirmation && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          {confirmation}
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search sessions by title or teacher…"
        toolbar={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SessionStatus | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <ConfirmDialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
        title="Reschedule session?"
        description={rescheduleTarget ? `"${rescheduleTarget.title}" will be marked as rescheduled. Parents and the teacher will be notified.` : undefined}
        confirmLabel="Reschedule"
        onConfirm={() => {
          if (!rescheduleTarget) return;
          return doReschedule(rescheduleTarget);
        }}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel this session?"
        description={cancelTarget ? `"${cancelTarget.title}" will be cancelled. This action can be reversed by rescheduling.` : undefined}
        confirmLabel="Cancel Session"
        destructive
        onConfirm={() => {
          if (!cancelTarget) return;
          return doCancel(cancelTarget);
        }}
      />

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Session</DialogTitle>
            <DialogDescription>Set the course, teacher and slot — the session will appear as Scheduled on the calendar.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Course</Label>
              <Select
                value={form.courseId}
                onValueChange={(v) => setForm((f) => ({ ...f, courseId: v, batchId: "none" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courseOpts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Batch (optional)</Label>
              <Select value={form.batchId} onValueChange={(v) => setForm((f) => ({ ...f, batchId: v }))} disabled={!form.courseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — 1:1 / standalone session</SelectItem>
                  {batchOpts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Teacher</Label>
              <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOpts.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-session-date">Date</Label>
              <Input
                id="new-session-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-session-time">Start Time</Label>
              <Input
                id="new-session-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Duration</Label>
              <Select value={form.duration} onValueChange={(v) => setForm((f) => ({ ...f, duration: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canSubmit} onClick={handleCreateSession}>
              Schedule Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
