import { useState } from "react";
import { Link } from "react-router-dom";
import { addDays, endOfWeek, isWithinInterval, parse, parseISO, startOfDay, startOfWeek } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  Check,
  CheckCircle2,
  Clock,
  Link2,
  PartyPopper,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PersonalMeetingButton } from "@/components/PersonalMeetingButton";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSessionsForTeacher } from "@/data/sessions";
import { getBatchById, BATCHES } from "@/data/batches";
import { getCourseById } from "@/data/courses";
import { CHILDREN } from "@/data/children";
import { getPayoutsForTeacher } from "@/data/payouts";
import { DEMO_FEEDBACKS } from "@/data/feedback";
import { useSession } from "@/state/session";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listMySessions, toFrontendSession } from "@/api/sessions";
import { listMyPayouts, toFrontendPayout } from "@/api/payouts";
import { listMyDemoBookings, toAwaitingFeedback } from "@/api/demoBookings";
import { getMyMeetingRoomShortLink } from "@/api/account";
import { listAttendance, type ApiSessionAttendance } from "@/api/academicOps";
import { CHART_PALETTE } from "@/lib/roles";
import { formatCurrency, formatDate, formatTimeLabel } from "@/lib/utils";
import { isJoinable, joinHint } from "@/features/parent/utils";
import type { ClassSession, DemoFeedback, SessionStatus, TeacherPayout } from "@/types";

const TEACHER_ID = "t-1";
const TEACHER_NAME = "Karan Mehta";
// Deterministic "now" for this mock universe — keeps the dashboard reproducible.
const NOW = new Date("2026-07-09T12:00:00");
const TODAY = "2026-07-09";


function sessionSubtitle(session: ClassSession) {
  if (session.batchId) return getBatchById(session.batchId)?.name ?? "General session";
  if (session.courseId) return getCourseById(session.courseId)?.name ?? "General session";
  if (session.type === "demo") return "Demo class";
  return "General session";
}

const STATUS_ICON: Partial<Record<SessionStatus, typeof PartyPopper>> = {
  holiday: PartyPopper,
  leave: CalendarOff,
  demo: Sparkles,
};

function parseMonth(month: string) {
  return parse(month, "MMMM yyyy", new Date());
}

export default function TeacherDashboard() {
  const { userName } = useSession();
  const firstName = userName.split(" ")[0] ?? userName;
  const usingApi = apiEnabled();

  // Copy state for a demo row's "Copy Link" -- every demo uses this teacher's own fixed
  // personal room, so the same short-link mint used by "My meeting link" works here too.
  const [copyLinkState, setCopyLinkState] = useState<{ sessionId: string; status: "copying" | "copied" | "failed" } | null>(null);
  function copyDemoLink(sessionId: string) {
    setCopyLinkState({ sessionId, status: "copying" });
    getMyMeetingRoomShortLink()
      .then(async ({ url }) => {
        if (!navigator.clipboard) {
          throw new Error("Clipboard API unavailable");
        }
        await navigator.clipboard.writeText(url);
        setCopyLinkState({ sessionId, status: "copied" });
      })
      .catch(() => setCopyLinkState({ sessionId, status: "failed" }))
      .finally(() => {
        setTimeout(() => setCopyLinkState((s) => (s?.sessionId === sessionId ? null : s)), 2500);
      });
  }

  // Sessions plus every completed one's real per-child attendance, fetched together (same
  // pattern as Attendance.tsx): there's no aggregate attendance endpoint, so the per-session
  // one is fetched once per completed session and aggregated client-side here, bounded by
  // how many completed sessions this teacher actually has.
  const { data: apiSessionData, loading: sessionsLoading, error: sessionsError } = useApiData<{
    sessions: ClassSession[];
    attendanceBySession: Record<string, ApiSessionAttendance[]>;
  }>(
    async () => {
      const sessions = await listMySessions().then((s) => s.map(toFrontendSession));
      const completed = sessions.filter((s) => s.status === "completed");
      const entries = await Promise.all(
        completed.map((s) =>
          listAttendance(s.id)
            .then((records) => [s.id, records] as const)
            .catch(() => [s.id, [] as ApiSessionAttendance[]] as const)
        )
      );
      return { sessions, attendanceBySession: Object.fromEntries(entries) };
    },
    { sessions: [], attendanceBySession: {} },
    { sessions: [], attendanceBySession: {} }
  );
  const apiSessions = apiSessionData.sessions;
  const { data: apiPayouts, loading: payoutsLoading, error: payoutsError } = useApiData<TeacherPayout[]>(
    () => listMyPayouts().then((p) => p.map(toFrontendPayout)),
    []
  );
  const { data: apiPending } = useApiData<DemoFeedback[]>(
    () => listMyDemoBookings().then((b) => b.filter((x) => x.conversionStatus === "DemoScheduled").map(toAwaitingFeedback)),
    []
  );

  // Real "now" in API mode; the mock universe is pinned to a fixed date.
  const now = usingApi ? new Date() : NOW;
  const today = usingApi ? now.toISOString().slice(0, 10) : TODAY;

  const teacherSessions = usingApi ? apiSessions : getSessionsForTeacher(TEACHER_ID);

  const todaysSessions = teacherSessions
    // "rescheduled" is the old record a reschedule moved off of — the backend keeps it
    // (still dated today) as a historical pointer and creates a new session for the new
    // time, so leaving it in here showed up as a second, dead "Join" entry alongside
    // the real one.
    .filter((s) => s.date === today && s.status !== "rescheduled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const thisWeekSessions = teacherSessions.filter(
    (s) =>
      isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd }) &&
      (s.status === "scheduled" || s.status === "completed" || s.status === "demo")
  );

  const teacherBatchIds = BATCHES.filter((b) => b.teacherId === TEACHER_ID).map((b) => b.id);
  const teacherChildren = CHILDREN.filter((c) => teacherBatchIds.includes(c.batchId));
  const apiStudentRecords = usingApi
    ? Object.values(apiSessionData.attendanceBySession)
        .flat()
        .filter((r) => r.participantType === "Student")
    : [];
  const avgAttendance = usingApi
    ? apiStudentRecords.length > 0
      ? Math.round((apiStudentRecords.filter((r) => r.status === "Present").length / apiStudentRecords.length) * 100)
      : 0
    : teacherChildren.length
      ? Math.round(teacherChildren.reduce((sum, c) => sum + c.attendancePercent, 0) / teacherChildren.length)
      : 0;

  const payouts = usingApi ? apiPayouts : getPayoutsForTeacher(TEACHER_ID);
  // The API returns payouts newest-first; the mock array happens to be oldest-first. Sort
  // explicitly by period rather than trusting either array's incoming order — same approach
  // as Payout.tsx's own "latest" derivation.
  const latestPayout = [...payouts].sort((a, b) => parseMonth(b.month).getTime() - parseMonth(a.month).getTime())[0];

  const pendingFeedback = usingApi ? apiPending : DEMO_FEEDBACKS.filter((f) => f.teacherName === TEACHER_NAME && !f.submitted);

  const windowStart = startOfDay(addDays(now, 1));
  const windowEnd = addDays(now, 7);
  const upcoming = teacherSessions
    .filter((s) => {
      const d = parseISO(s.date);
      return (
        isWithinInterval(d, { start: windowStart, end: windowEnd }) &&
        (s.status === "scheduled" || s.status === "demo" || s.status === "holiday" || s.status === "leave")
      );
    })
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));

  return (
    <div>
      <PageHeader
        eyebrow="Teacher Portal"
        title={`Welcome back, ${firstName}`}
        description="Here's what's on your plate today — classes, payout status and anything waiting on you."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PersonalMeetingButton />
            <Button asChild>
              <Link to="/teacher/classes">
                View all classes <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Today's Classes" value={String(todaysSessions.length)} icon={CalendarDays} tone="primary" loading={sessionsLoading} error={sessionsError} />
        <KpiCard label="This Week" value={String(thisWeekSessions.length)} icon={Clock} tone="primary" loading={sessionsLoading} error={sessionsError} />
        <KpiCard
          label="Student Attendance"
          value={avgAttendance ? `${avgAttendance}%` : "—"}
          detail={usingApi && !avgAttendance ? "No completed sessions yet" : undefined}
          icon={Users}
          tone="success"
          loading={usingApi ? sessionsLoading : undefined}
          trend={avgAttendance ? { value: avgAttendance - 90, label: "vs 90% target" } : undefined}
        />
        <KpiCard
          label="Payout This Month"
          value={latestPayout ? formatCurrency(latestPayout.finalAmount) : "—"}
          icon={Wallet}
          tone="neutral"
          loading={payoutsLoading}
          error={payoutsError}
        />
      </div>

      {pendingFeedback.length > 0 && (
        <Card className="mt-5 border-warning/40 bg-warning/10">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {pendingFeedback.length} demo feedback {pendingFeedback.length === 1 ? "form" : "forms"} pending
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {pendingFeedback
                    .map((f) => `${f.childName} (demo on ${formatDate(f.demoDate, "short")})`)
                    .join(", ")}{" "}
                  — feedback is mandatory after every demo class.
                </p>
              </div>
            </div>
            <Button asChild variant="default" className="shrink-0">
              <Link to="/teacher/demo-feedback">Complete feedback</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Classes</CardTitle>
            <CardDescription>{formatDate(today, "long")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {todaysSessions.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No classes today" description="Enjoy your day off — check back tomorrow for your next session." />
            ) : (
              <div className="flex flex-col gap-3">
                {todaysSessions.map((session, i) => {
                  const hex = CHART_PALETTE[i % CHART_PALETTE.length];
                  const joinable = isJoinable(session);
                  return (
                    <div
                      key={session.id}
                      className="flex flex-col gap-3 rounded-xl border border-border p-4 transition-shadow hover:shadow-soft sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-[11px] font-bold leading-tight"
                          style={{ backgroundColor: `${hex}1A`, color: hex }}
                        >
                          {session.type === "demo" ? <Sparkles className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {sessionSubtitle(session)} · {formatTimeLabel(session.startTime)} · {session.duration} min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <SessionStatusBadge status={session.status} />
                        {session.type === "demo" && usingApi && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={copyLinkState?.sessionId === session.id}
                            title="Copy this demo's join link to share manually"
                            onClick={() => copyDemoLink(session.id)}
                          >
                            {copyLinkState?.sessionId === session.id ? (
                              copyLinkState.status === "copying" ? (
                                "Copying…"
                              ) : copyLinkState.status === "copied" ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                              )
                            ) : (
                              <Link2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        {joinable ? (
                          <Button asChild size="sm">
                            <Link
                              to={`/teacher/live/${session.id}`}
                              state={session.meetingRoomId ? { room: session.meetingRoomId, title: session.title } : undefined}
                            >
                              {session.status === "demo" ? "Start Demo" : "Start Class"}
                            </Link>
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button size="sm" variant="outline" disabled>
                                  Not joinable
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{joinHint(session)}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout Snapshot</CardTitle>
            <CardDescription>{latestPayout ? latestPayout.month : "No payout yet"}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {latestPayout ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(latestPayout.finalAmount)}</p>
                    <p className="text-xs text-muted-foreground">Final amount</p>
                  </div>
                  <Badge variant={latestPayout.status === "paid" ? "success" : latestPayout.status === "finalized" ? "default" : "warning"}>
                    {latestPayout.status === "paid" ? "Paid" : latestPayout.status === "finalized" ? "Finalized" : "Pending"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Sessions</p>
                    <p className="font-semibold text-foreground">{latestPayout.sessionsCompleted}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Base Amount</p>
                    <p className="font-semibold text-foreground">{formatCurrency(latestPayout.baseAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Deductions</p>
                    <p className="font-semibold text-destructive">{formatCurrency(latestPayout.deductions)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Waiting Added</p>
                    <p className="font-semibold text-success">{formatCurrency(latestPayout.waitingAmountAdded)}</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/teacher/payout">
                    View full payout history <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState icon={Wallet} title="No payout records" description="Your payout history will appear here once processed." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Coming Up This Week</CardTitle>
          <CardDescription>Next 7 days — {formatDate(windowStart, "short")} to {formatDate(windowEnd, "short")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing else scheduled this week" description="Your calendar is clear for the next 7 days." />
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map((session, i) => {
                const hex = CHART_PALETTE[(i + 3) % CHART_PALETTE.length];
                const Icon = STATUS_ICON[session.status] ?? CalendarClock;
                return (
                  <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${hex}1A`, color: hex }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(session.date, "long")} · {formatTimeLabel(session.startTime)}
                        </p>
                      </div>
                    </div>
                    <SessionStatusBadge status={session.status} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
