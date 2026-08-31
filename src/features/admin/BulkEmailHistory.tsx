import { useState } from "react";
import { Loader2, Mail, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { useApiData } from "@/api/hooks";
import {
  getBulkEmailBlastDetail,
  getBulkEmailHistory,
  type ApiBulkEmailBlastDetail,
  type ApiBulkEmailHistoryItem,
} from "@/api/reports";
import { formatDate } from "@/lib/utils";

const STATUS_VARIANT = {
  Sent: "success",
  Read: "success",
  Failed: "destructive",
  Pending: "muted",
} as const;

export default function AdminBulkEmailHistory() {
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
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Bulk Email History"
        description="Every Bulk Email ever sent, its delivery status per recipient, and any parent replies."
      />

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

          <Button variant="outline" onClick={() => setOpenBlastId(null)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
