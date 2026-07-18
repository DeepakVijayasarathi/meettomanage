import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Download, IndianRupee, PieChart as PieChartIcon, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { DEPARTMENT_REVENUE, ENROLLMENT_FUNNEL, REVENUE_TREND } from "@/data/kpis";
import { useApiData } from "@/api/hooks";
import { getDashboardSummary, type ApiDashboardSummary } from "@/api/reports";

const DEMO_SUMMARY: Pick<ApiDashboardSummary, "revenueTrend" | "revenueByDepartment" | "enrollmentFunnel"> = {
  revenueTrend: REVENUE_TREND,
  revenueByDepartment: DEPARTMENT_REVENUE.map((d) => ({ name: d.department, revenue: d.value })),
  enrollmentFunnel: ENROLLMENT_FUNNEL,
};

// API mode seeds (and settles errors) with empty tables — never the demo figures.
const EMPTY_SUMMARY: Pick<ApiDashboardSummary, "revenueTrend" | "revenueByDepartment" | "enrollmentFunnel"> = {
  revenueTrend: [],
  revenueByDepartment: [],
  enrollmentFunnel: [],
};

function toCsv(columns: string[], rows: (string | number)[][]) {
  return [columns.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function downloadCsv(filename: string, columns: string[], rows: (string | number)[][]) {
  const blob = new Blob([toCsv(columns, rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface SummaryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  columns: string[];
  rows: (string | number)[][];
  filename: string;
}

function SummaryCard({ icon: Icon, title, description, columns, rows, filename }: SummaryCardProps) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadCsv(filename, columns, rows)}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
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
                    <TableCell key={j} className={j > 0 ? "font-medium text-foreground" : undefined}>
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagementReports() {
  const { data: summary } = useApiData(
    () => getDashboardSummary(),
    DEMO_SUMMARY as ApiDashboardSummary,
    EMPTY_SUMMARY as ApiDashboardSummary
  );

  const monthlySummary = useMemo(() => {
    const columns = ["Month", "Revenue", "MoM Change"];
    const rows = summary.revenueTrend.map((d, i) => {
      const prev = summary.revenueTrend[i - 1];
      const change = prev && prev.revenue > 0 ? (((d.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1) + "%" : "—";
      return [d.month, formatCurrency(d.revenue), change];
    });
    return { columns, rows };
  }, [summary.revenueTrend]);

  const departmentComparison = useMemo(() => {
    const total = summary.revenueByDepartment.reduce((sum, d) => sum + d.revenue, 0);
    const columns = ["Department", "Revenue", "Share"];
    const rows = summary.revenueByDepartment.map((d) => [
      d.name,
      formatCurrency(d.revenue),
      formatPercent(total > 0 ? (d.revenue / total) * 100 : 0, 1),
    ]);
    return { columns, rows };
  }, [summary.revenueByDepartment]);

  const funnelSummary = useMemo(() => {
    const columns = ["Stage", "Count", "Conversion from Previous"];
    const rows = summary.enrollmentFunnel.map((d, i) => {
      const prev = summary.enrollmentFunnel[i - 1];
      const conv = prev && prev.value > 0 ? formatPercent((d.value / prev.value) * 100, 0) : "—";
      return [d.stage, d.value, conv];
    });
    return { columns, rows };
  }, [summary.enrollmentFunnel]);

  return (
    <div>
      <PageHeader
        eyebrow="Executive Reports"
        title="Reports"
        description="A short set of curated, export-ready summaries for board packs and stakeholder updates — not a report builder."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SummaryCard
          icon={IndianRupee}
          title="Monthly Business Summary"
          description="Revenue trend, last 6 months"
          columns={monthlySummary.columns}
          rows={monthlySummary.rows}
          filename="monthly-business-summary.csv"
        />
        <SummaryCard
          icon={PieChartIcon}
          title="Department Comparison"
          description="Revenue split by department"
          columns={departmentComparison.columns}
          rows={departmentComparison.rows}
          filename="department-comparison.csv"
        />
        <SummaryCard
          icon={Users}
          title="Enrollment Funnel Summary"
          description="Demo to enrollment, this quarter"
          columns={funnelSummary.columns}
          rows={funnelSummary.rows}
          filename="enrollment-funnel-summary.csv"
        />
      </div>
    </div>
  );
}
