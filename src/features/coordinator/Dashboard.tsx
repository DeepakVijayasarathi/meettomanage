import { useMemo } from "react";
import { Link } from "react-router-dom";
import { endOfWeek, isWithinInterval, parseISO, startOfWeek } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarOff,
  CircleSlash,
  Clock,
  ShieldAlert,
  Sparkles,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PersonalMeetingButton } from "@/components/PersonalMeetingButton";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SESSIONS } from "@/data/sessions";
import { LEAVE_REQUESTS } from "@/data/leaves";
import { useSession } from "@/state/session";
import { CHART_PALETTE } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listSessions, toFrontendSession } from "@/api/sessions";
import { listLeave, toFrontendLeave } from "@/api/academicOps";
import type { ClassSession, LeaveRequest, SessionStatus } from "@/types";

// Deterministic "today" for the mock universe; API mode uses the real clock.
const MOCK_TODAY = "2026-07-09";
const MOCK_NOW = new Date("2026-07-09T12:00:00");

const PLACEHOLDER_STATUSES: SessionStatus[] = ["holiday", "leave"];

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function CoordinatorDashboard() {
  const { userName } = useSession();
  const firstName = userName.split(" ")[0] ?? userName;

  const usingApi = apiEnabled();
  const { data: apiSessions } = useApiData<ClassSession[]>(() => listSessions().then((s) => s.map(toFrontendSession)), SESSIONS);
  const { data: apiLeaves } = useApiData<LeaveRequest[]>(() => listLeave().then((l) => l.map(toFrontendLeave)), LEAVE_REQUESTS);

  const sessions = usingApi ? apiSessions : SESSIONS;
  const leaves = usingApi ? apiLeaves : LEAVE_REQUESTS;
  const TODAY = usingApi ? new Date().toISOString().slice(0, 10) : MOCK_TODAY;
  const NOW = usingApi ? new Date() : MOCK_NOW;

  const todaySessions = useMemo(
    () =>
      sessions.filter((s) => s.date === TODAY && !PLACEHOLDER_STATUSES.includes(s.status)).sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      ),
    [sessions, TODAY]
  );

  const demosToday = useMemo(() => sessions.filter((s) => s.date === TODAY && s.status === "demo"), [sessions, TODAY]);

  const teachersOnLeaveToday = useMemo(() => {
    const ids = new Set<string>();
    leaves.filter((l) => l.status === "approved" && l.date === TODAY).forEach((l) => ids.add(l.teacherId));
    sessions.filter((s) => s.date === TODAY && s.status === "leave").forEach((s) => ids.add(s.teacherId));
    return ids.size;
  }, [leaves, sessions, TODAY]);

  const weekStart = startOfWeek(NOW);
  const weekEnd = endOfWeek(NOW);
  const noShowsThisWeek = useMemo(
    () => sessions.filter((s) => s.status === "noshow" && isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd })),
    [sessions, weekStart, weekEnd]
  );

  const leaveByStatus = useMemo(() => {
    const counts: Record<LeaveRequest["status"], number> = { pending: 0, approved: 0, rejected: 0, blocked: 0 };
    leaves.forEach((l) => counts[l.status]++);
    return counts;
  }, [leaves]);


  return (
    <div>
      <PageHeader
        eyebrow="Coordinator Portal"
        title={`Good day, ${firstName}`}
        description="Today's academic operations at a glance — sessions, teacher availability and anything that needs your attention."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PersonalMeetingButton />
            <Button asChild>
              <Link to="/coordinator/calendar">
                Open Academic Calendar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Sessions Today" value={String(todaySessions.length)} icon={CalendarClock} tone="primary" />
        <KpiCard label="Demos Today" value={String(demosToday.length)} icon={Sparkles} tone="success" />
        <KpiCard label="Teachers on Leave Today" value={String(teachersOnLeaveToday)} icon={CalendarOff} tone="neutral" />
        <KpiCard label="No-Shows This Week" value={String(noShowsThisWeek.length)} icon={CircleSlash} tone="destructive" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Sessions</CardTitle>
            <CardDescription>{formatDate(TODAY, "long")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {todaySessions.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No sessions today" description="There are no classes scheduled for today." />
            ) : (
              <div className="flex flex-col gap-3">
                {todaySessions.map((session, i) => (
                  <TimelineRow key={session.id} session={session} colorIndex={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Requests Snapshot</CardTitle>
            <CardDescription>Across all teachers, current queue</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <LeaveStatRow label="Pending" value={leaveByStatus.pending} tone="warning" />
            <LeaveStatRow label="Approved" value={leaveByStatus.approved} tone="success" />
            <LeaveStatRow label="Rejected" value={leaveByStatus.rejected} tone="neutral" />
            <LeaveStatRow label="Blocked (late notice)" value={leaveByStatus.blocked} tone="destructive" />
            <Button asChild variant="outline" className="mt-1 w-full">
              <Link to="/coordinator/availability">
                Review leave queue <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TimelineRow({ session, colorIndex }: { session: ClassSession; colorIndex: number }) {
  const hex = CHART_PALETTE[colorIndex % CHART_PALETTE.length];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4 transition-shadow hover:shadow-soft sm:flex-row sm:items-center sm:justify-between">
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
            {session.teacherName} · {formatTimeLabel(session.startTime)} · {session.duration} min · {session.childIds.length} student
            {session.childIds.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <SessionStatusBadge status={session.status} />
    </div>
  );
}

function LeaveStatRow({ label, value, tone }: { label: string; value: number; tone: "warning" | "success" | "neutral" | "destructive" }) {
  const toneClass = {
    warning: "bg-warning/20 text-warning-foreground",
    success: "bg-success/15 text-success",
    neutral: "bg-muted text-muted-foreground",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClass}`}>{value}</span>
    </div>
  );
}
