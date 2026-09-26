import { useMemo, useState } from "react";
import { Link2, Loader2, PartyPopper, Plus, RefreshCcw, Trash2, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CalendarBoard } from "@/components/CalendarBoard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RecordingsDialog } from "@/components/RecordingsDialog";
import { GuestLinkDialog } from "@/components/GuestLinkDialog";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SessionStatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SESSIONS } from "@/data/sessions";
import { getBatchById } from "@/data/batches";
import { getChildById } from "@/data/children";
import { apiEnabled, userMessage } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { cancelSession, getJitsiJoin, listSessions, rescheduleSession, scheduleSession, toFrontendSession } from "@/api/sessions";
import { staffCanJoin } from "@/lib/staffJoin";
import { listBatches, listTeacherOptions } from "@/api/batches";
import { createHoliday, deleteHoliday, listHolidays, listLeave, type ApiHoliday, type ApiLeaveRequest } from "@/api/academicOps";
import { approvedLeaveToCalendarEvents, holidaysToCalendarEvents } from "@/lib/calendarEvents";
import { getUserTimeZoneAbbreviation, localToUtcIso } from "@/lib/datetime";
import { useSession } from "@/state/session";
import type { ClassSession } from "@/types";
import { formatDate, formatTimeLabel } from "@/lib/utils";

const LOCKED_STATUSES: ClassSession["status"][] = ["cancelled", "completed", "holiday", "leave"];
// "rescheduled" is the old record a reschedule moved off of, not a live session — leaving
// it here duplicated the join entry alongside the new, actually-scheduled session.

export default function CoordinatorCalendar() {
  const { toast } = useToast();
  const usingApi = apiEnabled();
  const { hasPermission } = useSession();
  // Reachable from any Sub Admin-type portal now (see App.tsx's shared page pool) --
  // SessionCalendarManagement is guaranteed by the menu gate that got someone here, but
  // LeaveManagement isn't, and GET /api/leave-requests requires it server-side. Confirmed
  // live: an account with only Sessions/Batches/Admission granted got a 403 on this page.
  const canSeeLeave = !usingApi || hasPermission("LeaveManagement", "View");
  // POST /{id}/reschedule and /{id}/cancel (used here for "Mark Holiday") both require
  // SessionCalendarManagement:Edit server-side.
  const canEditSessions = !usingApi || hasPermission("SessionCalendarManagement", "Edit");
  // Scheduling an ad-hoc session (POST /api/sessions) and managing the holiday calendar
  // (POST/DELETE /api/holidays) are both gated on SessionCalendarManagement, same module as
  // the reschedule/holiday-mark actions above but Create/Delete rather than Edit — ported
  // from admin/Sessions.tsx and admin/AcademicCalendar.tsx, which previously were the only
  // screens that could act on those grants at all.
  const canScheduleSession = !usingApi || hasPermission("SessionCalendarManagement", "Create");
  const canAddHoliday = !usingApi || hasPermission("SessionCalendarManagement", "Create");
  const canDeleteHoliday = !usingApi || hasPermission("SessionCalendarManagement", "Delete");
  // Client requirement (2026-09-15): "Copy Guest Link" gated by the session module's own View
  // right, same permission this whole page already requires to load a calendar at all — not a
  // separate/stricter grant. See Documentation/Client_Feedback_2026-09-15_RM-Emergency-Class-Link.md §10.
  const canGuestLink = !usingApi || hasPermission("SessionCalendarManagement", "View");
  const { data: apiSessions, reload } = useApiData<ClassSession[]>(
    () => listSessions().then((s) => s.map(toFrontendSession)),
    SESSIONS
  );
  const [demoSessions, setDemoSessions] = useState<ClassSession[]>(SESSIONS);
  const { data: holidays, reload: reloadHolidays } = useApiData<ApiHoliday[]>(() => listHolidays(), []);
  const { data: approvedLeave } = useApiData<ApiLeaveRequest[]>(
    () => (canSeeLeave ? listLeave("Approved") : Promise.resolve([])),
    []
  );
  const { data: batches } = useApiData(() => (canScheduleSession ? listBatches() : Promise.resolve([])), []);
  const { data: teachers } = useApiData(() => (canScheduleSession ? listTeacherOptions() : Promise.resolve([])), []);
  const sessions = useMemo(
    () =>
      usingApi
        ? [...apiSessions, ...holidaysToCalendarEvents(holidays), ...approvedLeaveToCalendarEvents(approvedLeave)]
        : demoSessions,
    [usingApi, apiSessions, holidays, approvedLeave, demoSessions]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [recordingsFor, setRecordingsFor] = useState<ClassSession | null>(null);
  const [guestLinkOpen, setGuestLinkOpen] = useState(false);

  // Holiday calendar management (ported from admin/AcademicCalendar.tsx)
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);
  const [holidayDeleteTarget, setHolidayDeleteTarget] = useState<ApiHoliday | null>(null);
  const [demoHolidays, setDemoHolidays] = useState<ApiHoliday[]>([]);
  const visibleHolidays = usingApi ? holidays : demoHolidays;

  // Schedule an ad-hoc session (ported from admin/Sessions.tsx)
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newType, setNewType] = useState<"Regular" | "Demo">("Regular");
  const [newBatch, setNewBatch] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [newDuration, setNewDuration] = useState("45");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  function pickBatch(batchId: string) {
    setNewBatch(batchId);
    const batch = batches.find((b) => b.id === batchId);
    if (batch) setNewTeacher(batch.teacherProfileId);
  }

  const durationMinutes = Number(newDuration);
  const durationValid = Number.isFinite(durationMinutes) && durationMinutes > 0;

  async function handleScheduleSession() {
    if (!newTeacher || !newDate || !durationValid || (newType === "Regular" && !newBatch)) return;
    if (!usingApi) {
      toast({ variant: "success", title: "Session scheduled", description: "Demo mode — session not persisted." });
      setScheduleOpen(false);
      return;
    }
    setScheduling(true);
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
      toast({ variant: "success", title: "Session scheduled" });
      setScheduleOpen(false);
      reload();
    } catch (err) {
      const message = userMessage(err, "Could not schedule the session.");
      setScheduleError(message);
      toast({ variant: "error", title: "Couldn't schedule session", description: message });
    } finally {
      setScheduling(false);
    }
  }

  async function handleAddHoliday() {
    if (!holidayDate || !holidayName.trim()) return;
    if (!usingApi) {
      setDemoHolidays((prev) =>
        [...prev, { id: `demo-${Date.now()}`, date: holidayDate, name: holidayName.trim(), description: null }].sort((a, b) =>
          a.date.localeCompare(b.date)
        )
      );
      setHolidayDate("");
      setHolidayName("");
      return;
    }
    setSavingHoliday(true);
    setHolidayError(null);
    try {
      await createHoliday({ date: holidayDate, name: holidayName.trim() });
      setHolidayDate("");
      setHolidayName("");
      reloadHolidays();
      toast({ variant: "success", title: "Holiday added" });
    } catch (err) {
      const message = userMessage(err, "Could not add the holiday.");
      setHolidayError(message);
      toast({ variant: "error", title: "Couldn't add holiday", description: message });
    } finally {
      setSavingHoliday(false);
    }
  }

  async function handleDeleteHoliday(id: string) {
    if (!usingApi) {
      setDemoHolidays((prev) => prev.filter((h) => h.id !== id));
      return;
    }
    setDeletingHolidayId(id);
    setHolidayError(null);
    try {
      await deleteHoliday(id);
      reloadHolidays();
      toast({ variant: "success", title: "Holiday removed" });
    } catch (err) {
      const message = userMessage(err, "Could not remove the holiday.");
      setHolidayError(message);
      toast({ variant: "error", title: "Couldn't remove holiday", description: message });
    } finally {
      setDeletingHolidayId(null);
    }
  }

  const selected = selectedId ? sessions.find((s) => s.id === selectedId) ?? null : null;
  const locked = selected ? LOCKED_STATUSES.includes(selected.status) : true;

  function localStatus(id: string, status: ClassSession["status"]) {
    setDemoSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  /** The exact date/time doReschedule will move the session to — shown before the coordinator confirms. */
  function nextRescheduleSlot(session: ClassSession): Date {
    const start = new Date(`${session.date}T${session.startTime}:00`);
    return new Date(start.getTime() + 7 * 86400_000);
  }

  async function doReschedule(session: ClassSession) {
    if (!usingApi) {
      localStatus(session.id, "rescheduled");
      return;
    }
    // Coordinator "reschedule" pushes the session one week forward at the same slot.
    try {
      const newStart = nextRescheduleSlot(session);
      const newEnd = new Date(newStart.getTime() + session.duration * 60000);
      await rescheduleSession(session.id, newStart.toISOString(), newEnd.toISOString());
      reload();
      toast({ variant: "success", title: "Session rescheduled", description: `"${session.title}" moved to ${formatDate(nextRescheduleSlot(session).toISOString().slice(0, 10), "long")}.` });
    } catch (err) {
      const message = userMessage(err, "Could not reschedule this session.");
      toast({ variant: "error", title: "Couldn't reschedule session", description: message });
      throw err;
    }
  }

  async function doHoliday(session: ClassSession) {
    if (!usingApi) {
      localStatus(session.id, "holiday");
      return;
    }
    // No session-level "holiday" state on the backend; cancelling frees the slot as the dialog states.
    try {
      await cancelSession(session.id, "Marked as holiday by coordinator");
      reload();
      toast({ variant: "success", title: "Session marked as holiday", description: `"${session.title}" was cancelled and freed from the schedule.` });
    } catch (err) {
      const message = userMessage(err, "Could not mark this session as a holiday.");
      toast({ variant: "error", title: "Couldn't mark holiday", description: message });
      throw err;
    }
  }

  // A bare room URL isn't enough once the Jitsi deployment enforces token verification (see
  // the backend's JitsiLinkBuilder doc comment) — this authorizes against the session itself
  // and gets back a signed token, the same way the actual classroom join flow does, instead of
  // building the link from just the room id carried in this row's own data.
  async function joinSession(session: ClassSession) {
    if (!usingApi) {
      // Demo mode only (no real backend/session behind it) -- but still worth pointing at
      // the actual configured deployment rather than a hardcoded dev domain that's already
      // drifted from production once (VITE_JITSI_DOMAIN is thereadernest.co.in in prod, not
      // this). Same fallback JitsiLive.tsx uses when the env var isn't set.
      const domain = import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si";
      window.open(`https://${domain}/${session.meetingRoomId}`, "_blank", "noopener");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const join = await getJitsiJoin(session.id);
      // The in-app monitor view (StaffLiveClassroom), not a raw Jitsi tab — see its doc comment.
      window.open(`/staff/live/${join.sessionId}`, "_blank", "noopener");
    } catch (err) {
      setJoinError(userMessage(err, "Couldn't join this class."));
    } finally {
      setJoining(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Coordination"
        title="Academic Calendar"
        description="The single, colour-coded source of truth for every scheduled session, demo, holiday and teacher leave across the academy. Click any session to inspect or action it."
        actions={
          canScheduleSession ? (
            <Button onClick={() => { setScheduleOpen(true); setScheduleError(null); }}>
              <Plus className="h-4 w-4" /> Schedule Session
            </Button>
          ) : undefined
        }
      />

      {usingApi && !canSeeLeave && (
        <InlineAlert variant="info" className="mb-4">
          Approved teacher leave isn&apos;t visible with this account&apos;s current permissions — the calendar below may be
          missing leave overlays rather than showing genuinely no leave scheduled.
        </InlineAlert>
      )}

      <Card className="p-5">
        <CalendarBoard
          sessions={sessions}
          initialMonth={usingApi ? new Date() : new Date(2026, 6, 1)}
          onSessionClick={(s) => setSelectedId(s.id)}
        />
      </Card>

      {(canAddHoliday || visibleHolidays.length > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Holiday Calendar</CardTitle>
            <CardDescription>
              {usingApi
                ? "Automated scheduling skips these dates when generating batch sessions."
                : "Demo mode — holidays are kept for this session only and aren't sent anywhere."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {canAddHoliday && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="holiday-date">Date <span className="text-destructive">*</span></Label>
                  <Input id="holiday-date" type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="w-44" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="holiday-name">Name <span className="text-destructive">*</span></Label>
                  <Input id="holiday-name" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g. Diwali" className="w-56" />
                </div>
                <Button onClick={handleAddHoliday} disabled={savingHoliday || !holidayDate || !holidayName.trim()}>
                  {savingHoliday ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{savingHoliday ? "Adding…" : "Add Holiday"}
                </Button>
              </div>
            )}
            {holidayError && <p className="text-sm font-medium text-destructive">{holidayError}</p>}
            {visibleHolidays.length > 0 && (
              <ul className="flex flex-col divide-y divide-border">
                {visibleHolidays.map((h) => (
                  <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-foreground">
                      {formatDate(h.date)} — {h.name}
                    </span>
                    {canDeleteHoliday && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove holiday: ${h.name}`}
                        title={`Remove holiday: ${h.name}`}
                        disabled={deletingHolidayId === h.id}
                        onClick={() => setHolidayDeleteTarget(h)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {formatDate(selected.date, "long")} · {formatTimeLabel(selected.startTime)} · {selected.duration} min
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <SessionStatusBadge status={selected.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</p>
                  <p className="mt-1 font-medium capitalize text-foreground">{selected.type}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teacher</p>
                  <p className="mt-1 font-medium text-foreground">{selected.teacherName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Batch</p>
                  <p className="mt-1 font-medium text-foreground">{selected.batchName ?? (selected.batchId ? getBatchById(selected.batchId)?.name ?? "—" : "—")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students</p>
                  <p className="mt-1 font-medium text-foreground">
                    {selected.studentNames && selected.studentNames.length > 0
                      ? selected.studentNames.join(", ")
                      : selected.childIds.length === 0
                        ? "No students assigned"
                        : selected.childIds.map((id) => getChildById(id)?.name ?? id).join(", ")}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
                {canEditSessions && (
                  <Button variant="outline" disabled={locked} onClick={() => setHolidayOpen(true)}>
                    <PartyPopper className="h-4 w-4" /> Mark Holiday
                  </Button>
                )}
                {canEditSessions && (
                  <Button variant="outline" disabled={locked} onClick={() => setRescheduleOpen(true)}>
                    <RefreshCcw className="h-4 w-4" /> Reschedule
                  </Button>
                )}
                {selected.status === "completed" && (
                  <Button variant="outline" onClick={() => setRecordingsFor(selected)}>
                    <Video className="h-4 w-4" /> Recording
                  </Button>
                )}
                {/* Monitor-only: the coordinator can drop into any ongoing/upcoming class or demo. */}
                {staffCanJoin(selected) && canGuestLink && (
                  <Button
                    variant="outline"
                    title="Copy a shareable guest link for a parent, grandparent or caretaker"
                    onClick={() => setGuestLinkOpen(true)}
                  >
                    <Link2 className="h-4 w-4" /> Copy Guest Link
                  </Button>
                )}
                {staffCanJoin(selected) && (
                  <Button disabled={joining} onClick={() => joinSession(selected)}>
                    <Video className="h-4 w-4" /> Join Class
                  </Button>
                )}
              </DialogFooter>
              {joinError && <p role="alert" className="px-6 pb-4 text-sm font-medium text-destructive">{joinError}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        title="Reschedule this session?"
        description={
          selected
            ? `"${selected.title}" moves to ${formatDate(nextRescheduleSlot(selected).toISOString().slice(0, 10), "long")} at ${formatTimeLabel(nextRescheduleSlot(selected).toTimeString().slice(0, 5))} — one week from its current slot. The teacher and parents will be notified to confirm.`
            : undefined
        }
        confirmLabel="Mark Rescheduled"
        onConfirm={() => {
          if (!selected) return;
          return doReschedule(selected).then(() => setSelectedId(null));
        }}
      />

      <ConfirmDialog
        open={holidayOpen}
        onOpenChange={setHolidayOpen}
        title="Mark this slot as a holiday?"
        description={
          selected
            ? `"${selected.title}" will be recorded as Cancelled — there's no separate "Holiday" status yet, so this is how a holiday shows up on reports too. Any assigned students and the teacher will be freed from this slot.`
            : undefined
        }
        confirmLabel="Mark Holiday"
        onConfirm={() => {
          if (!selected) return;
          return doHoliday(selected).then(() => setSelectedId(null));
        }}
      />

      {recordingsFor && <RecordingsDialog session={recordingsFor} onClose={() => setRecordingsFor(null)} />}
      {guestLinkOpen && selected && <GuestLinkDialog session={selected} onClose={() => setGuestLinkOpen(false)} />}

      <ConfirmDialog
        open={!!holidayDeleteTarget}
        onOpenChange={(open) => !open && setHolidayDeleteTarget(null)}
        title={`Remove "${holidayDeleteTarget?.name}"?`}
        description={holidayDeleteTarget ? `${formatDate(holidayDeleteTarget.date)} will no longer be marked as a holiday on the calendar.` : undefined}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (!holidayDeleteTarget) return;
          return handleDeleteHoliday(holidayDeleteTarget.id).then(() => setHolidayDeleteTarget(null));
        }}
      />

      {/* Schedule an ad-hoc session — ported from admin/Sessions.tsx */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a session</DialogTitle>
            <DialogDescription>Regular sessions belong to a batch; demo sessions only need a teacher.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cc-session-type-select">Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as "Regular" | "Demo")}>
                  <SelectTrigger id="cc-session-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cc-session-duration-input">Duration (min)</Label>
                <Input
                  id="cc-session-duration-input"
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
                <Label htmlFor="cc-session-batch-select">Batch <span className="text-destructive">*</span></Label>
                <Select value={newBatch} onValueChange={pickBatch}>
                  <SelectTrigger id="cc-session-batch-select">
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
              <Label htmlFor="cc-session-teacher-select">Teacher <span className="text-destructive">*</span></Label>
              <Select value={newTeacher} onValueChange={setNewTeacher}>
                <SelectTrigger id="cc-session-teacher-select">
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
                <Label htmlFor="cc-ns-date">Date <span className="text-destructive">*</span></Label>
                <Input id="cc-ns-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cc-ns-time">Start time ({getUserTimeZoneAbbreviation()})</Label>
                <Input id="cc-ns-time" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>
            </div>
            {scheduleError && <p className="text-sm font-medium text-destructive">{scheduleError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={scheduling || !newTeacher || !newDate || !durationValid || (newType === "Regular" && !newBatch)}
              onClick={handleScheduleSession}
            >
              {scheduling && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {scheduling ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
