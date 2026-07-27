import { useMemo, useState } from "react";
import { Download, FileBarChart2, Sparkles } from "lucide-react";
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
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHART_PALETTE } from "@/lib/roles";
import { formatPercent } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { downloadReportCsv, getDashboardSummary, getTeacherPerformance, type ApiDashboardSummary } from "@/api/reports";
import {
  ATTENDANCE_TREND,
  ENROLLMENT_FUNNEL,
  REVENUE_TREND,
  TEACHER_UTILIZATION,
} from "@/data/kpis";

type ReportType = "attendance" | "revenue" | "performance" | "conversion";

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "attendance", label: "Attendance Report" },
  { value: "revenue", label: "Revenue Report" },
  { value: "performance", label: "Teacher Performance Report" },
  { value: "conversion", label: "Enrollment Conversion Report" },
];

interface ReportSources {
  attendance: { week: string; attendance: number }[];
  revenueTrend: ApiDashboardSummary["revenueTrend"];
  utilization: { teacher: string; utilization: number }[];
  funnel: ApiDashboardSummary["enrollmentFunnel"];
}

function reportRows(type: ReportType, sources: ReportSources): { columns: string[]; rows: (string | number)[][] } {
  switch (type) {
    case "attendance":
      return {
        columns: ["Week", "Attendance %"],
        rows: sources.attendance.map((d) => [d.week, d.attendance]),
      };
    case "revenue":
      return {
        columns: ["Month", "Revenue (₹)"],
        rows: sources.revenueTrend.map((d) => [d.month, d.revenue]),
      };
    case "performance":
      return {
        columns: ["Teacher", "Utilization %"],
        rows: sources.utilization.map((d) => [d.teacher, d.utilization]),
      };
    case "conversion":
      return {
        columns: ["Stage", "Count"],
        rows: sources.funnel.map((d) => [d.stage, d.value]),
      };
  }
}

function toCsv(columns: string[], rows: (string | number)[][]) {
  const lines = [columns.join(","), ...rows.map((r) => r.join(","))];
  return lines.join("\n");
}

export default function AdminReports() {
  const usingApi = apiEnabled();
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [fromDate, setFromDate] = useState(
    usingApi ? new Date(Date.now() - 150 * 86400_000).toISOString().slice(0, 10) : "2026-02-01"
  );
  const [toDate, setToDate] = useState(usingApi ? new Date().toISOString().slice(0, 10) : "2026-07-09");
  const [generated, setGenerated] = useState<ReportType | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: summary } = useApiData<
    Pick<ApiDashboardSummary, "revenueTrend" | "enrollmentFunnel" | "weeklyAttendanceTrend">
  >(
    () =>
      getDashboardSummary().then((s) => ({
        revenueTrend: s.revenueTrend,
        enrollmentFunnel: s.enrollmentFunnel,
        weeklyAttendanceTrend: s.weeklyAttendanceTrend ?? [],
      })),
    { revenueTrend: REVENUE_TREND, enrollmentFunnel: ENROLLMENT_FUNNEL, weeklyAttendanceTrend: ATTENDANCE_TREND },
    { revenueTrend: [], enrollmentFunnel: [], weeklyAttendanceTrend: [] }
  );
  const { data: utilization } = useApiData<{ teacher: string; utilization: number }[]>(
    () =>
      getTeacherPerformance().then((items) =>
        items.map((t) => ({ teacher: t.teacherName, utilization: Math.round(t.studentAttendancePercent) }))
      ),
    TEACHER_UTILIZATION
  );

  const sources: ReportSources = useMemo(
    () => ({
      attendance: summary.weeklyAttendanceTrend,
      revenueTrend: summary.revenueTrend,
      utilization,
      funnel: summary.enrollmentFunnel,
    }),
    [summary, utilization]
  );

  const { columns, rows } = useMemo(
    () => reportRows(generated ?? reportType, sources),
    [generated, reportType, sources]
  );

  async function handleExport() {
    setExportError(null);
    const type = generated ?? reportType;

    // API mode: pull the full server-side export so the CSV isn't limited to the on-screen preview.
    if (usingApi) {
      setExporting(true);
      try {
        await downloadReportCsv(type);
      } catch {
        setExportError("Couldn't reach the export endpoint. Showing the on-screen preview as CSV instead.");
        downloadClientCsv(type);
      } finally {
        setExporting(false);
      }
      return;
    }

    downloadClientCsv(type);
  }

  function downloadClientCsv(type: ReportType) {
    const csv = toCsv(columns, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Reports & Analytics"
        description="Build a report by type and date range, preview it, and export the results as CSV."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label>Report type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="from-date">From</Label>
            <Input id="from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to-date">To</Label>
            <Input id="to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
          </div>
          <Button onClick={() => setGenerated(reportType)}>
            <Sparkles className="h-4 w-4" />
            Generate
          </Button>
        </CardContent>
      </Card>

      {generated && (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title={REPORT_OPTIONS.find((o) => o.value === generated)?.label ?? "Report"} description={`${fromDate} → ${toDate}`}>
            <ResponsiveContainer width="100%" height="100%">
              {generated === "attendance" ? (
                <LineChart data={rows.map(([label, value]) => ({ label, value }))} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                  <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke={CHART_PALETTE[0]} strokeWidth={2.5} dot={{ r: 4, fill: CHART_PALETTE[0] }} />
                </LineChart>
              ) : (
                <BarChart data={rows.map(([label, value]) => ({ label, value }))} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={generated === "performance" ? -12 : 0} textAnchor={generated === "performance" ? "end" : "middle"} height={generated === "performance" ? 44 : 24} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                  <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {rows.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartCard>

          <Card className="flex flex-col">
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileBarChart2 className="h-[18px] w-[18px]" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">Data Preview</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? "Exporting…" : "Export CSV"}
                </Button>
              </div>
              {exportError && (
                <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">{exportError}</p>
              )}
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {columns.map((c) => (
                        <TableHead key={c}>{c}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        {r.map((cell, j) => (
                          <TableCell key={j} className={j === 1 ? "font-semibold" : undefined}>
                            {typeof cell === "number" && columns[j].includes("%") ? formatPercent(cell) : cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Showing {rows.length} rows for the selected range. Export CSV downloads exactly what&apos;s previewed above.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!generated && (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            Select a report type and date range, then click <span className="font-semibold text-foreground">Generate</span> to see a live preview.
          </p>
        </div>
      )}
    </div>
  );
}
