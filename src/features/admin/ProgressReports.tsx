import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Save, ScrollText, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  listProgressReports,
  saveProgressReportContent,
  sendProgressReport,
  progressReportPeriodLabel,
  type ApiProgressReport,
} from "@/api/progressReports";
import { DEMO_PROGRESS_REPORTS } from "@/data/progressReports";
import { cn, formatDate, getInitials } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toApiShape(items: typeof DEMO_PROGRESS_REPORTS): ApiProgressReport[] {
  return items.map((r) => ({
    id: r.id,
    childId: r.childId,
    childName: r.childName,
    parentUserId: r.childId,
    parentName: r.parentName,
    parentEmail: r.parentEmail,
    periodYear: r.periodYear,
    periodMonth: r.periodMonth,
    status: r.status,
    content: r.content,
    sentAtUtc: r.sentAtUtc,
    updatedAtUtc: null,
  }));
}

export default function AdminProgressReports() {
  const live = apiEnabled();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null);

  const { data: reports, loading, error, reload } = useApiData<ApiProgressReport[]>(
    () => listProgressReports({ year: period.year, month: period.month }),
    toApiShape(DEMO_PROGRESS_REPORTS.filter((r) => r.periodYear === period.year && r.periodMonth === period.month))
  );

  useEffect(() => {
    reload();
    setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.year, period.month]);

  const selected = reports.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    setDraftContent(selected?.content ?? "");
    setSavedAt(null);
    setActionError(null);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => a.childName.localeCompare(b.childName)),
    [reports]
  );

  function shiftMonth(delta: number) {
    setPeriod((p) => {
      const d = new Date(p.year, p.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }

  async function saveDraft() {
    if (!selected) return;
    if (!live) {
      setActionError("Demo mode — no report actually saved.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await saveProgressReportContent(selected.id, draftContent);
      await reload();
      setSavedAt(Date.now());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't save the report.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSend() {
    if (!confirmSendId) return;
    if (!live) {
      setActionError("Demo mode — no report actually sent.");
      setConfirmSendId(null);
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      // Save whatever's currently in the textarea before sending — otherwise an admin
      // who edits and clicks Send without first clicking "Save Draft" would email
      // whatever was last persisted (possibly stale or empty), not what's on screen.
      await saveProgressReportContent(confirmSendId, draftContent);
      await sendProgressReport(confirmSendId);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't send the report.");
    } finally {
      setBusy(false);
      setConfirmSendId(null);
    }
  }

  const monthLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;
  const sentCount = reports.filter((r) => r.status === "Sent").length;

  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Progress Reports"
        description="One report per child per month. Write it, save the draft, then send it as an email to the parent — a sent report is locked."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[9rem] text-center text-sm font-semibold">{monthLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {live && error && (
        <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
          Could not load progress reports ({error}).{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </p>
      )}

      {actionError && (
        <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">{actionError}</p>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No reports for this month yet"
          description="Drafts are created automatically for every active child on the 1st of the month."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-base">{monthLabel}</CardTitle>
              <CardDescription>
                {sentCount} of {reports.length} sent
              </CardDescription>
            </CardHeader>
            <CardContent className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto pr-1">
              {sortedReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    r.id === selectedId ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted/60"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {getInitials(r.childName)}
                    </span>
                    <span className="truncate">{r.childName}</span>
                  </span>
                  <Badge variant={r.status === "Sent" ? "success" : "warning"} className="shrink-0 text-[10px]">
                    {r.status === "Sent" ? "Sent" : "Draft"}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          {selected ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>{selected.childName}</CardTitle>
                  <CardDescription>
                    {progressReportPeriodLabel(selected)} &middot; to {selected.parentName} ({selected.parentEmail})
                  </CardDescription>
                </div>
                <Badge variant={selected.status === "Sent" ? "success" : "warning"}>
                  {selected.status === "Sent" ? "Sent" : "Draft"}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Textarea
                  value={selected.status === "Sent" ? selected.content : draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  readOnly={selected.status === "Sent"}
                  placeholder="Attendance, topics covered this month, progress, and areas to improve…"
                  className="min-h-[280px]"
                />

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    {selected.status === "Sent"
                      ? `Sent ${selected.sentAtUtc ? formatDate(selected.sentAtUtc.slice(0, 10)) : ""} — locked.`
                      : savedAt
                        ? "Saved just now."
                        : selected.updatedAtUtc
                          ? `Last saved ${formatDate(selected.updatedAtUtc.slice(0, 10))}`
                          : "Not saved yet."}
                  </p>
                  {selected.status !== "Sent" && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={saveDraft} disabled={busy}>
                        <Save className="h-3.5 w-3.5" /> Save Draft
                      </Button>
                      <Button onClick={() => setConfirmSendId(selected.id)} disabled={busy || !draftContent.trim()}>
                        <Send className="h-3.5 w-3.5" /> Send
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={ScrollText} title="Select a child" description="Pick a child from the list to write or review their report." />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmSendId !== null}
        onOpenChange={(open) => !open && setConfirmSendId(null)}
        title="Send this report?"
        description="Emails the report to the parent and locks it — it can no longer be edited afterward."
        confirmLabel="Send"
        onConfirm={confirmSend}
      />
    </div>
  );
}
