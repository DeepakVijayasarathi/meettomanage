import { useMemo, useState } from "react";
import { ChevronDown, Loader2, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listStoreInquiries, updateStoreInquiryStatus, type ApiStoreInquiry, type ApiStoreInquiryStatus } from "@/api/store";
import { formatDate } from "@/lib/utils";

const DEMO_INQUIRIES: ApiStoreInquiry[] = [
  {
    id: "si-1",
    packagePlanId: "pp-1",
    planName: "Phonics Foundations — Monthly",
    parentName: "Neha Sharma",
    parentEmail: "neha.sharma@example.com",
    parentPhone: "9876500001",
    childName: "Ira Sharma",
    childAge: 6,
    notes: "Prefers evening sessions after 5pm.",
    status: "New",
    createdAtUtc: "2026-08-08T10:15:00Z",
  },
  {
    id: "si-2",
    packagePlanId: "pp-2",
    planName: "Maths Explorers — Quarterly",
    parentName: "Vikram Nair",
    parentEmail: "vikram.nair@example.com",
    parentPhone: "9876500002",
    childName: "Advik Nair",
    childAge: 9,
    notes: null,
    status: "Contacted",
    createdAtUtc: "2026-08-07T14:30:00Z",
  },
];

const STATUS_ORDER: ApiStoreInquiryStatus[] = ["New", "Contacted", "Converted", "Closed"];
const STATUS_VARIANT: Record<ApiStoreInquiryStatus, "warning" | "default" | "success" | "outline"> = {
  New: "warning",
  Contacted: "default",
  Converted: "success",
  Closed: "outline",
};

export default function AdminStoreInquiries() {
  const live = apiEnabled();
  const { data: inquiries, error, reload } = useApiData<ApiStoreInquiry[]>(() => listStoreInquiries(), DEMO_INQUIRIES);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function changeStatus(inquiry: ApiStoreInquiry, status: ApiStoreInquiryStatus) {
    if (!live) {
      setActionError("Demo mode — no inquiry actually updated.");
      return;
    }
    setBusyId(inquiry.id);
    setActionError(null);
    try {
      await updateStoreInquiryStatus(inquiry.id, status);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update this inquiry.");
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<ApiStoreInquiry>[] = useMemo(
    () => [
      {
        key: "parent",
        header: "Parent",
        sortable: true,
        accessor: (row) => row.parentName,
        render: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.parentName}</p>
            <p className="text-xs text-muted-foreground">{row.parentEmail} · {row.parentPhone}</p>
          </div>
        ),
      },
      {
        key: "child",
        header: "Child",
        sortable: true,
        accessor: (row) => row.childName,
        render: (row) => (
          <span className="text-sm">
            {row.childName}
            {row.childAge ? ` (${row.childAge})` : ""}
          </span>
        ),
      },
      { key: "plan", header: "Plan", sortable: true, accessor: (row) => row.planName, render: (row) => <span className="text-sm">{row.planName}</span> },
      {
        key: "submitted",
        header: "Submitted",
        sortable: true,
        accessor: (row) => row.createdAtUtc,
        render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.createdAtUtc.slice(0, 10))}</span>,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>,
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={busyId === row.id}>
                  {busyId === row.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      Update status <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {STATUS_ORDER.filter((s) => s !== row.status).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => changeStatus(row, s)}>
                    Mark {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Admission"
        title="Store Inquiries"
        description="Enroll Now submissions from the public course catalog (/store) — follow up to complete enrollment and payment."
      />

      {live && error && (
        <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
          Could not load store inquiries ({error}).{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </p>
      )}

      {actionError && (
        <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">{actionError}</p>
      )}

      {inquiries.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No store inquiries yet" description="Submissions from the public course catalog will show up here." />
      ) : (
        <DataTable data={inquiries} columns={columns} rowKey={(row) => row.id} searchPlaceholder="Search by parent or child name…" />
      )}
    </div>
  );
}
