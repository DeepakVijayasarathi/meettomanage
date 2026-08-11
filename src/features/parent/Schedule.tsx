import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays, ListChecks, PlayCircle, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CalendarSyncButton } from "@/components/CalendarSyncButton";
import { MultiChildSwitcher } from "@/components/MultiChildSwitcher";
import { CalendarBoard } from "@/components/CalendarBoard";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/state/session";
import { getChildById } from "@/data/children";
import { getSessionsForChild } from "@/data/sessions";
import { getBatchById } from "@/data/batches";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { toFrontendSession } from "@/api/sessions";
import { getParentSchedule } from "@/api/parentPortal";
import { cn, formatDate } from "@/lib/utils";
import type { ClassSession } from "@/types";
import { compareSessionAsc, compareSessionDesc, isJoinable, joinHint, recordingExpiryLabel } from "./utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * API mode has no separate "batch" entity on the client — but the recurring pattern
 * (which weekdays, what time) is fully derivable from the child's own scheduled
 * sessions, so the "when does class normally happen" summary doesn't need a new
 * endpoint. Only counts status "scheduled" — one-off demos/reschedules shouldn't
 * skew the pattern.
 */
function recurringPatternLabel(sessions: ClassSession[]): string | undefined {
  const recurring = sessions.filter((s) => s.status === "scheduled");
  if (recurring.length === 0) return undefined;

  const weekdays = new Set<number>();
  const timeCounts = new Map<string, number>();
  for (const s of recurring) {
    weekdays.add(new Date(`${s.date}T00:00:00`).getDay());
    timeCounts.set(s.startTime, (timeCounts.get(s.startTime) ?? 0) + 1);
  }
  const mostCommonTime = [...timeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const dayLabels = [...weekdays].sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d]);
  return `${dayLabels.join(", ")} · ${formatTimeLabel(mostCommonTime)}`;
}

export default function ParentSchedule() {
  const { activeChildId, enrolledChildIds, children: sessionChildren } = useSession();
  const usingApi = apiEnabled();
  const mockChild = getChildById(activeChildId);
  const sessionChild = sessionChildren.find((c) => c.id === activeChildId) ?? sessionChildren[0];
  // Normalized active child (real in API mode, mock otherwise) — just id + name.
  const child = usingApi
    ? sessionChild
      ? { id: sessionChild.id, name: sessionChild.name }
      : undefined
    : mockChild
      ? { id: mockChild.id, name: mockChild.name }
      : undefined;
  const [selected, setSelected] = useState<ClassSession | null>(null);

  const { data: apiSessions, error: sessionsError, reload: reloadSessions } = useApiData<ClassSession[]>(
    () => {
      const from = new Date(Date.now() - 60 * 86400_000).toISOString();
      const to = new Date(Date.now() + 60 * 86400_000).toISOString();
      return getParentSchedule(from, to).then((items) => items.map(toFrontendSession));
    },
    []
  );
  const sessions = useMemo(() => {
    if (!usingApi) return mockChild ? getSessionsForChild(mockChild.id) : [];
    if (!child) return [];
    // Demo sessions aren't tied to a specific enrolled child yet (childIds is empty for
    // them) and stay visible regardless of which child is selected; regular batch
    // sessions are scoped to whichever of the parent's children are in that batch.
    return apiSessions.filter((s) => s.childIds.length === 0 || s.childIds.includes(child.id));
  }, [usingApi, apiSessions, mockChild, child]);

  const upcoming = useMemo(
    () => sessions.filter((s) => ["scheduled", "demo", "rescheduled"].includes(s.status)).sort(compareSessionAsc),
    [sessions]
  );

  const past = useMemo(
    () => sessions.filter((s) => ["completed", "cancelled", "noshow"].includes(s.status)).sort(compareSessionDesc),
    [sessions]
  );

  const isEnrolled = usingApi ? (sessionChild?.enrollmentComplete ?? false) : mockChild ? enrolledChildIds.includes(mockChild.id) : false;
  const batch = !usingApi && mockChild ? getBatchById(mockChild.batchId) : undefined;
  const recurringPattern = useMemo(() => (usingApi ? recurringPatternLabel(sessions) : undefined), [usingApi, sessions]);

  return (
    <div>
      <PageHeader
        title="Schedule &amp; Live Class"
        description="Upcoming sessions, calendar view and one-click join for your child."
        actions={<CalendarSyncButton />}
      />
      <MultiChildSwitcher />

      {child && !isEnrolled && (
        <Card className="mt-4 border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
            <p className="text-sm text-foreground">
              {child.name.split(" ")[0]}'s enrollment isn't complete yet — demo sessions still show below, but regular batch classes
              unlock after enrollment.{" "}
              <Link to={`/parent/enrollment?childId=${child.id}`} className="font-semibold text-primary hover:underline">
                Finish enrollment →
              </Link>
            </p>
          </div>
        </Card>
      )}

      {usingApi && sessionsError && (
        <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
          Could not load the schedule ({sessionsError}).{" "}
          <button type="button" className="underline" onClick={() => reloadSessions()}>
            Retry
          </button>
        </p>
      )}

      {!child ? (
        <EmptyState icon={CalendarDays} title="No child selected" className="mt-6" />
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {batch && (
            <p className="text-sm text-muted-foreground">
              Batch: <span className="font-semibold text-foreground">{batch.name}</span> · {batch.schedule}
            </p>
          )}
          {recurringPattern && (
            <p className="text-sm text-muted-foreground">
              Regular class days: <span className="font-semibold text-foreground">{recurringPattern}</span>
            </p>
          )}

          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              {upcoming.length === 0 ? (
                <EmptyState icon={ListChecks} title="No upcoming sessions" description="New classes will appear here once scheduled." />
              ) : (
                <div className="flex flex-col gap-3">
                  {upcoming.map((s) => (
                    <ScheduleRow key={s.id} session={s} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="calendar">
              <Card>
                <CardContent className="pt-5">
                  <CalendarBoard sessions={sessions} onSessionClick={setSelected} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Past Sessions</CardTitle>
              <CardDescription>Attendance history and recording availability</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {past.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No past sessions yet" />
              ) : (
                past.map((s) => <PastRow key={s.id} session={s} />)
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {formatDate(selected.date, "long")} · {selected.startTime} · {selected.teacherName}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between">
                <SessionStatusBadge status={selected.status} />
                {isJoinable(selected) ? (
                  <Button asChild size="sm">
                    <Link
                      to={`/parent/live/${selected.id}`}
                      state={selected.meetingRoomId ? { room: selected.meetingRoomId, title: selected.title } : undefined}
                    >
                      <Video className="h-3.5 w-3.5" /> Join Class
                    </Link>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{joinHint(selected)}</span>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleRow({ session }: { session: ClassSession }) {
  const joinable = isJoinable(session);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{session.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(session.date, "long")} · {session.startTime} · {session.teacherName}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SessionStatusBadge status={session.status} />
        {joinable ? (
          <Button size="sm" asChild>
            <Link
              to={`/parent/live/${session.id}`}
              state={session.meetingRoomId ? { room: session.meetingRoomId, title: session.title } : undefined}
            >
              <Video className="h-3.5 w-3.5" /> Join
            </Link>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button size="sm" variant="outline" disabled>
                  <Video className="h-3.5 w-3.5" /> Join
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{joinHint(session)}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function PastRow({ session }: { session: ClassSession }) {
  const recInfo = session.recordingAvailable ? recordingExpiryLabel(session) : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{session.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(session.date, "long")} · {session.startTime} · {session.teacherName}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <SessionStatusBadge status={session.status} />
        {recInfo ? (
          <Link
            to="/parent/resources"
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
              recInfo.expired ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary hover:bg-primary/15"
            )}
          >
            <PlayCircle className="h-3.5 w-3.5" /> {recInfo.label}
          </Link>
        ) : session.status === "completed" ? (
          <span className="text-xs text-muted-foreground">No recording</span>
        ) : null}
      </div>
    </div>
  );
}
