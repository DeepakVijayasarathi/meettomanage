import { useMemo, useState } from "react";
import { CalendarClock, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SESSIONS } from "@/data/sessions";
import type { ClassSession, SessionStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";

const STATUS_OPTIONS: { value: SessionStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "noshow", label: "No-Show" },
  { value: "demo", label: "Demo" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "holiday", label: "Holiday" },
  { value: "leave", label: "Teacher Leave" },
];

export default function AdminSessions() {
  const [sessions, setSessions] = useState<ClassSession[]>(SESSIONS);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "all">("all");
  const [rescheduleTarget, setRescheduleTarget] = useState<ClassSession | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClassSession | null>(null);

  const filtered = useMemo(
    () => (statusFilter === "all" ? sessions : sessions.filter((s) => s.status === statusFilter)),
    [sessions, statusFilter]
  );

  const columns: DataTableColumn<ClassSession>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Session",
        sortable: true,
        accessor: (row) => row.title,
        render: (row) => (
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_PALETTE[row.title.length % CHART_PALETTE.length]}1A`, color: CHART_PALETTE[row.title.length % CHART_PALETTE.length] }}
            >
              <CalendarClock className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{row.title}</p>
              <p className="text-xs capitalize text-muted-foreground">{row.type} class</p>
            </div>
          </div>
        ),
      },
      {
        key: "datetime",
        header: "Date & Time",
        sortable: true,
        accessor: (row) => `${row.date} ${row.startTime}`,
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.date)} · {row.startTime}
          </span>
        ),
      },
      {
        key: "teacher",
        header: "Teacher",
        sortable: true,
        accessor: (row) => row.teacherName,
        render: (row) => <span className="text-sm">{row.teacherName}</span>,
      },
      {
        key: "children",
        header: "Students",
        sortable: true,
        accessor: (row) => row.childIds.length,
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users2 className="h-3.5 w-3.5" />
            {row.childIds.length}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => <SessionStatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={row.status === "cancelled" || row.status === "completed"}
              onClick={(e) => {
                e.stopPropagation();
                setRescheduleTarget(row);
              }}
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={row.status === "cancelled" || row.status === "completed"}
              onClick={(e) => {
                e.stopPropagation();
                setCancelTarget(row);
              }}
            >
              Cancel
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="Scheduling"
        title="Sessions"
        description="Every class, demo and leave block across the academy — schedule, reschedule and cancel as needed."
      />

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search sessions by title or teacher…"
        toolbar={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SessionStatus | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <ConfirmDialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
        title="Reschedule session?"
        description={rescheduleTarget ? `"${rescheduleTarget.title}" will be marked as rescheduled. Parents and the teacher will be notified.` : undefined}
        confirmLabel="Reschedule"
        onConfirm={() => {
          if (!rescheduleTarget) return;
          setSessions((prev) => prev.map((s) => (s.id === rescheduleTarget.id ? { ...s, status: "rescheduled" } : s)));
        }}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel this session?"
        description={cancelTarget ? `"${cancelTarget.title}" will be cancelled. This action can be reversed by rescheduling.` : undefined}
        confirmLabel="Cancel Session"
        destructive
        onConfirm={() => {
          if (!cancelTarget) return;
          setSessions((prev) => prev.map((s) => (s.id === cancelTarget.id ? { ...s, status: "cancelled" } : s)));
        }}
      />
    </div>
  );
}
