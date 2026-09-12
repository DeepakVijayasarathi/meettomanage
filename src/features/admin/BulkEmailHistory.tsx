import { useState } from "react";
import { Loader2, Mail, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { useApiData } from "@/api/hooks";
import {
  getBulkEmailBlastDetail,
  getBulkEmailHistory,
  getEmailHistory,
  type ApiBulkEmailBlastDetail,
  type ApiBulkEmailHistoryItem,
  type ApiEmailHistoryItem,
  type EmailNotificationType,
} from "@/api/reports";
import { formatDate } from "@/lib/utils";

const STATUS_VARIANT = {
  Sent: "success",
  Read: "success",
  Failed: "destructive",
  Pending: "muted",
} as const;

const TYPE_LABELS: Record<EmailNotificationType, string> = {
  BookingConfirmation: "Booking Confirmation",
  SessionReminder: "Session Reminder",
  NoShowAlert: "No-Show Alert",
  DelayedSessionAlert: "Delayed Session Alert",
  PaymentReminder: "Payment Reminder",
  PaymentReceived: "Payment Received",
  FeeSuspension: "Fee Suspension",
  LeaveStatusUpdate: "Leave Status Update",
  AttendanceUpdate: "Attendance Update",
  PerformanceSummary: "Performance Summary",
  PayoutStatement: "Payout Statement",
  General: "General",
};

/** "Bulk" and "All" are this screen's own view modes; every other value is a real
 *  NotificationType, narrowing "All" down to just that one type. */
type ViewFilter = "Bulk" | "All" | EmailNotificationType;

const VIEW_OPTIONS: { value: ViewFilter; label: string }[] = [
  { value: "Bulk", label: "Bulk Email" },
  { value: "All", label: "All Emails" },
  ...(Object.entries(TYPE_LABELS) as [EmailNotificationType, string][]).map(([value, label]) => ({ value, label })),
];

export default function AdminBulkEmailHistory() {
  // Defaults to Bulk Email (today's behavior) -- switching this is what loads every other
  // email ever sent to a user instead, itself narrowed to one type or left at "All Emails".
  const [view, setView] = useState<ViewFilter>("Bulk");

  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Bulk Email History"
        description="Every Bulk Email ever sent, its delivery status per recipient, and any parent replies — or switch to see every other email sent to users."
      />

      <div className="mb-4 flex items-center gap-2">
        <Label htmlFor="bulk-email-history-view" className="text-sm text-muted-foreground">
          Show
        </Label>
        <Select value={view} onValueChange={(v) => setView(v as ViewFilter)}>
          <SelectTrigger id="bulk-email-history-view" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === "Bulk" ? (
        <BulkEmailPanel />
      ) : (
        // Keyed by the filter so switching type/"All" remounts fresh instead of needing its
        // own effect to trigger a refetch — useApiData only refetches on its own reload().
        <OtherEmailsPanel key={view} type={view === "All" ? undefined : view} />
      )}
    </div>
  );
}

function BulkEmailPanel() {
  const { data: history, loading, error, reload } = useApiData(getBulkEmailHistory, []);
  const [openBlastId, setOpenBlastId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiBulkEmailBlastDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  function openBlast(row: ApiBulkEmailHistoryItem) {
    setOpenBlastId(row.id);
    setDetail(null);
    setDetailLoading(true);
    getBulkEmailBlastDetail(row.id)
      .then(setDetail)
      .finally(() => setDetailLoading(false));
  }

  const columns: DataTableColumn<ApiBulkEmailHistoryItem>[] = [
    {
      key: "subject",
      header: "Subject",
      sortable: true,
      accessor: (row) => row.subject,
      render: (row) => (
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {row.subject}
        </div>
      ),
    },
    {
      key: "scope",
      header: "Sent to",
      render: (row) => (row.scope === "Batch" ? (row.batchName ?? "One batch") : "All active parents"),
    },
    {
      key: "sentByName",
      header: "Sent by",
      render: (row) => row.sentByName,
    },
    {
      key: "sentAtUtc",
      header: "Sent on",
      sortable: true,
      accessor: (row) => new Date(row.sentAtUtc).getTime(),
      render: (row) => formatDate(row.sentAtUtc, "datetime"),
    },
    {
      key: "status",
      header: "Delivery",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="success">{row.successCount} delivered</Badge>
          {row.failureCount > 0 && <Badge variant="destructive">{row.failureCount} failed</Badge>}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={history}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={openBlast}
        searchPlaceholder="Search by subject or sender…"
        searchFn={(row, q) => row.subject.toLowerCase().includes(q.toLowerCase()) || row.sentByName.toLowerCase().includes(q.toLowerCase())}
        emptyTitle="No Bulk Email sent yet"
        emptyDescription="Sends from Bulk Email will show up here with delivery status and replies."
        error={error}
        onRetry={reload}
      />
      {loading && history.length === 0 && !error && (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      <Dialog open={openBlastId !== null} onOpenChange={(open) => !open && setOpenBlastId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.subject ?? "Bulk Email"}</DialogTitle>
            <DialogDescription>
              {detail && (
                <>
                  Sent by {detail.sentByName} on {formatDate(detail.sentAtUtc, "datetime")} to{" "}
                  {detail.scope === "Batch" ? (detail.batchName ?? "one batch") : "all active parents"}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : detail ? (
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
              {detail.recipients.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{r.recipientName}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </div>
                  {r.status === "Failed" && r.errorMessage && (
                    <p className="mt-2 text-xs font-medium text-destructive">{r.errorMessage}</p>
                  )}
                  {r.replyMessage && (
                    <div className="mt-2.5 flex items-start gap-2 rounded-md bg-muted/40 p-2.5">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground">{r.replyMessage}</p>
                        {r.replyAtUtc && (
                          <p className="mt-1 text-[11px] text-muted-foreground">Replied {formatDate(r.replyAtUtc, "datetime")}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBlastId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Every individual (non-Bulk-Email) email sent to a user — reminders, booking confirmations,
 *  payment notices, and the rest of NotificationType — one row per recipient per send. */
function OtherEmailsPanel({ type }: { type?: EmailNotificationType }) {
  const { data: emails, loading, error, reload } = useApiData(() => getEmailHistory(type), []);

  const columns: DataTableColumn<ApiEmailHistoryItem>[] = [
    {
      key: "subject",
      header: "Subject",
      sortable: true,
      accessor: (row) => row.subject ?? "",
      render: (row) => (
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {row.subject ?? "(no subject)"}
        </div>
      ),
    },
    {
      key: "recipient",
      header: "Recipient",
      sortable: true,
      accessor: (row) => row.recipientName,
      render: (row) => (
        <div>
          <p className="text-sm text-foreground">{row.recipientName}</p>
          <p className="text-xs text-muted-foreground">{row.recipientEmail}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      accessor: (row) => TYPE_LABELS[row.type],
      render: (row) => <Badge variant="outline">{TYPE_LABELS[row.type]}</Badge>,
    },
    {
      key: "sentAtUtc",
      header: "Sent on",
      sortable: true,
      accessor: (row) => new Date(row.sentAtUtc ?? row.createdAtUtc).getTime(),
      render: (row) => formatDate(row.sentAtUtc ?? row.createdAtUtc, "datetime"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>,
    },
  ];

  return (
    <>
      <DataTable
        data={emails}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search by subject or recipient…"
        searchFn={(row, q) =>
          (row.subject ?? "").toLowerCase().includes(q.toLowerCase()) || row.recipientName.toLowerCase().includes(q.toLowerCase())
        }
        emptyTitle="No emails found"
        emptyDescription="Reminders, confirmations and other system emails will show up here as they're sent."
        error={error}
        onRetry={reload}
      />
      {loading && emails.length === 0 && !error && (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
    </>
  );
}
