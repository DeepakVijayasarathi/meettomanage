import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format } from "date-fns";
import { CalendarOff, CheckCircle2, Clock, PartyPopper, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { InlineAlert } from "@/components/InlineAlert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TEACHERS } from "@/data/users";
import { SESSIONS } from "@/data/sessions";
import { LEAVE_REQUESTS } from "@/data/leaves";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listHolidays, listLeave, toFrontendLeave } from "@/api/academicOps";
import { listTeacherOptions } from "@/api/batches";
import { CHART_PALETTE } from "@/lib/roles";
import { cn, formatDate, formatDateRange, getInitials } from "@/lib/utils";
import type { LeaveRequest } from "@/types";

/** row.date is only ever the leave's *start* — this is the real span, when it's known. */
function leaveDateLabel(row: LeaveRequest): string {
  return row.startAtUtc && row.endAtUtc ? formatDateRange(row.startAtUtc, row.endAtUtc) : formatDate(row.date, "long");
}

/** Whether `dateKey` (a local "yyyy-MM-dd") falls anywhere within the leave's own span —
 *  inclusive of its last day. Exact equality against `date` (the start only) used to mark
 *  just the first day of a multi-day leave as covered, leaving the rest showing "Available". */
function leaveCoversDate(leave: LeaveRequest, dateKey: string): boolean {
  if (leave.startAtUtc && leave.endAtUtc) {
    return dateKey >= leave.startAtUtc.slice(0, 10) && dateKey <= leave.endAtUtc.slice(0, 10);
  }
  return leave.date === dateKey;
}

// Deterministic reference clock for the mock universe; API mode uses the real clock.
const NOW = new Date("2026-07-09T12:00:00");
const WEEK_LENGTH = 7;

type DayState = "available" | "leave" | "holiday";

const DAY_STATE_STYLE: Record<DayState, string> = {
  available: "bg-success/10 text-success",
  leave: "bg-status-leave/15 text-[#af1261]",
  holiday: "bg-status-holiday/20 text-foreground/70",
};

const DAY_STATE_LABEL: Record<DayState, string> = {
  available: "Available",
  leave: "On Leave",
  holiday: "Holiday",
};

/**
 * Admin's own view of the same weekly teacher availability Coordinator monitors —
 * Admin has always held SessionCalendarManagement view (AllModulesFull() in
 * DatabaseInitializer), but the only screen built for it lived under /coordinator,
 * which RequireAuth keeps Admin out of. Read-only here: the approve/reject decision
 * itself lives at Leave Management (/admin/leave) — this page shows who's around
 * and who's out, not another copy of that queue.
 */
export default function AdminAvailability() {
  const usingApi = apiEnabled();
  const [now] = useState(() => (usingApi ? new Date() : NOW));
  const today = format(now, "yyyy-MM-dd");

  const { data: apiLeaves, loading: leavesLoading, error: leavesError, reload } = useApiData<LeaveRequest[]>(
    () => listLeave().then((items) => items.map(toFrontendLeave)),
    LEAVE_REQUESTS
  );
  const { data: apiTeachers, loading: teachersLoading, error: teachersError } = useApiData(() => listTeacherOptions(), [], undefined, { cacheKey: "teacherOptions" });
  const { data: apiHolidays, loading: holidaysLoading, error: holidaysError } = useApiData(() => listHolidays(), []);
  const kpiLoading = leavesLoading || teachersLoading || holidaysLoading;
  const loadError = leavesError || teachersError || holidaysError;
  const leaves = usingApi ? apiLeaves : LEAVE_REQUESTS;

  const teacherRoster = useMemo(
    () =>
      usingApi
        ? apiTeachers.map((t, i) => ({
            id: t.teacherProfileId,
            name: t.fullName,
            department: t.departmentName ?? "—",
            status: "active" as const,
            avatarColor: CHART_PALETTE[i % CHART_PALETTE.length],
          }))
        : TEACHERS,
    [usingApi, apiTeachers]
  );
  const activeTeachers = useMemo(() => teacherRoster.filter((t) => t.status === "active"), [teacherRoster]);
  const holidayDates = useMemo(() => new Set(apiHolidays.map((h) => h.date.slice(0, 10))), [apiHolidays]);

  const pendingCount = leaves.filter((l) => l.status === "pending").length;
  const approvedUpcomingCount = leaves.filter(
    (l) => l.status === "approved" && (l.endAtUtc ? l.endAtUtc.slice(0, 10) : l.date) >= today
  ).length;
  const holidaysThisMonth = useMemo(
    () =>
      usingApi
        ? apiHolidays.filter((h) => h.date.slice(0, 7) === today.slice(0, 7)).length
        : SESSIONS.filter((s) => s.status === "holiday" && s.date.startsWith("2026-07")).length,
    [usingApi, apiHolidays, today]
  );
  const teachersOnLeaveToday = useMemo(() => {
    const ids = new Set<string>();
    leaves.filter((l) => l.status === "approved" && leaveCoversDate(l, today)).forEach((l) => ids.add(l.teacherId));
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
      leaves.some((l) => l.teacherId === teacherId && l.status === "approved" && leaveCoversDate(l, dateKey)) ||
      (!usingApi && SESSIONS.some((s) => s.teacherId === teacherId && s.date === dateKey && s.status === "leave"));
    if (isOnLeave) return "leave";
    return "available";
  }

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Teacher Availability"
        description="Weekly availability at a glance across the academy — who's teaching, who's on leave, and upcoming holidays."
        actions={
          pendingCount > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/leave">
                <Clock className="h-3.5 w-3.5" /> {pendingCount} pending leave request{pendingCount === 1 ? "" : "s"}
              </Link>
            </Button>
          ) : undefined
        }
      />

      {usingApi && loadError && (
        <InlineAlert variant="warning" className="mb-4 mt-4">
          Could not load availability data ({loadError}) — the roster and leave data below may be incomplete.{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </InlineAlert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Teachers Today" value={String(activeTeachersToday)} icon={UserCheck} tone="primary" loading={kpiLoading} />
        <KpiCard label="Pending Leave Requests" value={String(pendingCount)} icon={Clock} tone="warning" loading={kpiLoading} />
        <KpiCard label="Approved Leave (Upcoming)" value={String(approvedUpcomingCount)} icon={CheckCircle2} tone="success" loading={kpiLoading} />
        <KpiCard label="Holidays This Month" value={String(holidaysThisMonth)} icon={PartyPopper} tone="neutral" loading={kpiLoading} />
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

          {/* Desktop: the full week-by-teacher grid. A 7-day-wide table has no honest
              mobile/tablet form, so narrower viewports get a genuinely different layout
              below rather than the same table squeezed into a horizontal-scroll strip.
              Needs lg: (1024px) — at tablet width (~820px) the sticky name column plus
              7 day columns don't fit and the table clips instead of just scrolling. */}
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
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
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: teacher.avatarColor }}
                        >
                          {getInitials(teacher.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{teacher.name}</p>
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

          {/* Mobile/tablet: one card per teacher, day tiles wrap instead of scrolling sideways. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {activeTeachers.map((teacher) => (
              <div key={teacher.id} className="rounded-xl border border-border p-3">
                <div className="mb-2.5 flex min-w-0 items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: teacher.avatarColor }}
                  >
                    {getInitials(teacher.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{teacher.name}</p>
                    <p className="text-xs text-muted-foreground">{teacher.department}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                  {weekDays.map((d) => {
                    const dateKey = format(d, "yyyy-MM-dd");
                    const state = getDayState(teacher.id, dateKey);
                    return (
                      <div key={dateKey} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-medium text-muted-foreground">{format(d, "EEE d")}</span>
                        <span
                          className={cn(
                            "flex w-full items-center justify-center rounded-md px-1 py-1 text-center text-[10px] font-semibold leading-tight",
                            DAY_STATE_STYLE[state]
                          )}
                        >
                          {DAY_STATE_LABEL[state]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-foreground">Teacher Leave Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teacherRoster.map((teacher) => {
            const upcomingApproved = leaves
              .filter(
                (l) =>
                  l.teacherId === teacher.id &&
                  l.status === "approved" &&
                  (l.endAtUtc ? l.endAtUtc.slice(0, 10) : l.date) >= today
              )
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
                          <span className="font-medium text-foreground">{leaveDateLabel(l)}</span>
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
    </div>
  );
}
