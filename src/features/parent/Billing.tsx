import { useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, ReceiptText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FeeStatusBadge } from "@/components/StatusBadge";
import { PayNowModal } from "@/components/PayNowModal";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/state/session";
import { getChildrenByParent } from "@/data/children";
import { getInvoicesForParent } from "@/data/invoices";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { toFrontendInvoice } from "@/api/billing";
import { getParentDashboard, getParentInvoices } from "@/api/parentPortal";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/types";

const PARENT_ID = "p-1";

export default function ParentBilling() {
  const { children } = useSession();
  const mockChildren = getChildrenByParent(PARENT_ID);
  const { data: invoices, reload: reloadInvoices } = useApiData(
    () => getParentInvoices().then((items) => items.map(toFrontendInvoice)),
    getInvoicesForParent(PARENT_ID)
  );
  const { data: isSuspended } = useApiData(
    () => getParentDashboard().then((d) => d.isSuspended),
    mockChildren.some((c) => c.feeStatus === "suspended")
  );
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  function openPayModal(invoice: Invoice) {
    setPayInvoice(invoice);
    setPayOpen(true);
  }

  // The suspended child's name for the banner: real children in API mode, mock in demo.
  const suspendedChild = apiEnabled()
    ? isSuspended
      ? children[0]
      : undefined
    : mockChildren.find((c) => c.feeStatus === "suspended");

  const outstanding = invoices.filter((i) => i.status !== "paid");
  const paid = invoices.filter((i) => i.status === "paid");
  const totalOutstanding = outstanding.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = paid.reduce((sum, i) => sum + i.amount, 0);
  const nextDue = [...outstanding].sort((a, b) => +new Date(a.dueOn) - +new Date(b.dueOn))[0];

  const columns: DataTableColumn<Invoice>[] = [
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
    { key: "amount", header: "Amount", render: (r) => formatCurrency(r.amount), sortable: true, accessor: (r) => r.amount },
    { key: "due", header: "Due Date", render: (r) => formatDate(r.dueOn, "short"), sortable: true, accessor: (r) => r.dueOn },
    { key: "status", header: "Status", render: (r) => <FeeStatusBadge status={r.status} /> },
    {
      key: "action",
      header: "",
      render: (r) =>
        r.status !== "paid" ? (
          <Button size="sm" onClick={() => openPayModal(r)}>
            Pay Now
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Payments &amp; Billing" description="Invoices, receipts and secure Pay Now checkout for your family." />

      {suspendedChild && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Access restricted for {suspendedChild.name}</p>
              <p className="mt-0.5 text-sm text-foreground/80">
                Live classes and resources are paused until the outstanding fee is cleared. Pay now to restore full access instantly.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={Wallet} tone={totalOutstanding > 0 ? "destructive" : "success"} />
        <KpiCard label="Paid this year" value={formatCurrency(totalPaid)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Next due date" value={nextDue ? formatDate(nextDue.dueOn, "short") : "—"} icon={ReceiptText} tone="primary" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Every invoice raised for your children</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable data={invoices} columns={columns} rowKey={(r) => r.id} searchPlaceholder="Search invoices…" />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Receipts for completed payments</CardDescription>
        </CardHeader>
        <CardContent>
          {paid.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments yet" />
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
        amount={payInvoice?.amount ?? 0}
        invoiceLabel={payInvoice ? `${payInvoice.courseName} — ${payInvoice.childName}` : undefined}
        invoiceId={payInvoice?.apiId}
        onInitiated={reloadInvoices}
      />
    </div>
  );
}
