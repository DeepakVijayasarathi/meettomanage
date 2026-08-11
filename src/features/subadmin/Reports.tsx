import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CalendarCheck2, Download, Layers, Lock, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHART_PALETTE } from "@/lib/roles";
import { formatPercent } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import { EmptyState } from "@/components/EmptyState";
import { useApiData } from "@/api/hooks";
import { listBatches, toFrontendBatch } from "@/api/batches";
import { getDashboardSummary } from "@/api/reports";
import { ATTENDANCE_TREND, BATCH_OCCUPANCY_BY_COURSE } from "@/data/kpis";
import { BATCHES } from "@/data/batches";
import { getCourseById } from "@/data/courses";
import { getTeacherById } from "@/data/users";
import { NO_ACCESS_MODULES } from "./data";
import type { Batch } from "@/types";

type ReportKey = "attendance" | "occupancy" | "roster";

interface BatchRow extends Batch {
  courseName: string;
  teacherName: string;
  occupancy: number;
}

const MOCK_BATCH_ROWS: BatchRow[] = BATCHES.map((b) => ({
  ...b,
  courseName: getCourseById(b.courseId)?.name ?? "—",
  teacherName: getTeacherById(b.teacherId)?.name ?? "—",
  occupancy: Math.round((b.enrolled / b.capacity) * 100),
}));

function toCsv(columns: string[], rows: (string | number)[][]) {
  const lines = [columns.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))];
  return lines.join("\n");
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const STATUS_LABEL: Record<Batch["status"], string> = { active: "Active", dormant: "Dormant", upcoming: "Upcoming" };
const STATUS_VARIANT: Record<Batch["status"], "success" | "muted" | "warning"> = {
  active: "success",
  dormant: "muted",
  upcoming: "warning",
};

const BATCH_COLUMNS: DataTableColumn<BatchRow>[] = [
  { key: "name", header: "Batch", render: (r) => <span className="font-medium text-foreground">{r.name}</span>, accessor: (r) => r.name, sortable: true },
  { key: "course", header: "Course", render: (r) => r.courseName, accessor: (r) => r.courseName, sortable: true },
  { key: "teacher", header: "Teacher", render: (r) => r.teacherName, accessor: (r) => r.teacherName, sortable: true },
  {
    key: "occupancy",
    header: "Occupancy",
    render: (r) => (
      <span className="font-semibold text-foreground">
        {r.enrolled}/{r.capacity} &middot; {formatPercent(r.occupancy)}
      </span>
    ),
    accessor: (r) => r.occupancy,
    sortable: true,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
    accessor: (r) => r.status,
    sortable: true,
  },
];

export default function SubAdminReports() {
  const [tab, setTab] = useState<ReportKey>("attendance");
  const usingApi = apiEnabled();
  const { hasPermission } = useSession();
  const reportDate = usingApi ? new Date().toISOString().slice(0, 10) : "2026-07-09";

  // Live roster from the batches API; the demo roster only renders without a backend.
  const { data: batchRows } = useApiData<BatchRow[]>(
    () =>
      listBatches().then((items) =>
        items.map((b) => {
          const mapped = toFrontendBatch(b);
          return {
            ...mapped,
            courseName: mapped.courseName ?? "—",
            teacherName: mapped.teacherName ?? "—",
            occupancy: mapped.capacity > 0 ? Math.round((mapped.enrolled / mapped.capacity) * 100) : 0,
          };
        })
      ),
    MOCK_BATCH_ROWS
  );

  // Live attendance + per-course occupancy from the dashboard summary.
  const { data: liveTrends } = useApiData(
    () =>
      getDashboardSummary().then((s) => ({
        attendance: s.weeklyAttendanceTrend ?? [],
        occupancy: s.batchOccupancyByCourse ?? [],
      })),
    { attendance: ATTENDANCE_TREND, occupancy: BATCH_OCCUPANCY_BY_COURSE },
    { attendance: [], occupancy: [] }
  );
  const attendanceTrend = usingApi ? liveTrends.attendance : ATTENDANCE_TREND;
  const occupancyByCourse = usingApi ? liveTrends.occupancy : BATCH_OCCUPANCY_BY_COURSE;

  const attendanceRows = useMemo(() => attendanceTrend.map((d) => [d.week, d.attendance] as [string, number]), [attendanceTrend]);
  const occupancyRows = useMemo(() => occupancyByCourse.map((d) => [d.course, d.occupancy] as [string, number]), [occupancyByCourse]);

  function exportAttendance() {
    download(`attendance-report-${reportDate}.csv`, toCsv(["Week", "Attendance %"], attendanceRows));
  }
  function exportOccupancy() {
    download(`batch-occupancy-report-${reportDate}.csv`, toCsv(["Course", "Occupancy %"], occupancyRows));
  }
  function exportRoster() {
    download(
      `batch-roster-report-${reportDate}.csv`,
      toCsv(
        ["Batch", "Course", "Teacher", "Enrolled", "Capacity", "Occupancy %", "Status"],
        batchRows.map((r) => [r.name, r.courseName, r.teacherName, r.enrolled, r.capacity, r.occupancy, STATUS_LABEL[r.status]])
      )
    );
  }

  // GET /api/reports/dashboard-summary requires ReportsAnalytics:View — without it every
  // fetch on this screen 403s and useApiData silently falls back to empty/mock data with no
  // explanation, so a restricted Sub Admin would otherwise see a blank/broken report screen
  // instead of a clear "no access" state (hasPermission always passes in demo mode, matching
  // the backend's own "no live enforcement without an API" behavior).
  if (!hasPermission("ReportsAnalytics", "View")) {
    return (
      <div>
        <PageHeader
          eyebrow="Delegated Work"
          title="Assigned Reports"
          description="Reports are scoped to the modules you have view access to."
        />
        <EmptyState
          icon={Lock}
          title="No access to Reports & Analytics"
          description="Ask your Admin to grant Reports & Analytics access from Roles & Permissions if you need to view these reports."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Delegated Work"
        title="Assigned Reports"
        description="Reports are scoped to the modules you have view access to. Financial and enrollment-revenue reports are not part of your permissions."
      />

      {/* The scripted persona scope is demo-only; real scope is enforced by permissions. */}
      {!usingApi && NO_ACCESS_MODULES.length > 0 && (
        <Card className="mb-6 border-dashed">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ShieldAlert className="h-[18px] w-[18px]" />
            </span>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Not shown here:</span> reports covering {NO_ACCESS_MODULES.join(", ")} — those
              modules are outside your delegated scope.{" "}
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Lock className="h-3 w-3" /> Contact your Admin to request access.
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReportKey)}>
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="occupancy">Batch Occupancy</TabsTrigger>
          <TabsTrigger value="roster">Batch Roster</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <ChartCard
              title="Attendance Trend"
              description="Weekly attendance rate across all your batches, this month"
              className="lg:col-span-2"
              action={
                <Button variant="outline" size="sm" onClick={exportAttendance}>
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrend} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis domain={[80, 100]} tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={54} />
                  <RTooltip formatter={(value: number) => [`${value}%`, "Attendance"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="attendance" stroke={CHART_PALETTE[1]} strokeWidth={2.5} dot={{ r: 4, fill: CHART_PALETTE[1] }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <Card>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
                  <CalendarCheck2 className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold text-foreground">Why this matters</p>
                <p className="text-sm text-muted-foreground">
                  Attendance is the earliest signal of a batch at risk. You can view and export this trend, but adjusting fee status or
                  refunds tied to attendance stays with your Admin.
                </p>
                <div className="mt-auto grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Latest week</p>
                    <p className="font-semibold text-foreground">
                      {attendanceTrend.length > 0 ? formatPercent(attendanceTrend[attendanceTrend.length - 1].attendance) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">4-week avg</p>
                    <p className="font-semibold text-foreground">
                      {attendanceTrend.length > 0
                        ? formatPercent(Math.round(attendanceTrend.reduce((s, d) => s + d.attendance, 0) / attendanceTrend.length))
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="occupancy">
          <ChartCard
            title="Batch Occupancy by Course"
            description="Fill rate across active batches you can view"
            action={
              <Button variant="outline" size="sm" onClick={exportOccupancy}>
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyByCourse} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="course" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}%`} width={54} />
                <RTooltip formatter={(value: number) => [`${value}%`, "Occupancy"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="occupancy" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {occupancyByCourse.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[(i + 2) % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        <TabsContent value="roster">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Batch Roster Report</p>
                    <p className="text-xs text-muted-foreground">All {batchRows.length} batches you have view access to</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={exportRoster}>
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </div>
              <DataTable
                data={batchRows}
                columns={BATCH_COLUMNS}
                rowKey={(r) => r.id}
                searchPlaceholder="Search batches, courses or teachers…"
                pageSize={6}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
