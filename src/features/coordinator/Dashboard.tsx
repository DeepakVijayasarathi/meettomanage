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
import type { ClassSession, LeaveRequest, SessionStatus } from "@/types";

// Deterministic "today" for this mock universe — keeps the dashboard reproducible.
const TODAY = "2026-07-09";
const NOW = new Date("2026-07-09T12:00:00");

const PLACEHOLDER_STATUSES: SessionStatus[] = ["holiday", "leave"];

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

interface AttentionItem {
  id: string;
  tone: "destructive" | "warning";
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
}

export default function CoordinatorDashboard() {
  const { userName } = useSession();
  const firstName = userName.split(" ")[0] ?? userName;

  const todaySessions = useMemo(
    () =>
      SESSIONS.filter((s) => s.date === TODAY && !PLACEHOLDER_STATUSES.includes(s.status)).sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      ),
    []
  );

  const demosToday = useMemo(() => SESSIONS.filter((s) => s.date === TODAY && s.status === "demo"), []);

  const teachersOnLeaveToday = useMemo(() => {
    const ids = new Set<string>();
    LEAVE_REQUESTS.filter((l) => l.status === "approved" && l.date === TODAY).forEach((l) => ids.add(l.teacherId));
    SESSIONS.filter((s) => s.date === TODAY && s.status === "leave").forEach((s) => ids.add(s.teacherId));
    return ids.size;
  }, []);

  const weekStart = startOfWeek(NOW);
  const weekEnd = endOfWeek(NOW);
  const noShowsThisWeek = useMemo(
    () => SESSIONS.filter((s) => s.status === "noshow" && isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd })),
    [weekStart, weekEnd]
  );

  const leaveByStatus = useMemo(() => {
    const counts: Record<LeaveRequest["status"], number> = { pending: 0, approved: 0, rejected: 0, blocked: 0 };
    LEAVE_REQUESTS.forEach((l) => counts[l.status]++);
    return counts;
  }, []);

  // Cross-reference approved / pending leave against sessions still showing as "scheduled"
  // on the same date for the same teacher — the real reason this role exists.
  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    LEAVE_REQUESTS.filter((l) => l.status === "approved").forEach((l) => {
      const clash = SESSIONS.find((s) => s.teacherId === l.teacherId && s.date === l.date && s.status === "scheduled");
      if (clash) {
        items.push({
          id: `approved-${l.id}`,
          tone: "destructive",
          icon: AlertTriangle,
          title: `${l.teacherName} is on approved leave, but "${clash.title}" is still scheduled`,
          description: `${formatDate(l.date, "long")} · ${clash.startTime} — the calendar hasn't been updated to reflect the approved leave yet. Mark the session as leave or reassign a substitute.`,
          ctaLabel: "Resolve in Calendar",
          ctaTo: "/coordinator/calendar",
        });
      }
    });

    LEAVE_REQUESTS.filter((l) => l.status === "pending").forEach((l) => {
      const clash = SESSIONS.find((s) => s.teacherId === l.teacherId && s.date === l.date && s.status === "scheduled");
      if (clash) {
        items.push({
          id: `pending-${l.id}`,
          tone: "warning",
          icon: Clock,
          title: `${l.teacherName}'s leave request is pending approval`,
          description: `Requested for ${formatDate(l.date, "long")}, overlapping "${clash.title}" at ${clash.startTime} — decide before the session date to avoid a last-minute scramble.`,
          ctaLabel: "Review in Availability",
          ctaTo: "/coordinator/availability",
        });
      }
    });

    LEAVE_REQUESTS.filter((l) => l.status === "blocked").forEach((l) => {
      items.push({
        id: `blocked-${l.id}`,
        tone: "warning",
        icon: ShieldAlert,
        title: `${l.teacherName}'s late leave request was auto-blocked`,
        description: `Only ${l.hoursBeforeSession}h notice given for "${l.session}" on ${formatDate(l.date, "long")} — below the minimum notice window. Confirm the teacher is still covering the session.`,
        ctaLabel: "Check Coverage",
        ctaTo: "/coordinator/scheduling",
      });
    });

    noShowsThisWeek.forEach((s) => {
      items.push({
        id: `noshow-${s.id}`,
        tone: "destructive",
        icon: UserX,
        title: `"${s.title}" was marked No-Show`,
        description: `${formatDate(s.date, "long")} · ${s.startTime} with ${s.teacherName} — confirm whether it needs a reschedule or parent follow-up.`,
        ctaLabel: "Reschedule",
        ctaTo: "/coordinator/scheduling",
      });
    });

    return items;
  }, [noShowsThisWeek]);

  return (
    <div>
      <PageHeader
        eyebrow="Coordinator Portal"
        title={`Good day, ${firstName}`}
        description="Today's academic operations at a glance — sessions, teacher availability and anything that needs your attention."
        actions={
          <Button asChild>
            <Link to="/coordinator/calendar">
              Open Academic Calendar <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Conflicts &amp; Attention Needed</CardTitle>
          <CardDescription>Leave requests and no-shows that clash with the live calendar</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {attentionItems.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing needs attention"
              description="No leave conflicts or unresolved no-shows right now — the calendar is fully in sync."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {attentionItems.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.tone === "destructive"
                      ? "flex flex-col gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                      : "flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  }
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        item.tone === "destructive"
                          ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
                          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground"
                      }
                    >
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 self-start sm:self-center">
                    <Link to={item.ctaTo}>{item.ctaLabel}</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
