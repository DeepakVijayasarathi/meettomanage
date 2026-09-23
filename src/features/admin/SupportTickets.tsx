import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Inbox, LifeBuoy, Loader2, Mail, MessageSquareWarning, Phone } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SupportTicketThread, TicketStatusBadge } from "@/components/SupportTicketThread";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import {
  TICKET_STATUS_LABELS,
  formatTicketTime,
  getSupportTicket,
  getSupportTicketCounts,
  listSupportTickets,
  replyToSupportTicket,
  ticketCategoryLabel,
  updateSupportTicketStatus,
  type ApiSupportTicketCounts,
  type ApiSupportTicketDetail,
  type ApiSupportTicketSummary,
  type SupportTicketStatus,
} from "@/api/supportTickets";
import { toast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { useSession } from "@/state/session";

type Filter = "active" | "awaiting" | SupportTicketStatus | "all";

const FILTERS: [Filter, string][] = [
  ["active", "Open & in progress"],
  ["awaiting", "Needs reply"],
  ["Resolved", "Resolved"],
  ["Closed", "Closed"],
  ["all", "All"],
];

const EMPTY_COUNTS: ApiSupportTicketCounts = { open: 0, inProgress: 0, resolved: 0, closed: 0, awaitingReply: 0 };

/**
 * Parent support tickets queue — the Relationship Manager's inbox for every family concern
 * raised from the parent portal. Shared by Admin and the Relationship Manager (subadmin) portal;
 * access is the SupportTickets module (View to read, Edit to reply / change status).
 */
export default function SupportTickets() {
  const { hasPermission } = useSession();
  const canEdit = hasPermission("SupportTickets", "Edit");
  const { data: tickets, error, reload } = useApiData(() => listSupportTickets(), [] as ApiSupportTicketSummary[]);
  const { data: counts, reload: reloadCounts } = useApiData(() => getSupportTicketCounts(), EMPTY_COUNTS, EMPTY_COUNTS);
  const [filter, setFilter] = useState<Filter>("active");
  const [openTicket, setOpenTicket] = useState<ApiSupportTicketDetail | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link from the "new ticket" / "parent replied" email: ?ticket=<id>
  const linkedTicketId = searchParams.get("ticket");
  useEffect(() => {
    if (linkedTicketId && apiEnabled()) void openThread(linkedTicketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedTicketId]);

  function refresh() {
    reload();
    reloadCounts();
  }

  async function openThread(id: string) {
    try {
      setOpenTicket(await getSupportTicket(id));
    } catch (err) {
      toast({ variant: "error", title: "Couldn't open the ticket", description: userMessage(err, "Please try again.") });
    }
  }

  function closeThread() {
    setOpenTicket(null);
    if (linkedTicketId) {
      searchParams.delete("ticket");
      setSearchParams(searchParams, { replace: true });
    }
  }

  async function reply(text: string) {
    if (!openTicket) return;
    try {
      setOpenTicket(await replyToSupportTicket(openTicket.id, text));
      refresh();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't send the reply", description: userMessage(err, "Please try again.") });
      throw err;
    }
  }

  async function changeStatus(status: SupportTicketStatus) {
    if (!openTicket || status === openTicket.status) return;
    setStatusBusy(true);
    try {
      setOpenTicket(await updateSupportTicketStatus(openTicket.id, status));
      toast({ variant: "success", title: `Marked ${TICKET_STATUS_LABELS[status].toLowerCase()}` });
      refresh();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't update the status", description: userMessage(err, "Please try again.") });
    } finally {
      setStatusBusy(false);
    }
  }

  const visible = tickets.filter((t) => {
    switch (filter) {
      case "all":
        return true;
      case "active":
        return t.status === "Open" || t.status === "InProgress";
      case "awaiting":
        return t.awaitingStaffReply && (t.status === "Open" || t.status === "InProgress");
      default:
        return t.status === filter;
    }
  });

  const columns: DataTableColumn<ApiSupportTicketSummary>[] = [
    {
      key: "subject",
      header: "Ticket",
      sortable: true,
      accessor: (t) => t.subject,
      className: "max-w-sm whitespace-normal",
      render: (t) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-semibold text-foreground">{t.subject}</p>
            {t.awaitingStaffReply && (t.status === "Open" || t.status === "InProgress") && (
              <Badge variant="destructive">Needs reply</Badge>
            )}
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground">{t.lastMessagePreview}</p>
          <p className="text-xs text-muted-foreground">{t.reference} · {ticketCategoryLabel(t.category)}</p>
        </div>
      ),
    },
    {
      key: "parentName",
      header: "Parent",
      sortable: true,
      accessor: (t) => t.parentName,
      render: (t) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{t.parentName}</p>
          <p className="truncate text-xs text-muted-foreground">{t.childName ?? t.parentEmail}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", sortable: true, accessor: (t) => t.status, render: (t) => <TicketStatusBadge status={t.status} /> },
    { key: "messageCount", header: "Msgs", sortable: true, accessor: (t) => t.messageCount, render: (t) => <span className="text-sm">{t.messageCount}</span> },
    {
      key: "lastActivityAtUtc",
      header: "Last activity",
      sortable: true,
      accessor: (t) => t.lastActivityAtUtc,
      render: (t) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatTicketTime(t.lastActivityAtUtc)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Support"
        title="Parent Tickets"
        description="Every concern parents raise from the portal. Reply here — the parent is emailed and sees it on their Help & Support page."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Needs reply" value={String(counts.awaitingReply)} icon={MessageSquareWarning} tone="destructive" />
        <KpiCard label="Open" value={String(counts.open)} icon={Inbox} tone="warning" />
        <KpiCard label="In progress" value={String(counts.inProgress)} icon={LifeBuoy} tone="primary" />
        <KpiCard label="Resolved" value={String(counts.resolved)} detail={`${counts.closed} closed`} icon={CheckCircle2} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border p-0.5 sm:inline-flex">
        {FILTERS.map(([key, label]) => (
          <Button key={key} size="sm" variant={filter === key ? "secondary" : "ghost"} onClick={() => setFilter(key)}>
            {label}
          </Button>
        ))}
      </div>

      <DataTable
        data={visible}
        columns={columns}
        rowKey={(t) => t.id}
        onRowClick={(t) => void openThread(t.id)}
        searchPlaceholder="Search by subject, parent, child or reference…"
        searchFn={(t, q) =>
          [t.subject, t.parentName, t.parentEmail, t.childName, t.reference, t.lastMessagePreview].some((v) =>
            v?.toLowerCase().includes(q.toLowerCase()),
          )
        }
        emptyTitle="No tickets here"
        emptyDescription="Tickets appear as soon as a parent raises one from Help & Support in their portal."
        error={apiEnabled() ? error : null}
        onRetry={refresh}
      />

      <Dialog open={!!openTicket} onOpenChange={(open) => !open && closeThread()}>
        <DialogContent className="max-w-2xl">
          {openTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                  {openTicket.subject} <TicketStatusBadge status={openTicket.status} />
                </DialogTitle>
                <DialogDescription>
                  {openTicket.reference} · {ticketCategoryLabel(openTicket.category)} · raised {formatTicketTime(openTicket.createdAtUtc)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold text-foreground">
                    {openTicket.parentName}
                    {openTicket.childName && <span className="font-normal text-muted-foreground"> · parent of {openTicket.childName}</span>}
                  </p>
                  <p className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {openTicket.parentEmail}</p>
                  {openTicket.parentPhone && (
                    <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {openTicket.parentPhone}</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {statusBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Select value={openTicket.status} onValueChange={(v) => void changeStatus(v as SupportTicketStatus)} disabled={statusBusy}>
                      <SelectTrigger className="h-9 w-[150px]" aria-label="Ticket status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TICKET_STATUS_LABELS) as SupportTicketStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <SupportTicketThread
                ticket={openTicket}
                viewer="staff"
                onReply={reply}
                readOnlyNote={canEdit ? undefined : "You have view-only access to Support Tickets; replying needs Edit access."}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
