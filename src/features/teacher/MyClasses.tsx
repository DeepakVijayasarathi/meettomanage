import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarClock, List, Users, Video } from "lucide-react";
import { useApiData } from "@/api/hooks";
import { listMySessions, toFrontendSession } from "@/api/sessions";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { FilterBar } from "@/components/FilterBar";
import { CalendarSyncButton } from "@/components/CalendarSyncButton";
import { CalendarBoard } from "@/components/CalendarBoard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { RecordingsDialog } from "@/components/RecordingsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { getSessionsForTeacher } from "@/data/sessions";
import { getBatchById } from "@/data/batches";
import { getCourseById } from "@/data/courses";
import { listHolidays, listLeave, type ApiHoliday, type ApiLeaveRequest } from "@/api/academicOps";
import { approvedLeaveToCalendarEvents, holidaysToCalendarEvents } from "@/lib/calendarEvents";
import { apiEnabled } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { isJoinable, joinHint } from "@/features/parent/utils";
import type { ClassSession, SessionStatus } from "@/types";

/** Status-eligible for live class, independent of whether the join window is open yet. */
function isJoinableStatus(status: SessionStatus) {
  return status === "scheduled" || status === "demo";
}

const TEACHER_ID = "t-1";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "demo", label: "Demo" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "noshow", label: "No-Show" },
  { value: "holiday", label: "Holiday" },
  { value: "leave", label: "Leave" },
];

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function sessionSubtitle(session: ClassSession) {
  if (session.batchId) return getBatchById(session.batchId)?.name ?? "General session";
  if (session.courseId) return getCourseById(session.courseId)?.name ?? "General session";
  if (session.type === "demo") return "Demo class";
  return "General session";
}

export default function TeacherMyClasses() {
  const navigate = useNavigate();
  const { data: mySessions, error: sessionsError, reload } = useApiData(
    () => listMySessions().then((sessions) => sessions.map(toFrontendSession)),
    getSessionsForTeacher(TEACHER_ID)
  );
  const allSessions = useMemo(
    () =>
      [...mySessions].sort((a, b) =>
        a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
      ),
    [mySessions]
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<ClassSession | null>(null);
  const [recordingsFor, setRecordingsFor] = useState<ClassSession | null>(null);

  // Calendar-only: holidays/leave aren't real classes, so they're kept out of allSessions
  // (the list/table view) and merged in just for the calendar's colour coding.
  const { data: holidays } = useApiData<ApiHoliday[]>(() => listHolidays(), []);
  const { data: approvedLeave } = useApiData<ApiLeaveRequest[]>(() => listLeave("Approved"), []);
  const calendarEvents = useMemo(
    () =>
      apiEnabled()
        ? [...allSessions, ...holidaysToCalendarEvents(holidays), ...approvedLeaveToCalendarEvents(approvedLeave)]
        : allSessions,
    [allSessions, holidays, approvedLeave]
  );

  // Real sessions launch straight into the Jitsi room; mock sessions open the demo classroom
  const startClass = useCallback(
    (session: ClassSession) => {
      navigate(`/teacher/live/${session.id}`, {
        state: session.meetingRoomId ? { room: session.meetingRoomId, title: session.title } : undefined,
      });
    },
    [navigate]
  );

  const filtered = statusFilter === "all" ? allSessions : allSessions.filter((s) => s.status === statusFilter);

  // Filter-select/dialog-open state changes re-render this component on nearly every
  // interaction; without this the columns array was rebuilt each time, defeating
  // DataTable's internal useMemo (it re-sorts/re-filters the whole dataset on any
  // prop identity change, not just when the actual data changes).
  const columns: DataTableColumn<ClassSession>[] = useMemo(
    () => [
    {
      key: "title",
      header: "Class",
      accessor: (row) => row.title,
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.type === "1:1" ? "1:1" : row.type === "demo" ? "Demo" : "Group"} · {row.duration} min
          </p>
        </div>
      ),
    },
    {
      key: "batch",
      header: "Batch / Course",
      accessor: (row) => sessionSubtitle(row),
      render: (row) => <span className="text-sm text-muted-foreground">{sessionSubtitle(row)}</span>,
    },
    {
      key: "date",
      header: "Date & Time",
      accessor: (row) => `${row.date}T${row.startTime}`,
      sortable: true,
      render: (row) => (
        <span className="text-sm text-foreground">
          {formatDate(row.date, "short")} · {formatTimeLabel(row.startTime)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => <SessionStatusBadge status={row.status} />,
    },
    {
      key: "action",
      // Empty header (not "Action"): DataTable's mobile card view only gives an
      // actions column its own full-width row — instead of squeezing it into a
      // half-width grid slot where these two buttons overflowed/clipped — when
      // the header is falsy. Matches the convention used elsewhere (e.g.
      // parent/Billing.tsx's action column).
      header: "",
      render: (row) =>
        isJoinable(row) ? (
          <Button size="sm" onClick={(e) => { e.stopPropagation(); startClass(row); }}>
            {row.status === "demo" ? "Start Demo" : "Start Class"}
          </Button>
        ) : row.status === "completed" ? (
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/teacher/attendance">View record</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setRecordingsFor(row); }}>
              <Video className="h-3.5 w-3.5" />
              Recording
            </Button>
          </div>
        ) : isJoinableStatus(row.status) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" disabled>
                  {row.status === "demo" ? "Start Demo" : "Start Class"}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{joinHint(row)}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    ],
    [startClass]
  );

  return (
    <div>
      <PageHeader
        title="My Classes"
        description="All your scheduled, live, completed and past sessions in one place."
        eyebrow="Teaching"
        actions={<CalendarSyncButton />}
      />

      {apiEnabled() && sessionsError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load your classes ({sessionsError}) — the list below may be incomplete.{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </InlineAlert>
      )}

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="h-4 w-4" /> List
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarClock className="h-4 w-4" /> Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search classes…"
            onRowClick={(row) => setSelected(row)}
            emptyTitle="No classes match this filter"
            emptyDescription="Try a different status filter or clear your search."
            error={apiEnabled() && sessionsError ? sessionsError : null}
            onRetry={reload}
            toolbar={
              <FilterBar
                filters={[
                  {
                    key: "status",
                    label: "Status",
                    value: statusFilter,
                    onChange: setStatusFilter,
                    className: "w-[180px]",
                    placeholder: "Filter status",
                    options: STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label })),
                  },
                ]}
              />
            }
          />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarBoard sessions={calendarEvents} initialMonth={apiEnabled() ? new Date() : new Date(2026, 6, 1)} onSessionClick={(s) => setSelected(s)} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {formatDate(selected.date, "long")} · {formatTimeLabel(selected.startTime)} · {selected.duration} min
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <span className="text-muted-foreground">Batch / Course</span>
                  <span className="font-medium text-foreground">{sessionSubtitle(selected)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <span className="text-muted-foreground">Status</span>
                  <SessionStatusBadge status={selected.status} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <span className="text-muted-foreground">Roster</span>
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Users className="h-4 w-4" /> {selected.childIds.length} student{selected.childIds.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                {selected.status === "completed" && (
                  <Button variant="outline" onClick={() => setRecordingsFor(selected)}>
                    <Video className="h-3.5 w-3.5" />
                    Recording
                  </Button>
                )}
                {isJoinable(selected) ? (
                  <Button onClick={() => startClass(selected)}>
                    {selected.status === "demo" ? "Start Demo" : "Start Class"}
                  </Button>
                ) : (
                  isJoinableStatus(selected.status) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button variant="outline" disabled>
                            {selected.status === "demo" ? "Start Demo" : "Start Class"}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{joinHint(selected)}</TooltipContent>
                    </Tooltip>
                  )
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {recordingsFor && <RecordingsDialog session={recordingsFor} onClose={() => setRecordingsFor(null)} />}
    </div>
  );
}
