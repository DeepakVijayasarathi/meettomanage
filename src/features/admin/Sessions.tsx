import { useMemo, useState } from "react";
import { CalendarClock, Plus, Users2, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { FilterBar } from "@/components/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionStatusBadge } from "@/components/StatusBadge";
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
import { formatDate } from "@/lib/utils";
import { getUserTimeZoneAbbreviation, localToUtcIso } from "@/lib/datetime";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { cancelSession, getJitsiJoin, listSessions, markNoShow, rescheduleSession, scheduleSession, toFrontendSession, type NoShowParty } from "@/api/sessions";
import { listBatches, listTeacherOptions } from "@/api/batches";
import { buildJitsiJoinUrl } from "@/lib/jitsi";
import { useSession } from "@/state/session";

// Monitor-only, same as Coordinator's own Join Class (coordinator/Calendar.tsx) --
// Admin had no way at all to drop into a live class from this screen, real or demo.
const JOINABLE_STATUSES: SessionStatus[] = ["scheduled", "demo", "rescheduled"];

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

export default function AdminSessions() {
  const usingApi = apiEnabled();
  const { userName } = useSession();
  const { data: apiSessions, error: sessionsError, reload } = useApiData<ClassSession[]>(
    () => listSessions().then((items) => items.map(toFrontendSession)),
    []
  );
  const { data: batches } = useApiData(() => listBatches(), []);
  const { data: teachers } = useApiData(() => listTeacherOptions(), []);

  // Demo fallback keeps the old local mock behaviour.
  const [mockSessions, setMockSessions] = useState<ClassSession[]>(SESSIONS);
  const sessions = usingApi ? apiSessions : mockSessions;

  const [statusFilter, setStatusFilter] = useState<SessionStatus | "all">("all");
  const [rescheduleTarget, setRescheduleTarget] = useState<ClassSession | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClassSession | null>(null);
  const [recordingsFor, setRecordingsFor] = useState<ClassSession | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Mark no-show dialog
  const [noShowTarget, setNoShowTarget] = useState<ClassSession | null>(null);
  const [noShowParty, setNoShowParty] = useState<NoShowParty>("Student");
  const [noShowNote, setNoShowNote] = useState("");
  const [noShowBusy, setNoShowBusy] = useState(false);

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

  // Reschedule dialog (real date/time picker, not just a status flip)
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("10:00");
  const [reschedBusy, setReschedBusy] = useState(false);

  const filtered = useMemo(
    () => (statusFilter === "all" ? sessions : sessions.filter((s) => s.status === statusFilter)),
    [sessions, statusFilter]
  );

  // Admin/teacher session lists never carry childIds (that's parent-portal only — see
  // ApiClassSession.childIds), so the Students column instead reads the batch's real
  // enrolled headcount, joined from the batches already loaded for the schedule dialog.
  const enrolledByBatchId = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of batches) map.set(b.id, b.enrolledCount);
    return map;
  }, [batches]);

  function notify(ok: boolean, text: string) {
    setBanner({ ok, text });
    setTimeout(() => setBanner(null), 5000);
  }

  // When a batch is picked, default the teacher to the batch's teacher.
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
      setScheduleError(err instanceof Error ? err.message : "Could not schedule the session.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReschedule() {
    if (!rescheduleTarget || !reschedDate) return;
    if (!usingApi) {
      setMockSessions((prev) => prev.map((s) => (s.id === rescheduleTarget.id ? { ...s, status: "rescheduled" } : s)));
      setRescheduleTarget(null);
      return;
    }
    setReschedBusy(true);
    try {
      const start = localToUtcIso(reschedDate, reschedTime);
      const end = new Date(new Date(start).getTime() + rescheduleTarget.duration * 60000).toISOString();
      await rescheduleSession(rescheduleTarget.id, start, end);
      notify(true, `"${rescheduleTarget.title}" rescheduled to ${formatDate(reschedDate)} ${reschedTime}.`);
      setRescheduleTarget(null);
      reload();
    } catch (err) {
      notify(false, err instanceof Error ? err.message : "Could not reschedule the session.");
    } finally {
      setReschedBusy(false);
    }
  }

  async function handleMarkNoShow() {
    if (!noShowTarget) return;
    if (!usingApi) {
      setMockSessions((prev) => prev.map((s) => (s.id === noShowTarget.id ? { ...s, status: "noshow" } : s)));
      setNoShowTarget(null);
      return;
    }
    setNoShowBusy(true);
    try {
      await markNoShow(noShowTarget.id, noShowParty, noShowNote.trim() || undefined);
      notify(
        true,
        `"${noShowTarget.title}" marked as a ${noShowParty.toLowerCase()} no-show — the class is carried forward 7 days${
          noShowParty === "Teacher" ? " and the payout deduction has been applied." : "."
        }`
      );
      setNoShowTarget(null);
      setNoShowNote("");
      reload();
    } catch (err) {
      notify(false, err instanceof Error ? err.message : "Could not record the no-show.");
    } finally {
      setNoShowBusy(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    if (!usingApi) {
      setMockSessions((prev) => prev.map((s) => (s.id === cancelTarget.id ? { ...s, status: "cancelled" } : s)));
      return;
    }
    try {
      await cancelSession(cancelTarget.id, "Cancelled by admin");
      notify(true, `"${cancelTarget.title}" cancelled. Parents and the teacher can see the change.`);
      reload();
    } catch (err) {
      notify(false, err instanceof Error ? err.message : "Could not cancel the session.");
    }
  }

  async function joinSession(session: ClassSession) {
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
  }

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
        render: (row) => <SessionStatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "",
        render: (row) =>
          row.status === "completed" ? (
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
          ) : (
            <div className="flex items-center gap-1.5">
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
              <Button
                variant="outline"
                size="sm"
                disabled={row.status === "cancelled"}
                onClick={(e) => {
                  e.stopPropagation();
                  setRescheduleTarget(row);
                  setReschedDate(row.date);
                  setReschedTime(row.startTime);
                }}
              >
                Reschedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={row.status === "cancelled" || row.status === "noshow"}
                onClick={(e) => {
                  e.stopPropagation();
                  setNoShowTarget(row);
                  setNoShowParty("Student");
                  setNoShowNote("");
                }}
              >
                Mark No-Show
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
            </div>
          ),
      },
    ],
    [enrolledByBatchId]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Scheduling"
        title="Sessions"
        description="Every class, demo and leave block across the academy — schedule, reschedule and cancel as needed."
        actions={
          <Button onClick={() => { setScheduleOpen(true); setScheduleError(null); }}>
            <Plus className="h-4 w-4" /> Schedule Session
          </Button>
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
        emptyDescription="Schedule a session, or generate a batch schedule from Batches → Manage."
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
              {saving ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule with a real new slot */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="max-w-sm">
          {rescheduleTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Reschedule session</DialogTitle>
                <DialogDescription>
                  "{rescheduleTarget.title}" — pick the new slot. Parents and the teacher see the change immediately.
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
                  Close
                </Button>
                <Button disabled={reschedBusy || !reschedDate} onClick={handleReschedule}>
                  {reschedBusy ? "Rescheduling…" : "Reschedule"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark no-show — accrues the payout waiting-amount/deduction and carries the class forward 7 days */}
      <Dialog open={!!noShowTarget} onOpenChange={(open) => !open && setNoShowTarget(null)}>
        <DialogContent className="max-w-sm">
          {noShowTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Mark a no-show</DialogTitle>
                <DialogDescription>
                  "{noShowTarget.title}" — the class is automatically carried forward 7 days. A student no-show adds a
                  waiting amount to the teacher's pay; a teacher no-show applies a deduction and notifies you.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Who didn't show up?</Label>
                  <Select value={noShowParty} onValueChange={(v) => setNoShowParty(v as NoShowParty)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ns-note">Note (optional)</Label>
                  <Input
                    id="ns-note"
                    placeholder="e.g. parent informed sick leave in advance"
                    value={noShowNote}
                    onChange={(e) => setNoShowNote(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNoShowTarget(null)}>
                  Close
                </Button>
                <Button variant="destructive" disabled={noShowBusy} onClick={handleMarkNoShow}>
                  {noShowBusy ? "Recording…" : "Mark No-Show"}
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
