import { Link } from "react-router-dom";
import {
  CalendarClock,
  ClipboardList,
  IndianRupee,
  PhoneCall,
  TrendingUp,
  ArrowRight,
  Users2,
} from "lucide-react";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { PersonalMeetingButton } from "@/components/PersonalMeetingButton";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_PALETTE } from "@/lib/roles";
import { formatCurrency, formatDate, formatNumber, formatPercent, formatTimeLabel } from "@/lib/utils";
import { utcIsoToLocalDateTime } from "@/lib/datetime";
import { SESSIONS } from "@/data/sessions";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listDemoBookings, toFrontendLead } from "@/api/demoBookings";
import { listSessions, sessionWindow, toFrontendSession } from "@/api/sessions";
import { getDashboardSummary } from "@/api/reports";
import { useSession } from "@/state/session";
import { usePortalBase } from "@/lib/portalBase";
import { LEADS, getConversionFunnel, getConversionRate, getRevenueThisMonth, type Lead, type ConversionStage } from "./data";
import type { ClassSession } from "@/types";

// Demo mode's mock sessions are pinned to a fixed July 2026 week (see src/data/sessions.ts) —
// comparing them against the real Date.now() (e.g. today) makes "Demos This Week" read as 0
// beside a visibly non-empty pipeline snapshot below, once the real calendar has moved past
// that week. Same fixed-"today" pattern as coordinator/Dashboard.tsx's MOCK_TODAY.
const MOCK_TODAY = "2026-07-09";
// demoSessions' own .date (from toFrontendSession) is already the account's local calendar
// date, not UTC -- comparing it against a UTC "today"/week-range mismatches for hours near
// local midnight. Same bug and fix as teacher/Dashboard.tsx's "today's classes" list.
const TODAY = apiEnabled() ? utcIsoToLocalDateTime(new Date().toISOString()).date : MOCK_TODAY;
const WEEK_START = apiEnabled()
  ? utcIsoToLocalDateTime(new Date(Date.now() - 3 * 86400_000).toISOString()).date
  : "2026-07-06";
const WEEK_END = apiEnabled()
  ? utcIsoToLocalDateTime(new Date(Date.now() + 4 * 86400_000).toISOString()).date
  : "2026-07-13";
const FUNNEL_STAGES: ConversionStage[] = ["Demo Scheduled", "Demo Completed", "Follow-up", "Enrolled", "Not Interested"];

const FUNNEL_COLORS: Record<string, string> = {
  "Demo Scheduled": CHART_PALETTE[4],
  "Demo Completed": CHART_PALETTE[2],
  "Follow-up": CHART_PALETTE[6],
  Enrolled: "hsl(var(--success))",
  "Not Interested": "hsl(var(--destructive))",
};

export default function AdmissionDashboard() {
  const usingApi = apiEnabled();
  const { userName } = useSession();
  const base = usePortalBase();
  const { data: leads, loading: leadsLoading, error: leadsError } = useApiData<Lead[]>(() => listDemoBookings().then((b) => b.map(toFrontendLead)), LEADS);
  const { data: apiSessions, loading: sessionsLoading, error: sessionsError } = useApiData<ClassSession[]>(
    () => listSessions(sessionWindow(35, 35)).then((s) => s.map(toFrontendSession)),
    SESSIONS
  );
  const { data: collectedRevenue, loading: revenueLoading, error: revenueError } = useApiData<number>(
    // This calendar month (the trend's last point) -- revenueCollected is all-time.
    () => getDashboardSummary().then((s) => s.revenueTrend.at(-1)?.revenue ?? 0),
    getRevenueThisMonth(),
    0
  );
  const kpiLoading = leadsLoading || sessionsLoading || revenueLoading;
  const kpiError = leadsError || sessionsError || revenueError;

  const demoSessions = apiSessions.filter((s) => s.type === "demo");
  const demosThisWeek = demoSessions.filter((s) => s.date >= WEEK_START && s.date <= WEEK_END).length;
  const enrolledCount = leads.filter((l) => l.conversionStage === "Enrolled").length;
  const conversionRate = usingApi
    ? leads.length > 0 ? Math.round((enrolledCount / leads.length) * 100) : 0
    : getConversionRate();
  const pendingFollowUps = leads.filter((l) => l.conversionStage === "Follow-up").length;
  const revenueThisMonth = collectedRevenue;
  const funnel = usingApi
    ? FUNNEL_STAGES.map((stage) => ({ stage, value: leads.filter((l) => l.conversionStage === stage).length }))
    : getConversionFunnel();

  const upcomingDemos = demoSessions
    .filter((s) => s.date >= TODAY)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        eyebrow="Admission Team"
        title={`Good to see you, ${userName.split(" ")[0]}`}
        description="Your demo-to-enrollment pipeline at a glance — scheduling, feedback, follow-ups and conversions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PersonalMeetingButton />
            <Button asChild>
              <Link to={`${base}/demo-scheduling`}>
                <CalendarClock className="h-4 w-4" />
                Schedule a demo
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Demos This Week"
          value={formatNumber(demosThisWeek)}
          icon={CalendarClock}
          tone="primary"
          trend={usingApi ? undefined : { value: 18, label: "vs last week" }}
          loading={kpiLoading}
          error={kpiError}
        />
        <KpiCard
          label="Demo → Enrollment Conversion"
          value={formatPercent(conversionRate)}
          icon={TrendingUp}
          tone="success"
          trend={usingApi ? undefined : { value: 4.5, label: "vs last month" }}
          loading={kpiLoading}
          error={kpiError}
        />
        <KpiCard
          label="Pending Follow-ups"
          value={formatNumber(pendingFollowUps)}
          icon={PhoneCall}
          tone="destructive"
          trend={usingApi ? undefined : { value: -12, label: "vs last week" }}
          loading={kpiLoading}
          error={kpiError}
        />
        <KpiCard
          // Asked live: "I collected 56,200 but it shows 48,400" / "I collected nothing yet it
          // shows an amount". This is the whole academy's payments recorded in the portal this
          // month (IST), not one counselor's own collection -- say so on the card.
          label="Academy Collections This Month"
          value={formatCurrency(revenueThisMonth)}
          detail={`All payments recorded in the portal by the whole team since 1 ${new Date().toLocaleString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}`}
          icon={IndianRupee}
          tone="warning"
          trend={usingApi ? undefined : { value: 9.2, label: "this month" }}
          loading={kpiLoading}
          error={kpiError}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard
          title="Conversion Funnel"
          description="Demo Scheduled → Completed → Follow-up → Enrolled / Not Interested"
          className="lg:col-span-2"
          loading={kpiLoading}
          error={kpiError}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 32, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} fontSize={12} width={112} />
              <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
                {funnel.map((f) => (
                  <Cell key={f.stage} fill={FUNNEL_COLORS[f.stage]} />
                ))}
                <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-semibold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users2 className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Pipeline Snapshot</h3>
              <p className="text-sm text-muted-foreground">{leads.length} active leads</p>
            </div>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {(["Demo Scheduled", "Demo Completed", "Follow-up", "Enrolled", "Not Interested"] as const).map((stage) => {
              const count = leads.filter((l) => l.conversionStage === stage).length;
              return (
                <div key={stage} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[stage] }} />
                    <span className="text-sm text-foreground">{stage}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{count}</span>
                </div>
              );
            })}
          </div>
          <Button variant="soft" size="sm" className="mt-4 w-full" asChild>
            <Link to={`${base}/conversion`}>
              Open Kanban board <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>
      </div>

      {/* Today & upcoming demos */}
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${CHART_PALETTE[4]}1A`, color: CHART_PALETTE[4] }}>
              <ClipboardList className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Today &amp; Upcoming Demos</h3>
              <p className="text-sm text-muted-foreground">{formatDate(TODAY, "long")} onward</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/demo-scheduling`}>
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {kpiLoading ? (
          <div className="flex flex-col divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : upcomingDemos.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No demos scheduled" description="Schedule a demo class to see it appear here." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {upcomingDemos.map((s, i) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                    style={{ backgroundColor: `${CHART_PALETTE[i % CHART_PALETTE.length]}1A`, color: CHART_PALETTE[i % CHART_PALETTE.length] }}
                  >
                    {formatDate(s.date, "short").slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.date === TODAY ? "Today" : formatDate(s.date, "long")} · {formatTimeLabel(s.startTime)} · {s.teacherName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.date === TODAY && <Badge variant="warning">Today</Badge>}
                  <SessionStatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
