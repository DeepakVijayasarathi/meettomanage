import { useMemo, useState } from "react";
import { PartyPopper, RefreshCcw, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CalendarBoard } from "@/components/CalendarBoard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { cancelSession, getJitsiJoin, listSessions, rescheduleSession, toFrontendSession } from "@/api/sessions";
import { listHolidays, listLeave, type ApiHoliday, type ApiLeaveRequest } from "@/api/academicOps";
import { approvedLeaveToCalendarEvents, holidaysToCalendarEvents } from "@/lib/calendarEvents";
import { buildJitsiJoinUrl } from "@/lib/jitsi";
import { useSession } from "@/state/session";
import type { ClassSession } from "@/types";
import { formatDate } from "@/lib/utils";

const LOCKED_STATUSES: ClassSession["status"][] = ["cancelled", "completed", "holiday", "leave"];
const JOINABLE_STATUSES: ClassSession["status"][] = ["scheduled", "demo", "rescheduled"];

export default function CoordinatorCalendar() {
  const usingApi = apiEnabled();
  const { userName } = useSession();
  const { data: apiSessions, reload } = useApiData<ClassSession[]>(
    () => listSessions().then((s) => s.map(toFrontendSession)),
    SESSIONS
  );
  const [demoSessions, setDemoSessions] = useState<ClassSession[]>(SESSIONS);
  const { data: holidays } = useApiData<ApiHoliday[]>(() => listHolidays(), []);
  const { data: approvedLeave } = useApiData<ApiLeaveRequest[]>(() => listLeave("Approved"), []);
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
    const newStart = nextRescheduleSlot(session);
    const newEnd = new Date(newStart.getTime() + session.duration * 60000);
    await rescheduleSession(session.id, newStart.toISOString(), newEnd.toISOString());
    reload();
  }

  async function doHoliday(session: ClassSession) {
    if (!usingApi) {
      localStatus(session.id, "holiday");
      return;
    }
    // No session-level "holiday" state on the backend; cancelling frees the slot as the dialog states.
    await cancelSession(session.id, "Marked as holiday by coordinator");
    reload();
  }

  // A bare room URL isn't enough once the Jitsi deployment enforces token verification (see
  // the backend's JitsiLinkBuilder doc comment) — this authorizes against the session itself
  // and gets back a signed token, the same way the actual classroom join flow does, instead of
  // building the link from just the room id carried in this row's own data.
  async function joinSession(session: ClassSession) {
    if (!usingApi) {
      window.open(`https://meet.techmisai.com/${session.meetingRoomId}`, "_blank", "noopener");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const join = await getJitsiJoin(session.id);
      window.open(buildJitsiJoinUrl(join.domain, join.room, join.token, userName), "_blank", "noopener");
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Couldn't join this class.");
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
      />

      <Card className="p-5">
        <CalendarBoard
          sessions={sessions}
          initialMonth={usingApi ? new Date() : new Date(2026, 6, 1)}
          onSessionClick={(s) => setSelectedId(s.id)}
        />
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {formatDate(selected.date, "long")} · {selected.startTime} · {selected.duration} min
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
                  <p className="mt-1 font-medium text-foreground">{selected.batchId ? getBatchById(selected.batchId)?.name ?? "—" : "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students</p>
                  <p className="mt-1 font-medium text-foreground">
                    {selected.childIds.length === 0
                      ? "No students assigned"
                      : selected.childIds.map((id) => getChildById(id)?.name ?? id).join(", ")}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
                <Button variant="outline" disabled={locked} onClick={() => setHolidayOpen(true)}>
                  <PartyPopper className="h-4 w-4" /> Mark Holiday
                </Button>
                <Button variant="outline" disabled={locked} onClick={() => setRescheduleOpen(true)}>
                  <RefreshCcw className="h-4 w-4" /> Reschedule
                </Button>
                {/* Monitor-only: the coordinator can drop into any ongoing/upcoming class or demo. */}
                {JOINABLE_STATUSES.includes(selected.status) && selected.meetingRoomId && (
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
            ? `"${selected.title}" moves to ${formatDate(nextRescheduleSlot(selected).toISOString().slice(0, 10), "long")} at ${nextRescheduleSlot(selected).toTimeString().slice(0, 5)} — one week from its current slot. The teacher and parents will be notified to confirm.`
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
    </div>
  );
}
