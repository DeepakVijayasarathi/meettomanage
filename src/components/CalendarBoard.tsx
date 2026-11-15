import { useEffect, useMemo, useRef, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SESSION_STATUS_COLOR, SESSION_STATUS_LABEL } from "@/components/StatusBadge";
import { cn, formatTimeLabel } from "@/lib/utils";
import { holidayNameFromReason } from "@/lib/cancelledBy";

interface CalendarBoardProps {
  sessions: ClassSession[];
  initialMonth?: Date;
  onSessionClick?: (session: ClassSession) => void;
  legendStatuses?: SessionStatus[];
  /** Called whenever the shown month changes, so the page can load just that month's classes. */
  onMonthChange?: (month: Date) => void;
}

/** Text on a status chip: white only on the dark red "cancelled"; the other status colours are too
 *  light for white text (as low as 1.9:1 on scheduled yellow), so they get near-black. */
const chipText = (status: SessionStatus) => (status === "cancelled" ? "text-white" : "text-[#1C1917]");

const DEFAULT_LEGEND: SessionStatus[] = ["scheduled", "completed", "cancelled", "noshow", "demo", "rescheduled", "holiday", "leave"];

export function CalendarBoard({ sessions, initialMonth, onSessionClick, legendStatuses = DEFAULT_LEGEND, onMonthChange }: CalendarBoardProps) {
  const [cursor, setCursor] = useState(initialMonth ?? new Date());
  // Phones only: the day whose classes are listed under the grid (cells there show dots, not labels).
  const [selectedKey, setSelectedKey] = useState(() => format(initialMonth ?? new Date(), "yyyy-MM-dd"));
  const onMonthChangeRef = useRef(onMonthChange);
  onMonthChangeRef.current = onMonthChange;
  useEffect(() => {
    onMonthChangeRef.current?.(cursor);
  }, [cursor]);

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
    // Earliest first, so a day reads in the order it happens.
    for (const list of map.values()) list.sort((x, y) => x.startTime.localeCompare(y.startTime));
    return map;
  }, [sessions]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {/* aria-live: Prev/Next/Today swap this text without moving focus — without it, a
            screen-reader user who clicked "Next month" has no way to know the grid changed
            unless they re-navigate back to this heading. */}
        <h3 className="text-lg font-bold tracking-tight" aria-live="polite">{format(cursor, "MMMM yyyy")}</h3>
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
        <div className="grid grid-cols-7 bg-muted/50 text-center text-xs font-medium text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const allDaySessions = sessionsByDay.get(key) ?? [];
            // A holiday day: the holiday itself plus any classes cancelled because of it (those carry
            // status "holiday" too). The whole day is greyed with a "Holiday" label and those
            // not-held classes are collapsed to a count, so it never reads as a wall of cancellations.
            // A class still Scheduled on a holiday (a data problem) stays visible.
            const holidayEvents = allDaySessions.filter((s) => s.status === "holiday");
            const isHoliday = holidayEvents.length > 0;
            const holidayEvent = holidayEvents.find((s) => s.id.startsWith("holiday-")) ?? holidayEvents[0];
            const holidayName = holidayEvent ? (holidayEvent.id.startsWith("holiday-") ? holidayEvent.title : holidayNameFromReason(holidayEvent.cancellationReason)) : null;
            const notHeldCount = holidayEvents.filter((s) => !s.id.startsWith("holiday-")).length;
            const daySessions = isHoliday ? allDaySessions.filter((s) => s.status !== "holiday") : allDaySessions;
            const inMonth = isSameMonth(day, cursor);
            return (
              <div
                key={key}
                className={cn(
                  "relative min-h-[60px] border-b border-r border-border p-1 last:border-r-0 sm:min-h-[104px] sm:p-1.5",
                  selectedKey === key && "ring-2 ring-inset ring-primary sm:ring-0",
                  !inMonth && "bg-muted/20",
                  isToday(day) && "bg-primary/5",
                  isHoliday && "bg-muted/80 grayscale"
                )}
              >
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      !inMonth && "text-muted-foreground font-normal",
                      isToday(day) && "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                {/* Phones: seven columns are too narrow for labels, so a day shows dots and tapping it lists its classes below. */}
                <button
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  aria-label={`${format(day, "EEEE, MMM d")}: ${isHoliday ? "holiday, " : ""}${daySessions.length} ${daySessions.length === 1 ? "class" : "classes"}`}
                  aria-pressed={selectedKey === key}
                  className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1.5 sm:hidden"
                >
                  {isHoliday && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />}
                  {daySessions.slice(0, 4).map((s) => <span key={s.id} className={cn("h-1.5 w-1.5 rounded-full", SESSION_STATUS_COLOR[s.status])} />)}
                  {daySessions.length > 4 && <span className="text-[9px] font-bold leading-none text-muted-foreground">+</span>}
                </button>
                <div className="mt-1 hidden flex-col gap-1 sm:flex">
                  {isHoliday && holidayEvent && (
                    <button
                      onClick={() => onSessionClick?.(holidayEvent)}
                      title={holidayName ? `Holiday — ${holidayName}` : "Holiday"}
                      className="flex flex-col items-start rounded-md border border-border bg-background/70 px-1.5 py-1 text-left"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Holiday</span>
                      {holidayName && <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground">{holidayName}</span>}
                      {notHeldCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {notHeldCount} {notHeldCount === 1 ? "class" : "classes"} not held
                        </span>
                      )}
                    </button>
                  )}
                  {daySessions.slice(0, 3).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onSessionClick?.(s)}
                      title={s.title}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium transition-transform hover:scale-[1.02]",
                        SESSION_STATUS_COLOR[s.status],
                        chipText(s.status)
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {formatTimeLabel(s.startTime)} {s.title}
                      </span>
                    </button>
                  ))}
                  {daySessions.length > 3 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="px-1.5 text-left text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:underline">
                          +{daySessions.length - 3} more
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-64 p-2">
                        <p className="px-1 pb-1.5 text-xs font-bold text-foreground">{format(day, "EEEE, MMM d")}</p>
                        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                          {daySessions.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => onSessionClick?.(s)}
                              title={s.title}
                              className={cn(
                                "flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-medium transition-transform hover:scale-[1.02]",
                                SESSION_STATUS_COLOR[s.status],
                                chipText(s.status)
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {formatTimeLabel(s.startTime)} {s.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SelectedDayList dateKey={selectedKey} sessions={sessionsByDay.get(selectedKey) ?? []} onSessionClick={onSessionClick} />

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

/** Phones only: the tapped day's holiday and classes, full width so titles are readable. */
function SelectedDayList({ dateKey, sessions, onSessionClick }: { dateKey: string; sessions: ClassSession[]; onSessionClick?: (session: ClassSession) => void }) {
  const day = new Date(`${dateKey}T00:00:00`);
  const holiday = sessions.find((s) => s.id.startsWith("holiday-"));
  const items = sessions.filter((s) => !s.id.startsWith("holiday-"));
  return (
    <div className="rounded-xl border border-border p-3 sm:hidden" aria-live="polite">
      <p className="text-sm font-bold text-foreground">{format(day, "EEEE, MMM d")}</p>
      {holiday && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Holiday · {holiday.title}</p>}
      {items.length === 0 ? (
        !holiday && <p className="mt-1 text-sm text-muted-foreground">No classes this day.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {items.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSessionClick?.(s)}
              className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium", SESSION_STATUS_COLOR[s.status], chipText(s.status))}
            >
              <span className="shrink-0 tabular-nums">{formatTimeLabel(s.startTime)}</span>
              <span className="min-w-0 flex-1 break-words">{s.title}<span className="block text-xs font-normal opacity-90">{SESSION_STATUS_LABEL[s.status]}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
