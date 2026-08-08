import {
  Users,
  UserCheck,
  IndianRupee,
  TrendingUp,
  ClipboardCheck,
  GraduationCap,
  CalendarCheck2,
  RefreshCw,
  Undo2,
  LayoutGrid,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { PersonalMeetingButton } from "@/components/PersonalMeetingButton";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_PALETTE } from "@/lib/roles";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";
import {
  ADMIN_KPIS,
  ATTENDANCE_TREND,
  BATCH_OCCUPANCY_BY_COURSE,
  COURSE_REVENUE,
  DEPARTMENT_REVENUE,
  ENROLLMENT_FUNNEL,
  REVENUE_TREND,
  TEACHER_UTILIZATION,
} from "@/data/kpis";
import { SESSIONS } from "@/data/sessions";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getDashboardSummary } from "@/api/reports";
import { listSessions, toFrontendSession } from "@/api/sessions";
import type { ClassSession } from "@/types";

const TODAY = "2026-07-09";

// API mode starts from zeros/empties — never the demo numbers — until real aggregates arrive.
const ZERO_KPIS: typeof ADMIN_KPIS = {
  totalStudents: 0,
  activeStudents: 0,
  revenueThisMonth: 0,
  revenueGrowth: 0,
  enrollments: 0,
  conversionRate: 0,
  teacherUtilization: 0,
  attendanceRate: 0,
  renewalRate: 0,
  refundRate: 0,
  batchOccupancy: 0,
};

/** Local YYYY-MM-DD (matches the date key toFrontendSession produces). */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminDashboard() {
  const usingApi = apiEnabled();
  const todayKey = usingApi ? localDateKey(new Date()) : TODAY;
  const { data: apiSessions, loading: sessionsLoading } = useApiData<ClassSession[]>(
    () => listSessions().then((items) => items.map(toFrontendSession)),
    []
  );
  const todaySessions = (usingApi ? apiSessions : SESSIONS)
    .filter((s) => s.date === todayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  // Live aggregates replace the mock KPI block and charts when the API is configured
  const { data: dashboard, loading: dashboardLoading, error: dashboardError } = useApiData(
    () =>
      getDashboardSummary().then((s) => ({
        kpis: {
          totalStudents: s.totalStudents,
          activeStudents: s.activeStudents,
          revenueThisMonth: s.revenueCollected,
          revenueGrowth: 0,
          enrollments: s.totalEnrollments,
          conversionRate: s.conversionRatePercent,
          teacherUtilization: s.teacherUtilizationSessionsPerTeacher,
          // No attendance aggregate endpoint yet — 0, never the demo numbers
          attendanceRate: 0,
          renewalRate: s.renewalRatePercent,
          refundRate: s.refundRatePercent,
          batchOccupancy: s.batchOccupancyPercent,
        },
        revenueTrend: s.revenueTrend,
        departmentRevenue: s.revenueByDepartment.map((d, i) => ({
          department: d.name,
          value: d.revenue,
          color: CHART_PALETTE[(i + 3) % CHART_PALETTE.length],
        })),
        courseRevenue: s.revenueByCourse.map((c) => ({ course: c.name, revenue: c.revenue })),
        enrollmentFunnel: s.enrollmentFunnel,
        attendanceTrend: s.weeklyAttendanceTrend,
        batchOccupancyByCourse: s.batchOccupancyByCourse,
      })),
    {
      kpis: ADMIN_KPIS,
      revenueTrend: REVENUE_TREND,
      departmentRevenue: DEPARTMENT_REVENUE,
      courseRevenue: COURSE_REVENUE,
      enrollmentFunnel: ENROLLMENT_FUNNEL,
      attendanceTrend: ATTENDANCE_TREND,
      batchOccupancyByCourse: BATCH_OCCUPANCY_BY_COURSE,
    },
    { kpis: ZERO_KPIS, revenueTrend: [], departmentRevenue: [], courseRevenue: [], enrollmentFunnel: [], attendanceTrend: [], batchOccupancyByCourse: [] }
  );
  const { kpis, revenueTrend, departmentRevenue, courseRevenue, enrollmentFunnel, attendanceTrend, batchOccupancyByCourse } = dashboard;
  // No per-teacher breakdown endpoint yet (only the aggregate sessions-per-teacher
  // KPI above) — empty chart in API mode.
  const teacherUtilization = usingApi ? [] : TEACHER_UTILIZATION;

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Admin Dashboard"
        description="A real-time snapshot of enrollment, revenue and academic operations across The Reader Nest."
        actions={<PersonalMeetingButton />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Students"
          value={formatNumber(kpis.totalStudents)}
          icon={Users}
          tone="primary"
          trend={usingApi ? undefined : { value: 6.2, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Active Students"
          value={formatNumber(kpis.activeStudents)}
          icon={UserCheck}
          tone="success"
          trend={usingApi ? undefined : { value: 3.8, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Revenue This Month"
          value={formatCurrency(kpis.revenueThisMonth)}
          icon={IndianRupee}
          tone="primary"
          trend={usingApi ? undefined : { value: kpis.revenueGrowth, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="New Enrollments"
          value={formatNumber(kpis.enrollments)}
          icon={GraduationCap}
          tone="warning"
          trend={usingApi ? undefined : { value: 4.1, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Conversion Rate"
          value={formatPercent(kpis.conversionRate)}
          icon={TrendingUp}
          tone="success"
          trend={usingApi ? undefined : { value: 2.4, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Teacher Utilization"
          value={formatPercent(kpis.teacherUtilization)}
          icon={ClipboardCheck}
          tone="primary"
          trend={usingApi ? undefined : { value: -1.2, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Attendance Rate"
          value={formatPercent(kpis.attendanceRate)}
          icon={CalendarCheck2}
          tone="success"
          trend={usingApi ? undefined : { value: 1.5, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Renewal Rate"
          value={formatPercent(kpis.renewalRate)}
          icon={RefreshCw}
          tone="warning"
          trend={usingApi ? undefined : { value: -0.8, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Refund Rate"
          value={formatPercent(kpis.refundRate, 1)}
          icon={Undo2}
          tone="destructive"
          trend={usingApi ? undefined : { value: 0.4, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Batch Occupancy"
          value={formatPercent(kpis.batchOccupancy)}
          icon={LayoutGrid}
          tone="neutral"
          trend={usingApi ? undefined : { value: 2.9, label: "vs last month" }}
          loading={dashboardLoading}
          error={dashboardError}
        />
      </div>

      {/* Charts grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Revenue Trend" description="Monthly revenue, last 6 months" loading={dashboardLoading} error={dashboardError}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_PALETTE[0]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_PALETTE[0]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={56} />
              <RTooltip
                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke={CHART_PALETTE[0]} strokeWidth={2.5} fill="url(#revenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department Revenue" description="Share of revenue by department" loading={dashboardLoading} error={dashboardError}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={departmentRevenue}
                dataKey="value"
                nameKey="department"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={3}
                strokeWidth={0}
              >
                {departmentRevenue.map((d) => (
                  <Cell key={d.department} fill={d.color} />
                ))}
              </Pie>
              <RTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => <span className="text-xs font-medium text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Course Revenue" description="Collected revenue by course, all time" loading={dashboardLoading} error={dashboardError}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={courseRevenue} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="course" tickLine={false} axisLine={false} fontSize={11} width={120} />
              <RTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {courseRevenue.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Enrollment Funnel" description="Demo to enrollment conversion, this quarter" loading={dashboardLoading} error={dashboardError}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={enrollmentFunnel} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} fontSize={12} width={104} />
              <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {enrollmentFunnel.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Teacher Utilization"
          description="Sessions delivered vs. capacity, by teacher"
          empty={teacherUtilization.length === 0}
          emptyMessage={usingApi ? "Per-teacher utilization isn't available yet." : "No data yet."}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teacherUtilization} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="teacher" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-12} textAnchor="end" height={44} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={40} />
              <RTooltip formatter={(value: number) => [`${value}%`, "Utilization"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="utilization" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {teacherUtilization.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[(i + 2) % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Attendance Trend"
          description="Weekly attendance rate, this month"
          empty={attendanceTrend.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceTrend} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis domain={[80, 100]} tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={40} />
              <RTooltip formatter={(value: number) => [`${value}%`, "Attendance"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Line type="monotone" dataKey="attendance" stroke={CHART_PALETTE[1]} strokeWidth={2.5} dot={{ r: 4, fill: CHART_PALETTE[1] }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Batch Occupancy by Course"
          description="Fill rate across active batches"
          empty={batchOccupancyByCourse.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={batchOccupancyByCourse} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="course" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={40} />
              <RTooltip formatter={(value: number) => [`${value}%`, "Occupancy"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="occupancy" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {batchOccupancyByCourse.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[(i + 4) % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Today's sessions */}
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${CHART_PALETTE[0]}1A`, color: CHART_PALETTE[0] }}>
              <Clock className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Today&apos;s Sessions</h3>
              <p className="text-sm text-muted-foreground">{formatDate(todayKey, "long")}</p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {todaySessions.length} scheduled
          </span>
        </div>

        {sessionsLoading ? (
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
        ) : todaySessions.length === 0 ? (
          <EmptyState icon={Clock} title="No sessions today" description="There are no classes scheduled for today." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {todaySessions.map((s, i) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                    style={{ backgroundColor: `${CHART_PALETTE[i % CHART_PALETTE.length]}1A`, color: CHART_PALETTE[i % CHART_PALETTE.length] }}
                  >
                    {s.startTime.slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.startTime} · {s.duration} min · {s.teacherName} · {s.childIds.length} student{s.childIds.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <SessionStatusBadge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
