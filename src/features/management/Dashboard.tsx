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
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { CHART_PALETTE } from "@/lib/roles";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { ADMIN_KPIS, DEPARTMENT_REVENUE, ENROLLMENT_FUNNEL, REVENUE_TREND } from "@/data/kpis";

const TODAY = "2026-07-09";

export default function ManagementDashboard() {
  return (
    <div>
      <PageHeader
        eyebrow="Executive Overview"
        title="Good to see you, Vikram"
        description={`A curated view of enrollment, revenue and retention health across The Reader Nest — as of ${formatDate(TODAY, "long")}.`}
      />

      {/* Hero KPI row — the handful of numbers a board actually asks about */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Students"
          value={formatNumber(ADMIN_KPIS.totalStudents)}
          icon={Users}
          tone="primary"
          trend={{ value: 6.2, label: "vs last month" }}
        />
        <KpiCard
          label="Revenue This Month"
          value={formatCurrency(ADMIN_KPIS.revenueThisMonth)}
          icon={IndianRupee}
          tone="success"
          trend={{ value: ADMIN_KPIS.revenueGrowth, label: "vs last month" }}
        />
        <KpiCard
          label="Conversion Rate"
          value={formatPercent(ADMIN_KPIS.conversionRate)}
          icon={TrendingUp}
          tone="neutral"
          trend={{ value: 2.4, label: "demo → enrollment" }}
        />
        <KpiCard
          label="Renewal Rate"
          value={formatPercent(ADMIN_KPIS.renewalRate)}
          icon={RefreshCw}
          tone="warning"
          trend={{ value: -0.8, label: "vs last month" }}
        />
      </div>

      {/* Fewer, bigger charts — the handful that matter at exec level */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard
          title="Revenue Trend"
          description="Monthly revenue, last 6 months"
          className="lg:col-span-2"
          height={320}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE_TREND} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
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

        <ChartCard title="Revenue by Department" description="Share of this term's revenue" height={320}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={DEPARTMENT_REVENUE}
                dataKey="value"
                nameKey="department"
                innerRadius={68}
                outerRadius={100}
                paddingAngle={3}
                strokeWidth={0}
              >
                {DEPARTMENT_REVENUE.map((d) => (
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
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ENROLLMENT_FUNNEL} layout="vertical" margin={{ left: 8, right: 32, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} fontSize={12} width={116} />
              <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28}>
                {ENROLLMENT_FUNNEL.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[(i + 4) % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Revenue has climbed for five straight months to {formatCurrency(ADMIN_KPIS.revenueThisMonth)}, and the business is currently
        converting {formatPercent(ADMIN_KPIS.conversionRate)} of demos into paid enrollments with a {formatPercent(ADMIN_KPIS.renewalRate)} renewal
        rate. Deeper cuts by course, teacher and batch are one click away in Revenue and Performance.
      </p>
    </div>
  );
}
