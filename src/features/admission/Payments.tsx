import { useMemo, useState } from "react";
import { CheckCircle2, IndianRupee, Link2, ListChecks, Loader2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { FilterBar } from "@/components/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { FeeStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CashConfirmationsPanel } from "@/components/CashConfirmationsPanel";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listInvoiceRows, toFrontendInvoice, createPaymentLink } from "@/api/billing";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { PAYMENT_LINKS } from "./data";

type RowStatus = Invoice["status"];

/** One row of the Payment Tracking table — a real invoice in API mode, a demo payment link otherwise. */
interface PaymentRow {
  id: string;
  /** Real invoice Guid; present only in API mode, needed to generate a live payment link. */
  apiId?: string;
  childName: string;
  parentName: string;
  courseName: string;
  department: string;
  amount: number;
  /** Settled so far; only known in API mode — the demo mock has no partial-payment figure. */
  amountPaid?: number;
  status: RowStatus;
  issuedOn: string;
  dueOn: string;
}

/** Balance due — falls back to the full amount when amountPaid isn't known (demo mode). */
function balanceOf(row: PaymentRow): number {
  return row.amountPaid !== undefined ? row.amount - row.amountPaid : row.amount;
}

const STATUS_OPTIONS: { value: RowStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partially Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const DEMO_ROWS: PaymentRow[] = PAYMENT_LINKS.map((link) => ({
  id: link.id,
  childName: link.childName,
  parentName: link.parentName,
  courseName: link.courseName,
  department: link.department,
  amount: link.amount,
  status: link.status === "Paid" ? "paid" : link.status === "Partially Paid" ? "partial" : "pending",
  issuedOn: link.linkSharedOn,
  dueOn: link.paidOn ?? link.linkSharedOn,
}));

function fromInvoice(invoice: Invoice): PaymentRow {
  return {
    id: invoice.id,
    apiId: invoice.apiId,
    childName: invoice.childName,
    parentName: invoice.parentName,
    courseName: invoice.courseName,
    department: invoice.department,
    amount: invoice.amount,
    amountPaid: invoice.amountPaid,
    status: invoice.status,
    issuedOn: invoice.issuedOn,
    dueOn: invoice.dueOn,
  };
}

export default function AdmissionPayments() {
  const { toast } = useToast();
  // One page of the (forever-growing) invoice table; the status filter, totals and
  // DataTable's paging all run client-side over it. totalCount is the whole matching
  // set server-side, which is what the "Invoices" KPI should actually count.
  const { data: invoiceData, loading: invoicesLoading, error: invoicesError, reload } = useApiData(
    () => listInvoiceRows((invoice) => fromInvoice(toFrontendInvoice(invoice))),
    { rows: DEMO_ROWS, totalCount: DEMO_ROWS.length },
    { rows: [], totalCount: 0 }
  );
  const rows = invoiceData.rows;
  const truncated = invoiceData.totalCount > rows.length;
  const [statusFilter, setStatusFilter] = useState<RowStatus | "all">("all");
  const [linkBusyId, setLinkBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter]
  );

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
    // Balance due, not the full invoice total — a partially-paid row previously counted
    // its whole amount as outstanding, overstating real receivables. Cancelled invoices
    // aren't owed at all, so they're excluded rather than counted as outstanding.
    const outstanding = rows
      .filter((r) => r.status !== "paid" && r.status !== "cancelled")
      .reduce((s, r) => s + balanceOf(r), 0);
    const partial = rows.filter((r) => r.status === "partial").length;
    // Count comes from the server's total, not the loaded page — it's the one figure
    // here that can stay exact once the table outgrows a page.
    return { paid, outstanding, partial, total: invoiceData.totalCount };
  }, [rows, invoiceData.totalCount]);

  async function handleGenerateLink(row: PaymentRow) {
    setError(null);
    if (!apiEnabled() || !row.apiId) {
      // Demo mode: nothing real to generate — there's no gateway to call.
      return;
    }
    setLinkBusyId(row.id);
    try {
      const link = await createPaymentLink(row.apiId);
      await navigator.clipboard?.writeText(link.url).catch(() => undefined);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((id) => (id === row.id ? null : id)), 2500);
      toast({ variant: "success", title: "Payment link copied", description: "The link is on your clipboard." });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not generate a payment link for this invoice.";
      setError(message);
      toast({ variant: "error", title: "Couldn't generate link", description: message });
    } finally {
      setLinkBusyId(null);
    }
  }

  const columns: DataTableColumn<PaymentRow>[] = useMemo(
    () => [
      {
        key: "child",
        header: "Child / Parent",
        sortable: true,
        accessor: (row) => row.childName,
        render: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.childName}</p>
            <p className="text-xs text-muted-foreground">{row.parentName}</p>
          </div>
        ),
      },
      {
        key: "course",
        header: "Course / Department",
        render: (row) => (
          <div>
            <p className="text-sm text-foreground">{row.courseName}</p>
            <p className="text-xs text-muted-foreground">{row.department}</p>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        accessor: (row) => row.amount,
        render: (row) => <span className="text-sm font-semibold text-foreground">{formatCurrency(row.amount)}</span>,
      },
      {
        key: "balance",
        header: "Paid / Balance",
        sortable: true,
        accessor: (row) => balanceOf(row),
        render: (row) =>
          row.amountPaid === undefined ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <div className="text-xs">
              <p className="text-muted-foreground">Paid {formatCurrency(row.amountPaid)}</p>
              <p className="font-semibold text-foreground">Balance {formatCurrency(balanceOf(row))}</p>
            </div>
          ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => <FeeStatusBadge status={row.status} />,
      },
      {
        key: "issued",
        header: "Issued / Due",
        sortable: true,
        accessor: (row) => row.issuedOn,
        render: (row) => (
          <div className="text-xs">
            <p className="font-medium text-foreground">Issued {formatDate(row.issuedOn)}</p>
            <p className="text-muted-foreground">Due {formatDate(row.dueOn)}</p>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            disabled={row.status === "paid" || row.status === "cancelled" || linkBusyId === row.id || (!apiEnabled())}
            onClick={() => handleGenerateLink(row)}
          >
            {linkBusyId === row.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : copiedId === row.id ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {linkBusyId === row.id ? "Generating…" : copiedId === row.id ? "Link copied" : "Generate & copy link"}
          </Button>
        ),
      },
    ],
    [linkBusyId, copiedId]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Payment Tracking"
        description="Generate and share payment links with parents ahead of enrollment, and track how collection is trending."
      />

      {apiEnabled() && invoicesError && (
        // Without this the screen reads "Invoices 0 · Collected ₹0 · Outstanding ₹0" after
        // a failed fetch — collection figures of zero are a claim about money, and one
        // nobody should make on the strength of a request that never returned.
        <InlineAlert variant="warning" className="mb-4">
          Could not load invoices ({invoicesError}) — the figures and table below are not
          your real collection position.{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </InlineAlert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Invoices" value={String(totals.total)} icon={Link2} tone="primary" loading={invoicesLoading} />
        <KpiCard label="Collected" value={formatCurrency(totals.paid)} icon={IndianRupee} tone="success" loading={invoicesLoading} />
        <KpiCard label="Outstanding" value={formatCurrency(totals.outstanding)} icon={Wallet} tone="destructive" loading={invoicesLoading} />
        <KpiCard label="Partially Paid" value={String(totals.partial)} icon={ListChecks} tone="warning" loading={invoicesLoading} />
      </div>

      {truncated && (
        // Collected/Outstanding/Partially Paid are summed over the loaded page only, so
        // say so rather than letting them read as whole-book figures.
        <p className="mt-3 text-xs text-muted-foreground">
          Showing the {formatNumber(rows.length)} most recent of {formatNumber(totals.total)} invoices — the
          collection figures above cover the loaded rows only.
        </p>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pending Cash Confirmations
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Parents who chose "Cash" on Pay Now from their portal. Confirm once collected at the centre so their invoice and access update.
        </p>
        <CashConfirmationsPanel />
      </div>

      <div className="mt-8">
        {error && <p role="alert" className="mb-3 text-sm font-medium text-destructive">{error}</p>}
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by child or course…"
          emptyTitle="No payments yet"
          emptyDescription="Invoices and payments will appear here once families start enrolling."
          error={apiEnabled() ? invoicesError : null}
          onRetry={reload}
          toolbar={
            <FilterBar
              filters={[
                {
                  key: "status",
                  label: "Status",
                  value: statusFilter,
                  onChange: (v) => setStatusFilter(v as RowStatus | "all"),
                  className: "w-48",
                  options: STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
                },
              ]}
            />
          }
        />
        {!apiEnabled() && (
          <p className="mt-2 text-xs text-muted-foreground">
            Demo mode — payment link generation needs the API connected (VITE_API_BASE_URL).
          </p>
        )}
      </div>
    </div>
  );
}
