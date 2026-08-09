import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClassSession, SessionStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { SESSION_STATUS_COLOR, SESSION_STATUS_LABEL } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

interface CalendarBoardProps {
  sessions: ClassSession[];
  initialMonth?: Date;
  onSessionClick?: (session: ClassSession) => void;
  legendStatuses?: SessionStatus[];
}

const DEFAULT_LEGEND: SessionStatus[] = ["scheduled", "completed", "cancelled", "noshow", "demo", "rescheduled", "holiday", "leave"];

export function CalendarBoard({ sessions, initialMonth, onSessionClick, legendStatuses = DEFAULT_LEGEND }: CalendarBoardProps) {
  const [cursor, setCursor] = useState(initialMonth ?? new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    const arr: Date[] = [];
    let d = start;
    while (d <= end) {
      arr.push(d);
      d = addDays(d, 1);
    }
    return arr;
  }, [cursor]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of sessions) {
      const key = s.date;
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [sessions]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-tight">{format(cursor, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous month"
            title="Previous month"
            onClick={() => setCursor((c) => subMonths(c, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next month"
            title="Next month"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-7 bg-muted/50 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const daySessions = sessionsByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, cursor);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[104px] border-b border-r border-border p-1.5 last:border-r-0",
                  !inMonth && "bg-muted/20",
                  isToday(day) && "bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      !inMonth && "text-muted-foreground/50",
                      isToday(day) && "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {daySessions.slice(0, 3).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onSessionClick?.(s)}
                      title={s.title}
                      className={cn(
                        "flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium text-white transition-transform hover:scale-[1.02]",
                        SESSION_STATUS_COLOR[s.status]
                      )}
                    >
                      <span className="truncate">
                        {s.startTime} {s.title}
                      </span>
                    </button>
                  ))}
                  {daySessions.length > 3 && (
                    <span className="px-1.5 text-[10px] font-semibold text-muted-foreground">+{daySessions.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-muted/40 px-3 py-2.5">
        {legendStatuses.map((status) => (
          <div key={status} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", SESSION_STATUS_COLOR[status])} />
            {SESSION_STATUS_LABEL[status]}
          </div>
        ))}
      </div>
    </div>
  );
}
