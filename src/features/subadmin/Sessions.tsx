import { useCallback, useMemo, useState } from "react";
import { CalendarClock, Loader2, Plus, Users2, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { FilterBar } from "@/components/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionStatusBadge, noShowLabel } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RecordingsDialog } from "@/components/RecordingsDialog";
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
import { SESSIONS } from "@/data/sessions";
import type { ClassSession, SessionStatus } from "@/types";
import { formatDate, formatTimeLabel } from "@/lib/utils";
import { getUserTimeZoneAbbreviation, localToUtcIso } from "@/lib/datetime";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { cancelSession, getJitsiJoin, listSessions, rescheduleSession, scheduleSession, toFrontendSession } from "@/api/sessions";
import { listBatches, listTeacherOptions } from "@/api/batches";
import { buildJitsiJoinUrl } from "@/lib/jitsi";
import { useSession } from "@/state/session";

// Same monitor-only join affordance as admin/Sessions.tsx — "rescheduled" is the old record
// a reschedule moved off of, not a live session.
const JOINABLE_STATUSES: SessionStatus[] = ["scheduled", "demo"];

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

/**
 * Delegated-portal Sessions — ported from admin/Sessions.tsx so a Relationship Manager can
 * view, schedule, reschedule and cancel sessions without needing the full Admin Portal.
 * SessionsController gates List/Get on SessionCalendarManagement:View, Schedule on :Create,
 * Reschedule/Cancel on :Edit (SessionsController.cs:29,94,102,112) — RM is already in the
 * controller's allowed-roles list for every one of these, it's only ever been missing a
 * screen. Mark No-Show is deliberately left out: MarkNoShow is Admin/Teacher-only at the
 * controller (SessionsController.cs:140) and isn't part of what RMs were asked to manage.
 */
export default function SubAdminSessions() {
  const { toast } = useToast();
  const usingApi = apiEnabled();
  const { userName, hasPermission } = useSession();
  const canSchedule = !usingApi || hasPermission("SessionCalendarManagement", "Create");
  const canManage = !usingApi || hasPermission("SessionCalendarManagement", "Edit");
  // GET /api/batches requires CourseBatchManagement:View server-side — a delegated-portal
  // account with only SessionCalendarManagement granted (e.g. Admission) 403's on it. Confirmed
  // live via a fresh AdmissionTeam test account. Same gate as subadmin/Dashboard.tsx's own
  // canSeeBatches; batches here just silently shows a blank Students column and an empty batch
  // picker instead of a console 403 when the account lacks the grant.
  const canSeeBatches = !usingApi || hasPermission("CourseBatchManagement", "View");

  const { data: apiSessions, error: sessionsError, reload } = useApiData<ClassSession[]>(
    () => listSessions().then((items) => items.map(toFrontendSession)),
    []
  );
  const { data: batches } = useApiData(() => (canSeeBatches ? listBatches() : Promise.resolve([])), []);
  const { data: teachers } = useApiData(() => listTeacherOptions(), [], undefined, { cacheKey: "teacherOptions" });

  // Demo fallback keeps the old local mock behaviour.
  const [mockSessions, setMockSessions] = useState<ClassSession[]>(SESSIONS);
  const sessions = usingApi ? apiSessions : mockSessions;

  const [statusFilter, setStatusFilter] = useState<SessionStatus | "all">("all");
  const [rescheduleTarget, setRescheduleTarget] = useState<ClassSession | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClassSession | null>(null);
  const [recordingsFor, setRecordingsFor] = useState<ClassSession | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Schedule-session dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newType, setNewType] = useState<"Regular" | "Demo">("Regular");
  const [newBatch, setNewBatch] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [newDuration, setNewDuration] = useState("45");
  const [saving, setSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Edit session dialog (date/time picker plus teacher/batch overrides — was "Reschedule",
  // time-only) — duration is editable here too, same reasoning as admin/Sessions.tsx: the
  // backend prices payout off ScheduledEndAtUtc - ScheduledStartAtUtc at completion time.
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("10:00");
  const [reschedDuration, setReschedDuration] = useState("45");
  const [reschedTeacher, setReschedTeacher] = useState("");
  const [reschedBatch, setReschedBatch] = useState("");
  const [reschedBusy, setReschedBusy] = useState(false);

  const reschedDurationMinutes = Number(reschedDuration);
  const reschedDurationValid = Number.isFinite(reschedDurationMinutes) && reschedDurationMinutes > 0;

  const filtered = useMemo(
    () => (statusFilter === "all" ? sessions : sessions.filter((s) => s.status === statusFilter)),
    [sessions, statusFilter]
  );

  // Same batch-headcount join as admin/Sessions.tsx — admin/teacher session lists never
  // carry childIds (parent-portal only), so Students reads the batch's real enrolled count.
  const enrolledByBatchId = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of batches) map.set(b.id, b.enrolledCount);
    return map;
  }, [batches]);

  // useCallback (deps: just the stable `toast`) so joinSession below — which needs to be
  // stable itself to sit in the columns useMemo's deps — can depend on it without
  // recomputing every render.
  const notify = useCallback((ok: boolean, text: string) => {
    setBanner({ ok, text });
    toast({ variant: ok ? "success" : "error", title: ok ? "Done" : "Something went wrong", description: text });
    setTimeout(() => setBanner(null), 5000);
  }, [toast]);

  function pickBatch(batchId: string) {
    setNewBatch(batchId);
    const batch = batches.find((b) => b.id === batchId);
    if (batch) setNewTeacher(batch.teacherProfileId);
  }

  const durationMinutes = Number(newDuration);
  const durationValid = Number.isFinite(durationMinutes) && durationMinutes > 0;

  async function handleSchedule() {
    if (!newTeacher || !newDate || !durationValid || (newType === "Regular" && !newBatch)) return;
    if (!usingApi) {
      notify(true, "Demo mode — session not persisted.");
      setScheduleOpen(false);
      return;
    }
    setSaving(true);
    setScheduleError(null);
    try {
      const start = localToUtcIso(newDate, newTime);
      const end = new Date(new Date(start).getTime() + durationMinutes * 60000).toISOString();
      await scheduleSession({
        batchId: newType === "Regular" ? newBatch : undefined,
        teacherProfileId: newTeacher,
        type: newType,
        scheduledStartAtUtc: start,
        scheduledEndAtUtc: end,
      });
      notify(true, "Session scheduled — it now shows on the teacher's and parents' schedules.");
      setScheduleOpen(false);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not schedule the session.";
      setScheduleError(message);
      toast({ variant: "error", title: "Couldn't schedule session", description: message });
    } finally {
      setSaving(false);
    }
  }

  async function handleReschedule() {
    if (!rescheduleTarget || !reschedDate || !reschedDurationValid) return;
    if (!usingApi) {
      setMockSessions((prev) => prev.map((s) => (s.id === rescheduleTarget.id ? { ...s, status: "rescheduled" } : s)));
      setRescheduleTarget(null);
      return;
    }
    setReschedBusy(true);
    try {
      const start = localToUtcIso(reschedDate, reschedTime);
      const end = new Date(new Date(start).getTime() + reschedDurationMinutes * 60000).toISOString();
      await rescheduleSession(rescheduleTarget.id, start, end, {
        teacherProfileId: reschedTeacher && reschedTeacher !== rescheduleTarget.teacherId ? reschedTeacher : undefined,
        batchId: reschedBatch && reschedBatch !== (rescheduleTarget.batchId ?? "") ? reschedBatch : undefined,
      });
      notify(true, `"${rescheduleTarget.title}" updated to ${formatDate(reschedDate)} ${formatTimeLabel(reschedTime)} (${reschedDurationMinutes} min).`);
      setRescheduleTarget(null);
      reload();
    } catch (err) {
      notify(false, err instanceof Error ? err.message : "Could not reschedule the session.");
    } finally {
      setReschedBusy(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    if (!usingApi) {
      setMockSessions((prev) => prev.map((s) => (s.id === cancelTarget.id ? { ...s, status: "cancelled" } : s)));
      return;
    }
    try {
      await cancelSession(cancelTarget.id, "Cancelled by relationship manager");
      notify(true, `"${cancelTarget.title}" cancelled. Parents and the teacher can see the change.`);
      reload();
    } catch (err) {
      notify(false, err instanceof Error ? err.message : "Could not cancel the session.");
    }
  }

  const joinSession = useCallback(async (session: ClassSession) => {
    if (!usingApi) {
      notify(true, "Demo mode — no live class to actually join.");
      return;
    }
    setJoiningId(session.id);
    try {
      const join = await getJitsiJoin(session.id);
      window.open(buildJitsiJoinUrl(join.domain, join.room, join.token, userName), "_blank", "noopener");
    } catch (err) {
      notify(false, err instanceof Error ? err.message : "Couldn't join this class.");
    } finally {
      setJoiningId(null);
    }
  }, [usingApi, notify, userName]);

  const columns: DataTableColumn<ClassSession>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Session",
        sortable: true,
        accessor: (row) => row.title,
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_PALETTE[row.title.length % CHART_PALETTE.length]}1A`, color: CHART_PALETTE[row.title.length % CHART_PALETTE.length] }}
            >
              <CalendarClock className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{row.title}</p>
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
            {formatDate(row.date)} · {formatTimeLabel(row.startTime)}
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
        key: "children",
        header: "Students",
        sortable: true,
        accessor: (row) => (row.batchId ? enrolledByBatchId.get(row.batchId) ?? 0 : row.childIds.length),
        render: (row) => {
          const count = row.batchId ? enrolledByBatchId.get(row.batchId) : row.childIds.length;
          return (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users2 className="h-3.5 w-3.5" />
              {count || "—"}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => <SessionStatusBadge status={row.status} label={noShowLabel(row)} />,
      },
      {
        key: "actions",
        header: "",
        render: (row) =>
          row.status === "completed" ? (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setRecordingsFor(row);
                }}
              >
                <Video className="h-3.5 w-3.5" />
                Recording
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-1.5">
              {JOINABLE_STATUSES.includes(row.status) && row.meetingRoomId && (
                <Button
                  size="sm"
                  disabled={joiningId === row.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    joinSession(row);
                  }}
                >
                  <Video className="h-3.5 w-3.5" />
                  {joiningId === row.id ? "Joining…" : "Join"}
                </Button>
              )}
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={row.status === "cancelled"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRescheduleTarget(row);
                      setReschedDate(row.date);
                      setReschedTime(row.startTime);
                      setReschedDuration(String(row.duration));
                      setReschedTeacher(row.teacherId);
                      setReschedBatch(row.batchId ?? "");
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={row.status === "cancelled"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCancelTarget(row);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          ),
      },
    ],
    [enrolledByBatchId, joiningId, canManage, joinSession]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Scheduling"
        title="Sessions"
        description="Every class, demo and leave block you're responsible for — schedule, reschedule and cancel as needed."
        actions={
          canSchedule ? (
            <Button onClick={() => { setScheduleOpen(true); setScheduleError(null); }}>
              <Plus className="h-4 w-4" /> Schedule Session
            </Button>
          ) : undefined
        }
      />

      {usingApi && sessionsError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load the session calendar ({sessionsError}) — the schedule below may be incomplete.{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </InlineAlert>
      )}

      {banner && (
        <InlineAlert variant={banner.ok ? "success" : "error"} bordered className="mb-5">
          {banner.text}
        </InlineAlert>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search sessions by title or teacher…"
        emptyTitle="No sessions in this window"
        emptyDescription="Schedule a session, or ask an admin to generate a batch schedule from Batches → Manage."
        error={usingApi ? sessionsError : null}
        onRetry={reload}
        toolbar={
          <FilterBar
            filters={[
              {
                key: "status",
                label: "Status",
                value: statusFilter,
                onChange: (v) => setStatusFilter(v as SessionStatus | "all"),
                className: "w-48",
                options: STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
              },
            ]}
          />
        }
      />

      {/* Schedule a session */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a session</DialogTitle>
            <DialogDescription>Regular sessions belong to a batch; demo sessions only need a teacher.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="session-type-select">Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as "Regular" | "Demo")}>
                  <SelectTrigger id="session-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="session-duration-input">Duration (min)</Label>
                <Input
                  id="session-duration-input"
                  type="number"
                  min={1}
                  step={1}
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                />
              </div>
            </div>
            {newType === "Regular" && (
              <div className="grid gap-1.5">
                <Label htmlFor="session-batch-select">Batch</Label>
                <Select value={newBatch} onValueChange={pickBatch}>
                  <SelectTrigger id="session-batch-select">
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} · {b.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="session-teacher-select">Teacher</Label>
              <Select value={newTeacher} onValueChange={setNewTeacher}>
                <SelectTrigger id="session-teacher-select">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.teacherProfileId} value={t.teacherProfileId}>
                      {t.fullName} {t.departmentName ? `· ${t.departmentName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="ns-date">Date</Label>
                <Input id="ns-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ns-time">Start time ({getUserTimeZoneAbbreviation()})</Label>
                <Input id="ns-time" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>
            </div>
            {scheduleError && <p className="text-sm font-medium text-destructive">{scheduleError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving || !newTeacher || !newDate || !durationValid || (newType === "Regular" && !newBatch)}
              onClick={handleSchedule}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {saving ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit session: date/time/duration plus, now, teacher/batch — was time-only "Reschedule" */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="max-w-sm">
          {rescheduleTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Edit session</DialogTitle>
                <DialogDescription>
                  "{rescheduleTarget.title}" — parents and the teacher see the change immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="rs-date">New date</Label>
                  <Input id="rs-date" type="date" value={reschedDate} onChange={(e) => setReschedDate(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rs-time">New time ({getUserTimeZoneAbbreviation()})</Label>
                  <Input id="rs-time" type="time" value={reschedTime} onChange={(e) => setReschedTime(e.target.value)} />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="rs-duration">Duration (min)</Label>
                  <Input
                    id="rs-duration"
                    type="number"
                    min={1}
                    step={1}
                    value={reschedDuration}
                    onChange={(e) => setReschedDuration(e.target.value)}
                    aria-invalid={!reschedDurationValid}
                  />
                  {!reschedDurationValid && <p className="text-xs font-medium text-destructive">Enter a duration greater than 0.</p>}
                </div>
                {rescheduleTarget.type !== "demo" && (
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="rs-batch">Batch</Label>
                    <Select value={reschedBatch} onValueChange={setReschedBatch}>
                      <SelectTrigger id="rs-batch">
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} · {b.courseName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="rs-teacher">Teacher</Label>
                  <Select value={reschedTeacher} onValueChange={setReschedTeacher}>
                    <SelectTrigger id="rs-teacher">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.teacherProfileId} value={t.teacherProfileId}>
                          {t.fullName} {t.departmentName ? `· ${t.departmentName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
                  Close
                </Button>
                <Button disabled={reschedBusy || !reschedDate || !reschedDurationValid} onClick={handleReschedule}>
                  {reschedBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {reschedBusy ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel this session?"
        description={cancelTarget ? `"${cancelTarget.title}" will be cancelled. Parents and the teacher will see the change.` : undefined}
        confirmLabel="Cancel Session"
        destructive
        onConfirm={handleCancel}
      />

      {recordingsFor && <RecordingsDialog session={recordingsFor} onClose={() => setRecordingsFor(null)} />}
    </div>
  );
}
