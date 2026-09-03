import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, BellOff, CheckCheck, CheckCircle2, Info, Loader2, MessageSquare, Send, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  toNotificationItem,
  type ApiNotification,
} from "@/api/notifications";
import { replyToBulkEmail } from "@/api/reports";
import type { NotificationItem } from "@/types";
import { TODAY_ISO, YESTERDAY_ISO } from "./utils";

interface ParentNotification extends NotificationItem {
  /** ISO date used only for day-grouping — independent of the human-readable `time` string. */
  date: string;
  /** Set when this is one recipient's copy of a Bulk Email — offers a reply box. Absent in demo mode. */
  bulkEmailRecipientId?: string | null;
  /** True once the parent has already replied to this Bulk Email. */
  hasReplied?: boolean;
  /** The parent's own reply text, once sent this session (server doesn't echo it back on the feed). */
  ownReply?: string;
}

const PARENT_NOTIFICATIONS: ParentNotification[] = [
  {
    id: "pn-1",
    title: "Aarav joined today's Phonics class",
    description: "Attendance marked present for Phonics-A1 · Session 19.",
    time: "Today, 4:30 PM",
    read: false,
    type: "success",
    date: "2026-07-09",
    route: "/parent/schedule",
  },
  {
    id: "pn-2",
    title: "Fee reminder: Diya's invoice due soon",
    description: "INV-2026-1002 for ₹2,800 is due on 12 Jul. Pay now to avoid late fees.",
    time: "Today, 9:00 AM",
    read: false,
    type: "warning",
    date: "2026-07-09",
    route: "/parent/billing",
  },
  {
    id: "pn-3",
    title: "Kabir's enrollment is incomplete",
    description: "Finish Kabir's enrollment form to unlock his dashboard and upcoming demo class details.",
    time: "Today, 8:15 AM",
    read: false,
    type: "danger",
    date: "2026-07-09",
    route: "/parent/enrollment",
  },
  {
    id: "pn-4",
    title: "New recording available",
    description: "Aarav's Phonics-A1 session from Jul 6 is ready to watch. Available for 15 days from upload.",
    time: "Yesterday, 6:10 PM",
    read: true,
    type: "info",
    date: "2026-07-08",
    route: "/parent/recordings",
  },
  {
    id: "pn-5",
    title: "Weekly performance summary",
    description: "Aarav completed 3 of 3 classes this week with 92% attendance. Great progress on blending sounds!",
    time: "Yesterday, 5:00 PM",
    read: true,
    type: "success",
    date: "2026-07-08",
    route: "/parent/schedule",
  },
  {
    id: "pn-6",
    title: "Class rescheduled",
    description: "Diya's Reading-R1 session moved from Jul 3 to Jul 10, 11:00 AM.",
    time: "Yesterday, 11:20 AM",
    read: true,
    type: "info",
    date: "2026-07-08",
    route: "/parent/schedule",
  },
  {
    id: "pn-7",
    title: "Payment received",
    description: "₹2,500 received for Aarav's Phonics Foundations invoice INV-2026-1010.",
    time: "3 days ago",
    read: true,
    type: "success",
    date: "2026-07-06",
    route: "/parent/billing",
  },
  {
    id: "pn-8",
    title: "Demo class confirmed",
    description: "Kabir's demo session with Karan Mehta is confirmed for Jul 12, 4:00 PM.",
    time: "3 days ago",
    read: true,
    type: "info",
    date: "2026-07-06",
    route: "/parent/schedule",
  },
  {
    id: "pn-9",
    title: "Attendance dip noticed",
    description: "Diya missed her last session. Reach out to your coordinator if you'd like to reschedule.",
    time: "5 days ago",
    read: true,
    type: "warning",
    date: "2026-07-04",
    route: "/parent/schedule",
  },
  {
    id: "pn-10",
    title: "Monthly report ready",
    description: "June's academic report for Aarav and Diya is ready to download from Resources.",
    time: "1 week ago",
    read: true,
    type: "info",
    date: "2026-07-02",
    route: "/parent/resources",
  },
];

const TYPE_ICON: Record<NotificationItem["type"], LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

const TYPE_TONE: Record<NotificationItem["type"], string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/10 text-destructive",
};

const GROUP_ORDER = ["Today", "Yesterday", "Earlier"] as const;

/** yyyy-MM-dd in the viewer's local timezone. */
function localIsoDate(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

function groupByDay(list: ParentNotification[], todayIso: string, yesterdayIso: string) {
  const map = new Map<string, ParentNotification[]>();
  for (const n of list) {
    const label = n.date === todayIso ? "Today" : n.date === yesterdayIso ? "Yesterday" : "Earlier";
    map.set(label, [...(map.get(label) ?? []), n]);
  }
  return GROUP_ORDER.filter((l) => map.has(l)).map((l) => [l, map.get(l)!] as const);
}

function apiToParentNotification(n: ApiNotification): ParentNotification {
  return {
    ...toNotificationItem(n, "parent"),
    date: localIsoDate(new Date(n.createdAtUtc)),
    bulkEmailRecipientId: n.bulkEmailRecipientId,
    hasReplied: n.hasReplied,
  };
}

export default function ParentNotifications() {
  const navigate = useNavigate();
  const usingApi = apiEnabled();
  const [items, setItems] = useState<ParentNotification[]>(usingApi ? [] : PARENT_NOTIFICATIONS);
  const [loaded, setLoaded] = useState(!usingApi);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const unreadCount = items.filter((n) => !n.read).length;

  // API mode: the parent's real feed (attendance, payments, reminders, reports),
  // shared with the topbar bell. The mock list is demo-only.
  useEffect(() => {
    if (!usingApi) return;
    let cancelled = false;
    setLoadError(null);
    getMyNotifications(50)
      .then((feed) => {
        if (cancelled) return;
        setItems(feed.items.map(apiToParentNotification));
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Keep whatever was last loaded (don't clobber it with []) and surface the
        // failure — otherwise a network error renders identically to "no notifications".
        setLoadError(err instanceof Error ? err.message : "Request failed");
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [usingApi, version]);

  const reload = () => setVersion((v) => v + 1);

  // Demo dates come from the fixed demo clock; real notifications use the real one.
  const todayIso = usingApi ? localIsoDate(new Date()) : TODAY_ISO;
  const yesterdayIso = usingApi ? localIsoDate(new Date(Date.now() - 86400_000)) : YESTERDAY_ISO;

  function toggleRead(id: string) {
    if (usingApi) {
      // The server tracks read-state one-way; clicking an unread row marks it read.
      const target = items.find((n) => n.id === id);
      if (!target || target.read) return;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      markNotificationRead(id).catch(() => {
        /* reload will reconcile */
      });
      return;
    }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    if (usingApi) {
      markAllNotificationsRead().catch(() => {
        /* reload will reconcile */
      });
    }
  }

  /** Same read-toggle as before, plus — when this notification is about a specific
   *  page (fee reminder → Billing, class reschedule → Schedule, etc.) — takes the
   *  parent there. */
  function openItem(item: ParentNotification) {
    toggleRead(item.id);
    if (item.route) navigate(item.route);
  }

  function handleReplied(id: string, message: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, hasReplied: true, ownReply: message } : n)));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Notifications &amp; Reports"
        description="Attendance updates, performance summaries and payment reminders for your family."
        actions={
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />

      {usingApi && loadError && (
        <InlineAlert variant="warning" className="mt-4">
          Could not load notifications ({loadError}) — the list below may be incomplete.{" "}
          <button type="button" className="underline" onClick={reload}>
            Retry
          </button>
        </InlineAlert>
      )}

      <Tabs defaultValue="all" className={usingApi && loadError ? "mt-4" : undefined}>
        <TabsList>
          <TabsTrigger value="all">{loaded ? `All (${items.length})` : <Skeleton className="h-4 w-14" />}</TabsTrigger>
          <TabsTrigger value="unread">{loaded ? `Unread (${unreadCount})` : <Skeleton className="h-4 w-16" />}</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loaded ? (
            <NotificationGroups groups={groupByDay(items, todayIso, yesterdayIso)} onOpen={openItem} onReplied={handleReplied} />
          ) : (
            <NotificationSkeletonList />
          )}
        </TabsContent>
        <TabsContent value="unread">
          {loaded ? (
            <NotificationGroups
              groups={groupByDay(items.filter((n) => !n.read), todayIso, yesterdayIso)}
              onOpen={openItem}
              onReplied={handleReplied}
            />
          ) : (
            <NotificationSkeletonList />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Shown in place of NotificationGroups while the real feed is still loading (`!loaded`). */
function NotificationSkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationGroups({
  groups,
  onOpen,
  onReplied,
}: {
  groups: ReadonlyArray<readonly [string, ParentNotification[]]>;
  onOpen: (item: ParentNotification) => void;
  onReplied: (id: string, message: string) => void;
}) {
  if (groups.length === 0) {
    return <EmptyState icon={BellOff} title="You're all caught up" description="No notifications to show here." />;
  }
  return (
    <div className="flex flex-col gap-6">
      {groups.map(([label, list]) => (
        <div key={label}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="flex flex-col gap-2">
            {list.map((n) => (
              <NotificationRow key={n.id} item={n} onOpen={() => onOpen(n)} onReplied={(message) => onReplied(n.id, message)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationRow({
  item,
  onOpen,
  onReplied,
}: {
  item: ParentNotification;
  onOpen: () => void;
  onReplied: (message: string) => void;
}) {
  const Icon = TYPE_ICON[item.type];
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition-colors",
        item.read ? "border-border bg-card" : "border-primary/30 bg-primary/[0.04]"
      )}
    >
      <div
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        // Unread status is otherwise conveyed only by bold text + a color dot + a tinted
        // background — none of which reaches a screen reader on their own.
        aria-label={`${item.read ? "Read" : "Unread"}: ${item.title}. ${item.description}`}
        className={cn(
          "flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          item.route && "cursor-pointer"
        )}
      >
        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TYPE_TONE[item.type])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn("text-sm text-foreground", !item.read && "font-bold")}>{item.title}</p>
            {!item.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
          <p className="mt-1 text-xs text-muted-foreground/70">{item.time}</p>
        </div>
      </div>

      {item.bulkEmailRecipientId && (
        <div className="ml-12 mt-2.5 border-t border-border/60 pt-2.5" onClick={(e) => e.stopPropagation()}>
          {item.hasReplied ? (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>{item.ownReply ? <>Your reply: &quot;{item.ownReply}&quot;</> : "You've replied to this email."}</p>
            </div>
          ) : (
            <BulkEmailReplyBox recipientId={item.bulkEmailRecipientId} onReplied={onReplied} />
          )}
        </div>
      )}
    </div>
  );
}

function BulkEmailReplyBox({ recipientId, onReplied }: { recipientId: string; onReplied: (message: string) => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      await replyToBulkEmail(recipientId, trimmed);
      onReplied(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your reply. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Reply to this email…"
        className="min-h-[70px] text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        <Button size="sm" className="ml-auto" disabled={!message.trim() || sending} onClick={handleSend}>
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Reply
        </Button>
      </div>
    </div>
  );
}
