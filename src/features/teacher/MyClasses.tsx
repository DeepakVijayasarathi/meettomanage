import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarClock, List, Users } from "lucide-react";
import { useApiData } from "@/api/hooks";
import { listMySessions, toFrontendSession } from "@/api/sessions";
import { PageHeader } from "@/components/PageHeader";
import { CalendarBoard } from "@/components/CalendarBoard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSessionsForTeacher } from "@/data/sessions";
import { getBatchById } from "@/data/batches";
import { getCourseById } from "@/data/courses";
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
          <Button asChild size="sm" variant="outline">
            <Link to="/teacher/attendance">View record</Link>
          </Button>
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
          <CalendarBoard sessions={allSessions} initialMonth={new Date(2026, 6, 1)} onSessionClick={(s) => setSelected(s)} />
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
    </div>
  );
}
