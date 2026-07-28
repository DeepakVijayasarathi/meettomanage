import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarClock, List, Loader2, Plus, Users, Video } from "lucide-react";
import { useApiData } from "@/api/hooks";
import {
  listMySessions,
  listRecordings,
  registerRecording,
  toFrontendSession,
  type ApiSessionRecording,
} from "@/api/sessions";
import { PageHeader } from "@/components/PageHeader";
import { CalendarSyncButton } from "@/components/CalendarSyncButton";
import { CalendarBoard } from "@/components/CalendarBoard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSessionsForTeacher } from "@/data/sessions";
import { getBatchById } from "@/data/batches";
import { getCourseById } from "@/data/courses";
import { listHolidays, listLeave, type ApiHoliday, type ApiLeaveRequest } from "@/api/academicOps";
import { approvedLeaveToCalendarEvents, holidaysToCalendarEvents } from "@/lib/calendarEvents";
import { apiEnabled } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { ClassSession, SessionStatus } from "@/types";

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

function isJoinable(status: SessionStatus) {
  return status === "scheduled" || status === "demo";
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Manual fallback for registering a session recording. Auto-recording (Jitsi/Jibri) posts
 * here automatically when configured; this dialog lets a teacher paste a link directly —
 * e.g. a class recorded outside the automated pipeline, or before Jibri infra is live —
 * so the 15-day parent recording window still works without waiting on that infra.
 */
function RecordingsDialog({ session, onClose }: { session: ClassSession; onClose: () => void }) {
  const [recordings, setRecordings] = useState<ApiSessionRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = apiEnabled() && GUID_RE.test(session.id);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listRecordings(session.id)
      .then((items) => !cancelled && setRecordings(items))
      .catch(() => !cancelled && setError("Couldn't load existing recordings."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [session.id, canManage]);

  async function handleAdd() {
    if (!url.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const durationSeconds = minutes.trim() ? Math.round(Number(minutes) * 60) : undefined;
      await registerRecording(session.id, url.trim(), durationSeconds);
      const items = await listRecordings(session.id);
      setRecordings(items);
      setUrl("");
      setMinutes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't register that recording.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recordings — {session.title}</DialogTitle>
          <DialogDescription>
            {formatDate(session.date, "long")} · {formatTimeLabel(session.startTime)}. Parents can view a
            recording for 15 days after it's registered here.
          </DialogDescription>
        </DialogHeader>

        {!canManage ? (
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            Recording management needs a real, connected session — not available in demo mode.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : recordings.length === 0 ? (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                No recording registered yet. If this class wasn't auto-recorded, paste the link below.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recordings.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <div className="min-w-0">
                      <a
                        href={r.storageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 truncate font-medium text-primary hover:underline"
                      >
                        <Video className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{r.storageUrl}</span>
                      </a>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.expiresAtUtc
                          ? `Visible to parents until ${formatDate(r.expiresAtUtc.slice(0, 10), "long")}`
                          : "Registered"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 rounded-lg border border-dashed border-border p-3">
              <div className="grid gap-1.5">
                <Label htmlFor="rec-url">Recording URL</Label>
                <Input
                  id="rec-url"
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rec-duration">Duration (minutes, optional)</Label>
                <Input
                  id="rec-duration"
                  type="number"
                  min={0}
                  placeholder="45"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-32"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button size="sm" className="self-start" disabled={!url.trim() || saving} onClick={handleAdd}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Register recording
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeacherMyClasses() {
  const navigate = useNavigate();
  const { data: mySessions } = useApiData(
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
  function startClass(session: ClassSession) {
    navigate(`/teacher/live/${session.id}`, {
      state: session.meetingRoomId ? { room: session.meetingRoomId, title: session.title } : undefined,
    });
  }

  const filtered = statusFilter === "all" ? allSessions : allSessions.filter((s) => s.status === statusFilter);

  const columns: DataTableColumn<ClassSession>[] = [
    {
      key: "title",
      header: "Class",
      accessor: (row) => row.title,
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.title}</p>
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
      header: "Action",
      render: (row) =>
        isJoinable(row.status) ? (
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
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Classes"
        description="All your scheduled, live, completed and past sessions in one place."
        eyebrow="Teaching"
        actions={<CalendarSyncButton />}
      />

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
            toolbar={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {isJoinable(selected.status) && (
                  <Button onClick={() => startClass(selected)}>
                    {selected.status === "demo" ? "Start Demo" : "Start Class"}
                  </Button>
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
