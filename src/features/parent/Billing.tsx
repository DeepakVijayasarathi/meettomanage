import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Download, Loader2, ReceiptText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FeeStatusBadge } from "@/components/StatusBadge";
import { PayNowModal } from "@/components/PayNowModal";
import { InvoiceDetailDialog } from "@/components/InvoiceDetailDialog";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/state/session";
import { getChildrenByParent } from "@/data/children";
import { getInvoicesForParent } from "@/data/invoices";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { toFrontendInvoice } from "@/api/billing";
import { downloadParentInvoice, getParentDashboard, getParentInvoices } from "@/api/parentPortal";
import { formatCurrency, formatDate, invoiceBalance } from "@/lib/utils";
import type { Invoice } from "@/types";

const PARENT_ID = "p-1";

export default function ParentBilling() {
  const { children } = useSession();
  const mockChildren = getChildrenByParent(PARENT_ID);
  const { data: invoices, loading: invoicesLoading, error: invoicesError, reload: reloadInvoices } = useApiData(
    () => getParentInvoices().then((items) => items.map(toFrontendInvoice)),
    getInvoicesForParent(PARENT_ID)
  );
  const { data: isSuspended } = useApiData(
    () => getParentDashboard().then((d) => d.isSuspended),
    mockChildren.some((c) => c.feeStatus === "suspended"),
    false
  );
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Invoice | null>(null);

  const openPayModal = useCallback((invoice: Invoice) => {
    setPayInvoice(invoice);
    setPayOpen(true);
  }, []);

  const handleDownload = useCallback(async (invoice: Invoice) => {
    if (!invoice.apiId) return;
    setDownloadingId(invoice.id);
    setDownloadError(null);
    try {
      await downloadParentInvoice(invoice.apiId, invoice.id);
    } catch {
      setDownloadError(`Couldn't download ${invoice.id}. Please try again.`);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // Suspension is computed once for the whole parent account (ParentPortalService) and
  // applies identically to every child — never assume it's about just one of them.
  // API mode: list every child on the account. Demo mode's mock family is single-child,
  // so filtering by feeStatus stays accurate without needing the account-wide flag.
  const suspendedChildNames = apiEnabled()
    ? isSuspended
      ? children.map((c) => c.name)
      : []
    : mockChildren.filter((c) => c.feeStatus === "suspended").map((c) => c.name);
  const isAccountSuspended = suspendedChildNames.length > 0;

  // Cancelled invoices are neither paid nor owed — exclude them from what's "outstanding".
  const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
  const paid = invoices.filter((i) => i.status === "paid");
  // Partial payments count only what's still owed
  const totalOutstanding = outstanding.reduce((sum, i) => sum + invoiceBalance(i), 0);
  const totalPaid = paid.reduce((sum, i) => sum + i.amount, 0);
  const nextDue = [...outstanding].sort((a, b) => +new Date(a.dueOn) - +new Date(b.dueOn))[0];

  const columns: DataTableColumn<Invoice>[] = useMemo(
    () => [
    {
      key: "id",
      header: "Invoice",
      render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span>,
      sortable: true,
      accessor: (r) => r.id,
    },
    { key: "child", header: "Child", render: (r) => r.childName, sortable: true, accessor: (r) => r.childName },
    {
      key: "course",
      header: "Course",
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.courseName}</p>
          <p className="text-xs text-muted-foreground">{r.department}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (r) => {
        const balance = invoiceBalance(r);
        const partiallyPaid = r.status !== "paid" && (r.amountPaid ?? 0) > 0;
        return (
          <div>
            <p className="font-medium text-foreground">{formatCurrency(r.amount)}</p>
            {partiallyPaid && (
              <p className="text-xs text-muted-foreground">
                Paid {formatCurrency(r.amountPaid!)} · <span className="font-semibold text-warning-foreground">Balance {formatCurrency(balance)}</span>
              </p>
            )}
          </div>
        );
      },
      sortable: true,
      accessor: (r) => r.amount,
    },
    { key: "due", header: "Due Date", render: (r) => formatDate(r.dueOn, "short"), sortable: true, accessor: (r) => r.dueOn },
    { key: "status", header: "Status", render: (r) => <FeeStatusBadge status={r.status} /> },
    {
      key: "action",
      header: "",
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.status !== "paid" && r.status !== "cancelled" && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); openPayModal(r); }}>
              Pay {formatCurrency(invoiceBalance(r))}
            </Button>
          )}
          {r.apiId && (
            <Button
              size="sm"
              variant="outline"
              title="Download invoice"
              aria-label="Download invoice"
              disabled={downloadingId === r.id}
              onClick={(e) => { e.stopPropagation(); handleDownload(r); }}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
    ],
    [openPayModal, downloadingId, handleDownload]
  );

  return (
    <div>
      <PageHeader eyebrow="Account" title="Payments &amp; Billing" description="Invoices, receipts and secure Pay Now checkout for your family." />

      {apiEnabled() && invoicesError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load your invoices ({invoicesError}).{" "}
          <button type="button" className="underline" onClick={() => reloadInvoices()}>
            Retry
          </button>
        </InlineAlert>
      )}

      {downloadError && <InlineAlert variant="warning" className="mb-4">{downloadError}</InlineAlert>}

      {isAccountSuspended && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                {suspendedChildNames.length > 1
                  ? "Access is restricted across your account"
                  : `Access restricted for ${suspendedChildNames[0]}`}
              </p>
              <p className="mt-0.5 text-sm text-foreground/80">
                {suspendedChildNames.length > 1
                  ? `Live classes and resources are paused for ${suspendedChildNames.join(", ")} until the outstanding fee is cleared. Pay now to restore full access instantly.`
                  : "Live classes and resources are paused until the outstanding fee is cleared. Pay now to restore full access instantly."}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={Wallet} tone={totalOutstanding > 0 ? "destructive" : "success"} loading={invoicesLoading} />
        <KpiCard label="Paid this year" value={formatCurrency(totalPaid)} icon={CheckCircle2} tone="success" loading={invoicesLoading} />
        <KpiCard label="Next due date" value={nextDue ? formatDate(nextDue.dueOn, "short") : "—"} icon={ReceiptText} tone="primary" loading={invoicesLoading} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Every invoice raised for your children</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={invoices}
            columns={columns}
            rowKey={(r) => r.id}
            searchPlaceholder="Search invoices…"
            onRowClick={(r) => setDetail(r)}
            emptyTitle="No invoices yet"
            emptyDescription="Invoices for your children's courses and subscriptions will appear here once raised."
            error={apiEnabled() ? invoicesError : null}
            onRetry={reloadInvoices}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Receipts for completed payments</CardDescription>
        </CardHeader>
        <CardContent>
          {paid.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments yet" description="Completed payment receipts will appear here once an invoice is paid." />
          ) : (
            <div className="flex flex-col gap-2">
              {paid.map((inv) => (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {inv.courseName} — {inv.childName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Paid on {formatDate(inv.issuedOn, "long")} · {inv.id}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-success">{formatCurrency(inv.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PayNowModal
        open={payOpen}
        onOpenChange={setPayOpen}
        amount={payInvoice ? invoiceBalance(payInvoice) : 0}
        invoiceLabel={payInvoice ? `${payInvoice.courseName} — ${payInvoice.childName}` : undefined}
        invoiceId={payInvoice?.apiId}
        onInitiated={reloadInvoices}
      />

      <InvoiceDetailDialog
        invoice={detail}
        onClose={() => setDetail(null)}
        footerActions={
          detail && (
            <>
              {detail.apiId && (
                <Button variant="outline" onClick={() => handleDownload(detail)} disabled={downloadingId === detail.id}>
                  {downloadingId === detail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {downloadingId === detail.id ? "Downloading…" : "Download PDF"}
                </Button>
              )}
              {detail.status !== "paid" && detail.status !== "cancelled" && (
                <Button
                  onClick={() => {
                    setDetail(null);
                    openPayModal(detail);
                  }}
                >
                  Pay {formatCurrency(invoiceBalance(detail))}
                </Button>
              )}
            </>
          )
        }
      />
    </div>
  );
}
