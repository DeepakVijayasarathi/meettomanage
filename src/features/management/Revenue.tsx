import { useMemo } from "react";
import { IndianRupee, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
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
import { ChartCard } from "@/components/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { CHART_PALETTE } from "@/lib/roles";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { COURSES } from "@/data/courses";
import { DEPARTMENT_REVENUE, REVENUE_TREND } from "@/data/kpis";
import type { Course } from "@/types";

const CATEGORY_COLOR: Record<Course["category"], string> = {
  Phonics: CHART_PALETTE[3],
  Maths: CHART_PALETTE[4],
  Reading: CHART_PALETTE[2],
  Writing: CHART_PALETTE[5],
  Speaking: CHART_PALETTE[6],
};

export default function ManagementRevenue() {
  const sortedCourses = useMemo(() => [...COURSES].sort((a, b) => b.revenue - a.revenue), []);
  const totalRevenue = useMemo(() => COURSES.reduce((sum, c) => sum + c.revenue, 0), []);

  const columns: DataTableColumn<Course>[] = [
    {
      key: "name",
      header: "Course",
      accessor: (c) => c.name,
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-semibold text-foreground">{c.name}</p>
          <p className="text-xs text-muted-foreground">
            {c.type === "1:1" ? "1:1" : c.type === "demo" ? "Demo" : "Group"} · {c.duration} min
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      accessor: (c) => c.category,
      sortable: true,
      render: (c) => (
        <Badge variant="outline" className="gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[c.category] }} />
          {c.category}
        </Badge>
      ),
    },
    {
      key: "enrolled",
      header: "Enrolled",
      accessor: (c) => c.totalEnrolled,
      sortable: true,
      render: (c) => <span className="font-medium">{formatNumber(c.totalEnrolled)}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      accessor: (c) => c.revenue,
      sortable: true,
      render: (c) => <span className="font-semibold text-foreground">{formatCurrency(c.revenue)}</span>,
    },
    {
      key: "share",
      header: "Share of Revenue",
      accessor: (c) => (totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0),
      sortable: true,
      render: (c) => {
        const share = totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(share, 2)}%`, backgroundColor: CATEGORY_COLOR[c.category] }}
              />
            </div>
            <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">{share.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Performance"
        title="Revenue & Courses"
        description="Where revenue comes from — course by course and department by department. Read-only, for strategic review; day-to-day course edits live in the Admin portal."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Revenue Trend" description="Monthly revenue, last 6 months" className="lg:col-span-2" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE_TREND} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_PALETTE[0]} stopOpacity={0.3} />
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
              <Area type="monotone" dataKey="revenue" stroke={CHART_PALETTE[0]} strokeWidth={2.5} fill="url(#revTrendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Department" description="Share of this term's revenue" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={DEPARTMENT_REVENUE}
                dataKey="value"
                nameKey="department"
                innerRadius={62}
                outerRadius={92}
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
                height={32}
                formatter={(value: string) => <span className="text-xs font-medium text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Course-wise Revenue</h3>
              <p className="text-sm text-muted-foreground">All active and draft courses, sorted by revenue</p>
            </div>
          </div>
          <div className={cn("flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success")}>
            <TrendingUp className="h-3.5 w-3.5" />
            {formatCurrency(totalRevenue)} total
          </div>
        </div>
        <DataTable
          data={sortedCourses}
          columns={columns}
          rowKey={(c) => c.id}
          searchPlaceholder="Search courses…"
          searchFn={(c, q) => c.name.toLowerCase().includes(q.toLowerCase()) || c.category.toLowerCase().includes(q.toLowerCase())}
          pageSize={8}
        />
      </div>
    </div>
  );
}
