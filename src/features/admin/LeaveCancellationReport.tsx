import { useMemo, useState } from "react";
import { Download, FileBarChart2, RefreshCw, Users } from "lucide-react";
import { InlineAlert } from "@/components/InlineAlert";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useApiData } from "@/api/hooks";
import { apiEnabled, userMessage } from "@/lib/api";
import { formatDate, toCsv } from "@/lib/utils";
import { useSession } from "@/state/session";
import {
  getLeaveCancellationReport,
  regenerateLeaveCancellationReport,
  type ApiLeaveCancellationReport,
} from "@/api/academicOps";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function emptyReport(year: number, month: number): ApiLeaveCancellationReport {
  return { year, month, generatedAtUtc: new Date().toISOString(), isSnapshot: false, totalCancelledClasses: 0, teachers: [] };
}

function downloadCsv(filename: string, csv: string) {
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

/**
 * Month-end leave and class-cancellation report per teacher -- the figures teacher pay
 * deductions are based on. The backend freezes a snapshot at 23:59 IST on the last day of
 * every month; until then (or for a month it hasn't run for) this shows a live preview.
 */
export function LeaveCancellationReport() {
  const [monthValue, setMonthValue] = useState(currentMonthValue());

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="leave-report-month" className="mb-1 block text-xs font-medium text-muted-foreground">
          Month
        </label>
        <Input
          id="leave-report-month"
          type="month"
          className="w-48"
          value={monthValue}
          max={currentMonthValue()}
          onChange={(e) => e.target.value && setMonthValue(e.target.value)}
        />
      </div>
      {/* Keyed by month so each month fetches its own report from scratch. */}
      <MonthReport key={monthValue} monthValue={monthValue} />
    </div>
  );
}

function MonthReport({ monthValue }: { monthValue: string }) {
  const { toast } = useToast();
  const { hasPermission } = useSession();
  const usingApi = apiEnabled();
  const canRegenerate = usingApi && hasPermission("LeaveManagement", "Edit");
  const [year, month] = monthValue.split("-").map(Number);
  const [regenerating, setRegenerating] = useState(false);

  const { data: report, loading, error, reload } = useApiData<ApiLeaveCancellationReport>(
    () => getLeaveCancellationReport(year, month),
    emptyReport(year, month),
    emptyReport(year, month),
  );

  const csv = useMemo(() => {
    const rows: (string | number)[][] = [];
    for (const teacher of report.teachers) {
      for (const day of teacher.days) {
        for (const c of day.classes) {
          rows.push([teacher.teacherName, day.date, day.cancelledClasses, c.batchName, c.classType, c.startTime, teacher.totalCancelledClasses]);
        }
      }
    }
    return toCsv(["Teacher", "Leave date", "Classes cancelled that date", "Batch", "Type", "Class time", "Teacher total for month"], rows);
  }, [report]);

  async function regenerate() {
    setRegenerating(true);
    try {
      await regenerateLeaveCancellationReport(year, month);
      toast({ variant: "success", title: "Report regenerated", description: `${monthLabel(year, month)} was refreshed from the latest data.` });
      reload();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't regenerate the report", description: userMessage(err, "Please try again.") });
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={report.teachers.length === 0}
          onClick={() => downloadCsv(`leave-cancellations-${monthValue}.csv`, csv)}
        >
          <Download className="h-3.5 w-3.5" /> Download CSV
        </Button>
        {canRegenerate && (
          <Button variant="outline" size="sm" disabled={regenerating} onClick={regenerate}>
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} /> Regenerate
          </Button>
        )}
      </div>

      {usingApi && error && (
        <InlineAlert variant="warning">
          Could not load the report ({error}).{" "}
          <button type="button" className="underline" onClick={reload}>
            Retry
          </button>
        </InlineAlert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={`Classes cancelled — ${monthLabel(year, month)}`} value={String(report.totalCancelledClasses)} icon={FileBarChart2} tone="warning" loading={loading} />
        <KpiCard label="Teachers with cancellations" value={String(report.teachers.length)} icon={Users} tone="neutral" loading={loading} />
        <div className="flex items-center rounded-xl border border-border bg-card p-4 text-sm">
          {report.isSnapshot ? (
            <span>
              <Badge variant="success">Month-end report</Badge>
              <span className="mt-1 block text-muted-foreground">Generated {formatDate(report.generatedAtUtc, "datetime")}</span>
            </span>
          ) : (
            <span>
              <Badge variant="warning">Live preview</Badge>
              <span className="mt-1 block text-muted-foreground">The final report is generated automatically at 11:59 PM on the last day of the month.</span>
            </span>
          )}
        </div>
      </div>

      {!loading && report.teachers.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No classes were cancelled for teacher leave in {monthLabel(year, month)}.
        </div>
      )}

      {report.teachers.map((teacher) => (
        <section key={teacher.teacherProfileId} className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">{teacher.teacherName}</h3>
            <Badge variant="destructive">{teacher.totalCancelledClasses} cancelled in total</Badge>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Leave date</th>
                  <th className="px-4 py-2 font-medium">Classes cancelled</th>
                  <th className="px-4 py-2 font-medium">Batch</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {teacher.days.map((day) =>
                  day.classes.map((c, i) => (
                    <tr key={`${day.date}-${i}`} className="border-t border-border/60 align-top">
                      {i === 0 && (
                        <>
                          <td className="px-4 py-2 font-medium" rowSpan={day.classes.length}>
                            {formatDate(day.date, "long")}
                          </td>
                          <td className="px-4 py-2" rowSpan={day.classes.length}>
                            {day.cancelledClasses}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-2">{c.batchName}</td>
                      <td className="px-4 py-2">{c.classType}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.startTime}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
