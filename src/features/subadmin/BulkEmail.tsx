import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mail, MessageSquare, Send, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { CHILDREN } from "@/data/children";
import { BATCHES } from "@/data/batches";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import { useApiData } from "@/api/hooks";
import { listBatches } from "@/api/batches";
import {
  getBulkEmailRecipientCount,
  sendBulkEmail,
  getBulkEmailHistory,
  getBulkEmailBlastDetail,
  type ApiBulkEmailBlastDetail,
  type ApiBulkEmailHistoryItem,
} from "@/api/reports";
import { formatDate } from "@/lib/utils";

type Scope = "all" | "batch";

const MOCK_BATCH_OPTIONS = BATCHES.map((b) => ({ id: b.id, name: b.name }));

const STATUS_VARIANT = {
  Sent: "success",
  Read: "success",
  Failed: "destructive",
  Pending: "muted",
} as const;

/**
 * Delegated-portal Bulk Email — ported from admin/BulkEmail.tsx + admin/BulkEmailHistory.tsx,
 * combined into one tabbed page (they're the same "Communication" feature: compose + past sends).
 * CommunicationsController's bulk-email POST is Communication:Create; the recipient-count preview
 * and both history endpoints are Communication:View — the menu gate that reaches this page already
 * implies View, so only the Send action itself needs its own check.
 */
export default function SubAdminBulkEmail() {
  const { hasPermission } = useSession();
  const canSend = !apiEnabled() || hasPermission("Communication", "Create");

  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Bulk Email"
        description="Compose an announcement to all active students or a specific batch, and review past sends."
      />
      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="compose">
          <ComposePanel canSend={canSend} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComposePanel({ canSend }: { canSend: boolean }) {
  const { toast } = useToast();
  const { data: batchOptions } = useApiData(
    () => listBatches().then((batches) => batches.map((b) => ({ id: b.id, name: b.name }))),
    MOCK_BATCH_OPTIONS
  );
  const [scope, setScope] = useState<Scope>("all");
  const [batchId, setBatchId] = useState(BATCHES[0].id);
  useEffect(() => {
    if (batchOptions.length > 0) setBatchId(batchOptions[0].id);
  }, [batchOptions]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);

  const usingApi = apiEnabled();
  const activeStudents = useMemo(() => CHILDREN.filter((c) => c.enrollmentComplete), []);

  const [apiCount, setApiCount] = useState<number | null>(null);
  useEffect(() => {
    if (!usingApi) return;
    let cancelled = false;
    setApiCount(null);
    getBulkEmailRecipientCount(scope === "batch" ? batchId : undefined)
      .then((count) => {
        if (!cancelled) setApiCount(count);
      })
      .catch(() => {
        /* keep the placeholder if the preview can't load */
      });
    return () => {
      cancelled = true;
    };
  }, [usingApi, scope, batchId]);

  const recipientCount = useMemo(() => {
    if (sentCount !== null) return sentCount;
    if (usingApi) return apiCount;
    if (scope === "all") return activeStudents.length;
    return CHILDREN.filter((c) => c.batchId === batchId).length;
  }, [scope, batchId, activeStudents, sentCount, usingApi, apiCount]);

  async function handleSend() {
    if (!apiEnabled()) {
      setSent(true);
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const result = await sendBulkEmail({ subject, body, batchId: scope === "batch" ? batchId : undefined });
      setSentCount(result.recipientCount);
      setSent(true);
      toast({ variant: "success", title: "Email sent", description: `Delivered to ${result.recipientCount} recipient(s).` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't send the email. Please try again.";
      setSendError(message);
      toast({ variant: "error", title: "Couldn't send email", description: message });
    } finally {
      setSending(false);
    }
  }

  function handleComposeAnother() {
    setSent(false);
    setSubject("");
    setBody("");
    setSendError(null);
  }

  if (!canSend) {
    return (
      <EmptyState
        icon={Mail}
        title="No permission to send Bulk Email"
        description="This role hasn't been granted Communication: Create. Ask an admin to grant it, or use the History tab to review past sends."
      />
    );
  }

  if (sent) {
    return (
      <Card className="mx-auto mt-5 max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-foreground">Email sent!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              &quot;{subject || "Untitled message"}&quot; was delivered to {recipientCount} recipient{recipientCount === 1 ? "" : "s"}.
            </p>
          </div>
          <Button onClick={handleComposeAnother}>
            <Mail className="h-4 w-4" />
            Compose Another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="grid gap-1.5">
            <Label id="bulk-email-scope-label">Recipient scope</Label>
            <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <TabsList aria-labelledby="bulk-email-scope-label">
                <TabsTrigger value="all">All Active Students</TabsTrigger>
                <TabsTrigger value="batch">Per Batch</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {scope === "batch" && (
            <div className="grid gap-1.5">
              <Label htmlFor="bulk-email-batch-select">Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger id="bulk-email-batch-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {batchOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="email-subject">Subject <span className="text-destructive">*</span></Label>
            <Input id="email-subject" placeholder="e.g. Upcoming holiday schedule" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email-body">Message <span className="text-destructive">*</span></Label>
            <Textarea
              id="email-body"
              placeholder="Write your announcement here…"
              className="min-h-[220px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              {recipientCount === null ? (
                <>Counting recipients…</>
              ) : (
                <>
                  This will be delivered to <span className="font-semibold text-foreground">{recipientCount}</span> recipient
                  {recipientCount === 1 ? "" : "s"}.
                </>
              )}
            </p>
            <Button disabled={!subject.trim() || !body.trim() || sending || recipientCount === null} onClick={() => setSendConfirmOpen(true)}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
          {sendError && <p className="text-sm font-medium text-destructive">{sendError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${CHART_PALETTE[4]}1A`, color: CHART_PALETTE[4] }}>
              <Users2 className="h-[18px] w-[18px]" />
            </span>
            <p className="text-sm font-semibold text-foreground">Recipient Preview</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{recipientCount ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {scope === "all" ? "active students across all batches" : "students in the selected batch"}
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {!usingApi && <li>• Delivery is simulated — no real emails are sent.</li>}
            <li>• Recipients are derived live from enrollment and batch data.</li>
            <li>• Use &quot;Per Batch&quot; scope to target a single class roster.</li>
          </ul>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title="Send this email?"
        description={
          recipientCount !== null
            ? `"${subject || "Untitled message"}" will be delivered to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"} — ${scope === "all" ? "every active student across all batches" : "everyone in the selected batch"}. This can't be recalled once sent.`
            : undefined
        }
        confirmLabel="Send"
        onConfirm={() => {
          setSendConfirmOpen(false);
          return handleSend();
        }}
      />
    </div>
  );
}

function HistoryPanel() {
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
    <div className="mt-5">
      <DataTable
        data={history}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={openBlast}
        searchPlaceholder="Search by subject or sender…"
        searchFn={(row, q) => row.subject.toLowerCase().includes(q.toLowerCase()) || row.sentByName.toLowerCase().includes(q.toLowerCase())}
        emptyTitle="No Bulk Email sent yet"
        emptyDescription="Sends from the Compose tab will show up here with delivery status and replies."
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
    </div>
  );
}
