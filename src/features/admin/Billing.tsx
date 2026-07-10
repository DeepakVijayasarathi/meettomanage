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
import { INVOICES } from "@/data/invoices";
import { getParentById } from "@/data/users";
import { useApiData } from "@/api/hooks";
import { listInvoices, toFrontendInvoice } from "@/api/billing";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";

const DEPARTMENT_COLOR: Record<Invoice["department"], string> = {
  Phonics: CHART_PALETTE[3],
  Maths: CHART_PALETTE[4],
};

export default function AdminBilling() {
  const { data: invoices } = useApiData(
    () => listInvoices().then((items) => items.map(toFrontendInvoice)),
    INVOICES
  );
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [downloaded, setDownloaded] = useState(false);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Revenue Collected" value={formatCurrency(totals.totalRevenue)} icon={IndianRupee} tone="success" />
        <KpiCard label="Pending Invoices" value={`${formatNumber(totals.pendingCount)} · ${formatCurrency(totals.pendingAmount)}`} icon={TimerReset} tone="warning" />
        <KpiCard label="Overdue Invoices" value={`${formatNumber(totals.overdueCount)} · ${formatCurrency(totals.overdueAmount)}`} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="mt-6">
        <DataTable
          data={invoices}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search invoices by ID or student…"
          onRowClick={(row) => {
            setDetail(row);
            setDownloaded(false);
          }}
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
                  <p className="mt-1 font-medium text-foreground">{getParentById(detail.parentId)?.name ?? "—"}</p>
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
                <div className="col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <FeeStatusBadge status={detail.status} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
                <Button onClick={() => setDownloaded(true)}>
                  <Download className="h-4 w-4" />
                  {downloaded ? "Receipt Downloaded" : "Download Receipt"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
