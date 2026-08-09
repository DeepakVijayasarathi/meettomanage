import {
  Users,
  IndianRupee,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_PALETTE } from "@/lib/roles";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { ADMIN_KPIS, DEPARTMENT_REVENUE, ENROLLMENT_FUNNEL, REVENUE_TREND } from "@/data/kpis";
import { useApiData } from "@/api/hooks";
import { useSession } from "@/state/session";
import { getDashboardSummary, type ApiDashboardSummary } from "@/api/reports";

const TODAY = new Date().toISOString().slice(0, 10);

// API mode must never render the demo numbers: this zeroed summary is the seed
// (and the resting state if the request fails).
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

// Demo-mode fallback built from the mock KPI constants, in the API summary shape.
const DEMO_SUMMARY: ApiDashboardSummary = {
  ...EMPTY_SUMMARY,
  totalStudents: ADMIN_KPIS.totalStudents,
  activeStudents: ADMIN_KPIS.totalStudents,
  revenueCollected: ADMIN_KPIS.revenueThisMonth,
  conversionRatePercent: ADMIN_KPIS.conversionRate,
  batchOccupancyPercent: ADMIN_KPIS.batchOccupancy,
  revenueByDepartment: DEPARTMENT_REVENUE.map((d) => ({ name: d.department, revenue: d.value })),
  revenueTrend: REVENUE_TREND,
  enrollmentFunnel: ENROLLMENT_FUNNEL,
};

export default function ManagementDashboard() {
  const { userName } = useSession();
  const { data: summary, loading, error } = useApiData<ApiDashboardSummary>(() => getDashboardSummary(), DEMO_SUMMARY, EMPTY_SUMMARY);
  const departmentRevenue = summary.revenueByDepartment.map((d, i) => ({
    department: d.name,
    value: d.revenue,
    color: CHART_PALETTE[(i + 4) % CHART_PALETTE.length],
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Executive Overview"
        title={`Good to see you, ${userName.split(" ")[0]}`}
        description={`A curated view of enrollment, revenue and retention health across The Reader Nest — as of ${formatDate(TODAY, "long")}.`}
        actions={<PersonalMeetingButton />}
      />

      {/* Hero KPI row — the handful of numbers a board actually asks about */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/*
          These four don't have a real prior-period figure to compare against, so they
          don't use KpiCard's `trend` slot — that always renders as a signed percentage
          with an up/down arrow, which turned plain counts/currency into nonsense like
          "▲ 45000% still pending". The supporting number is folded into the value
          string instead, the same way ManagementPerformance's Active Teachers card
          already does ("x / y") rather than faking a trend.
        */}
        <KpiCard
          label="Total Students"
          value={`${formatNumber(summary.totalStudents)} · ${formatNumber(summary.activeStudents)} active`}
          icon={Users}
          tone="primary"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Revenue Collected"
          value={`${formatCurrency(summary.revenueCollected)} · ${formatCurrency(summary.revenuePending)} pending`}
          icon={IndianRupee}
          tone="success"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${formatPercent(summary.conversionRatePercent)} · ${formatNumber(summary.totalEnrollments)} enrollments`}
          icon={TrendingUp}
          tone="neutral"
          loading={loading}
          error={error}
        />
        <KpiCard
          label="Batch Occupancy"
          value={`${formatPercent(summary.batchOccupancyPercent)} · ${formatNumber(summary.activeBatches)} batches`}
          icon={RefreshCw}
          tone="warning"
          loading={loading}
          error={error}
        />
      </div>

      {/* Fewer, bigger charts — the handful that matter at exec level */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard
          title="Revenue Trend"
          description="Monthly revenue, last 6 months"
          className="lg:col-span-2"
          height={320}
          loading={loading}
          error={error}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.revenueTrend} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="mgmtRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_PALETTE[4]} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={CHART_PALETTE[4]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={56} />
              <RTooltip
                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke={CHART_PALETTE[4]} strokeWidth={2.5} fill="url(#mgmtRevenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Department" description="Share of this term's revenue" height={320} loading={loading} error={error}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={departmentRevenue}
                dataKey="value"
                nameKey="department"
                innerRadius={68}
                outerRadius={100}
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
          title="Enrollment Funnel"
          description="From demo booked to enrolled, this quarter"
          className="lg:col-span-3"
          height={260}
          loading={loading}
          error={error}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.enrollmentFunnel} layout="vertical" margin={{ left: 8, right: 32, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} fontSize={12} width={116} />
              <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28}>
                {summary.enrollmentFunnel.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[(i + 4) % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {loading ? (
        <div className="mt-6 max-w-3xl space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ) : error ? (
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-destructive">Couldn&apos;t load the executive summary.</p>
      ) : (
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {formatCurrency(summary.revenueCollected)} collected to date with {formatCurrency(summary.revenuePending)} still pending, and the
          business is currently converting {formatPercent(summary.conversionRatePercent)} of demos into paid enrollments across{" "}
          {summary.activeBatches} active batches at {formatPercent(summary.batchOccupancyPercent)} occupancy. Deeper cuts by course, teacher
          and batch are one click away in Revenue and Performance.
        </p>
      )}
    </div>
  );
}
