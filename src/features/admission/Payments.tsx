import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Copy, IndianRupee, Link2, ListChecks, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { FeeStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_LINKS as INITIAL_PAYMENT_LINKS, type PaymentLink, type PaymentStatus } from "./data";

const STATUS_OPTIONS: { value: PaymentStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Paid", label: "Paid" },
  { value: "Partially Paid", label: "Partially Paid" },
];

function toFeeStatusKey(status: PaymentStatus) {
  if (status === "Paid") return "paid";
  if (status === "Partially Paid") return "partial";
  return "pending";
}

export default function AdmissionPayments() {
  const [links, setLinks] = useState<PaymentLink[]>(INITIAL_PAYMENT_LINKS);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reminderSentId, setReminderSentId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (statusFilter === "all" ? links : links.filter((l) => l.status === statusFilter)),
    [links, statusFilter]
  );

  const totals = useMemo(() => {
    const paid = links.filter((l) => l.status === "Paid").reduce((s, l) => s + l.amountPaid, 0);
    const outstanding = links.reduce((s, l) => s + (l.amount - l.amountPaid), 0);
    const partial = links.filter((l) => l.status === "Partially Paid").length;
    return { paid, outstanding, partial, total: links.length };
  }, [links]);

  function handleCopy(link: PaymentLink) {
    navigator.clipboard?.writeText(link.paymentLinkUrl).catch(() => undefined);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 2000);
  }

  function handleRemind(link: PaymentLink) {
    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, lastReminderOn: "2026-07-09" } : l)));
    setReminderSentId(link.id);
    setTimeout(() => setReminderSentId((id) => (id === link.id ? null : id)), 2500);
  }

  const columns: DataTableColumn<PaymentLink>[] = useMemo(
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
        key: "paid",
        header: "Paid",
        sortable: true,
        accessor: (row) => row.amountPaid,
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatCurrency(row.amountPaid)}
            {row.status === "Partially Paid" && <span className="ml-1 text-xs">/ {formatCurrency(row.amount)}</span>}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => <FeeStatusBadge status={toFeeStatusKey(row.status)} />,
      },
      {
        key: "shared",
        header: "Link Shared",
        sortable: true,
        accessor: (row) => row.linkSharedOn,
        render: (row) => (
          <div className="text-xs">
            <p className="font-medium text-foreground">{formatDate(row.linkSharedOn)}</p>
            {row.lastReminderOn && <p className="text-muted-foreground">Reminded {formatDate(row.lastReminderOn)}</p>}
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => handleCopy(row)}>
              {copiedId === row.id ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === row.id ? "Copied" : "Copy link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={row.status === "Paid"}
              onClick={() => handleRemind(row)}
            >
              <Bell className="h-3.5 w-3.5" />
              {reminderSentId === row.id ? "Sent!" : "Remind"}
            </Button>
          </div>
        ),
      },
    ],
    [copiedId, reminderSentId]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Payment Links"
        description="Share payment links with parents ahead of enrollment and track how collection is trending."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Payment Links" value={String(totals.total)} icon={Link2} tone="primary" />
        <KpiCard label="Collected" value={formatCurrency(totals.paid)} icon={IndianRupee} tone="success" />
        <KpiCard label="Outstanding" value={formatCurrency(totals.outstanding)} icon={Wallet} tone="destructive" />
        <KpiCard label="Partially Paid" value={String(totals.partial)} icon={ListChecks} tone="warning" />
      </div>

      <div className="mt-6">
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by child, parent or course…"
          toolbar={
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus | "all")}>
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
      </div>
    </div>
  );
}
