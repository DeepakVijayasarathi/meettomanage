import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  PlayCircle,
  Sparkles,
  TrendingUp,
  Video,
  Wallet,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { MultiChildSwitcher } from "@/components/MultiChildSwitcher";
import { FeeStatusBadge, SessionStatusBadge } from "@/components/StatusBadge";
import { PayNowModal } from "@/components/PayNowModal";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/state/session";
import { getChildById } from "@/data/children";
import { getSessionsForChild } from "@/data/sessions";
import { getInvoicesForParent } from "@/data/invoices";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { toFrontendSession } from "@/api/sessions";
import { getParentDashboard, getParentInvoices, getParentSchedule, type ApiParentChildSummary, type ApiParentDashboard } from "@/api/parentPortal";
import { toFrontendInvoice } from "@/api/billing";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import type { Child, ClassSession, Invoice } from "@/types";
import { compareSessionAsc, compareSessionDesc, isJoinable, joinHint, minutesUntilStart } from "./utils";

const PARENT_ID = "p-1";

/** Maps a live API child summary onto the Child shape the dashboard renders. */
function apiChildToChild(summary: ApiParentChildSummary, enrolled: boolean, index: number): Child {
  return {
    id: summary.childId,
    parentId: "",
    name: summary.name,
    age: 0,
    grade: summary.academicLevel ?? "—",
    avatarColor: CHART_PALETTE[index % CHART_PALETTE.length],
    courseId: "",
    batchId: "",
    classesCompleted: summary.classesCompleted,
    classesRemaining: summary.classesRemaining,
    attendancePercent: summary.attendancePercent,
    feeStatus: summary.feeStatus,
    enrollmentComplete: enrolled,
  };
}

export default function ParentDashboard() {
  const { activeChildId, enrolledChildIds, userName } = useSession();
  const mockChild = getChildById(activeChildId);
  const [payOpen, setPayOpen] = useState(false);

  // Live overlay: the API's per-child summary and real schedule replace the mock numbers
  const { data: apiDash } = useApiData<ApiParentDashboard | null>(() => getParentDashboard(), null);
  const { data: apiSessions } = useApiData<ClassSession[]>(
    () => {
      const from = new Date(Date.now() - 60 * 86400_000).toISOString();
      const to = new Date(Date.now() + 60 * 86400_000).toISOString();
      return getParentSchedule(from, to).then((items) => items.map(toFrontendSession));
    },
    []
  );

  const usingApi = apiEnabled();
  const apiChildren = apiDash?.children ?? [];
  // The shared child switcher drives activeChildId; match the dashboard's child to it.
  const selectedApiChild = apiChildren.find((c) => c.childId === activeChildId) ?? apiChildren[0] ?? null;

  // In API mode the real children drive the dashboard; demo mode keeps the mock child.
  const child: Child | undefined = usingApi
    ? selectedApiChild
      ? apiChildToChild(selectedApiChild, apiDash?.enrollmentFormCompleted ?? false, apiChildren.indexOf(selectedApiChild))
      : undefined
    : mockChild;

  const sessions = useMemo(
    () => (apiEnabled() ? apiSessions : child ? getSessionsForChild(child.id) : []),
    [apiSessions, child]
  );

  const upcoming = useMemo(
    () =>
      sessions
        .filter((s) => ["scheduled", "demo", "rescheduled"].includes(s.status))
        .filter((s) => minutesUntilStart(s) > -s.duration)
        .sort(compareSessionAsc)
        .slice(0, 4),
    [sessions]
  );

  const recent = useMemo(
    () =>
      sessions
        .filter((s) => ["completed", "cancelled", "noshow"].includes(s.status))
        .sort(compareSessionDesc)
        .slice(0, 5),
    [sessions]
  );

  // Real unpaid invoice drives the fee card / Pay Now in API mode; demo keeps the mock lookup.
  const { data: apiInvoices, reload: reloadInvoices } = useApiData<Invoice[]>(
    () => getParentInvoices().then((items) => items.map(toFrontendInvoice)),
    []
  );
  const invoice = apiEnabled()
    ? apiInvoices.find((i) => i.status !== "paid")
    : child
      ? getInvoicesForParent(PARENT_ID).find((i) => i.childName === child.name && i.status !== "paid")
      : undefined;

  const firstName = userName !== "Guest" ? userName.split(" ")[0] : "there";

  if (!child) {
    return (
      <div>
        <PageHeader title="Parent Dashboard" description="Classes completed, attendance and fee status for your children." />
        <EmptyState
          icon={Sparkles}
          title="No child selected"
          description="Add a child to your account to get started."
          action={
            <Button asChild>
              <Link to="/parent/add-child">Add child</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // The mandatory first-login enrollment form gates the dashboard (API flag when live)
  const isEnrolled = apiEnabled() && apiDash ? apiDash.enrollmentFormCompleted : enrolledChildIds.includes(child.id);

  return (
    <div>
      <PageHeader
        eyebrow="Parent Dashboard"
        title={`Welcome back, ${firstName}`}
        description={`Here's how ${child.name.split(" ")[0]} is doing this week.`}
      />

      <MultiChildSwitcher />

      <div className="mt-6">
        {!isEnrolled ? (
          <EnrollmentGate child={child} />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Classes Completed" value={String(child.classesCompleted)} icon={CheckCircle2} tone="success" />
              <KpiCard label="Classes Remaining" value={String(child.classesRemaining)} icon={CalendarClock} tone="primary" />
              <AttendanceCard percent={child.attendancePercent} color={child.avatarColor} />
              <FeeCard child={child} invoice={invoice} onPay={() => setPayOpen(true)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Upcoming Classes</CardTitle>
                  <CardDescription>{child.name.split(" ")[0]}'s next sessions</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {upcoming.length === 0 ? (
                    <EmptyState icon={CalendarClock} title="No upcoming classes" description="New sessions will appear here once scheduled." />
                  ) : (
                    upcoming.map((s) => <UpcomingRow key={s.id} session={s} />)
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest completed sessions</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {recent.length === 0 ? (
                    <EmptyState icon={Clock3} title="No activity yet" description="Completed classes will show up here." />
                  ) : (
                    recent.map((s) => <RecentRow key={s.id} session={s} />)
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {invoice && (
        <PayNowModal
          open={payOpen}
          onOpenChange={setPayOpen}
          amount={invoice.amount}
          invoiceLabel={`${invoice.courseName} — ${child.name}`}
          invoiceId={invoice.apiId}
          onInitiated={reloadInvoices}
        />
      )}
    </div>
  );
}

function AttendanceCard({ percent, color }: { percent: number; color: string }) {
  const tone = percent >= 90 ? "success" : percent >= 75 ? "warning" : "destructive";
  const toneClass =
    tone === "success" ? "bg-success/15 text-success" : tone === "warning" ? "bg-warning/20 text-warning-foreground" : "bg-destructive/10 text-destructive";
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Attendance</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{percent}%</p>
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClass)}>
          <TrendingUp className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, percent)}%`, backgroundColor: color }}
        />
      </div>
    </Card>
  );
}

function FeeCard({ child, invoice, onPay }: { child: Child; invoice?: Invoice; onPay: () => void }) {
  const needsAction = child.feeStatus === "due" || child.feeStatus === "overdue" || child.feeStatus === "suspended";
  return (
    <Card className={cn("p-5", needsAction && "border-warning/40")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Fee Status</p>
          <div className="mt-2">
            <FeeStatusBadge status={child.feeStatus} />
          </div>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            needsAction ? "bg-warning/20 text-warning-foreground" : "bg-success/15 text-success"
          )}
        >
          <Wallet className="h-5 w-5" />
        </span>
      </div>
      {needsAction ? (
        <Button size="sm" className="mt-4 w-full" onClick={onPay}>
          Pay {invoice ? formatCurrency(invoice.amount) : "Now"}
        </Button>
      ) : (
        <p className="mt-4 text-xs font-medium text-success">All caught up — thank you!</p>
      )}
    </Card>
  );
}

function UpcomingRow({ session }: { session: ClassSession }) {
  const joinable = isJoinable(session);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{session.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(session.date, "long")} · {session.startTime} · {session.teacherName}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SessionStatusBadge status={session.status} />
        {joinable ? (
          <Button size="sm" asChild>
            <Link to={`/parent/live/${session.id}`}>
              <Video className="h-3.5 w-3.5" /> Join
            </Link>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button size="sm" variant="outline" disabled>
                  <Video className="h-3.5 w-3.5" /> Join
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{joinHint(session)}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function RecentRow({ session }: { session: ClassSession }) {
  const Icon = session.status === "completed" ? CheckCircle2 : session.status === "noshow" ? Clock3 : XCircle;
  const toneClass =
    session.status === "completed"
      ? "bg-success/15 text-success"
      : session.status === "noshow"
        ? "bg-warning/20 text-warning-foreground"
        : "bg-destructive/10 text-destructive";
  return (
    <div className="flex items-start gap-3">
      <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", toneClass)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(session.date, "long")} · {session.teacherName}
        </p>
        {session.recordingAvailable && (
          <Link to="/parent/resources" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <PlayCircle className="h-3 w-3" /> Recording available
          </Link>
        )}
      </div>
      <SessionStatusBadge status={session.status} />
    </div>
  );
}

function EnrollmentGate({ child }: { child: Child }) {
  return (
    <Card className="border-warning/40 bg-warning/5 p-8 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/20 text-warning-foreground">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-bold text-foreground">Finish {child.name.split(" ")[0]}'s enrollment to unlock the dashboard</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        We just need a few details — grade, contact info and course interest — before {child.name.split(" ")[0]}'s classes, attendance
        and resources can appear here.
      </p>
      <Button asChild className="mt-5">
        <Link to={`/parent/enrollment?childId=${child.id}`}>
          Complete Enrollment <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}
