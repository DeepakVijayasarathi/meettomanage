import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, FileText, IndianRupee, TimerReset, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FeeStatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INVOICES } from "@/data/invoices";
import { getParentById } from "@/data/users";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import {
  listInvoiceRows,
  listInvoiceTransactions,
  recordPayment,
  requestRefund,
  toFrontendInvoice,
  type ApiPaymentMethod,
  type ApiPaymentTransaction,
} from "@/api/billing";
import { CashConfirmationsPanel } from "@/components/CashConfirmationsPanel";
import { RefundRequestsPanel } from "@/components/RefundRequestsPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useSession } from "@/state/session";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";

const PAYMENT_METHODS: { value: ApiPaymentMethod; label: string }[] = [
  { value: "Cash", label: "Cash (collected at centre)" },
  { value: "Upi", label: "UPI" },
  { value: "Card", label: "Card" },
  { value: "NetBanking", label: "Net Banking" },
  { value: "Wallet", label: "Wallet" },
  { value: "Other", label: "Other" },
];

const DEPARTMENT_COLOR: Record<Invoice["department"], string> = {
  Phonics: CHART_PALETTE[3],
  Maths: CHART_PALETTE[4],
};

export default function AdminBilling() {
  // GET /api/invoices is paged (the table grows one row per billing cycle, forever). This
  // screen filters, sorts and totals client-side, so it takes one full page and lets
  // DataTable paginate that in the browser; `totalCount` is what tells us when the page
  // no longer covers the whole table, so the KPI figures below can say so.
  const { data: invoiceData, loading: invoicesLoading, error: invoicesError, reload } = useApiData(
    () => listInvoiceRows(toFrontendInvoice),
    { rows: INVOICES, totalCount: INVOICES.length },
    { rows: [], totalCount: 0 }
  );
  const invoices = invoiceData.rows;
  const truncated = invoiceData.totalCount > invoices.length;
  const live = apiEnabled();
  const { hasPermission } = useSession();
  const canRequestRefund = hasPermission("BillingFinance", "Create");
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  // Record-payment (incl. confirming a parent's cash intent) state
  const [recording, setRecording] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<ApiPaymentMethod>("Cash");
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);

  // Payment history + refund request state for the open invoice
  const [transactions, setTransactions] = useState<ApiPaymentTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [refundTargetId, setRefundTargetId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundBanner, setRefundBanner] = useState<string | null>(null);

  const balanceDue = detail ? detail.amount - (detail.amountPaid ?? 0) : 0;

  function openDetail(row: Invoice) {
    setDetail(row);
    setDownloaded(false);
    setRecording(false);
    setPayError(null);
    setPayMethod("Cash");
    setPayAmount(String(row.amount - (row.amountPaid ?? 0)));
    setTransactions([]);
    setRefundTargetId(null);
    setRefundError(null);
    setRefundBanner(null);
  }

  useEffect(() => {
    if (!live || !detail?.apiId) return;
    let cancelled = false;
    setTransactionsLoading(true);
    listInvoiceTransactions(detail.apiId)
      .then((items) => {
        if (!cancelled) setTransactions(items);
      })
      .catch(() => {
        /* payment history just stays empty — the invoice detail itself still works */
      })
      .finally(() => {
        if (!cancelled) setTransactionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [live, detail?.apiId]);

  function openRefundForm(transaction: ApiPaymentTransaction) {
    setRefundTargetId(transaction.id);
    setRefundAmount(String(transaction.amount - transaction.alreadyRefunded));
    setRefundReason("");
    setRefundError(null);
  }

  async function submitRefund() {
    if (!refundTargetId || !detail?.apiId) return;
    const amount = Number(refundAmount);
    const target = transactions.find((t) => t.id === refundTargetId);
    const refundable = target ? target.amount - target.alreadyRefunded : 0;
    if (!Number.isFinite(amount) || amount <= 0) {
      setRefundError("Enter a valid amount.");
      return;
    }
    if (amount > refundable) {
      setRefundError(`Amount exceeds what's left to refund on this payment (${formatCurrency(refundable)}).`);
      return;
    }
    if (!refundReason.trim()) {
      setRefundError("A reason is required.");
      return;
    }
    setRefundSubmitting(true);
    setRefundError(null);
    try {
      await requestRefund({ paymentTransactionId: refundTargetId, amount, reason: refundReason.trim() });
      setRefundBanner(`Refund of ${formatCurrency(amount)} requested — awaiting approval.`);
      setRefundTargetId(null);
      const items = await listInvoiceTransactions(detail.apiId);
      setTransactions(items);
    } catch (e) {
      setRefundError(e instanceof Error ? e.message : "Couldn't request this refund.");
    } finally {
      setRefundSubmitting(false);
    }
  }

  function reviewPayment() {
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Enter a valid amount.");
      return;
    }
    if (amount > balanceDue) {
      setPayError(`Amount exceeds the balance due (${formatCurrency(balanceDue)}).`);
      return;
    }
    setPayError(null);
    setPayConfirmOpen(true);
  }

  async function submitPayment() {
    if (!detail?.apiId) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Enter a valid amount.");
      return;
    }
    if (amount > balanceDue) {
      setPayError(`Amount exceeds the balance due (${formatCurrency(balanceDue)}).`);
      return;
    }
    setSaving(true);
    setPayError(null);
    try {
      await recordPayment(detail.apiId, { amount, method: payMethod });
      await reload();
      setDetail(null);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Couldn't record the payment.");
    } finally {
      setSaving(false);
    }
  }

  const totals = useMemo(() => {
    const paid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
    const pending = invoices.filter((i) => i.status === "pending" || i.status === "partial");
    const overdue = invoices.filter((i) => i.status === "overdue");
    return {
      totalRevenue: paid,
      pendingAmount: pending.reduce((sum, i) => sum + i.amount, 0),
      pendingCount: pending.length,
      overdueAmount: overdue.reduce((sum, i) => sum + i.amount, 0),
      overdueCount: overdue.length,
    };
  }, [invoices]);

  const columns: DataTableColumn<Invoice>[] = useMemo(
    () => [
      {
        key: "id",
        header: "Invoice",
        sortable: true,
        accessor: (row) => row.id,
        render: (row) => (
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${DEPARTMENT_COLOR[row.department]}1A`, color: DEPARTMENT_COLOR[row.department] }}
            >
              <FileText className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{row.id}</p>
              <p className="text-xs text-muted-foreground">{row.childName}</p>
            </div>
          </div>
        ),
      },
      {
        key: "department",
        header: "Department",
        sortable: true,
        accessor: (row) => row.department,
        render: (row) => <Badge variant="outline">{row.department}</Badge>,
      },
      { key: "courseName", header: "Course", render: (row) => <span className="text-sm text-muted-foreground">{row.courseName}</span> },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        accessor: (row) => row.amount,
        render: (row) => <span className="text-sm font-semibold text-foreground">{formatCurrency(row.amount)}</span>,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => <FeeStatusBadge status={row.status} />,
      },
      {
        key: "issuedOn",
        header: "Issued",
        sortable: true,
        accessor: (row) => row.issuedOn,
        render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.issuedOn)}</span>,
      },
      {
        key: "dueOn",
        header: "Due",
        sortable: true,
        accessor: (row) => row.dueOn,
        render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.dueOn)}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Billing & Finance"
        description="Track packages, invoices, receipts and refunds across every parent account."
      />

      {live && invoicesError && (
        <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-sm font-medium text-warning-foreground">
          Could not load invoices ({invoicesError}) — the table below may be incomplete.{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Revenue Collected" value={formatCurrency(totals.totalRevenue)} icon={IndianRupee} tone="success" loading={invoicesLoading} />
        <KpiCard label="Pending Invoices" value={`${formatNumber(totals.pendingCount)} · ${formatCurrency(totals.pendingAmount)}`} icon={TimerReset} tone="warning" loading={invoicesLoading} />
        <KpiCard label="Overdue Invoices" value={`${formatNumber(totals.overdueCount)} · ${formatCurrency(totals.overdueAmount)}`} icon={AlertTriangle} tone="destructive" loading={invoicesLoading} />
      </div>

      {truncated && (
        // These KPIs are summed client-side over the rows actually loaded. Once the
        // invoice table outgrows one page they stop being whole-account figures, and a
        // money number that quietly means something narrower than its label is worse
        // than one that admits its scope.
        <p className="mt-3 text-xs text-muted-foreground">
          Showing the {formatNumber(invoices.length)} most recent of {formatNumber(invoiceData.totalCount)} invoices —
          the totals above cover the loaded rows only.
        </p>
      )}

      <Tabs defaultValue="action" className="mt-8">
        <TabsList>
          <TabsTrigger value="action">Needs Your Action</TabsTrigger>
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="action" className="flex flex-col gap-8">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pending Cash Confirmations
            </h2>
            <CashConfirmationsPanel />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pending Refund Requests
            </h2>
            <RefundRequestsPanel />
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <DataTable
            data={invoices}
            columns={columns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search invoices by ID or student…"
            onRowClick={openDetail}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.id}</DialogTitle>
                <DialogDescription>{detail.courseName}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</p>
                  <p className="mt-1 font-medium text-foreground">{detail.childName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</p>
                  {/* The API resolves this via Invoice.ParentProfile.User — never borrow a name from the mocks in live mode */}
                  <p className="mt-1 font-medium text-foreground">{live ? detail.parentName : getParentById(detail.parentId)?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</p>
                  <p className="mt-1 font-medium text-foreground">{detail.department}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</p>
                  <p className="mt-1 font-medium text-foreground">{formatCurrency(detail.amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Issued On</p>
                  <p className="mt-1 font-medium text-foreground">{formatDate(detail.issuedOn, "long")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due On</p>
                  <p className="mt-1 font-medium text-foreground">{formatDate(detail.dueOn, "long")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <FeeStatusBadge status={detail.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Balance Due</p>
                  <p className="mt-1 font-medium text-foreground">{formatCurrency(balanceDue)}</p>
                </div>
              </div>

              {live && detail.apiId && (transactionsLoading || transactions.length > 0) && (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payments</p>
                  {transactionsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading payment history…</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {transactions.map((t) => {
                        const refundable = t.amount - t.alreadyRefunded;
                        return (
                          <div
                            key={t.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium text-foreground">
                                {formatCurrency(t.amount)}
                                {t.method ? ` · ${t.method}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t.paidAtUtc ? formatDate(t.paidAtUtc.slice(0, 10)) : "—"}
                                {t.receiptNumber ? ` · ${t.receiptNumber}` : ""}
                                {t.alreadyRefunded > 0 ? ` · ${formatCurrency(t.alreadyRefunded)} refunded` : ""}
                              </p>
                            </div>
                            {canRequestRefund && refundable > 0 && refundTargetId !== t.id && (
                              <Button size="sm" variant="outline" onClick={() => openRefundForm(t)}>
                                <Undo2 className="h-3.5 w-3.5" />
                                Refund
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {refundTargetId && (
                    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
                      <p className="text-sm font-semibold text-foreground">Request refund</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="refund-amount">Amount</Label>
                          <Input
                            id="refund-amount"
                            type="number"
                            min="0"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="refund-reason">Reason</Label>
                        <Textarea
                          id="refund-reason"
                          rows={2}
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="Why is this being refunded?"
                        />
                      </div>
                      {refundError && <p className="text-sm font-medium text-destructive">{refundError}</p>}
                      <div className="flex items-center gap-2">
                        <Button size="sm" disabled={refundSubmitting} onClick={submitRefund}>
                          {refundSubmitting ? "Requesting…" : "Submit refund request"}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={refundSubmitting} onClick={() => setRefundTargetId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {refundBanner && <p className="text-sm font-medium text-success">{refundBanner}</p>}
                </div>
              )}

              {recording && (
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-sm font-semibold text-foreground">Record / confirm payment</p>
                  <p className="text-xs text-muted-foreground">
                    Use this to confirm a parent's cash payment or log any manual payment. The invoice updates immediately
                    and the parent's dashboard reflects it.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="pay-amount">Amount</Label>
                      <Input
                        id="pay-amount"
                        type="number"
                        min="0"
                        max={balanceDue}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="pay-method">Method</Label>
                      <Select value={payMethod} onValueChange={(v) => setPayMethod(v as ApiPaymentMethod)}>
                        <SelectTrigger id="pay-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {payError && <p className="text-sm font-medium text-destructive">{payError}</p>}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
                {live && detail.apiId && detail.status !== "paid" && detail.status !== "cancelled" ? (
                  recording ? (
                    <Button onClick={reviewPayment} disabled={saving}>
                      {saving ? "Recording…" : "Confirm payment"}
                    </Button>
                  ) : (
                    <Button onClick={() => setRecording(true)}>
                      <IndianRupee className="h-4 w-4" />
                      Record payment
                    </Button>
                  )
                ) : (
                  <Button onClick={() => setDownloaded(true)}>
                    <Download className="h-4 w-4" />
                    {downloaded ? "Receipt Downloaded" : "Download Receipt"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={payConfirmOpen}
        onOpenChange={setPayConfirmOpen}
        title="Record this payment?"
        description={`${formatCurrency(Number(payAmount) || 0)} via ${payMethod} will be applied to ${detail?.id ?? "this invoice"} immediately, updating the balance and the parent's dashboard. This can't be undone from here.`}
        confirmLabel="Record payment"
        destructive
        onConfirm={submitPayment}
      />
    </div>
  );
}
