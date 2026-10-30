import { useMemo, useState } from "react";
import { ChevronDown, Download, Handshake, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  listPlatformDemoRequests,
  deletePlatformDemoRequest,
  updatePlatformDemoRequest,
  updatePlatformDemoRequestStatus,
  type ApiPlatformDemoRequest,
  type ApiPlatformDemoRequestStatus,
} from "@/api/marketing";
import { formatDate } from "@/lib/utils";

const DEMO_REQUESTS: ApiPlatformDemoRequest[] = [
  {
    id: "pdr-1",
    fullName: "Rohan Mehta",
    workEmail: "rohan@brightstepacademy.com",
    phone: "9876512345",
    academyName: "Bright Step Academy",
    message: "We run 3 branches and currently juggle spreadsheets + WhatsApp for fees.",
    status: "New",
    createdAtUtc: "2026-08-20T09:00:00Z",
  },
  {
    id: "pdr-2",
    fullName: "Ananya Iyer",
    workEmail: "ananya@littlescholars.in",
    phone: "9876512346",
    academyName: "Little Scholars",
    message: null,
    status: "Contacted",
    createdAtUtc: "2026-08-18T13:20:00Z",
  },
];

const STATUS_ORDER: ApiPlatformDemoRequestStatus[] = ["New", "Contacted", "Converted", "Closed"];
const STATUS_VARIANT: Record<ApiPlatformDemoRequestStatus, "warning" | "default" | "success" | "outline"> = {
  New: "warning",
  Contacted: "default",
  Converted: "success",
  Closed: "outline",
};

export default function DemoRequests() {
  const { toast } = useToast();
  const live = apiEnabled();
  const { data: requests, error, reload } = useApiData<ApiPlatformDemoRequest[]>(() => listPlatformDemoRequests(), DEMO_REQUESTS);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<ApiPlatformDemoRequest | null>(null);

  async function changeStatus(request: ApiPlatformDemoRequest, status: ApiPlatformDemoRequestStatus) {
    if (!live) {
      setActionError("Demo mode — no request actually updated.");
      return;
    }
    setBusyId(request.id);
    setActionError(null);
    try {
      await updatePlatformDemoRequestStatus(request.id, status);
      await reload();
      toast({ variant: "success", title: "Request updated", description: `Marked as ${status}.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't update this request.";
      setActionError(message);
      toast({ variant: "error", title: "Couldn't update request", description: message });
    } finally {
      setBusyId(null);
    }
  }

  async function removeRequest() {
    if (!deleteRequest) return;
    if (!live) {
      setActionError("Demo mode — no request actually deleted.");
      return;
    }
    setBusyId(deleteRequest.id);
    setActionError(null);
    try {
      await deletePlatformDemoRequest(deleteRequest.id);
      await reload();
      toast({ variant: "success", title: "Request deleted", description: `${deleteRequest.fullName}'s demo request was deleted.` });
    } finally {
      setBusyId(null);
    }
  }

  async function remindTomorrow(request: ApiPlatformDemoRequest) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
    setBusyId(request.id);
    try { await updatePlatformDemoRequest(request.id, { nextFollowUpAtUtc: tomorrow.toISOString() }); await reload(); toast({ variant: "success", title: "Follow-up scheduled" }); }
    finally { setBusyId(null); }
  }

  function exportCsv() {
    const rows = [["Name", "Email", "Phone", "Academy", "Status", "Score", "Source", "Campaign", "Follow-up", "Submitted"], ...requests.map(r => [r.fullName, r.workEmail, r.phone, r.academyName, r.status, String(r.leadScore ?? 0), r.source ?? "Direct", r.campaign ?? "", r.nextFollowUpAtUtc ?? "", r.createdAtUtc])];
    const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = `marketing-leads-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<ApiPlatformDemoRequest>[] = useMemo(
    () => [
      {
        key: "contact",
        header: "Contact",
        sortable: true,
        accessor: (row) => row.fullName,
        render: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.fullName}</p>
            <p className="text-xs text-muted-foreground">{row.workEmail} · {row.phone}</p>
          </div>
        ),
      },
      { key: "academy", header: "Academy", sortable: true, accessor: (row) => row.academyName, render: (row) => <span className="text-sm">{row.academyName}</span> },
      {
        key: "message",
        header: "Message",
        accessor: (row) => row.message ?? "",
        render: (row) => <span className="line-clamp-2 max-w-xs text-sm text-muted-foreground">{row.message ?? "—"}</span>,
      },
      {
        key: "submitted",
        header: "Submitted",
        sortable: true,
        accessor: (row) => row.createdAtUtc,
        render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.createdAtUtc.slice(0, 10))}</span>,
      },
      {
        key: "score", header: "Lead", sortable: true, accessor: (row) => row.leadScore ?? 0,
        render: (row) => <div><Badge variant={row.leadTemperature === "Hot" ? "destructive" : row.leadTemperature === "Warm" ? "warning" : "muted"}>{row.leadTemperature ?? "Cold"} · {row.leadScore ?? 0}</Badge>{row.isDuplicate && <p className="mt-1 text-xs text-warning">Possible duplicate</p>}</div>,
      },
      {
        key: "source", header: "Source", accessor: (row) => row.source ?? "Direct",
        render: (row) => <div className="text-sm"><p>{row.source ?? "Direct"}</p>{row.campaign && <p className="text-xs text-muted-foreground">{row.campaign}</p>}</div>,
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
                <DropdownMenuItem onClick={() => void remindTomorrow(row)}>Follow up tomorrow, 10:00</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteRequest(row)}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete request
                </DropdownMenuItem>
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
        eyebrow="Marketing"
        title="Demo Requests"
        actions={<Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button>}
        description="Prospective academies asking to see the Meet to Manage platform itself — from the public /get-started page. Distinct from class-demo bookings, which are for an academy's own parents."
      />

      {live && error && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load demo requests ({error}).{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </InlineAlert>
      )}

      {actionError && <InlineAlert variant="warning" className="mb-4">{actionError}</InlineAlert>}

      {requests.length === 0 && !error ? (
        <EmptyState icon={Handshake} title="No platform demo requests yet" description="Submissions from the public /get-started page will show up here." />
      ) : (
        <DataTable
          data={requests}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by contact or academy…"
          emptyTitle="No platform demo requests yet"
          emptyDescription="Submissions from the public /get-started page will show up here."
          error={live ? error : null}
          onRetry={reload}
        />
      )}

      <ConfirmDialog
        open={deleteRequest !== null}
        onOpenChange={(open) => { if (!open) setDeleteRequest(null); }}
        title="Delete demo request?"
        description={deleteRequest ? `This permanently removes the request from ${deleteRequest.fullName} (${deleteRequest.academyName}). This cannot be undone.` : undefined}
        confirmLabel="Delete request"
        destructive
        onConfirm={removeRequest}
      />
    </div>
  );
}
