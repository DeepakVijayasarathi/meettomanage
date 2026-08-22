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
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHART_PALETTE } from "@/lib/roles";
import { formatCurrency, toCsv as toCsvEscaped } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listDemoBookings, listDemoFeedback, toFrontendLead, toFrontendFeedback } from "@/api/demoBookings";
import { listInvoiceRows, toFrontendInvoice } from "@/api/billing";
import { getDashboardSummary } from "@/api/reports";
import { DEMO_FEEDBACKS } from "@/data/feedback";
import type { DemoFeedback } from "@/types";
import { CONVERSION_RATE_TREND, LEADS, PAYMENT_LINKS, getDemosPerTeacher, type Lead } from "./data";

type ReportType = "feedback" | "payments" | "conversion";

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "conversion", label: "Enrollment / Conversion Report" },
  { value: "feedback", label: "Demo Feedback Report" },
  { value: "payments", label: "Payment Report" },
];

interface ReportRow {
  id: string;
  cells: (string | number)[];
}

interface PaymentReportRow {
  id: string;
  childName: string;
  parentName: string;
  courseName: string;
  department: string;
  amount: number;
  amountPaid: number;
  status: string;
  linkSharedOn: string;
}

function buildReport(
  type: ReportType,
  fromDate: string,
  toDate: string,
  feedbacks: DemoFeedback[],
  payments: PaymentReportRow[],
  leads: Lead[]
): { headers: string[]; rows: ReportRow[] } {
  if (type === "feedback") {
    const rows = feedbacks.filter((f) => f.demoDate >= fromDate && f.demoDate <= toDate).map((f) => ({
      id: f.id,
      cells: [f.childName, f.parentName, f.teacherName, f.demoDate, f.submitted ? "Submitted" : "Awaiting", f.recommendedCourse || "—"],
    }));
    return { headers: ["Child", "Parent", "Teacher", "Demo Date", "Feedback Status", "Recommended Course"], rows };
  }
  if (type === "payments") {
    const rows = payments.filter((p) => p.linkSharedOn >= fromDate && p.linkSharedOn <= toDate).map((p) => ({
      id: p.id,
      cells: [p.childName, p.parentName, p.courseName, p.department, p.amount, p.amountPaid, p.status, p.linkSharedOn],
    }));
    return { headers: ["Child", "Parent", "Course", "Department", "Amount", "Paid", "Status", "Issued / Shared"], rows };
  }
  const rows = leads.filter((l) => l.createdOn >= fromDate && l.createdOn <= toDate).map((l) => ({
    id: l.id,
    cells: [l.childName, l.parentName, l.conversionStage, l.recommendedCourse, l.lastContactedOn, l.nextFollowUpOn ?? "—"],
  }));
  return { headers: ["Child", "Parent", "Conversion Stage", "Recommended Course", "Last Contacted", "Next Follow-up"], rows };
}

// Delegates to lib/utils's toCsv, which (unlike this file's own old copy) neutralizes
// a leading =/+/-/@ — child/parent names here are free text entered at demo booking,
// so a formula-injection payload in one is a real, reachable path into a staff export.
function toCsv(headers: string[], rows: ReportRow[]) {
  return toCsvEscaped(headers, rows.map((r) => r.cells));
}

export default function AdmissionReports() {
  const usingApi = apiEnabled();
  // Demo mode keeps the mock universe's pinned range; API mode covers the last ~60 days.
  const [reportType, setReportType] = useState<ReportType>("conversion");
  const [fromDate, setFromDate] = useState(
    usingApi ? new Date(Date.now() - 60 * 86400_000).toISOString().slice(0, 10) : "2026-06-01"
  );
  const [toDate, setToDate] = useState(usingApi ? new Date().toISOString().slice(0, 10) : "2026-07-09");

  const { data: apiLeads, error: leadsError } = useApiData<Lead[]>(
    () => listDemoBookings().then((b) => b.map(toFrontendLead)),
    []
  );
  const { data: apiFeedbacks, error: feedbacksError } = useApiData<DemoFeedback[]>(
    () => listDemoFeedback().then((f) => f.map(toFrontendFeedback)),
    []
  );
  // GET /api/invoices is paged; this report filters by date client-side over one page,
  // so a long-running institution's older invoices fall outside it. totalCount is kept
  // so the payments report can flag when it isn't looking at the whole table.
  const { data: apiPaymentPage, error: paymentsError } = useApiData(
    () =>
      listInvoiceRows((invoice) => {
        const inv = toFrontendInvoice(invoice);
        return {
          id: inv.id,
          childName: inv.childName,
          parentName: inv.parentName,
          courseName: inv.courseName,
          department: inv.department,
          amount: inv.amount,
          amountPaid: inv.amountPaid ?? 0,
          status: inv.status,
          linkSharedOn: inv.issuedOn,
        } satisfies PaymentReportRow;
      }),
    { rows: [] as PaymentReportRow[], totalCount: 0 },
    { rows: [] as PaymentReportRow[], totalCount: 0 }
  );
  const apiPayments = apiPaymentPage.rows;
  const paymentsTruncated = usingApi && apiPaymentPage.totalCount > apiPayments.length;
  // A report whose source fetch failed renders as "0 rows · No records in this range",
  // which is indistinguishable from a genuinely empty range — and this screen's whole
  // job is to be exported and acted on. Flag the failure for whichever report is showing.
  const reportError = usingApi
    ? reportType === "payments"
      ? paymentsError
      : reportType === "feedback"
        ? feedbacksError
        : leadsError
    : null;

  const leads = usingApi ? apiLeads : LEADS;
  const feedbacks = usingApi ? apiFeedbacks : DEMO_FEEDBACKS;
  const payments = usingApi ? apiPayments : PAYMENT_LINKS;

  const { headers, rows } = useMemo(
    () => buildReport(reportType, fromDate, toDate, feedbacks, payments, leads),
    [reportType, fromDate, toDate, feedbacks, payments, leads]
  );
  // Live monthly demo→enrolled conversion from the dashboard summary.
  const { data: apiConversionTrend } = useApiData(
    () => getDashboardSummary().then((s) => s.conversionRateTrend ?? []),
    []
  );
  const conversionTrend = usingApi ? apiConversionTrend : CONVERSION_RATE_TREND;
  const demosPerTeacher = useMemo(() => {
    if (!usingApi) return getDemosPerTeacher();
    const counts = new Map<string, number>();
    for (const lead of leads) {
      if (!lead.teacherName) continue;
      counts.set(lead.teacherName, (counts.get(lead.teacherName) ?? 0) + 1);
    }
    return [...counts.entries()].map(([teacher, demos]) => ({ teacher, demos }));
  }, [usingApi, leads]);

  const columns: DataTableColumn<ReportRow>[] = useMemo(
    () =>
      headers.map((h, i) => ({
        key: `col-${i}`,
        header: h,
        sortable: true,
        accessor: (row) => row.cells[i],
        render: (row) => (typeof row.cells[i] === "number" && (h === "Amount" || h === "Paid") ? formatCurrency(row.cells[i] as number) : row.cells[i]),
      })),
    [headers]
  );

  function handleExport() {
    const csv = toCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admission-${reportType}-report-${fromDate}-to-${toDate}.csv`;
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
        description="Demo feedback, payment collection and conversion performance — all in one place, exportable as CSV."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Conversion Rate Trend" description="Demo-to-enrollment conversion, last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={conversionTrend} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} tickFormatter={(v) => `${v}%`} />
              <RTooltip
                formatter={(value: number) => [`${value}%`, "Conversion Rate"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Line type="monotone" dataKey="rate" stroke={CHART_PALETTE[4]} strokeWidth={2.5} dot={{ r: 4, fill: CHART_PALETTE[4] }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Demos Per Teacher" description="Demo classes conducted, all-time">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demosPerTeacher} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="teacher" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-12} textAnchor="end" height={44} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} allowDecimals={false} />
              <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="demos" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {demosPerTeacher.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="mt-6">
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
          <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileBarChart2 className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-foreground">{REPORT_OPTIONS.find((o) => o.value === reportType)?.label}</p>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{rows.length} rows</span>
        </div>

        {reportError && (
          <p role="alert" className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-sm font-medium text-warning-foreground">
            Could not load the data for this report ({reportError}) — what&apos;s below is
            incomplete, and exporting it would be too.
          </p>
        )}

        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search this report…"
          emptyTitle="No records in this range"
          emptyDescription="Try widening the date range or switching the report type."
        />
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Exporting downloads exactly what&apos;s shown above.
        </p>
        {reportType === "payments" && paymentsTruncated && (
          // The date filter runs over the invoice page this screen loaded, so a range
          // reaching past the newest page would quietly under-report. Say it rather
          // than hand someone a short report that looks complete.
          <p className="mt-1 text-xs text-warning-foreground">
            Drawn from the {apiPayments.length} most recent of {apiPaymentPage.totalCount} invoices — a range
            reaching further back than those may be incomplete.
          </p>
        )}
      </div>
    </div>
  );
}
