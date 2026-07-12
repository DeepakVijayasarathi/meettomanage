import { useState } from "react";
import { CheckCircle2, ClipboardList, Users, Video, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getSessionsForTeacher } from "@/data/sessions";
import { getBatchById } from "@/data/batches";
import { getChildById } from "@/data/children";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listMySessions, toFrontendSession } from "@/api/sessions";
import { listAttendance, type ApiSessionAttendance } from "@/api/academicOps";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { ClassSession } from "@/types";

const TEACHER_ID = "t-1";

interface AttendanceRecord {
  childId: string;
  present: boolean;
  note?: string;
}

// Mock per-session attendance breakdown — the ClassSession model only tracks
// roster (childIds), so per-child present/absent detail is simulated here.
const ATTENDANCE_RECORDS: Record<string, AttendanceRecord[]> = {
  "s-8": [
    { childId: "c-1", present: true },
    { childId: "c-10", present: true },
  ],
  "s-22": [
    { childId: "c-1", present: true },
    { childId: "c-10", present: false, note: "Parent informed sick leave in advance" },
  ],
};

const SESSION_NOTES: Record<string, string> = {
  "s-8": "Covered blending of 'sh' and 'ch' sounds using flashcards. Both students engaged well — assigned the Week 3 worksheet for home practice.",
  "s-22": "Recap session on short vowel sounds. Sara was attentive throughout; Aarav needs a quick catch-up on sequencing before the next class.",
};

function sessionSubtitle(session: ClassSession) {
  if (session.batchId) return getBatchById(session.batchId)?.name ?? "General session";
  return session.type === "1:1" ? "1:1 session" : "Group session";
}

export default function TeacherAttendance() {
  const [selected, setSelected] = useState<ClassSession | null>(null);
  const [apiRecords, setApiRecords] = useState<ApiSessionAttendance[] | null>(null);

  const { data: apiCompleted } = useApiData<ClassSession[]>(
    () =>
      listMySessions().then((items) =>
        items.map(toFrontendSession).filter((s) => s.status === "completed")
      ),
    []
  );
  const completed = apiEnabled()
    ? [...apiCompleted].sort((a, b) => b.date.localeCompare(a.date))
    : getSessionsForTeacher(TEACHER_ID)
        .filter((s) => s.status === "completed")
        .sort((a, b) => b.date.localeCompare(a.date));

  function openSummary(session: ClassSession) {
    setSelected(session);
    setApiRecords(null);
    if (apiEnabled()) {
      listAttendance(session.id).then(setApiRecords).catch(() => setApiRecords([]));
    }
  }

  const totalPresent = completed.reduce((sum, s) => sum + (ATTENDANCE_RECORDS[s.id]?.filter((r) => r.present).length ?? s.childIds.length), 0);
  const totalSeats = completed.reduce((sum, s) => sum + (ATTENDANCE_RECORDS[s.id]?.length ?? s.childIds.length), 0);
  const avgAttendance = totalSeats > 0 ? Math.round((totalPresent / totalSeats) * 100) : 0;
  const uniqueStudents = new Set(completed.flatMap((s) => s.childIds)).size;
  const recordingsAvailable = completed.filter((s) => s.recordingAvailable).length;

  const columns: DataTableColumn<ClassSession>[] = [
    {
      key: "title",
      header: "Session",
      accessor: (row) => row.title,
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{sessionSubtitle(row)}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      accessor: (row) => row.date,
      sortable: true,
      render: (row) => <span className="text-sm">{formatDate(row.date, "long")}</span>,
    },
    {
      key: "duration",
      header: "Duration",
      accessor: (row) => row.duration,
      render: (row) => <span className="text-sm text-muted-foreground">{row.duration} min</span>,
    },
    {
      key: "children",
      header: "Children",
      render: (row) => (
        <div className="flex items-center -space-x-2">
          {row.childIds.slice(0, 3).map((id) => {
            const child = getChildById(id);
            return (
              <Avatar key={id} className="h-7 w-7 border-2 border-card">
                <AvatarFallback style={{ backgroundColor: `${child?.avatarColor ?? "#999"}26`, color: child?.avatarColor ?? "#666" }} className="text-[10px]">
                  {child ? getInitials(child.name) : "?"}
                </AvatarFallback>
              </Avatar>
            );
          })}
          {row.childIds.length > 3 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
              +{row.childIds.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      render: (row) => {
        const records = ATTENDANCE_RECORDS[row.id];
        if (!records) return <span className="text-sm text-muted-foreground">{row.childIds.length}/{row.childIds.length} present</span>;
        const present = records.filter((r) => r.present).length;
        const pct = Math.round((present / records.length) * 100);
        return (
          <Badge variant={pct === 100 ? "success" : pct >= 50 ? "warning" : "destructive"}>
            {present}/{records.length} present
          </Badge>
        );
      },
    },
    {
      key: "recording",
      header: "Recording",
      render: (row) =>
        row.recordingAvailable ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Video className="h-3.5 w-3.5" /> Until {row.recordingExpiresOn ? formatDate(row.recordingExpiresOn, "short") : "—"}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Unavailable</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => openSummary(row)}>
          View summary
        </Button>
      ),
    },
  ];

  // Live rows come from the attendance API; mock mode keeps the simulated breakdown
  const selectedRecords = apiEnabled()
    ? apiRecords
        ?.filter((r) => r.participantType === "Student")
        .map<AttendanceRecord>((r) => ({
          childId: r.childName ?? r.childId ?? "",
          present: r.status !== "Absent",
          note: r.status === "Late" ? "Joined late" : undefined,
        }))
    : selected
      ? ATTENDANCE_RECORDS[selected.id]
      : undefined;

  return (
    <div>
      <PageHeader
        title="Attendance & Session Records"
        description="Per-session attendance breakdown, class notes and recording availability for your completed classes."
        eyebrow="Teaching"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Sessions Delivered" value={String(completed.length)} icon={ClipboardList} tone="primary" />
        <KpiCard label="Average Attendance" value={`${avgAttendance}%`} icon={CheckCircle2} tone="success" />
        <KpiCard label="Students Taught" value={String(uniqueStudents)} icon={Users} tone="warning" />
        <KpiCard label="Recordings Available" value={`${recordingsAvailable}/${completed.length}`} icon={Video} tone="neutral" />
      </div>

      <div className="mt-6">
        {completed.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No completed sessions yet" description="Once you deliver a class, its attendance record will show up here." />
        ) : (
          <DataTable
            data={completed}
            columns={columns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search sessions…"
            onRowClick={(row) => openSummary(row)}
          />
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {formatDate(selected.date, "long")} · {selected.duration} min · {sessionSubtitle(selected)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance breakdown</p>
                {(selectedRecords ?? selected.childIds.map<AttendanceRecord>((id) => ({ childId: id, present: true }))).map((record) => {
                  const child = getChildById(record.childId);
                  return (
                    <div key={record.childId} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ backgroundColor: `${child?.avatarColor ?? "#999"}26`, color: child?.avatarColor ?? "#666" }}>
                            {child ? getInitials(child.name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{child?.name ?? record.childId ?? "Unknown student"}</p>
                          {record.note && <p className="text-xs text-muted-foreground">{record.note}</p>}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          record.present ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {record.present ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {record.present ? "Present" : "Absent"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session notes</p>
                <p className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">
                  {SESSION_NOTES[selected.id] ?? "No notes were recorded for this session."}
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
