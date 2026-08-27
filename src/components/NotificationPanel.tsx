import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, AlertTriangle, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NOTIFICATIONS } from "@/data/notifications";
import type { NotificationItem } from "@/types";
import { cn } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  toNotificationItem,
} from "@/api/notifications";

const ICON_BY_TYPE: Record<NotificationItem["type"], typeof Info> = {
  info: Info,
  success: CheckCheck,
  warning: AlertTriangle,
  danger: XCircle,
};

const COLOR_BY_TYPE: Record<NotificationItem["type"], string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/10 text-destructive",
};

export function NotificationPanel() {
  // Demo mode (no API) keeps the mock feed; with the API configured the bell
  // shows the signed-in user's real notifications.
  const [items, setItems] = useState<NotificationItem[]>(apiEnabled() ? [] : NOTIFICATIONS);
  const unread = items.filter((i) => !i.read).length;

  const load = useCallback(() => {
    if (!apiEnabled()) return;
    getMyNotifications()
      .then((feed) => setItems(feed.items.map(toNotificationItem)))
      .catch(() => {
        /* leave the current list on a transient failure */
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    if (apiEnabled()) {
      try {
        await markAllNotificationsRead();
      } catch {
        load(); // reconcile with server truth if it failed
      }
    }
  }

  async function markOneRead(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target || target.read) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    if (apiEnabled()) {
      try {
        await markNotificationRead(id);
      } catch {
        load();
      }
    }
  }

  return (
    <Popover onOpenChange={(open) => open && load()}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 rounded-full"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-bold">Notifications</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up.</div>
          ) : (
            items.map((item) => {
              const Icon = ICON_BY_TYPE[item.type];
              return (
                <button
                  key={item.id}
                  onClick={() => markOneRead(item.id)}
                  className={cn(
                    "flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left last:border-0 hover:bg-muted/40",
                    !item.read && "bg-primary/[0.03]"
                  )}
                >
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", COLOR_BY_TYPE[item.type])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.description}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">{item.time}</p>
                  </div>
                  {!item.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
