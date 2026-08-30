import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLeavesForTeacher } from "@/data/leaves";
import { getSessionsForTeacher } from "@/data/sessions";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listMySessions, toFrontendSession } from "@/api/sessions";
import { listMyLeave, submitLeave, type ApiLeaveRequest } from "@/api/academicOps";
import { localToUtcIso, utcIsoToLocalDateTime } from "@/lib/datetime";
import { formatDate } from "@/lib/utils";
import type { ClassSession, LeaveRequest } from "@/types";

function toFrontendLeave(leave: ApiLeaveRequest): LeaveRequest {
  const noticeHours = (new Date(leave.startAtUtc).getTime() - new Date(leave.createdAtUtc).getTime()) / 3_600_000;
  return {
    id: leave.id,
    teacherId: leave.teacherProfileId,
    teacherName: leave.teacherName,
    date: leave.startAtUtc.slice(0, 10),
    session: `${leave.affectedSessionCount} session(s) affected`,
    reason: leave.reason,
    hoursBeforeSession: Math.round(noticeHours * 10) / 10,
    status: leave.status.toLowerCase() as LeaveRequest["status"],
  };
}

const TEACHER_ID = "t-1";
const TEACHER_NAME = "Karan Mehta";
// Deterministic reference "now" for this demo — never use new Date() with no args here.
const NOW = new Date("2026-07-09T12:00:00");
const MIN_HOURS_NOTICE = 6;

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// session.date/startTime are the signed-in teacher's own timezone's wall-clock values
// (see toFrontendSession) — parse them the same way rather than the browser's own
// timezone, so notice/eligibility math is correct no matter what machine this is viewed from.
function sessionDateTime(session: ClassSession) {
  return new Date(localToUtcIso(session.date, session.startTime));
}

function hoursBetween(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

const LEAVE_STATUS_VARIANT: Record<LeaveRequest["status"], "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  blocked: "destructive",
};

const LEAVE_STATUS_LABEL: Record<LeaveRequest["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  blocked: "Blocked (Late Request)",
};

function LeaveStatusBadge({ status }: { status: LeaveRequest["status"] }) {
  return <Badge variant={LEAVE_STATUS_VARIANT[status]}>{LEAVE_STATUS_LABEL[status]}</Badge>;
}

export default function TeacherLeave() {
  const { toast } = useToast();
  const now = apiEnabled() ? new Date() : NOW;
  const { data: fetchedSessions } = useApiData(
    () => listMySessions().then((sessions) => sessions.map(toFrontendSession)),
    getSessionsForTeacher(TEACHER_ID)
  );
  const eligibleSessions = fetchedSessions
    .filter((s) => s.status === "scheduled" || s.status === "demo")
    .filter((s) => sessionDateTime(s) > now)
    .sort((a, b) => sessionDateTime(a).getTime() - sessionDateTime(b).getTime());

  const { data: fetchedLeaves, error: leavesError, reload: reloadLeaves } = useApiData(
    () => listMyLeave().then((items) => items.map(toFrontendLeave)),
    getLeavesForTeacher(TEACHER_ID)
  );
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => (apiEnabled() ? [] : getLeavesForTeacher(TEACHER_ID)));
  useEffect(() => setLeaves(fetchedLeaves), [fetchedLeaves]);
  const [sessionId, setSessionId] = useState<string>("");
  // Independent date+time fields, not just a session picker — SubmitLeaveAsync (backend)
  // accepts any start/end instant and never requires it to overlap a session, but the
  // old UI only let a teacher pick from `eligibleSessions`. Whenever that list was empty
  // (a lighter week, or nothing scheduled far enough out yet) the whole "Apply for Leave"
  // card vanished behind an EmptyState with no button anywhere to submit a request.
  // These fields are now the actual source of truth; picking an upcoming session below
  // just quick-fills them as a convenience — it's optional, not required.
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("18:00");
  // Stops the Start+1h auto-default (below) once the teacher edits End themselves.
  const [endTouched, setEndTouched] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  // Defaults End to an hour after Start so the common same-day case doesn't require
  // typing both ends of the range — stops the moment the teacher touches End directly.
  useEffect(() => {
    if (endTouched || !startDate || !startTime) return;
    const startUtcMs = new Date(localToUtcIso(startDate, startTime)).getTime();
    const suggested = utcIsoToLocalDateTime(new Date(startUtcMs + 60 * 60_000).toISOString());
    setEndDate(suggested.date);
    setEndTime(suggested.time);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, startTime]);

  const selectedSession = eligibleSessions.find((s) => s.id === sessionId) ?? null;
  const startAt = startDate && startTime ? new Date(localToUtcIso(startDate, startTime)) : null;
  const endAt = endDate && endTime ? new Date(localToUtcIso(endDate, endTime)) : null;
  const hoursBefore = startAt ? hoursBetween(startAt, now) : null;
  // Mirrors SubmitLeaveAsync's own rule exactly: the cutoff only matters for a session
  // this leave would actually cover, not the leave's own start time in the abstract. The
  // previous "leave starts within 6h = blocked" check fired even for a leave over a day
  // with no scheduled classes at all, refusing a request the backend would have accepted.
  // Uses eligibleSessions (scheduled + demo, future-only) rather than filtering fetchedSessions
  // by status === "scheduled" alone — the backend's own check matches on ClassSession.Status,
  // which a Demo-type session also carries as "Scheduled", so excluding "demo" here would
  // under-block relative to what SubmitLeaveAsync actually rejects.
  const cutoffLimit = new Date(now.getTime() + MIN_HOURS_NOTICE * 60 * 60_000);
  const blockingSession =
    startAt && endAt
      ? (eligibleSessions.find((s) => {
          const sessionStart = sessionDateTime(s);
          const sessionEnd = new Date(sessionStart.getTime() + s.duration * 60_000);
          return sessionStart < cutoffLimit && sessionStart < endAt && sessionEnd > startAt;
        }) ?? null)
      : null;
  const isBlocked = blockingSession !== null;
  const validRange = !!startAt && !!endAt && endAt > startAt;
  const canSubmit = validRange && reason.trim().length > 0 && !isBlocked;

  /** Selecting an upcoming session pre-fills the date/time fields from it — still just
   *  a convenience over the real source of truth (the fields), so the teacher can tweak
   *  either end afterward without the picker fighting their edit. */
  function quickFillFromSession(id: string) {
    setSessionId(id);
    const session = eligibleSessions.find((s) => s.id === id);
    if (!session) return;
    const start = sessionDateTime(session);
    const end = new Date(start.getTime() + session.duration * 60_000);
    const endLocal = utcIsoToLocalDateTime(end.toISOString());
    setStartDate(session.date);
    setStartTime(session.startTime);
    setEndDate(endLocal.date);
    setEndTime(endLocal.time);
    setEndTouched(true);
  }

  function resetForm() {
    setSessionId("");
    setStartDate("");
    setStartTime("09:00");
    setEndDate("");
    setEndTime("18:00");
    setEndTouched(false);
    setReason("");
  }

  function handleSubmit() {
    if (!startAt || !endAt || hoursBefore === null || !canSubmit) return;
    setSubmitError(null);

    // A quick-filled session keeps its own descriptive label; a manually-entered range
    // (no session tied to it) gets one built from whatever the teacher actually chose —
    // a single date+time span, or a day range for multi-day leave.
    const label = selectedSession
      ? `${selectedSession.title} · ${formatTimeLabel(selectedSession.startTime)}`
      : startDate === endDate
        ? `${formatDate(startDate, "short")}, ${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`
        : `${formatDate(startDate, "short")} – ${formatDate(endDate, "short")}`;

    if (apiEnabled()) {
      submitLeave({ startAtUtc: startAt.toISOString(), endAtUtc: endAt.toISOString(), reason: reason.trim() })
        .then((created) => {
          // The request already succeeded server-side by this point — nothing below should
          // be able to make it look like it didn't. Confirmation and reload both run
          // unconditionally; the optimistic prepend is a nice-to-have (skips waiting on
          // reloadLeaves's round trip) wrapped so a mapping surprise in toFrontendLeave can't
          // throw out of this .then and land in the .catch below, which used to skip
          // reloadLeaves() entirely and leave the list stuck on stale data until a manual
          // page reload — created but invisible.
          setConfirmation(`Leave request for "${label}" submitted — pending admin approval.`);
          setSubmitError(null);
          try {
            setLeaves((prev) => [toFrontendLeave(created), ...prev]);
          } catch {
            /* reloadLeaves() below still picks it up from the server's own response */
          }
          reloadLeaves();
          toast({ variant: "success", title: "Leave request submitted", description: "Pending admin approval." });
          // Only clear the form once the request has actually succeeded -- resetting it
          // unconditionally used to wipe out everything the teacher typed the instant they
          // clicked submit, so a failed request (still typed out below) left them with an
          // error banner and a blank form, forcing a full re-entry to retry.
          resetForm();
        })
        .catch((err: Error) => {
          // Deliberately not resetForm() here — a failed submission keeps the teacher's
          // dates/reason in place so they can fix whatever's wrong and retry without
          // retyping the whole request.
          setSubmitError(err.message);
          toast({ variant: "error", title: "Couldn't submit leave request", description: err.message });
        });
      return;
    }

    const newLeave: LeaveRequest = {
      id: `lv-${Date.now()}`,
      teacherId: TEACHER_ID,
      teacherName: TEACHER_NAME,
      sessionId: selectedSession?.id,
      date: startDate,
      session: label,
      reason: reason.trim(),
      hoursBeforeSession: Math.round(hoursBefore * 10) / 10,
      status: "pending",
    };
    setLeaves((prev) => [newLeave, ...prev]);
    setConfirmation(`Leave request for "${label}" submitted — pending admin approval.`);
    resetForm();
  }

  const columns: DataTableColumn<LeaveRequest>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        accessor: (row) => row.date,
        sortable: true,
        render: (row) => <span className="text-sm">{formatDate(row.date, "long")}</span>,
      },
      { key: "session", header: "Session", render: (row) => <span className="text-sm text-foreground">{row.session}</span> },
      { key: "reason", header: "Reason", render: (row) => <span className="text-sm text-muted-foreground">{row.reason}</span> },
      {
        key: "hours",
        header: "Notice Given",
        accessor: (row) => row.hoursBeforeSession,
        sortable: true,
        render: (row) => <span className="text-sm">{row.hoursBeforeSession}h before</span>,
      },
      {
        key: "status",
        header: "Status",
        accessor: (row) => row.status,
        sortable: true,
        render: (row) => <LeaveStatusBadge status={row.status} />,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description="Apply for leave over any date and time — optionally pre-filled from an upcoming class. Requests must be submitted at least 6 hours in advance."
        eyebrow="My Account"
      />

      {confirmation && (
        <InlineAlert variant="success" bordered className="mb-5">
          {confirmation}
        </InlineAlert>
      )}

      {/* Kept separate from the success banner above — a rejected submitLeave() used to
          write its error text into the same state, which rendered inside the green
          checkmark banner and looked like the request had gone through. */}
      {submitError && (
        <InlineAlert variant="error" bordered className="mb-5">
          {submitError}
        </InlineAlert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
          <CardDescription>
            {apiEnabled()
              ? "Notice is calculated against the current time."
              : `Reference time for this demo: ${formatDate(NOW, "long")}, ${formatTimeLabel("12:00")}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4">
            {eligibleSessions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upcomingSession">Quick-fill from an upcoming session (optional)</Label>
                <Select value={sessionId} onValueChange={quickFillFromSession}>
                  <SelectTrigger id="upcomingSession">
                    <SelectValue placeholder="Or just set the dates below directly" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {formatDate(s.date, "short")}, {formatTimeLabel(s.startTime)} — {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <InlineAlert variant="info" className="text-sm">
                You have no upcoming scheduled classes right now — that's fine, set the dates below directly.
              </InlineAlert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leaveStartDate">
                  Start <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="leaveStartDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setSessionId("");
                    }}
                  />
                  <Input
                    aria-label="Start time"
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setSessionId("");
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leaveEndDate">
                  End <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="leaveEndDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setEndTouched(true);
                      setSessionId("");
                    }}
                  />
                  <Input
                    aria-label="End time"
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setEndTouched(true);
                      setSessionId("");
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Briefly describe your reason for leave"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {startAt && endAt && endAt <= startAt && (
              <InlineAlert variant="error" className="text-sm">
                End must be after the start of your leave.
              </InlineAlert>
            )}

            {startAt && hoursBefore !== null && (
              <InlineAlert variant={isBlocked ? "error" : "success"} className="text-sm">
                {isBlocked && blockingSession ? (
                  <span>
                    This covers your <strong>{blockingSession.title}</strong> class at{" "}
                    <strong>
                      {formatDate(blockingSession.date, "short")}, {formatTimeLabel(blockingSession.startTime)}
                    </strong>
                    , which starts less than {MIN_HOURS_NOTICE} hours from now — leave affecting a class must be requested at least{" "}
                    {MIN_HOURS_NOTICE} hours before it starts, so this request cannot be submitted.
                  </span>
                ) : (
                  <span>
                    {eligibleSessions.length > 0
                      ? "No upcoming class of yours falls inside this leave window within the notice period — this request can be submitted."
                      : `You're submitting ${hoursBefore.toFixed(1)} hours in advance.`}
                  </span>
                )}
              </InlineAlert>
            )}

            <div>
              <Button disabled={!canSubmit} onClick={handleSubmit}>
                Apply for Leave
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-foreground">Leave History</h2>
        {leaves.length === 0 && !leavesError ? (
          <EmptyState icon={Clock} title="No leave requests yet" description="Your submitted leave requests will appear here." />
        ) : (
          <DataTable
            data={leaves}
            columns={columns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search leave history…"
            error={apiEnabled() ? leavesError : null}
            onRetry={reloadLeaves}
          />
        )}
      </div>
    </div>
  );
}
