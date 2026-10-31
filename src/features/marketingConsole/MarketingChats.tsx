import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, CalendarCheck2, ChevronLeft, ChevronRight, Loader2, MessagesSquare, Search, User } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { getMarketingChat, listMarketingChats, type ApiMarketingChatConversation, type ApiMarketingChatDetail, type ApiPaged } from "@/api/marketing";
import { userMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const EMPTY: ApiPaged<ApiMarketingChatConversation> = { items: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE };

const when = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

/** Marketing console → Chats: every conversation visitors had with the website's AI assistant. */
export default function MarketingChats() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [bookedOnly, setBookedOnly] = useState(false);
  // ?open=<id> (from a visitor's journey page) opens that conversation straight away.
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(() => searchParams.get("open"));
  const [detail, setDetail] = useState<ApiMarketingChatDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Search the whole history (server side), a moment after typing stops.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, loading, error, reload } = useApiData(
    () => listMarketingChats({ page, pageSize: PAGE_SIZE, search: search || undefined, bookedOnly }),
    EMPTY,
    EMPTY,
    { cacheKey: `marketing-chats-${page}-${search}-${bookedOnly}`, ttlMs: 15_000 },
  );

  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    setDetail(null);
    setDetailError(null);
    getMarketingChat(openId)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((err) => { if (!cancelled) setDetailError(userMessage(err, "Couldn't load this conversation.")); });
    return () => { cancelled = true; };
  }, [openId]);

  const pages = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        eyebrow="Marketing"
        title="Chats"
        description="Every conversation visitors had with the website's AI assistant — what prospects ask, where they came from, and who booked a demo."
      />

      {error && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load chats ({error}).{" "}
          <button type="button" className="underline" onClick={() => reload()}>Retry</button>
        </InlineAlert>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search what visitors asked…" aria-label="Search chats" className="pl-9" />
        </div>
        <Button variant={bookedOnly ? "default" : "outline"} size="sm" onClick={() => { setBookedOnly((v) => !v); setPage(1); }}>
          <CalendarCheck2 className="h-4 w-4" /> Booked a demo
        </Button>
      </div>

      {loading && data.items.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : data.items.length === 0 && !error ? (
        <EmptyState
          icon={MessagesSquare}
          title={search || bookedOnly ? "No matching chats" : "No chats yet"}
          description={search || bookedOnly ? "Try a different search." : "Conversations from the website's chat assistant will show up here."}
        />
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {data.items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(c.id)}
              className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{c.firstMessage || "(no message)"}</p>
                <p className="text-xs text-muted-foreground">
                  {c.messageCount} messages · {c.source ?? "Direct"}{c.campaign ? ` · ${c.campaign}` : ""}{c.landingPath ? ` · ${c.landingPath}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {c.bookedName && <Badge variant="success">Booked · {c.bookedName}</Badge>}
                <span className="text-xs text-muted-foreground">{when(c.lastMessageAtUtc)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {data.totalCount > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.totalCount} conversations</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            <span>Page {page} / {pages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={openId !== null} onOpenChange={(open) => { if (!open) setOpenId(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chat conversation</DialogTitle>
            <DialogDescription>
              {detail
                ? `Started ${when(detail.conversation.startedAtUtc)} · ${detail.conversation.source ?? "Direct"}${detail.conversation.landingPath ? ` · ${detail.conversation.landingPath}` : ""}${detail.conversation.bookedName ? ` · Booked a demo as ${detail.conversation.bookedName}` : ""}`
                : "Loading…"}
            </DialogDescription>
          </DialogHeader>
          {detailError ? (
            <InlineAlert variant="warning">{detailError}</InlineAlert>
          ) : !detail ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3">
              {detail.messages.map((m, i) => {
                const visitor = m.role === "user";
                return (
                  <div key={i} className={cn("flex gap-2", visitor ? "flex-row-reverse" : "")}>
                    <span className={cn("mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", visitor ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      {visitor ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </span>
                    <div className={cn("max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm", visitor ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
