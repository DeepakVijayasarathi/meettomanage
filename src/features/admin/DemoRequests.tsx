import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Archive, ChevronDown, Clock3, Download, Handshake, LayoutGrid, List, Loader2, MessageCircle, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  listPlatformDemoRequestsPaged,
  bulkUpdateMarketingLeads,
  restoreMarketingLead,
  deletePlatformDemoRequest,
  updatePlatformDemoRequest,
  updatePlatformDemoRequestStatus,
  type ApiPlatformDemoRequest,
  type ApiPlatformDemoRequestStatus,
} from "@/api/marketing";
import { formatDate } from "@/lib/utils";
import { LeadStageBadge } from "./LeadStagePanel";
import { inr } from "@/api/crm";
import { StagePipeline } from "@/features/marketingConsole/crm/StagePipeline";
import { WhatsAppDialog } from "@/features/marketingConsole/crm/WhatsAppDialog";
import { leadPath } from "@/features/marketingConsole/crm/hooks";
import { AddLeadDialog, BulkLeadsDialog, ImportLeadsDialog } from "./LeadIntakeDialogs";
import { useCrmMe, useCrmTeam } from "@/features/marketingConsole/crm/hooks";
import { LEAD_STAGE_LABEL, type ApiLeadStage } from "@/api/marketing";
import { FileUp, Plus } from "lucide-react";

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
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const me = useCrmMe();
  const { active: team } = useCrmTeam();
  const [ownerFilter, setOwnerFilter] = useState("");
  const [stageFilter, setStageFilter] = useState<ApiLeadStage | "">("");
  const [regionFilter, setRegionFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const ownerQuery = ownerFilter === "mine" ? { assignedToUserId: me.userId ?? undefined } : ownerFilter === "unassigned" ? { unassignedOnly: true } : ownerFilter ? { assignedToUserId: ownerFilter } : {};
  const filterKey = `${ownerFilter}-${stageFilter}-${regionFilter.trim()}-${segmentFilter.trim()}`;
  // Sample rows only in offline demo mode; live mode starts (and stays, on error) empty.
  const fallbackPage = { items: DEMO_REQUESTS, totalCount: DEMO_REQUESTS.length, page: 1, pageSize: 25 };
  const emptyPage = { items: [] as ApiPlatformDemoRequest[], totalCount: 0, page: 1, pageSize: 25 };
  const { data: pageData, loading, error, reload } = useApiData(() => listPlatformDemoRequestsPaged({ page, pageSize: view === "pipeline" ? 100 : 25, search: search.trim() || undefined, overdueOnly, archivedOnly, ...ownerQuery, stage: stageFilter || undefined, region: regionFilter.trim() || undefined, segment: segmentFilter.trim() || undefined }), fallbackPage, emptyPage, { cacheKey: `marketing-leads-${view}-${page}-${archivedOnly}-${overdueOnly}-${search.trim()}-${filterKey}`, ttlMs: 15_000 });
  const requests = pageData.items;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<ApiPlatformDemoRequest | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [whatsAppLead, setWhatsAppLead] = useState<ApiPlatformDemoRequest | null>(null);
  const navigate = useNavigate();
  const now = Date.now();
  const overdueCount = requests.filter(r => r.nextFollowUpAtUtc && new Date(r.nextFollowUpAtUtc).getTime() < now && r.stage !== "Customer" && r.stage !== "Lost").length;
  const hotCount = requests.filter(r => r.leadTemperature === "Hot").length;
  const duplicateCount = requests.filter(r => r.isDuplicate).length;
  const openLeads = requests.filter((r) => r.stage !== "Customer" && r.stage !== "Lost");
  const openCount = openLeads.length;
  const openValue = openLeads.reduce((sum, r) => sum + (r.expectedMonthlyValue ?? 0), 0);
  const demosSoon = requests.filter((r) => r.stage === "DemoBooked" && r.demoAtUtc && new Date(r.demoAtUtc).getTime() >= now && new Date(r.demoAtUtc).getTime() < now + 7 * 86_400_000).length;

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

  // ?lead=<id> (old links from journeys, tasks and customers) now opens the lead's own page.
  const [searchParams] = useSearchParams();
  const leadParam = searchParams.get("lead");
  const openLead = (row: ApiPlatformDemoRequest) => navigate(leadPath(row.id));
  async function bulk(status?: ApiPlatformDemoRequestStatus, archive = false) {
    if (selected.size === 0) return;
    const ok = await runAction(async () => { await bulkUpdateMarketingLeads({ ids: [...selected], status, archive }); reload(); }, "Couldn't update leads", archive ? "Leads archived" : "Leads updated");
    if (ok) setSelected(new Set());
  }
  async function restoreLead(id: string) { await runAction(async () => { await restoreMarketingLead(id); reload(); }, "Couldn't restore lead", "Lead restored"); }
  const prepareWhatsApp = (lead: ApiPlatformDemoRequest) => setWhatsAppLead(lead);

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
      { key: "academy", header: "Academy", sortable: true, accessor: (row) => row.academyName, render: (row) => <div className="text-sm"><p>{row.academyName}</p>{(row.city || row.segment) && <p className="text-xs text-muted-foreground">{[row.segment, row.city ?? row.region].filter(Boolean).join(" · ")}</p>}{row.expectedMonthlyValue != null && <p className="text-xs font-semibold">₹{Math.round(row.expectedMonthlyValue).toLocaleString("en-IN")}/mo</p>}</div> },
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
        render: (row) => <div title={row.scoreReasons?.length ? `Why: ${row.scoreReasons.join(" · ")}` : undefined}><Badge variant={row.leadTemperature === "Hot" ? "destructive" : row.leadTemperature === "Warm" ? "warning" : "muted"}>{row.leadTemperature ?? "Cold"} · {row.leadScore ?? 0}</Badge>{row.scoreReasons?.[0] && <p className="mt-1 max-w-[11rem] truncate text-xs text-muted-foreground">{row.scoreReasons[0]}{row.scoreReasons.length > 1 ? ` +${row.scoreReasons.length - 1}` : ""}</p>}{row.isDuplicate && <p className="mt-1 text-xs text-warning">Possible duplicate</p>}</div>,
      },
      {
        key: "source", header: "Source", accessor: (row) => row.source ?? "Direct",
        render: (row) => <div className="text-sm"><p>{row.source ?? "Direct"}</p>{row.campaign && <p className="text-xs text-muted-foreground">{row.campaign}</p>}{row.landingPath && <p className="font-mono text-xs text-muted-foreground">from {row.landingPath}</p>}</div>,
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
        key: "stage", header: "Stage", sortable: true, accessor: (row) => row.stage ?? "New",
        render: (row) => <div className="space-y-1"><LeadStageBadge stage={row.stage} />{row.stage === "DemoBooked" && row.demoAtUtc && <p className="text-xs text-muted-foreground">{formatDate(row.demoAtUtc, "datetime")}</p>}{row.highIntentAtUtc && row.stage !== "Customer" && <p className="text-xs font-semibold text-destructive">High intent</p>}</div>,
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
                <DropdownMenuItem onClick={() => prepareWhatsApp(row)}><MessageCircle className="mr-2 h-4 w-4" />Message on WhatsApp</DropdownMenuItem>
                {archivedOnly && <DropdownMenuItem onClick={() => void restoreLead(row.id)}>Restore lead</DropdownMenuItem>}
                {me.isManager && <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteRequest(row)}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete lead
                </DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId, archivedOnly, me.isManager]
  );

  if (leadParam) return <Navigate to={leadPath(leadParam)} replace />;

  return (
    <div>
      <PageHeader
        eyebrow="Marketing"
        title="Leads"
        actions={<div className="flex flex-wrap gap-2">{me.canWrite && <><Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add lead</Button><Button variant="outline" onClick={() => setImportOpen(true)}><FileUp className="h-4 w-4" />Import CSV</Button></>}<Button variant={archivedOnly ? "default" : "outline"} onClick={() => { setArchivedOnly(v => !v); setPage(1); }}><Archive className="h-4 w-4" />{archivedOnly ? "Active leads" : "Archive"}</Button><Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button></div>}
        description={me.role === "Sales" ? "Your leads and unassigned ones: website enquiries, chat bookings, imports and leads added by hand." : "Every academy that may buy Meet to Manage: website enquiries, chat bookings, imports and leads added by hand."}
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

      <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" placeholder="Search lead, academy, email or phone…" /></div>
        <div className="flex flex-wrap gap-2"><select aria-label="Owner" className="h-9 rounded-md border bg-background px-2 text-sm" value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setPage(1); }}><option value="">{me.role === "Sales" ? "Mine + unassigned" : "All owners"}</option><option value="mine">Mine</option><option value="unassigned">Unassigned</option>{me.role !== "Sales" && team.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}</select><select aria-label="Stage" className="h-9 rounded-md border bg-background px-2 text-sm" value={stageFilter} onChange={(e) => { setStageFilter(e.target.value as ApiLeadStage | ""); setPage(1); }}><option value="">All stages</option>{(Object.keys(LEAD_STAGE_LABEL) as ApiLeadStage[]).map((s) => <option key={s} value={s}>{LEAD_STAGE_LABEL[s]}</option>)}</select><Input aria-label="Region" className="h-9 w-32" placeholder="Region" value={regionFilter} onChange={(e) => { setRegionFilter(e.target.value); setPage(1); }} /><Input aria-label="What they teach" className="h-9 w-36" placeholder="Phonics, Abacus…" value={segmentFilter} onChange={(e) => { setSegmentFilter(e.target.value); setPage(1); }} /><Button size="sm" variant={overdueOnly ? "default" : "outline"} onClick={() => { setOverdueOnly(v => !v); setPage(1); }}><Clock3 className="h-4 w-4" />Overdue</Button><div className="inline-flex rounded-md border p-0.5"><Button size="sm" variant={view === "pipeline" ? "default" : "ghost"} onClick={() => { setView("pipeline"); setPage(1); }}><LayoutGrid className="h-4 w-4" />Pipeline</Button><Button size="sm" variant={view === "table" ? "default" : "ghost"} onClick={() => { setView("table"); setPage(1); }}><List className="h-4 w-4" />List</Button></div></div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Open pipeline</p><p className="text-2xl font-bold">{inr(openValue)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p><p className="text-xs text-muted-foreground">{openCount} open lead{openCount === 1 ? "" : "s"} shown</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Hot leads</p><p className="text-2xl font-bold">{hotCount}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Demos in the next 7 days</p><p className="text-2xl font-bold">{demosSoon}</p></div>
        <button type="button" onClick={() => { setOverdueOnly((v) => !v); setPage(1); }} className={`rounded-xl border bg-card p-4 text-start transition ${overdueOnly ? "ring-2 ring-primary" : "hover:bg-muted/40"}`}><p className="text-xs text-muted-foreground">Overdue follow-ups</p><p className={overdueCount ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>{overdueCount}</p></button>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Possible duplicates</p><p className="text-2xl font-bold">{duplicateCount}</p></div>
      </div>

      {loading && requests.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 && !error ? (
        <EmptyState icon={Handshake} title="No platform demo requests yet" description="Submissions from the public /get-started page will show up here." />
      ) : view === "pipeline" && !archivedOnly ? (
        <StagePipeline leads={requests} canWrite={me.canWrite} onOpen={openLead} onWhatsApp={prepareWhatsApp} onChanged={reload} />
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
          onRowClick={openLead}
          selectable
          selectedKeys={selected}
          onSelectionChange={setSelected}
          bulkActions={<div className="flex flex-wrap gap-2">{me.canWrite && <Button size="sm" onClick={() => setBulkOpen(true)}>Assign / follow-up plan</Button>}<Button size="sm" variant="outline" onClick={() => void bulk("Contacted")}>Mark contacted</Button><Button size="sm" variant="outline" onClick={() => void bulk(undefined, true)}>Archive</Button></div>}
          serverPagination={{ page: pageData.page, pageSize: pageData.pageSize, totalCount: pageData.totalCount, onPageChange: setPage }}
        />
      )}

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onCreated={(id) => navigate(leadPath(id))} />
      <ImportLeadsDialog open={importOpen} onOpenChange={setImportOpen} onImported={reload} />
      <BulkLeadsDialog leadIds={[...selected]} open={bulkOpen} onOpenChange={(v) => { setBulkOpen(v); if (!v) setSelected(new Set()); }} onDone={reload} />
      <ConfirmDialog
        open={deleteRequest !== null}
        onOpenChange={(open) => { if (!open) setDeleteRequest(null); }}
        title="Delete demo request?"
        description={deleteRequest ? `This removes the request from active marketing lists and retains an audit record for administrators.` : undefined}
        confirmLabel="Delete request"
        destructive
        onConfirm={removeRequest}
      />
      <WhatsAppDialog lead={whatsAppLead} onOpenChange={(open) => { if (!open) setWhatsAppLead(null); }} onTracked={reload} />
    </div>
  );
}
