import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, ChevronDown, Clock3, Copy, Download, Handshake, LayoutGrid, List, Loader2, MessageCircle, Search, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  listPlatformDemoRequestsPaged,
  getMarketingLead,
  getMarketingLeadRecommendation,
  logMarketingLeadActivity,
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
const toLocalInput = (iso?: string | null) => iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";

function defaultWhatsAppMessage(lead: ApiPlatformDemoRequest) {
  return `Hi ${lead.fullName}, thank you for your interest in Meet to Manage for ${lead.academyName}. I’m following up about your platform demo request. When would be a convenient time to speak?`;
}

function whatsappLink(lead: ApiPlatformDemoRequest, message: string) {
  let number = lead.phone.replace(/\D/g, "");
  if (number.length === 10) number = `91${number}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export default function DemoRequests() {
  const { toast } = useToast();
  const live = apiEnabled();
  const [page, setPage] = useState(1);
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  // Sample rows only in offline demo mode; live mode starts (and stays, on error) empty.
  const fallbackPage = { items: DEMO_REQUESTS, totalCount: DEMO_REQUESTS.length, page: 1, pageSize: 25 };
  const emptyPage = { items: [] as ApiPlatformDemoRequest[], totalCount: 0, page: 1, pageSize: 25 };
  const { data: pageData, loading, error, reload } = useApiData(() => listPlatformDemoRequestsPaged({ page, pageSize: view === "pipeline" ? 100 : 25, search: search.trim() || undefined, overdueOnly, archivedOnly }), fallbackPage, emptyPage, { cacheKey: `marketing-leads-${view}-${page}-${archivedOnly}-${overdueOnly}-${search.trim()}`, ttlMs: 15_000 });
  const requests = pageData.items;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<ApiPlatformDemoRequest | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<ApiMarketingLeadDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<Awaited<ReturnType<typeof getMarketingLeadRecommendation>> | null>(null);
  const [notes, setNotes] = useState("");
  const [owner, setOwner] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [whatsAppLead, setWhatsAppLead] = useState<ApiPlatformDemoRequest | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppTemplate, setWhatsAppTemplate] = useState("follow-up");
  const [whatsAppFollowUpDays, setWhatsAppFollowUpDays] = useState(2);
  const [teamUpdate, setTeamUpdate] = useState("");
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

  // ?lead=<id> (from a visitor's journey page) opens that lead's workspace straight away.
  const [searchParams] = useSearchParams();
  const leadParam = searchParams.get("lead");
  useEffect(() => {
    if (leadParam && live) void openLead({ id: leadParam } as ApiPlatformDemoRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the link's lead id changes
  }, [leadParam]);

  async function openLead(row: ApiPlatformDemoRequest) {
    if (!live) return;
    setDetail(null); setRecommendation(null); setNotes(""); setTeamUpdate(""); setDetailOpen(true);
    const ok = await runAction(async () => { const value = await getMarketingLead(row.id); setDetail(value); setNotes(value.lead.internalNotes ?? ""); setOwner(value.lead.assignedTo ?? ""); setFollowUp(toLocalInput(value.lead.nextFollowUpAtUtc)); }, "Couldn't open lead");
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
  async function saveCrmFields() {
    if (!detail) return;
    const id = detail.lead.id;
    await runAction(async () => { await updatePlatformDemoRequest(id, { assignedTo: owner.trim(), nextFollowUpAtUtc: followUp ? new Date(followUp).toISOString() : undefined }); const value = await getMarketingLead(id); setDetail(value); await reload(); }, "Couldn't update lead", "CRM details updated");
  }
  async function bulk(status?: ApiPlatformDemoRequestStatus, archive = false) {
    if (selected.size === 0) return;
    const ok = await runAction(async () => { await bulkUpdateMarketingLeads({ ids: [...selected], status, archive }); reload(); }, "Couldn't update leads", archive ? "Leads archived" : "Leads updated");
    if (ok) setSelected(new Set());
  }
  async function restoreLead(id: string) { await runAction(async () => { await restoreMarketingLead(id); reload(); }, "Couldn't restore lead", "Lead restored"); }
  function prepareWhatsApp(lead: ApiPlatformDemoRequest, template = "follow-up") {
    const messages: Record<string, string> = {
      "follow-up": defaultWhatsAppMessage(lead),
      demo: `Hi ${lead.fullName}, this is a reminder about your Meet to Manage demo for ${lead.academyName}. Please let me know a suitable date and time, and I’ll arrange it for you.`,
      pricing: `Hi ${lead.fullName}, thank you for considering Meet to Manage for ${lead.academyName}. I can help you understand the plans and recommend the right setup based on your students, teachers and branches. May I ask how many students you currently manage?`,
      checkin: `Hi ${lead.fullName}, I wanted to check whether you still need help evaluating Meet to Manage for ${lead.academyName}. I’m happy to answer questions or arrange a quick demo.`,
    };
    setWhatsAppLead(lead); setWhatsAppTemplate(template); setWhatsAppMessage(messages[template]); setWhatsAppFollowUpDays(2);
  }
  function changeWhatsAppTemplate(template: string) { if (whatsAppLead) prepareWhatsApp(whatsAppLead, template); }
  async function openAdvancedWhatsApp() {
    if (!whatsAppLead || !whatsAppMessage.trim()) return;
    window.open(whatsappLink(whatsAppLead, whatsAppMessage.trim()), "_blank", "noopener,noreferrer");
    if (live) {
      const next = new Date(); next.setDate(next.getDate() + whatsAppFollowUpDays); next.setHours(10, 0, 0, 0);
      await runAction(async () => { await updatePlatformDemoRequest(whatsAppLead.id, { status: whatsAppLead.status === "New" ? "Contacted" : whatsAppLead.status, nextFollowUpAtUtc: next.toISOString() }); await logMarketingLeadActivity(whatsAppLead.id, { type: "WhatsApp sent", detail: whatsAppMessage.trim() }); await reload(); if (detail?.lead.id === whatsAppLead.id) setDetail(await getMarketingLead(whatsAppLead.id)); }, "WhatsApp opened, but CRM tracking couldn't be updated", "Message shared with the CRM team");
    }
    setWhatsAppLead(null);
  }
  async function moveLead(id: string, status: ApiPlatformDemoRequestStatus) {
    setBusyId(id);
    await runAction(async () => { await updatePlatformDemoRequestStatus(id, status); await reload(); }, "Couldn't move lead", `Lead moved to ${status}`);
    setBusyId(null);
  }
  async function shareTeamUpdate() {
    if (!detail || !teamUpdate.trim()) return;
    const id = detail.lead.id;
    const ok = await runAction(async () => { await logMarketingLeadActivity(id, { type: "WhatsApp reply", detail: teamUpdate.trim() }); setDetail(await getMarketingLead(id)); }, "Couldn't share this update", "WhatsApp update shared with team");
    if (ok) setTeamUpdate("");
  }

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

      <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" placeholder="Search lead, academy, email or phone…" /></div>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant={overdueOnly ? "default" : "outline"} onClick={() => { setOverdueOnly(v => !v); setPage(1); }}><Clock3 className="h-4 w-4" />Overdue</Button><div className="inline-flex rounded-md border p-0.5"><Button size="sm" variant={view === "pipeline" ? "default" : "ghost"} onClick={() => { setView("pipeline"); setPage(1); }}><LayoutGrid className="h-4 w-4" />Pipeline</Button><Button size="sm" variant={view === "table" ? "default" : "ghost"} onClick={() => { setView("table"); setPage(1); }}><List className="h-4 w-4" />List</Button></div></div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Hot leads</p><p className="text-2xl font-bold">{hotCount}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Overdue follow-ups</p><p className={overdueCount ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>{overdueCount}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Possible duplicates</p><p className="text-2xl font-bold">{duplicateCount}</p></div>
      </div>

      {loading && requests.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 && !error ? (
        <EmptyState icon={Handshake} title="No platform demo requests yet" description="Submissions from the public /get-started page will show up here." />
      ) : view === "pipeline" && !archivedOnly ? (
        <div className="grid gap-4 xl:grid-cols-4">
          {STATUS_ORDER.map((status) => { const leads = requests.filter((r) => r.status === status); return <section key={status} className="min-h-72 rounded-xl border bg-muted/25 p-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/lead-id"); if (id) void moveLead(id, status); }}>
            <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${status === "New" ? "bg-amber-500" : status === "Contacted" ? "bg-blue-500" : status === "Converted" ? "bg-emerald-500" : "bg-slate-400"}`} /><h2 className="font-semibold">{status}</h2></div><Badge variant="outline">{leads.length}</Badge></div>
            <div className="space-y-3">{leads.map((lead) => <article key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)} onClick={() => void openLead(lead)} className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-2"><div><p className="font-semibold leading-tight">{lead.academyName}</p><p className="mt-0.5 text-xs text-muted-foreground">{lead.fullName}</p></div><Badge variant={lead.leadTemperature === "Hot" ? "destructive" : lead.leadTemperature === "Warm" ? "warning" : "muted"}>{lead.leadScore ?? 0}</Badge></div>
              {lead.message && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{lead.message}</p>}
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground"><span>{lead.source ?? "Direct"}</span><span className={lead.nextFollowUpAtUtc && new Date(lead.nextFollowUpAtUtc).getTime() < Date.now() && !["Converted", "Closed"].includes(lead.status) ? "font-semibold text-destructive" : ""}>{lead.nextFollowUpAtUtc ? formatDate(lead.nextFollowUpAtUtc, "datetime") : "No follow-up"}</span></div><Button size="sm" variant="outline" className="mt-2 w-full text-emerald-700" onClick={(e) => { e.stopPropagation(); prepareWhatsApp(lead); }}><MessageCircle className="h-4 w-4" />WhatsApp</Button>
            </article>)}{leads.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">Drop leads here</div>}</div>
          </section>; })}
        </div>
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
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Score</p><p className="font-bold">{detail.lead.leadTemperature} · {detail.lead.leadScore}</p>{detail.lead.scoreReasons && detail.lead.scoreReasons.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">{detail.lead.scoreReasons.map((r) => <li key={r}>{r}</li>)}</ul>}</div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Source</p><p className="font-bold">{detail.lead.source ?? "Direct"}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Status</p><p className="font-bold">{detail.lead.status}</p></div></div>
          <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => prepareWhatsApp(detail.lead)}><MessageCircle className="h-4 w-4" />Prepare WhatsApp follow-up</Button>
          <div className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Lead management</h3><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span className="font-medium">Owner</span><Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Sales or marketing owner" /></label><label className="space-y-1 text-sm"><span className="font-medium">Next follow-up</span><Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></label></div><div className="mt-3 flex flex-wrap gap-2">{STATUS_ORDER.map((status) => <Button key={status} size="sm" variant={detail.lead.status === status ? "default" : "outline"} onClick={() => void runAction(async () => { await updatePlatformDemoRequestStatus(detail.lead.id, status); setDetail(await getMarketingLead(detail.lead.id)); await reload(); }, "Couldn't update stage", `Moved to ${status}`)}>{status}</Button>)}</div><Button className="mt-3" size="sm" onClick={() => void saveCrmFields()}>Save CRM details</Button></div>
          <div><p className="mb-2 text-sm font-semibold">Internal notes</p><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} /><Button className="mt-2" size="sm" onClick={() => void saveNotes()}>Save notes</Button></div>
          <div className="rounded-xl border bg-primary/5 p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">AI next action</h3><Button size="sm" variant="outline" onClick={() => void analyzeLead()}><Sparkles className="h-4 w-4" />Analyze</Button></div>{recommendation && <div className="mt-3 space-y-2 text-sm"><p>{recommendation.summary}</p><p><b>Next:</b> {recommendation.nextAction}</p><p><b>{recommendation.suggestedChannel}:</b> {recommendation.suggestedMessage}</p></div>}</div>
          <div className="rounded-xl border p-4"><h3 className="font-semibold">Share WhatsApp response with team</h3><p className="mb-2 text-xs text-muted-foreground">Paste or summarize what the lead replied. Everyone using the Marketing Console will see it in the timeline.</p><Textarea rows={3} value={teamUpdate} onChange={(e) => setTeamUpdate(e.target.value)} placeholder="Example: Customer asked for a demo on Friday at 4 PM…" /><Button className="mt-2" size="sm" onClick={() => void shareTeamUpdate()} disabled={!teamUpdate.trim()}>Share update</Button></div>
          <div><h3 className="mb-2 font-semibold">Timeline</h3><div className="space-y-2">{detail.activity.map(a => <div key={a.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-3"><b>{a.type}</b><span className="text-xs text-muted-foreground">{new Date(a.createdAtUtc).toLocaleString()}</span></div><p className="mt-1 text-muted-foreground">{a.detail}</p></div>)}</div></div>
        </div>}
      </DialogContent></Dialog>
      <Dialog open={whatsAppLead !== null} onOpenChange={(open) => { if (!open) setWhatsAppLead(null); }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" />WhatsApp follow-up</DialogTitle><DialogDescription>{whatsAppLead ? `${whatsAppLead.fullName} · ${whatsAppLead.phone} · ${whatsAppLead.academyName}` : "Prepare a message"}</DialogDescription></DialogHeader>
        <div className="space-y-4"><label className="block space-y-1 text-sm"><span className="font-medium">Message template</span><select className="h-10 w-full rounded-md border bg-background px-3" value={whatsAppTemplate} onChange={(e) => changeWhatsAppTemplate(e.target.value)}><option value="follow-up">Initial follow-up</option><option value="demo">Demo reminder</option><option value="pricing">Pricing qualification</option><option value="checkin">No-response check-in</option></select></label><label className="block space-y-1 text-sm"><span className="font-medium">Message preview — edit before opening</span><Textarea rows={7} value={whatsAppMessage} onChange={(e) => setWhatsAppMessage(e.target.value)} /></label><label className="block space-y-1 text-sm"><span className="font-medium">Schedule next follow-up</span><select className="h-10 w-full rounded-md border bg-background px-3" value={whatsAppFollowUpDays} onChange={(e) => setWhatsAppFollowUpDays(Number(e.target.value))}><option value={1}>Tomorrow at 10:00</option><option value={2}>In 2 days at 10:00</option><option value={3}>In 3 days at 10:00</option><option value={7}>In 1 week at 10:00</option></select></label><div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Opening WhatsApp marks a New lead as Contacted and schedules this follow-up. You still review and press Send inside WhatsApp.</div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => { void navigator.clipboard.writeText(whatsAppMessage); toast({ variant: "success", title: "Message copied" }); }}><Copy className="h-4 w-4" />Copy message</Button><Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void openAdvancedWhatsApp()} disabled={!whatsAppMessage.trim()}><MessageCircle className="h-4 w-4" />Open WhatsApp & track</Button></div></div>
      </DialogContent></Dialog>
    </div>
  );
}
