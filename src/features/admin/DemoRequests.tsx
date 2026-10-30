import { useMemo, useState } from "react";
import { Archive, ChevronDown, Download, Handshake, Loader2, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  listPlatformDemoRequestsPaged,
  getMarketingLead,
  getMarketingLeadRecommendation,
  bulkUpdateMarketingLeads,
  restoreMarketingLead,
  deletePlatformDemoRequest,
  updatePlatformDemoRequest,
  updatePlatformDemoRequestStatus,
  type ApiPlatformDemoRequest,
  type ApiPlatformDemoRequestStatus,
  type ApiMarketingLeadDetail,
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
  const [page, setPage] = useState(1);
  const [archivedOnly, setArchivedOnly] = useState(false);
  // Sample rows only in offline demo mode; live mode starts (and stays, on error) empty.
  const fallbackPage = { items: DEMO_REQUESTS, totalCount: DEMO_REQUESTS.length, page: 1, pageSize: 25 };
  const emptyPage = { items: [] as ApiPlatformDemoRequest[], totalCount: 0, page: 1, pageSize: 25 };
  const { data: pageData, loading, error, reload } = useApiData(() => listPlatformDemoRequestsPaged({ page, archivedOnly }), fallbackPage, emptyPage, { cacheKey: `marketing-leads-${page}-${archivedOnly}`, ttlMs: 15_000 });
  const requests = pageData.items;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<ApiPlatformDemoRequest | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<ApiMarketingLeadDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<Awaited<ReturnType<typeof getMarketingLeadRecommendation>> | null>(null);
  const [notes, setNotes] = useState("");
  const now = Date.now();
  const overdueCount = requests.filter(r => r.nextFollowUpAtUtc && new Date(r.nextFollowUpAtUtc).getTime() < now && !["Converted", "Closed"].includes(r.status)).length;
  const hotCount = requests.filter(r => r.leadTemperature === "Hot").length;
  const duplicateCount = requests.filter(r => r.isDuplicate).length;

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

  /** Runs a lead action with demo-mode guard, error toast and optional success toast. */
  async function runAction(action: () => Promise<unknown>, failTitle: string, successTitle?: string): Promise<boolean> {
    if (!live) {
      setActionError("Demo mode — nothing was changed.");
      return false;
    }
    setActionError(null);
    try {
      await action();
      if (successTitle) toast({ variant: "success", title: successTitle });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({ variant: "error", title: failTitle, description: message });
      return false;
    }
  }

  async function removeRequest() {
    const request = deleteRequest;
    if (!request) return;
    setBusyId(request.id);
    const ok = await runAction(async () => { await deletePlatformDemoRequest(request.id); reload(); }, "Couldn't delete request");
    setBusyId(null);
    setDeleteRequest(null);
    if (ok) toast({ variant: "success", title: "Request deleted", description: `${request.fullName}'s demo request was deleted.` });
  }

  async function remindTomorrow(request: ApiPlatformDemoRequest) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
    setBusyId(request.id);
    await runAction(async () => { await updatePlatformDemoRequest(request.id, { nextFollowUpAtUtc: tomorrow.toISOString() }); reload(); }, "Couldn't schedule follow-up", "Follow-up scheduled");
    setBusyId(null);
  }

  async function openLead(row: ApiPlatformDemoRequest) {
    if (!live) return;
    setDetail(null); setRecommendation(null); setNotes(""); setDetailOpen(true);
    const ok = await runAction(async () => { const value = await getMarketingLead(row.id); setDetail(value); setNotes(value.lead.internalNotes ?? ""); }, "Couldn't open lead");
    if (!ok) setDetailOpen(false);
  }
  async function saveNotes() {
    if (!detail) return;
    const id = detail.lead.id;
    await runAction(async () => { await updatePlatformDemoRequest(id, { internalNotes: notes }); setDetail(await getMarketingLead(id)); reload(); }, "Couldn't save notes", "Lead notes saved");
  }
  async function analyzeLead() {
    if (!detail) return;
    const id = detail.lead.id;
    await runAction(async () => setRecommendation(await getMarketingLeadRecommendation(id)), "Couldn't analyze lead");
  }
  async function bulk(status?: ApiPlatformDemoRequestStatus, archive = false) {
    if (selected.size === 0) return;
    const ok = await runAction(async () => { await bulkUpdateMarketingLeads({ ids: [...selected], status, archive }); reload(); }, "Couldn't update leads", archive ? "Leads archived" : "Leads updated");
    if (ok) setSelected(new Set());
  }
  async function restoreLead(id: string) { await runAction(async () => { await restoreMarketingLead(id); reload(); }, "Couldn't restore lead", "Lead restored"); }

  function exportCsv() {
    const rows = [["Name", "Email", "Phone", "Academy", "Status", "Score", "Source", "Campaign", "Follow-up", "Submitted"], ...requests.map(r => [r.fullName, r.workEmail, r.phone, r.academyName, r.status, String(r.leadScore ?? 0), r.source ?? "Direct", r.campaign ?? "", r.nextFollowUpAtUtc ?? "", r.createdAtUtc])];
    // Quoting is not enough for spreadsheets: neutralize formula prefixes as well.
    const safe = (value: unknown) => { const text = String(value); return /^[=+\-@]/.test(text) ? `'${text}` : text; };
    const csv = rows.map(row => row.map(v => `"${safe(v).replace(/"/g, '""')}"`).join(",")).join("\n");
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
        key: "followUp", header: "Follow-up", sortable: true, accessor: (row) => row.nextFollowUpAtUtc ?? "",
        render: (row) => row.nextFollowUpAtUtc ? <div className="text-sm"><p className={new Date(row.nextFollowUpAtUtc).getTime() < Date.now() && !["Converted", "Closed"].includes(row.status) ? "font-semibold text-destructive" : ""}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.nextFollowUpAtUtc))}</p>{row.assignedTo && <p className="text-xs text-muted-foreground">{row.assignedTo}</p>}</div> : <span className="text-sm text-muted-foreground">Not scheduled</span>,
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
                {archivedOnly && <DropdownMenuItem onClick={() => void restoreLead(row.id)}>Restore lead</DropdownMenuItem>}
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
    [busyId, archivedOnly]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Marketing"
        title="Demo Requests"
        actions={<div className="flex gap-2"><Button variant={archivedOnly ? "default" : "outline"} onClick={() => { setArchivedOnly(v => !v); setPage(1); }}><Archive className="h-4 w-4" />{archivedOnly ? "Active leads" : "Archive"}</Button><Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button></div>}
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

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Hot leads</p><p className="text-2xl font-bold">{hotCount}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Overdue follow-ups</p><p className={overdueCount ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>{overdueCount}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Possible duplicates</p><p className="text-2xl font-bold">{duplicateCount}</p></div>
      </div>

      {loading && requests.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 && !error ? (
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
          onRowClick={(row) => void openLead(row)}
          selectable
          selectedKeys={selected}
          onSelectionChange={setSelected}
          bulkActions={<div className="flex gap-2"><Button size="sm" onClick={() => void bulk("Contacted")}>Mark contacted</Button><Button size="sm" variant="outline" onClick={() => void bulk(undefined, true)}>Archive</Button></div>}
          serverPagination={{ page: pageData.page, pageSize: pageData.pageSize, totalCount: pageData.totalCount, onPageChange: setPage }}
        />
      )}

      <ConfirmDialog
        open={deleteRequest !== null}
        onOpenChange={(open) => { if (!open) setDeleteRequest(null); }}
        title="Delete demo request?"
        description={deleteRequest ? `This removes the request from active marketing lists and retains an audit record for administrators.` : undefined}
        confirmLabel="Delete request"
        destructive
        onConfirm={removeRequest}
      />
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{detail?.lead.fullName ?? "Lead workspace"}</DialogTitle><DialogDescription>{detail ? `${detail.lead.academyName} · ${detail.lead.workEmail} · ${detail.lead.phone}` : "Loading lead…"}</DialogDescription></DialogHeader>
        {!detail ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Score</p><p className="font-bold">{detail.lead.leadTemperature} · {detail.lead.leadScore}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Source</p><p className="font-bold">{detail.lead.source ?? "Direct"}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Status</p><p className="font-bold">{detail.lead.status}</p></div></div>
          <div><p className="mb-2 text-sm font-semibold">Internal notes</p><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} /><Button className="mt-2" size="sm" onClick={() => void saveNotes()}>Save notes</Button></div>
          <div className="rounded-xl border bg-primary/5 p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">AI next action</h3><Button size="sm" variant="outline" onClick={() => void analyzeLead()}><Sparkles className="h-4 w-4" />Analyze</Button></div>{recommendation && <div className="mt-3 space-y-2 text-sm"><p>{recommendation.summary}</p><p><b>Next:</b> {recommendation.nextAction}</p><p><b>{recommendation.suggestedChannel}:</b> {recommendation.suggestedMessage}</p></div>}</div>
          <div><h3 className="mb-2 font-semibold">Timeline</h3><div className="space-y-2">{detail.activity.map(a => <div key={a.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-3"><b>{a.type}</b><span className="text-xs text-muted-foreground">{new Date(a.createdAtUtc).toLocaleString()}</span></div><p className="mt-1 text-muted-foreground">{a.detail}</p></div>)}</div></div>
        </div>}
      </DialogContent></Dialog>
    </div>
  );
}
