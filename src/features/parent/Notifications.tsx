import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, BellOff, CheckCheck, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
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
import type { NotificationItem } from "@/types";
import { TODAY_ISO, YESTERDAY_ISO } from "./utils";

interface ParentNotification extends NotificationItem {
  /** ISO date used only for day-grouping — independent of the human-readable `time` string. */
  date: string;
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
  },
  {
    id: "pn-2",
    title: "Fee reminder: Diya's invoice due soon",
    description: "INV-2026-1002 for ₹2,800 is due on 12 Jul. Pay now to avoid late fees.",
    time: "Today, 9:00 AM",
    read: false,
    type: "warning",
    date: "2026-07-09",
  },
  {
    id: "pn-3",
    title: "Kabir's enrollment is incomplete",
    description: "Finish Kabir's enrollment form to unlock his dashboard and upcoming demo class details.",
    time: "Today, 8:15 AM",
    read: false,
    type: "danger",
    date: "2026-07-09",
  },
  {
    id: "pn-4",
    title: "New recording available",
    description: "Aarav's Phonics-A1 session from Jul 6 is ready to watch. Available for 15 days from upload.",
    time: "Yesterday, 6:10 PM",
    read: true,
    type: "info",
    date: "2026-07-08",
  },
  {
    id: "pn-5",
    title: "Weekly performance summary",
    description: "Aarav completed 3 of 3 classes this week with 92% attendance. Great progress on blending sounds!",
    time: "Yesterday, 5:00 PM",
    read: true,
    type: "success",
    date: "2026-07-08",
  },
  {
    id: "pn-6",
    title: "Class rescheduled",
    description: "Diya's Reading-R1 session moved from Jul 3 to Jul 10, 11:00 AM.",
    time: "Yesterday, 11:20 AM",
    read: true,
    type: "info",
    date: "2026-07-08",
  },
  {
    id: "pn-7",
    title: "Payment received",
    description: "₹2,500 received for Aarav's Phonics Foundations invoice INV-2026-1010.",
    time: "3 days ago",
    read: true,
    type: "success",
    date: "2026-07-06",
  },
  {
    id: "pn-8",
    title: "Demo class confirmed",
    description: "Kabir's demo session with Karan Mehta is confirmed for Jul 12, 4:00 PM.",
    time: "3 days ago",
    read: true,
    type: "info",
    date: "2026-07-06",
  },
  {
    id: "pn-9",
    title: "Attendance dip noticed",
    description: "Diya missed her last session. Reach out to your coordinator if you'd like to reschedule.",
    time: "5 days ago",
    read: true,
    type: "warning",
    date: "2026-07-04",
  },
  {
    id: "pn-10",
    title: "Monthly report ready",
    description: "June's academic report for Aarav and Diya is ready to download from Resources.",
    time: "1 week ago",
    read: true,
    type: "info",
    date: "2026-07-02",
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
  return { ...toNotificationItem(n), date: localIsoDate(new Date(n.createdAtUtc)) };
}

export default function ParentNotifications() {
  const usingApi = apiEnabled();
  const [items, setItems] = useState<ParentNotification[]>(usingApi ? [] : PARENT_NOTIFICATIONS);
  const [loaded, setLoaded] = useState(!usingApi);
  const unreadCount = items.filter((n) => !n.read).length;

  // API mode: the parent's real feed (attendance, payments, reminders, reports),
  // shared with the topbar bell. The mock list is demo-only.
  useEffect(() => {
    if (!usingApi) return;
    let cancelled = false;
    getMyNotifications(50)
      .then((feed) => {
        if (cancelled) return;
        setItems(feed.items.map(apiToParentNotification));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [usingApi]);

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

  return (
    <div>
      <PageHeader
        title="Notifications &amp; Reports"
        description="Attendance updates, performance summaries and payment reminders for your family."
        actions={
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loaded && <NotificationGroups groups={groupByDay(items, todayIso, yesterdayIso)} onToggle={toggleRead} />}
        </TabsContent>
        <TabsContent value="unread">
          {loaded && (
            <NotificationGroups groups={groupByDay(items.filter((n) => !n.read), todayIso, yesterdayIso)} onToggle={toggleRead} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationGroups({
  groups,
  onToggle,
}: {
  groups: ReadonlyArray<readonly [string, ParentNotification[]]>;
  onToggle: (id: string) => void;
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
              <NotificationRow key={n.id} item={n} onToggle={() => onToggle(n.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationRow({ item, onToggle }: { item: ParentNotification; onToggle: () => void }) {
  const Icon = TYPE_ICON[item.type];
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-muted/40",
        item.read ? "border-border bg-card" : "border-primary/30 bg-primary/[0.04]"
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
    </button>
  );
}
