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
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { SESSIONS } from "@/data/sessions";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listDemoBookings, toFrontendLead } from "@/api/demoBookings";
import { listSessions, toFrontendSession } from "@/api/sessions";
import { getDashboardSummary } from "@/api/reports";
import { useSession } from "@/state/session";
import { LEADS, getConversionFunnel, getConversionRate, getRevenueThisMonth, type Lead, type ConversionStage } from "./data";
import type { ClassSession } from "@/types";

const TODAY = new Date().toISOString().slice(0, 10);
const WEEK_START = new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10);
const WEEK_END = new Date(Date.now() + 4 * 86400_000).toISOString().slice(0, 10);
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
  const { data: leads, loading: leadsLoading, error: leadsError } = useApiData<Lead[]>(() => listDemoBookings().then((b) => b.map(toFrontendLead)), LEADS);
  const { data: apiSessions, loading: sessionsLoading, error: sessionsError } = useApiData<ClassSession[]>(
    () => listSessions().then((s) => s.map(toFrontendSession)),
    SESSIONS
  );
  const { data: collectedRevenue, loading: revenueLoading, error: revenueError } = useApiData<number>(
    () => getDashboardSummary().then((s) => s.revenueCollected),
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
              <Link to="/admission/demo-scheduling">
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
          trend={{ value: 18, label: "vs last week" }}
          loading={kpiLoading}
          error={kpiError}
        />
        <KpiCard
          label="Demo → Enrollment Conversion"
          value={formatPercent(conversionRate)}
          icon={TrendingUp}
          tone="success"
          trend={{ value: 4.5, label: "vs last month" }}
          loading={kpiLoading}
          error={kpiError}
        />
        <KpiCard
          label="Pending Follow-ups"
          value={formatNumber(pendingFollowUps)}
          icon={PhoneCall}
          tone="destructive"
          trend={{ value: -12, label: "vs last week" }}
          loading={kpiLoading}
          error={kpiError}
        />
        <KpiCard
          label="Revenue From Conversions"
          value={formatCurrency(revenueThisMonth)}
          icon={IndianRupee}
          tone="warning"
          trend={{ value: 9.2, label: "this month" }}
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
            <Link to="/admission/conversion">
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
            <Link to="/admission/demo-scheduling">
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
                      {s.date === TODAY ? "Today" : formatDate(s.date, "long")} · {s.startTime} · {s.teacherName}
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
