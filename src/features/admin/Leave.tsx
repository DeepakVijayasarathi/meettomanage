import { useEffect, useMemo, useState } from "react";
import { CalendarOff, CheckCircle2, Clock, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { InlineAlert } from "@/components/InlineAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FilterBar } from "@/components/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listLeave, reviewLeave, toFrontendLeave, type ApiLeaveStatus } from "@/api/academicOps";
import { LEAVE_REQUESTS } from "@/data/leaves";
import { cn, formatDate, formatDateRange, getInitials } from "@/lib/utils";
import type { LeaveRequest } from "@/types";

const LEAVE_STATUS_VARIANT: Record<LeaveRequest["status"], "warning" | "success" | "destructive" | "muted"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  blocked: "destructive",
  cancelled: "muted",
};

const LEAVE_STATUS_LABEL: Record<LeaveRequest["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  blocked: "Blocked (Late Request)",
  cancelled: "Cancelled by teacher",
};

function LeaveStatusBadge({ status }: { status: LeaveRequest["status"] }) {
  return <Badge variant={LEAVE_STATUS_VARIANT[status]}>{LEAVE_STATUS_LABEL[status]}</Badge>;
}

/** row.date is only ever the leave's *start* — this is the real span, when it's known. */
function leaveDateLabel(row: LeaveRequest): string {
  return row.startAtUtc && row.endAtUtc ? formatDateRange(row.startAtUtc, row.endAtUtc) : formatDate(row.date, "long");
}

const STATUS_FILTER_OPTIONS: { value: ApiLeaveStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

/**
 * Admin's own review surface for teacher leave requests — Admin has always held
 * LeaveManagement view+approve (AllModulesFull() in DatabaseInitializer), but until
 * now the only screen that could actually act on that grant was Coordinator's
 * Availability page, which RequireAuth keeps Admin out of. Same list/approve/reject
 * flow as Coordinator's leave queue (see academicOps.ts's listLeave/reviewLeave),
 * just as its own dedicated Admin screen instead of a card feed mixed in with the
 * weekly teacher-availability grid.
 */
export default function AdminLeave() {
  const { toast } = useToast();
  const usingApi = apiEnabled();
  const [statusFilter, setStatusFilter] = useState<ApiLeaveStatus | "all">("all");

  const { data: fetchedLeaves, loading, error, reload } = useApiData(
    () => listLeave().then((items) => items.map(toFrontendLeave)),
    LEAVE_REQUESTS
  );
  const [leaves, setLeaves] = useState<LeaveRequest[]>(usingApi ? [] : LEAVE_REQUESTS);
  useEffect(() => setLeaves(fetchedLeaves), [fetchedLeaves]);

  const [approveTarget, setApproveTarget] = useState<LeaveRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);

  function decide(target: LeaveRequest, approve: boolean) {
    if (usingApi) {
      return reviewLeave(target.id, approve)
        .then(() => {
          reload();
          toast({
            variant: "success",
            title: approve ? "Leave approved" : "Leave rejected",
            description: `${target.teacherName}'s leave request was ${approve ? "approved" : "rejected"}.`,
          });
        })
        .catch((err: unknown) => {
          const message = userMessage(err, "Something went wrong. Please try again.");
          toast({ variant: "error", title: `Couldn't ${approve ? "approve" : "reject"} leave`, description: message });
          throw err;
        });
    }
    setLeaves((prev) => prev.map((l) => (l.id === target.id ? { ...l, status: approve ? "approved" : "rejected" } : l)));
  }

  const today = usingApi ? new Date().toISOString().slice(0, 10) : "2026-07-09";
  const pendingCount = leaves.filter((l) => l.status === "pending").length;
  // l.date is only the leave's *start* -- comparing that alone against today undercounts a
  // long leave that started in the past but hasn't ended yet (e.g. a month-long leave a week
  // into its run): its start date is already "before today" even though it's still ongoing.
  // Falls back to l.date (demo mode / no endAtUtc) the same way it always did.
  const approvedUpcomingCount = leaves.filter(
    (l) => l.status === "approved" && (l.endAtUtc ? l.endAtUtc.slice(0, 10) : l.date) >= today
  ).length;
  const rejectedCount = leaves.filter((l) => l.status === "rejected").length;

  const filtered = useMemo(
    () => (statusFilter === "all" ? leaves : leaves.filter((l) => l.status === statusFilter.toLowerCase())),
    [leaves, statusFilter]
  );

  const columns: DataTableColumn<LeaveRequest>[] = useMemo(
    () => [
      {
        key: "teacher",
        header: "Teacher",
        accessor: (row) => row.teacherName,
        sortable: true,
        render: (row) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {getInitials(row.teacherName)}
            </span>
            <span className="truncate text-sm font-medium text-foreground">{row.teacherName}</span>
          </div>
        ),
      },
      {
        key: "date",
        header: "Date",
        accessor: (row) => row.date,
        sortable: true,
        // For a multi-day request (a week, a whole month) the start alone hides how long it
        // actually runs, which an admin approving/rejecting it needs to see plainly, not
        // infer from "Notice Given" or dig for.
        render: (row) => <span className="text-sm">{leaveDateLabel(row)}</span>,
      },
      {
        key: "session",
        header: "Session",
        render: (row) =>
          row.isClassWise && row.sessions && row.sessions.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-sm text-foreground underline decoration-dotted underline-offset-4">{row.session}</span>
              </TooltipTrigger>
              <TooltipContent>
                <ul className="flex flex-col gap-0.5 text-xs">
                  {row.sessions.map((s) => (
                    <li key={s.sessionId}>
                      {s.batchName ?? "Session"} · {formatDate(s.scheduledStartAtUtc, "datetime")}
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-sm text-foreground">{row.session}</span>
          ),
      },
      { key: "reason", header: "Reason", render: (row) => <span className="text-sm text-muted-foreground">{row.reason}</span> },
      {
        key: "hours",
        header: "Notice Given",
        accessor: (row) => row.hoursBeforeSession,
        sortable: true,
        render: (row) => <span className="text-sm">{row.hoursBeforeSession}h before</span>,
      },
      {
        key: "status",
        header: "Status",
        accessor: (row) => row.status,
        sortable: true,
        render: (row) => <LeaveStatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "",
        // Only a pending request has anything left to decide — approved/rejected/blocked
        // rows show as a plain dash instead of disabled buttons that invite a click.
        render: (row) =>
          row.status === "pending" ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setApproveTarget(row)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRejectTarget(row)}>
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          ) : (
            <span className="block text-right text-sm text-muted-foreground">—</span>
          ),
        className: "text-right",
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Leave Management"
        description="Review and decide on every teacher's leave request across the academy."
      />

      {usingApi && error && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load leave requests ({error}) — the list below may be incomplete.{" "}
          <button type="button" className="underline" onClick={reload}>
            Retry
          </button>
        </InlineAlert>
      )}

      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3")}>
        <KpiCard label="Pending Requests" value={String(pendingCount)} icon={Clock} tone="warning" loading={loading} />
        <KpiCard label="Approved (Upcoming)" value={String(approvedUpcomingCount)} icon={CheckCircle2} tone="success" loading={loading} />
        <KpiCard label="Rejected" value={String(rejectedCount)} icon={CalendarOff} tone="destructive" loading={loading} />
      </div>

      <div className="mt-6">
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by teacher or reason…"
          emptyTitle="No leave requests"
          emptyDescription="Leave requests submitted by teachers will appear here."
          error={usingApi ? error : null}
          onRetry={reload}
          toolbar={
            <FilterBar
              filters={[
                {
                  key: "status",
                  label: "Status",
                  value: statusFilter,
                  onChange: (v) => setStatusFilter(v as ApiLeaveStatus | "all"),
                  className: "w-44",
                  options: STATUS_FILTER_OPTIONS,
                },
              ]}
            />
          }
        />
      </div>

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve this leave request?"
        description={
          approveTarget
            ? `${approveTarget.teacherName}'s leave for "${approveTarget.session}" on ${leaveDateLabel(approveTarget)} will be approved. Remember to update the calendar for that slot.`
            : undefined
        }
        confirmLabel="Approve"
        onConfirm={() => {
          if (!approveTarget) return;
          return decide(approveTarget, true);
        }}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject this leave request?"
        description={
          rejectTarget
            ? `${rejectTarget.teacherName}'s leave request for "${rejectTarget.session}" on ${leaveDateLabel(rejectTarget)} will be rejected. The session remains scheduled as-is.`
            : undefined
        }
        confirmLabel="Reject"
        destructive
        onConfirm={() => {
          if (!rejectTarget) return;
          return decide(rejectTarget, false);
        }}
      />
    </div>
  );
}
