import {
  Users,
  IndianRupee,
  TrendingUp,
  ClipboardCheck,
  GraduationCap,
  CalendarCheck2,
  RefreshCw,
  Undo2,
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
import { formatCurrency, formatCurrencyAxisTick, formatDate, formatNumber, formatPercent, formatTimeLabel } from "@/lib/utils";
import { utcIsoToLocalDateTime } from "@/lib/datetime";
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
import { BATCHES } from "@/data/batches";
import { SESSIONS } from "@/data/sessions";
import { apiEnabled } from "@/lib/api";
import { useBrand } from "@/lib/branding";
import { useMemo } from "react";
import { useApiData } from "@/api/hooks";
import { useSession } from "@/state/session";
import { getDashboardSummary, type ApiDashboardSummary } from "@/api/reports";
import { listSessions, toFrontendSession } from "@/api/sessions";
import type { ClassSession } from "@/types";

// Cosmetic ("as of <date>") but still wrong near local midnight if computed in UTC.
const TODAY_NARRATIVE = utcIsoToLocalDateTime(new Date().toISOString()).date;
const TODAY_SESSIONS = "2026-07-09";

// API mode starts from zeros/empties — never the demo numbers — until real aggregates arrive.
const EMPTY_SUMMARY: ApiDashboardSummary = {
  totalStudents: 0,
  activeStudents: 0,
  revenueCollected: 0,
  revenuePending: 0,
  totalEnrollments: 0,
  activeBatches: 0,
  dormantBatches: 0,
  conversionRatePercent: 0,
  refundRatePercent: 0,
  renewalRatePercent: 0,
  batchOccupancyPercent: 0,
  teacherUtilizationSessionsPerTeacher: 0,
  revenueByDepartment: [],
  revenueByCourse: [],
  revenueTrend: [],
  enrollmentFunnel: [],
  weeklyAttendanceTrend: [],
  batchOccupancyByCourse: [],
  conversionRateTrend: [],
};

// Demo-mode fallback built from the mock KPI constants, in the API summary shape — same
// source data AdminDashboard/ManagementDashboard each used to build their own demo state from.
const DEMO_SUMMARY: ApiDashboardSummary = {
  ...EMPTY_SUMMARY,
  totalStudents: ADMIN_KPIS.totalStudents,
  activeStudents: ADMIN_KPIS.totalStudents,
  revenueCollected: ADMIN_KPIS.revenueThisMonth,
  conversionRatePercent: ADMIN_KPIS.conversionRate,
  batchOccupancyPercent: ADMIN_KPIS.batchOccupancy,
  totalEnrollments: ADMIN_KPIS.enrollments,
  activeBatches: BATCHES.filter((b) => b.status === "active").length,
  teacherUtilizationSessionsPerTeacher: ADMIN_KPIS.teacherUtilization,
  renewalRatePercent: ADMIN_KPIS.renewalRate,
  refundRatePercent: ADMIN_KPIS.refundRate,
  revenueByDepartment: DEPARTMENT_REVENUE.map((d) => ({ name: d.department, revenue: d.value })),
  revenueByCourse: COURSE_REVENUE.map((c) => ({ name: c.course, revenue: c.revenue })),
  revenueTrend: REVENUE_TREND,
  enrollmentFunnel: ENROLLMENT_FUNNEL,
  weeklyAttendanceTrend: ATTENDANCE_TREND,
  batchOccupancyByCourse: BATCH_OCCUPANCY_BY_COURSE,
};

/** Local YYYY-MM-DD (matches the date key toFrontendSession produces). */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Category-axis tick that stays on one line: long names are cut with an ellipsis (full name on hover). */
function TruncatedCategoryTick({
  x,
  y,
  payload,
  maxChars = 24,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  maxChars?: number;
}) {
  const full = String(payload?.value ?? "");
  const short = full.replace(/\(Individual\)/i, "(1:1)");
  const text = short.length > maxChars ? `${short.slice(0, maxChars - 1).trimEnd()}…` : short;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="hsl(var(--muted-foreground))">
      <title>{full}</title>
      {text}
    </text>
  );
}

/**
 * The Founder's single landing dashboard — merges what were, until 2026-09-22, two separate
 * screens (AdminDashboard's full operational grid and ManagementDashboard's curated executive
 * view) reached via two different portals. One `getDashboardSummary()` call now backs both the
 * personalised board-level summary up top and the full operational KPI/chart breakdown below it,
 * so nothing that either dashboard showed is lost, and switching between them is gone entirely.
 * Mounted at the "Founder" persona's `/executive` route (see App.tsx); the underlying route/role
 * key is unchanged from the prior "Admin & Management" persona to avoid disturbing anyone already
 * assigned it — only the branding and this landing page are new.
 */
export default function FounderDashboard() {
  const { userName } = useSession();
  const brand = useBrand();
  const usingApi = apiEnabled();
  const todayKey = usingApi ? localDateKey(new Date()) : TODAY_SESSIONS;

  const { data: apiSessions, loading: sessionsLoading } = useApiData<ClassSession[]>(
    () => listSessions().then((items) => items.map(toFrontendSession)),
    []
  );
  const todaySessions = useMemo(
    () =>
      (usingApi ? apiSessions : SESSIONS)
        .filter((s) => s.date === todayKey)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [usingApi, apiSessions, todayKey]
  );

  const { data: summary, loading, error } = useApiData<ApiDashboardSummary>(() => getDashboardSummary(), DEMO_SUMMARY, EMPTY_SUMMARY);

  const departmentRevenue = summary.revenueByDepartment.map((d, i) => ({
    department: d.name,
    value: d.revenue,
    color: CHART_PALETTE[(i + 3) % CHART_PALETTE.length],
  }));
  const courseRevenue = summary.revenueByCourse.map((c) => ({ course: c.name, revenue: c.revenue }));
  // Course names are long; on phones the label column has to stay narrow so the bars keep some room.
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
  // No per-teacher breakdown endpoint yet (only the aggregate sessions-per-teacher KPI) — empty in API mode.
  const teacherUtilization = usingApi ? [] : TEACHER_UTILIZATION;
  // No attendance aggregate endpoint yet in API mode.
  const attendanceRateDisplay = usingApi ? "—" : formatPercent(ADMIN_KPIS.attendanceRate);

  return (
    <div>
      <PageHeader
        eyebrow="Founder Dashboard"
        title={`Good to see you, ${userName.split(" ")[0]}`}
        description={`Everything about ${brand.name} in one place — enrollment, academic operations, revenue and business health.`}
        actions={<PersonalMeetingButton />}
      />

      {/* Business snapshot — the handful of numbers a founder checks first */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Students"
          value={formatNumber(summary.totalStudents)}
          detail={`${formatNumber(summary.activeStudents)} active`}
          icon={Users}
          tone="primary"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Revenue Collected"
          value={formatCurrency(summary.revenueCollected)}
          detail={`${formatCurrency(summary.revenuePending)} pending`}
          icon={IndianRupee}
          tone="success"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Conversion Rate"
          value={formatPercent(summary.conversionRatePercent)}
          detail={`${formatNumber(summary.totalEnrollments)} enrollments`}
          icon={TrendingUp}
          tone="neutral"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Batch Occupancy"
          value={formatPercent(summary.batchOccupancyPercent)}
          detail={`${formatNumber(summary.activeBatches)} active batches`}
          icon={RefreshCw}
          tone="warning"
          loading={loading}
          error={error}
        />
      </div>

      {/* Operational detail — the full breakdown behind the headline numbers above */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 min-[1360px]:grid-cols-5">
        <KpiCard
          label="Active Enrollments"
          value={formatNumber(summary.totalEnrollments)}
          icon={GraduationCap}
          tone="primary"
          loading={loading}
          error={error}
        />
        <KpiCard
          label={usingApi ? "Sessions per Teacher" : "Teacher Utilization"}
          value={
            usingApi
              ? formatNumber(summary.teacherUtilizationSessionsPerTeacher)
              : formatPercent(summary.teacherUtilizationSessionsPerTeacher)
          }
          detail={usingApi ? "completed, last 30 days" : undefined}
          icon={ClipboardCheck}
          tone="primary"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Attendance Rate"
          value={attendanceRateDisplay}
          detail={usingApi ? "not available yet" : undefined}
          icon={CalendarCheck2}
          tone="success"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Renewal Rate"
          value={formatPercent(summary.renewalRatePercent)}
          icon={RefreshCw}
          tone="success"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Refund Rate"
          value={formatPercent(summary.refundRatePercent, 1)}
          icon={Undo2}
          tone="destructive"
          loading={loading}
          error={error}
        />
      </div>

      {/* Charts grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Revenue Trend" description="Monthly revenue, last 6 months" loading={loading} error={error}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.revenueTrend} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="founderRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_PALETTE[0]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_PALETTE[0]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={formatCurrencyAxisTick} width={56} />
              <RTooltip
                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke={CHART_PALETTE[0]} strokeWidth={2.5} fill="url(#founderRevenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department Revenue" description="Share of revenue by department" loading={loading} error={error}>
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

        <ChartCard
          title="Course Revenue"
          description="Collected revenue by course, all time"
          loading={loading}
          error={error}
          empty={courseRevenue.length === 0}
          emptyMessage="No revenue collected yet."
          height={Math.max(280, courseRevenue.length * 30 + 40)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={courseRevenue} layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 0 }} barCategoryGap={6}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} tickFormatter={formatCurrencyAxisTick} />
              <YAxis type="category" dataKey="course" tickLine={false} axisLine={false} width={narrow ? 150 : 224} interval={0} tick={<TruncatedCategoryTick maxChars={narrow ? 21 : 33} />} />
              <RTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {courseRevenue.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Enrollment Funnel"
          description="Demo to enrollment conversion, this quarter"
          loading={loading}
          error={error}
          empty={summary.enrollmentFunnel.every((stage) => !stage.value)}
          emptyMessage="No demos booked this quarter yet."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.enrollmentFunnel} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} fontSize={12} width={104} />
              <RTooltip formatter={(value: number) => [formatNumber(value), "Count"]} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {summary.enrollmentFunnel.map((_, i) => (
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
            <BarChart data={teacherUtilization} margin={{ left: -12, right: 12, top: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="teacher"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                interval={teacherUtilization.length > 12 ? Math.ceil(teacherUtilization.length / 12) - 1 : 0}
                angle={-90}
                textAnchor="end"
                height={70}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={54} />
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
          empty={summary.weeklyAttendanceTrend.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.weeklyAttendanceTrend} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis domain={[80, 100]} tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={54} />
              <RTooltip formatter={(value: number) => [`${value}%`, "Attendance"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Line type="monotone" dataKey="attendance" stroke={CHART_PALETTE[1]} strokeWidth={2.5} dot={{ r: 4, fill: CHART_PALETTE[1] }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Batch Occupancy by Course"
          description="Fill rate across active batches"
          className="lg:col-span-2"
          empty={summary.batchOccupancyByCourse.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.batchOccupancyByCourse} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="course" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={54} />
              <RTooltip formatter={(value: number) => [`${value}%`, "Occupancy"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="occupancy" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {summary.batchOccupancyByCourse.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[(i + 4) % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Plain-language takeaway — the sentence a founder would say out loud about the numbers above */}
      {loading ? (
        <div className="mt-6 max-w-3xl space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ) : error ? (
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-destructive">Couldn&apos;t load the business summary.</p>
      ) : (
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {formatCurrency(summary.revenueCollected)} collected to date with {formatCurrency(summary.revenuePending)} still pending, and the
          business is currently converting {formatPercent(summary.conversionRatePercent)} of demos into paid enrollments across{" "}
          {summary.activeBatches} active batches at {formatPercent(summary.batchOccupancyPercent)} occupancy — as of{" "}
          {formatDate(TODAY_NARRATIVE, "long")}. Deeper cuts by course, teacher and batch are one click away in Revenue and Performance.
        </p>
      )}

      {/* Today's sessions */}
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${CHART_PALETTE[0]}1A`, color: CHART_PALETTE[0] }}>
              <Clock className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Today&apos;s Sessions</p>
              <p className="text-xs text-muted-foreground">{formatDate(todayKey, "long")}</p>
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
                    {formatTimeLabel(s.startTime).split(":")[0]}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeLabel(s.startTime)} · {s.duration} min · {s.teacherName} · {s.childIds.length} student{s.childIds.length === 1 ? "" : "s"}
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
