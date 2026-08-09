import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLeavesForTeacher } from "@/data/leaves";
import { getSessionsForTeacher } from "@/data/sessions";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listMySessions, toFrontendSession } from "@/api/sessions";
import { listMyLeave, submitLeave, type ApiLeaveRequest } from "@/api/academicOps";
import { cn, formatDate } from "@/lib/utils";
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

function sessionDateTime(session: ClassSession) {
  return new Date(`${session.date}T${session.startTime}:00`);
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
  const now = apiEnabled() ? new Date() : NOW;
  const { data: fetchedSessions } = useApiData(
    () => listMySessions().then((sessions) => sessions.map(toFrontendSession)),
    getSessionsForTeacher(TEACHER_ID)
  );
  const eligibleSessions = fetchedSessions
    .filter((s) => s.status === "scheduled" || s.status === "demo")
    .filter((s) => sessionDateTime(s) > now)
    .sort((a, b) => sessionDateTime(a).getTime() - sessionDateTime(b).getTime());

  const { data: fetchedLeaves, reload: reloadLeaves } = useApiData(
    () => listMyLeave().then((items) => items.map(toFrontendLeave)),
    getLeavesForTeacher(TEACHER_ID)
  );
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => (apiEnabled() ? [] : getLeavesForTeacher(TEACHER_ID)));
  useEffect(() => setLeaves(fetchedLeaves), [fetchedLeaves]);
  const [sessionId, setSessionId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  const selectedSession = eligibleSessions.find((s) => s.id === sessionId) ?? null;
  const hoursBefore = selectedSession ? hoursBetween(sessionDateTime(selectedSession), now) : null;
  const isBlocked = hoursBefore !== null && hoursBefore < MIN_HOURS_NOTICE;
  const canSubmit = !!selectedSession && reason.trim().length > 0 && !isBlocked;

  function handleSubmit() {
    if (!selectedSession || hoursBefore === null || !canSubmit) return;

    if (apiEnabled()) {
      const start = sessionDateTime(selectedSession);
      const end = new Date(start.getTime() + selectedSession.duration * 60_000);
      submitLeave({ startAtUtc: start.toISOString(), endAtUtc: end.toISOString(), reason: reason.trim() })
        .then(() => {
          reloadLeaves();
          setConfirmation(`Leave request for "${selectedSession.title}" submitted — pending admin approval.`);
        })
        .catch((err: Error) => setConfirmation(err.message));
      setSessionId("");
      setReason("");
      return;
    }

    const newLeave: LeaveRequest = {
      id: `lv-${Date.now()}`,
      teacherId: TEACHER_ID,
      teacherName: TEACHER_NAME,
      sessionId: selectedSession.id,
      date: selectedSession.date,
      session: `${selectedSession.title} · ${formatTimeLabel(selectedSession.startTime)}`,
      reason: reason.trim(),
      hoursBeforeSession: Math.round(hoursBefore * 10) / 10,
      status: "pending",
    };
    setLeaves((prev) => [newLeave, ...prev]);
    setConfirmation(`Leave request for "${selectedSession.title}" submitted — pending admin approval.`);
    setSessionId("");
    setReason("");
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
        description="Apply for leave from an upcoming class. Requests must be submitted at least 6 hours before the scheduled session."
        eyebrow="My Account"
      />

      {confirmation && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          {confirmation}
        </div>
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
          {eligibleSessions.length === 0 ? (
            <EmptyState icon={Clock} title="No upcoming classes" description="You have no upcoming scheduled classes to apply leave for." />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Upcoming Session</Label>
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a session" />
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Briefly describe your reason for leave"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {selectedSession && hoursBefore !== null && (
                <div
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
                    isBlocked ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"
                  )}
                >
                  {isBlocked ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                  {isBlocked ? (
                    <span>
                      This session starts in <strong>{hoursBefore.toFixed(1)} hours</strong>. Leave requests must be submitted at least{" "}
                      {MIN_HOURS_NOTICE} hours before the scheduled session — this request cannot be submitted.
                    </span>
                  ) : (
                    <span>
                      You're submitting <strong>{hoursBefore.toFixed(1)} hours</strong> in advance — this meets the {MIN_HOURS_NOTICE}-hour notice
                      requirement.
                    </span>
                  )}
                </div>
              )}

              <div>
                <Button disabled={!canSubmit} onClick={handleSubmit}>
                  Submit Leave Request
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-foreground">Leave History</h2>
        {leaves.length === 0 ? (
          <EmptyState icon={Clock} title="No leave requests yet" description="Your submitted leave requests will appear here." />
        ) : (
          <DataTable data={leaves} columns={columns} rowKey={(row) => row.id} searchPlaceholder="Search leave history…" />
        )}
      </div>
    </div>
  );
}
