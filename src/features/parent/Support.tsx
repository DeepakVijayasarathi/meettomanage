import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronRight, LifeBuoy, Loader2, MessageSquarePlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SupportTicketThread, TicketStatusBadge } from "@/components/SupportTicketThread";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import {
  TICKET_CATEGORIES,
  createSupportTicket,
  formatTicketTime,
  getMySupportTicket,
  listMySupportTickets,
  replyToMySupportTicket,
  ticketCategoryLabel,
  type ApiSupportTicketDetail,
  type ApiSupportTicketSummary,
  type SupportTicketCategory,
} from "@/api/supportTickets";
import { useSession } from "@/state/session";
import { toast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";

const NO_CHILD = "none";

/**
 * Parent "Help & Support": raise a ticket for any concern and follow the conversation with
 * the Relationship Manager team here — the portal replaces WhatsApp/phone contact with the team.
 */
export default function ParentSupport() {
  const { children } = useSession();
  const { data: tickets, loading, error, reload } = useApiData(() => listMySupportTickets(), [] as ApiSupportTicketSummary[]);
  const [searchParams, setSearchParams] = useSearchParams();

  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState<SupportTicketCategory | "">("");
  const [childId, setChildId] = useState<string>(NO_CHILD);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [openTicket, setOpenTicket] = useState<ApiSupportTicketDetail | null>(null);
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null);

  // Deep link from the "update on your ticket" email: /parent/support?ticket=<id>
  const linkedTicketId = searchParams.get("ticket");
  useEffect(() => {
    if (linkedTicketId && apiEnabled()) void openThread(linkedTicketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedTicketId]);

  function resetForm() {
    setCategory("");
    setChildId(children.length === 1 ? children[0].id : NO_CHILD);
    setSubject("");
    setMessage("");
  }

  function startNew() {
    resetForm();
    setCreating(true);
  }

  async function submit() {
    if (!category || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const created = await createSupportTicket({
        category,
        subject: subject.trim(),
        message: message.trim(),
        childId: childId === NO_CHILD ? null : childId,
      });
      setCreating(false);
      toast({ variant: "success", title: `Ticket ${created.reference} raised`, description: "Our team will reply here — you'll also get an email." });
      reload();
      setOpenTicket(created);
    } catch (err) {
      toast({ variant: "error", title: "Couldn't raise the ticket", description: userMessage(err, "Please try again.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function openThread(id: string) {
    setLoadingTicketId(id);
    try {
      setOpenTicket(await getMySupportTicket(id));
    } catch (err) {
      toast({ variant: "error", title: "Couldn't open the ticket", description: userMessage(err, "Please try again.") });
    } finally {
      setLoadingTicketId(null);
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
      setOpenTicket(await replyToMySupportTicket(openTicket.id, text));
      reload();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't send your message", description: userMessage(err, "Please try again.") });
      throw err;
    }
  }

  const active = tickets.filter((t) => t.status === "Open" || t.status === "InProgress");
  const past = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed");

  return (
    <div>
      <PageHeader
        eyebrow="Support"
        title="Help & Support"
        description="Have a question or concern? Raise a ticket and our team will reply right here."
        actions={
          <Button onClick={startNew}>
            <MessageSquarePlus className="h-4 w-4" /> Raise a ticket
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <EmptyState
          icon={LifeBuoy}
          title="Couldn't load your tickets"
          description={error}
          action={<Button variant="outline" onClick={reload}>Try again</Button>}
        />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="No tickets yet"
          description="Class timing, teacher, billing, login trouble — whatever it is, raise a ticket and the team will get back to you."
          action={<Button onClick={startNew}><MessageSquarePlus className="h-4 w-4" /> Raise a ticket</Button>}
        />
      ) : (
        <div className="space-y-6">
          <TicketList title="Active" tickets={active} loadingId={loadingTicketId} onOpen={openThread} />
          <TicketList title="Resolved & closed" tickets={past} loadingId={loadingTicketId} onOpen={openThread} />
        </div>
      )}

      {/* Raise a ticket */}
      <Dialog open={creating} onOpenChange={(open) => !open && !submitting && setCreating(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise a ticket</DialogTitle>
            <DialogDescription>Tell us what's going on. The more detail you share, the faster we can help.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ticket-category">What is it about?</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SupportTicketCategory)}>
                <SelectTrigger id="ticket-category">
                  <SelectValue placeholder="Choose a topic" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {children.length > 0 && (
              <div className="grid gap-1.5">
                <Label htmlFor="ticket-child">Which child? (optional)</Label>
                <Select value={childId} onValueChange={setChildId}>
                  <SelectTrigger id="ticket-child">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CHILD}>Not about a specific child</SelectItem>
                    {children.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={subject}
                maxLength={200}
                placeholder="e.g. Class time shows 4:00 PM, expected 5:30 PM"
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ticket-message">Details</Label>
              <Textarea
                id="ticket-message"
                value={message}
                maxLength={4000}
                rows={5}
                placeholder="Describe your concern…"
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={submitting || !category || !subject.trim() || !message.trim()}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket thread */}
      <Dialog open={!!openTicket} onOpenChange={(open) => !open && closeThread()}>
        <DialogContent className="max-w-2xl">
          {openTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                  {openTicket.subject} <TicketStatusBadge status={openTicket.status} />
                </DialogTitle>
                <DialogDescription>
                  {openTicket.reference} · {ticketCategoryLabel(openTicket.category)}
                  {openTicket.childName ? ` · ${openTicket.childName}` : ""} · raised {formatTicketTime(openTicket.createdAtUtc)}
                </DialogDescription>
              </DialogHeader>
              <SupportTicketThread
                ticket={openTicket}
                viewer="parent"
                onReply={reply}
                replyHint={
                  openTicket.status === "Resolved" || openTicket.status === "Closed"
                    ? "This ticket is closed. Sending a message will reopen it."
                    : undefined
                }
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TicketList({
  title,
  tickets,
  loadingId,
  onOpen,
}: {
  title: string;
  tickets: ApiSupportTicketSummary[];
  loadingId: string | null;
  onOpen: (id: string) => void;
}) {
  if (tickets.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <Card className="divide-y overflow-hidden p-0">
        {tickets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen(t.id)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-foreground">{t.subject}</p>
                <TicketStatusBadge status={t.status} />
                {!t.awaitingStaffReply && (t.status === "Open" || t.status === "InProgress") && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Team replied</span>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{t.lastMessagePreview}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.reference} · {ticketCategoryLabel(t.category)} · updated {formatTicketTime(t.lastActivityAtUtc)}
              </p>
            </div>
            {loadingId === t.id ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        ))}
      </Card>
    </section>
  );
}
