import { useMemo } from "react";
import { Gauge, LayoutGrid, UserCheck } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { CHART_PALETTE } from "@/lib/roles";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ADMIN_KPIS, BATCH_OCCUPANCY_BY_COURSE, TEACHER_UTILIZATION } from "@/data/kpis";
import { TEACHERS } from "@/data/users";
import { getPayoutsForTeacher } from "@/data/payouts";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getDashboardSummary, getTeacherPerformance } from "@/api/reports";
import type { AppUser, TeacherPayout } from "@/types";

/** TEACHER_UTILIZATION keys teachers by an abbreviated "First L." form — map back to full names. */
function abbreviate(name: string): string {
  const parts = name.trim().split(" ");
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last.charAt(0)}.`;
}

function utilizationFor(teacher: AppUser): number | undefined {
  const match = TEACHER_UTILIZATION.find((t) => t.teacher === abbreviate(teacher.name));
  return match?.utilization;
}

function latestPayoutFor(teacherId: string): TeacherPayout | undefined {
  const payouts = getPayoutsForTeacher(teacherId);
  return payouts.length > 0 ? payouts[payouts.length - 1] : undefined;
}

interface TeacherRow {
  teacher: AppUser;
  utilization?: number;
  payout?: TeacherPayout;
  sessions?: number;
}

const AVATAR_FALLBACKS = ["#7C5CFF", "#0EA5E9", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"];

export default function ManagementPerformance() {
  const mockRows = useMemo<TeacherRow[]>(
    () =>
      TEACHERS.map((teacher) => ({
        teacher,
        utilization: utilizationFor(teacher),
        payout: latestPayoutFor(teacher.id),
      })).sort((a, b) => (b.utilization ?? -1) - (a.utilization ?? -1)),
    []
  );

  // Live rows from the teacher-performance report: attendance % drives the meter
  const { data: rows } = useApiData<TeacherRow[]>(
    () =>
      getTeacherPerformance().then((items) =>
        items.map((t, i) => ({
          teacher: {
            id: t.teacherProfileId,
            name: t.teacherName,
            email: "",
            phone: "",
            role: "teacher" as const,
            status: "active" as const,
            avatarColor: AVATAR_FALLBACKS[i % AVATAR_FALLBACKS.length],
            joinedOn: "",
            department: (t.department ?? undefined) as AppUser["department"],
          },
          utilization: Math.round(t.studentAttendancePercent),
          sessions: t.sessionsCompleted,
        }))
      ),
    mockRows
  );

  const usingApi = apiEnabled();
  const activeTeachers = usingApi ? rows.length : TEACHERS.filter((t) => t.status === "active").length;

  // Live occupancy (overall + per course) from the dashboard summary; live utilization
  // averaged from the per-teacher report. Demo mode keeps the mock KPI constants.
  const { data: liveSummary } = useApiData(
    () =>
      getDashboardSummary().then((s) => ({
        occupancy: s.batchOccupancyPercent,
        occupancyByCourse: s.batchOccupancyByCourse ?? [],
      })),
    { occupancy: ADMIN_KPIS.batchOccupancy, occupancyByCourse: BATCH_OCCUPANCY_BY_COURSE },
    { occupancy: 0, occupancyByCourse: [] }
  );
  const liveOccupancy = liveSummary.occupancy;
  const avgUtilization = usingApi
    ? rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + (r.utilization ?? 0), 0) / rows.length)
      : 0
    : ADMIN_KPIS.teacherUtilization;
  const utilizationChart = usingApi
    ? rows.map((r) => ({ teacher: abbreviate(r.teacher.name), utilization: r.utilization ?? 0 }))
    : TEACHER_UTILIZATION;
  const occupancyChart = usingApi ? liveSummary.occupancyByCourse : BATCH_OCCUPANCY_BY_COURSE;

  const columns: DataTableColumn<TeacherRow>[] = [
    {
      key: "teacher",
      header: "Teacher",
      accessor: (r) => r.teacher.name,
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: r.teacher.avatarColor }}
          >
            {r.teacher.name
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </span>
          <div>
            <p className="font-semibold text-foreground">{r.teacher.name}</p>
            <p className="text-xs text-muted-foreground">{r.teacher.department ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "utilization",
      header: "Utilization",
      accessor: (r) => r.utilization ?? -1,
      sortable: true,
      render: (r) => {
        if (r.utilization === undefined) return <span className="text-xs text-muted-foreground">No data</span>;
        const tone = r.utilization >= 85 ? "bg-success" : r.utilization >= 65 ? "bg-primary" : "bg-warning";
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${tone}`} style={{ width: `${r.utilization}%` }} />
            </div>
            <span className="w-9 shrink-0 text-xs font-semibold text-foreground">{r.utilization}%</span>
          </div>
        );
      },
    },
    {
      key: "sessions",
      header: "Sessions (latest month)",
      accessor: (r) => r.sessions ?? r.payout?.sessionsCompleted ?? -1,
      sortable: true,
      render: (r) =>
        r.sessions ?? r.payout?.sessionsCompleted ?? <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: "payout",
      header: "Latest Payout",
      accessor: (r) => r.payout?.finalAmount ?? -1,
      sortable: true,
      render: (r) =>
        r.payout ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{formatCurrency(r.payout.finalAmount)}</span>
              <Badge variant={r.payout.status === "paid" ? "success" : "warning"}>
                {r.payout.status === "paid" ? "Paid" : "Calculated"}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{r.payout.month}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No payout data</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Performance"
        title="Teacher & Batch Performance"
        description="How efficiently the business is running — capacity utilization and batch fill rates at a glance. Strategic visibility only; scheduling changes belong to the Coordinator and Admin portals."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Avg. Teacher Utilization"
          value={formatPercent(avgUtilization)}
          icon={Gauge}
          tone="primary"
          trend={usingApi ? undefined : { value: -1.2, label: "vs last month" }}
        />
        <KpiCard
          label="Avg. Batch Occupancy"
          value={formatPercent(liveOccupancy)}
          icon={LayoutGrid}
          tone="success"
          trend={usingApi ? undefined : { value: 2.9, label: "vs last month" }}
        />
        <KpiCard
          label="Active Teachers"
          value={usingApi ? String(activeTeachers) : `${activeTeachers} / ${TEACHERS.length}`}
          icon={UserCheck}
          tone="neutral"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Teacher Utilization" description="Sessions delivered vs. capacity, by teacher" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={utilizationChart} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="teacher" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-12} textAnchor="end" height={44} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={40} />
              <RTooltip formatter={(value: number) => [`${value}%`, "Utilization"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="utilization" radius={[8, 8, 0, 0]} maxBarSize={40}>
                {utilizationChart.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[(i + 4) % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Batch Occupancy by Course" description="Fill rate across active batches" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={occupancyChart} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="course" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={40} />
              <RTooltip formatter={(value: number) => [`${value}%`, "Occupancy"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="occupancy" radius={[8, 8, 0, 0]} maxBarSize={44}>
                {occupancyChart.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Gauge className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground">Teacher Snapshot</h3>
            <p className="text-sm text-muted-foreground">Utilization and latest payout status, for visibility — not administration</p>
          </div>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => r.teacher.id}
          searchPlaceholder="Search teachers…"
          searchFn={(r, q) => r.teacher.name.toLowerCase().includes(q.toLowerCase())}
          pageSize={8}
        />
      </Card>
    </div>
  );
}
