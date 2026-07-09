import { useState } from "react";
import { Bell, CheckCheck, AlertTriangle, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NOTIFICATIONS } from "@/data/notifications";
import type { NotificationItem } from "@/types";
import { cn } from "@/lib/utils";

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
  const [items, setItems] = useState(NOTIFICATIONS);
  const unread = items.filter((i) => !i.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-10 w-10 rounded-full">
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
          <button
            onClick={() => setItems((prev) => prev.map((i) => ({ ...i, read: true })))}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.map((item) => {
            const Icon = ICON_BY_TYPE[item.type];
            return (
              <div key={item.id} className={cn("flex gap-3 border-b border-border/60 px-4 py-3 last:border-0", !item.read && "bg-primary/[0.03]")}>
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", COLOR_BY_TYPE[item.type])}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">{item.time}</p>
                </div>
                {!item.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
