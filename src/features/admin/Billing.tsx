import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileText, IndianRupee, TimerReset } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INVOICES } from "@/data/invoices";
import { getParentById } from "@/data/users";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import { listInvoices, recordPayment, toFrontendInvoice, type ApiPaymentMethod } from "@/api/billing";
import { CashConfirmationsPanel } from "@/components/CashConfirmationsPanel";
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
  const { data: invoices, error: invoicesError, reload } = useApiData(
    () => listInvoices().then((items) => items.map(toFrontendInvoice)),
    INVOICES
  );
  const live = apiEnabled();
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  // Record-payment (incl. confirming a parent's cash intent) state
  const [recording, setRecording] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<ApiPaymentMethod>("Cash");
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const balanceDue = detail ? detail.amount - (detail.amountPaid ?? 0) : 0;

  function openDetail(row: Invoice) {
    setDetail(row);
    setDownloaded(false);
    setRecording(false);
    setPayError(null);
    setPayMethod("Cash");
    setPayAmount(String(row.amount - (row.amountPaid ?? 0)));
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
        <KpiCard label="Total Revenue Collected" value={formatCurrency(totals.totalRevenue)} icon={IndianRupee} tone="success" />
        <KpiCard label="Pending Invoices" value={`${formatNumber(totals.pendingCount)} · ${formatCurrency(totals.pendingAmount)}`} icon={TimerReset} tone="warning" />
        <KpiCard label="Overdue Invoices" value={`${formatNumber(totals.overdueCount)} · ${formatCurrency(totals.overdueAmount)}`} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pending Cash Confirmations
        </h2>
        <CashConfirmationsPanel />
      </div>

      <div className="mt-8">
        <DataTable
          data={invoices}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search invoices by ID or student…"
          onRowClick={openDetail}
        />
      </div>

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
                  {/* API invoices don't resolve a parent name yet; never borrow one from the mocks */}
                  <p className="mt-1 font-medium text-foreground">{live ? "—" : getParentById(detail.parentId)?.name ?? "—"}</p>
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
                {live && detail.apiId && detail.status !== "paid" ? (
                  recording ? (
                    <Button onClick={submitPayment} disabled={saving}>
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
    </div>
  );
}
