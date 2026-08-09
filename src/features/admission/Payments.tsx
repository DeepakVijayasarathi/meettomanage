import { useMemo, useState } from "react";
import { CheckCircle2, IndianRupee, Link2, ListChecks, Loader2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { FeeStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CashConfirmationsPanel } from "@/components/CashConfirmationsPanel";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listInvoices, toFrontendInvoice, createPaymentLink } from "@/api/billing";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
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
  department: "Phonics" | "Maths";
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
  const { data: rows } = useApiData(
    () => listInvoices().then((items) => items.map(toFrontendInvoice).map(fromInvoice)),
    DEMO_ROWS
  );
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
    // its whole amount as outstanding, overstating real receivables.
    const outstanding = rows.filter((r) => r.status !== "paid").reduce((s, r) => s + balanceOf(r), 0);
    const partial = rows.filter((r) => r.status === "partial").length;
    return { paid, outstanding, partial, total: rows.length };
  }, [rows]);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a payment link for this invoice.");
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
            disabled={row.status === "paid" || linkBusyId === row.id || (!apiEnabled())}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Invoices" value={String(totals.total)} icon={Link2} tone="primary" />
        <KpiCard label="Collected" value={formatCurrency(totals.paid)} icon={IndianRupee} tone="success" />
        <KpiCard label="Outstanding" value={formatCurrency(totals.outstanding)} icon={Wallet} tone="destructive" />
        <KpiCard label="Partially Paid" value={String(totals.partial)} icon={ListChecks} tone="warning" />
      </div>

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
        {error && <p className="mb-3 text-sm font-medium text-destructive">{error}</p>}
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by child or course…"
          toolbar={
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RowStatus | "all")}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
