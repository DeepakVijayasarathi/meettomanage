import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  TICKET_STATUS_LABELS,
  formatTicketTime,
  type ApiSupportTicketDetail,
  type SupportTicketStatus,
} from "@/api/supportTickets";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<SupportTicketStatus, "default" | "warning" | "success" | "muted"> = {
  Open: "warning",
  InProgress: "default",
  Resolved: "success",
  Closed: "muted",
};

export function TicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{TICKET_STATUS_LABELS[status]}</Badge>;
}

interface SupportTicketThreadProps {
  ticket: ApiSupportTicketDetail;
  /** Whose side "me" is — right-aligns and tints that side's bubbles. */
  viewer: "parent" | "staff";
  onReply: (message: string) => Promise<void>;
  /** Shown above the reply box, e.g. "Replying will reopen this ticket." */
  replyHint?: string;
  /** When set, the reply box is replaced by this note (e.g. a staff member without Edit access). */
  readOnlyNote?: string;
}

/**
 * The message thread + reply box shared by the parent "Help & Support" page and the
 * Relationship Manager / Admin "Parent Tickets" queue, so both sides read the same conversation.
 */
export function SupportTicketThread({ ticket, viewer, onReply, replyHint, readOnlyNote }: SupportTicketThreadProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [ticket.messages.length]);

  async function send() {
    const message = draft.trim();
    if (!message) return;
    setSending(true);
    try {
      await onReply(message);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="max-h-[50vh] min-h-[160px] space-y-3 overflow-y-auto rounded-xl border bg-muted/30 p-3">
        {ticket.messages.map((m) => {
          const mine = viewer === "staff" ? m.isStaff : !m.isStaff;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card text-foreground",
                )}
              >
                <p className={cn("mb-0.5 text-xs font-semibold", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {m.isStaff ? (viewer === "parent" ? `${m.authorName} · Support team` : `${m.authorName} (team)`) : m.authorName}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-1 text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {formatTicketTime(m.createdAtUtc)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {readOnlyNote ? (
        <p className="text-xs text-muted-foreground">{readOnlyNote}</p>
      ) : (
        <>
          {replyHint && <p className="text-xs text-muted-foreground">{replyHint}</p>}
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={viewer === "parent" ? "Write a message to the team…" : "Reply to the parent…"}
              maxLength={4000}
              rows={3}
              className="min-h-[72px] flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button onClick={() => void send()} disabled={sending || !draft.trim()} aria-label="Send message">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
