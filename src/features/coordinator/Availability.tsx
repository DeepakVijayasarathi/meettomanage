import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarOff, CheckCircle2, Clock, PartyPopper, UserCheck, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TEACHERS } from "@/data/users";
import { SESSIONS } from "@/data/sessions";
import { LEAVE_REQUESTS } from "@/data/leaves";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listHolidays, listLeave, reviewLeave, type ApiLeaveRequest } from "@/api/academicOps";
import { listTeacherOptions } from "@/api/batches";
import { CHART_PALETTE } from "@/lib/roles";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { LeaveRequest } from "@/types";

function toFrontendLeave(leave: ApiLeaveRequest): LeaveRequest {
  const hoursBefore = Math.max(
    0,
    Math.round((new Date(leave.startAtUtc).getTime() - new Date(leave.createdAtUtc).getTime()) / 3_600_000)
  );
  return {
    id: leave.id,
    teacherId: leave.teacherProfileId,
    teacherName: leave.teacherName,
    date: leave.startAtUtc.slice(0, 10),
    session: `${leave.affectedSessionCount} scheduled session(s) affected`,
    reason: leave.reason,
    hoursBeforeSession: hoursBefore,
    status: leave.status.toLowerCase() as LeaveRequest["status"],
  };
}

// Deterministic reference clock for the mock universe; API mode uses the real clock.
const NOW = new Date("2026-07-09T12:00:00");
const WEEK_LENGTH = 7;

const LEAVE_STATUS_STYLE: Record<LeaveRequest["status"], string> = {
  pending: "bg-warning/20 text-warning-foreground",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  blocked: "bg-destructive/15 text-destructive",
};

const LEAVE_STATUS_LABEL: Record<LeaveRequest["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  blocked: "Blocked (Late Request)",
};

function LeaveStatusPill({ status }: { status: LeaveRequest["status"] }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", LEAVE_STATUS_STYLE[status])}>{LEAVE_STATUS_LABEL[status]}</span>;
}

type DayState = "available" | "leave" | "holiday";

const DAY_STATE_STYLE: Record<DayState, string> = {
  available: "bg-success/10 text-success",
  leave: "bg-status-leave/15 text-status-leave",
  holiday: "bg-status-holiday/20 text-foreground/70",
};

const DAY_STATE_LABEL: Record<DayState, string> = {
  available: "Available",
  leave: "On Leave",
  holiday: "Holiday",
};

export default function CoordinatorAvailability() {
  const usingApi = apiEnabled();
  // Real clock in API mode; the mock universe stays pinned for reproducible demos.
  const [now] = useState(() => (usingApi ? new Date() : NOW));
  const today = format(now, "yyyy-MM-dd");
  const { data: apiLeaves, reload } = useApiData<LeaveRequest[]>(
    () => listLeave().then((items) => items.map(toFrontendLeave)),
    LEAVE_REQUESTS
  );
  const { data: apiTeachers } = useApiData(() => listTeacherOptions(), []);
  const { data: apiHolidays } = useApiData(() => listHolidays(), []);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(usingApi ? [] : LEAVE_REQUESTS);
  useEffect(() => setLeaves(apiLeaves), [apiLeaves]);
  const [approveTarget, setApproveTarget] = useState<LeaveRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);

  function decide(target: LeaveRequest, approve: boolean) {
    if (apiEnabled()) {
      reviewLeave(target.id, approve).then(reload);
      return;
    }
    setLeaves((prev) => prev.map((l) => (l.id === target.id ? { ...l, status: approve ? "approved" : "rejected" } : l)));
  }

  // Live roster from the API; the mock TEACHERS list never renders in API mode.
  const teacherRoster = useMemo(
    () =>
      usingApi
        ? apiTeachers.map((t, i) => ({
            id: t.teacherProfileId,
            name: t.fullName,
            department: t.department ?? "—",
            status: "active" as const,
            avatarColor: CHART_PALETTE[i % CHART_PALETTE.length],
          }))
        : TEACHERS,
    [usingApi, apiTeachers]
  );
  const activeTeachers = useMemo(() => teacherRoster.filter((t) => t.status === "active"), [teacherRoster]);
  const holidayDates = useMemo(() => new Set(apiHolidays.map((h) => h.date.slice(0, 10))), [apiHolidays]);

  const pendingCount = leaves.filter((l) => l.status === "pending").length;
  const approvedUpcomingCount = leaves.filter((l) => l.status === "approved" && l.date >= today).length;
  const holidaysThisMonth = useMemo(
    () =>
      usingApi
        ? apiHolidays.filter((h) => h.date.slice(0, 7) === today.slice(0, 7)).length
        : SESSIONS.filter((s) => s.status === "holiday" && s.date.startsWith("2026-07")).length,
    [usingApi, apiHolidays, today]
  );
  const teachersOnLeaveToday = useMemo(() => {
    const ids = new Set<string>();
    leaves.filter((l) => l.status === "approved" && l.date === today).forEach((l) => ids.add(l.teacherId));
    if (!usingApi) SESSIONS.filter((s) => s.date === today && s.status === "leave").forEach((s) => ids.add(s.teacherId));
    return ids.size;
  }, [leaves, usingApi, today]);
  const activeTeachersToday = activeTeachers.length - teachersOnLeaveToday;

  const weekDays = useMemo(() => Array.from({ length: WEEK_LENGTH }, (_, i) => addDays(now, i)), [now]);

  function getDayState(teacherId: string, dateKey: string): DayState {
    const isHoliday = usingApi
      ? holidayDates.has(dateKey)
      : SESSIONS.some((s) => s.date === dateKey && s.status === "holiday");
    if (isHoliday) return "holiday";
    const isOnLeave =
      leaves.some((l) => l.teacherId === teacherId && l.date === dateKey && l.status === "approved") ||
      (!usingApi && SESSIONS.some((s) => s.teacherId === teacherId && s.date === dateKey && s.status === "leave"));
    if (isOnLeave) return "leave";
    return "available";
  }

  const pendingLeaves = leaves.filter((l) => l.status === "pending");

  return (
    <div>
      <PageHeader
        eyebrow="Coordination"
        title="Teacher Availability &amp; Leave"
        description="Weekly availability at a glance, plus the leave approval queue that keeps the academic calendar accurate."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Teachers Today" value={String(activeTeachersToday)} icon={UserCheck} tone="primary" />
        <KpiCard label="Pending Leave Requests" value={String(pendingCount)} icon={Clock} tone="warning" />
        <KpiCard label="Approved Leave (Upcoming)" value={String(approvedUpcomingCount)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Holidays This Month" value={String(holidaysThisMonth)} icon={PartyPopper} tone="neutral" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>This Week at a Glance</CardTitle>
          <CardDescription>
            {formatDate(weekDays[0], "long")} – {formatDate(weekDays[weekDays.length - 1], "long")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-muted/40 px-3 py-2.5">
            {(["available", "leave", "holiday"] as DayState[]).map((state) => (
              <div key={state} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-full", state === "available" ? "bg-success" : state === "leave" ? "bg-status-leave" : "bg-status-holiday")} />
                {DAY_STATE_LABEL[state]}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 bg-muted/50">Teacher</TableHead>
                  {weekDays.map((d) => (
                    <TableHead key={d.toISOString()} className="text-center">
                      {format(d, "EEE d MMM")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTeachers.map((teacher) => (
                  <TableRow key={teacher.id} className="hover:bg-muted/20">
                    <TableCell className="sticky left-0 bg-card font-medium">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: teacher.avatarColor }}
                        >
                          {getInitials(teacher.name)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{teacher.name}</p>
                          <p className="text-xs text-muted-foreground">{teacher.department}</p>
                        </div>
                      </div>
                    </TableCell>
                    {weekDays.map((d) => {
                      const dateKey = format(d, "yyyy-MM-dd");
                      const state = getDayState(teacher.id, dateKey);
                      return (
                        <TableCell key={dateKey} className="text-center">
                          <span className={cn("inline-flex w-full items-center justify-center rounded-md px-2 py-1.5 text-xs font-semibold", DAY_STATE_STYLE[state])}>
                            {DAY_STATE_LABEL[state]}
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Leave Approval Queue</CardTitle>
          <CardDescription>Requests awaiting your decision</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {pendingLeaves.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Queue is clear" description="There are no pending leave requests right now." />
          ) : (
            <div className="flex flex-col gap-3">
              {pendingLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: teacherRoster.find((t) => t.id === leave.teacherId)?.avatarColor ?? "hsl(var(--muted-foreground))" }}
                    >
                      {getInitials(leave.teacherName)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{leave.teacherName}</p>
                      <p className="text-xs text-muted-foreground">
                        {leave.session} · {formatDate(leave.date, "long")} · {leave.reason}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Requested {leave.hoursBeforeSession}h before the session</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <LeaveStatusPill status={leave.status} />
                    <Button variant="outline" size="sm" onClick={() => setApproveTarget(leave)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRejectTarget(leave)}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-foreground">Teacher Leave Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teacherRoster.map((teacher) => {
            const upcomingApproved = leaves
              .filter((l) => l.teacherId === teacher.id && l.status === "approved" && l.date >= today)
              .sort((a, b) => a.date.localeCompare(b.date));
            return (
              <Card key={teacher.id}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: teacher.avatarColor }}
                    >
                      {getInitials(teacher.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {teacher.department} · {teacher.status === "active" ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>

                  {upcomingApproved.length === 0 ? (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      <CalendarOff className="h-3.5 w-3.5" /> No upcoming leave
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {upcomingApproved.map((l) => (
                        <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-status-leave/10 px-3 py-2 text-xs">
                          <span className="font-medium text-foreground">{formatDate(l.date, "long")}</span>
                          <span className="text-muted-foreground">{l.session}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve this leave request?"
        description={approveTarget ? `${approveTarget.teacherName}'s leave for "${approveTarget.session}" on ${formatDate(approveTarget.date, "long")} will be approved. Remember to update the calendar for that slot.` : undefined}
        confirmLabel="Approve"
        onConfirm={() => {
          if (!approveTarget) return;
          decide(approveTarget, true);
        }}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject this leave request?"
        description={rejectTarget ? `${rejectTarget.teacherName}'s leave request for "${rejectTarget.session}" on ${formatDate(rejectTarget.date, "long")} will be rejected. The session remains scheduled as-is.` : undefined}
        confirmLabel="Reject"
        destructive
        onConfirm={() => {
          if (!rejectTarget) return;
          decide(rejectTarget, false);
        }}
      />
    </div>
  );
}
