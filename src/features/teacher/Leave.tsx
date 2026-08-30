import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLeavesForTeacher } from "@/data/leaves";
import { getSessionsForTeacher } from "@/data/sessions";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listMySessions, toFrontendSession } from "@/api/sessions";
import { listMyLeave, submitLeave, toFrontendLeave } from "@/api/academicOps";
import { localToUtcIso } from "@/lib/datetime";
import { formatDate } from "@/lib/utils";
import type { ClassSession, LeaveRequest } from "@/types";

const TEACHER_ID = "t-1";
const TEACHER_NAME = "Karan Mehta";
// Deterministic reference "now" for this demo — never use new Date() with no args here.
const NOW = new Date("2026-07-09T12:00:00");
const MIN_HOURS_NOTICE = 6;

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// session.date/startTime are the signed-in teacher's own timezone's wall-clock values
// (see toFrontendSession) — parse them the same way rather than the browser's own
// timezone, so notice/eligibility math is correct no matter what machine this is viewed from.
function sessionDateTime(session: ClassSession) {
  return new Date(localToUtcIso(session.date, session.startTime));
}

function hoursBetween(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

/** Calendar-day arithmetic on a plain "yyyy-MM-dd" string — no timezone involved, same
 *  convention session.date already uses. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

const LEAVE_STATUS_VARIANT: Record<LeaveRequest["status"], "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  blocked: "destructive",
};

const LEAVE_STATUS_LABEL: Record<LeaveRequest["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  blocked: "Blocked (Late Request)",
};

function LeaveStatusBadge({ status }: { status: LeaveRequest["status"] }) {
  return <Badge variant={LEAVE_STATUS_VARIANT[status]}>{LEAVE_STATUS_LABEL[status]}</Badge>;
}

export default function TeacherLeave() {
  const { toast } = useToast();
  const now = apiEnabled() ? new Date() : NOW;
  const { data: fetchedSessions } = useApiData(
    () => listMySessions().then((sessions) => sessions.map(toFrontendSession)),
    getSessionsForTeacher(TEACHER_ID)
  );
  const eligibleSessions = fetchedSessions
    .filter((s) => s.status === "scheduled" || s.status === "demo")
    .filter((s) => sessionDateTime(s) > now)
    .sort((a, b) => sessionDateTime(a).getTime() - sessionDateTime(b).getTime());

  const { data: fetchedLeaves, error: leavesError, reload: reloadLeaves } = useApiData(
    () => listMyLeave().then((items) => items.map(toFrontendLeave)),
    getLeavesForTeacher(TEACHER_ID)
  );
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => (apiEnabled() ? [] : getLeavesForTeacher(TEACHER_ID)));
  useEffect(() => setLeaves(fetchedLeaves), [fetchedLeaves]);
  const todayStr = now.toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  const rangeValid = fromDate.length > 0 && toDate.length > 0 && toDate >= fromDate;
  // Whole-day range: any of the teacher's own upcoming sessions falling on one of the
  // selected calendar days, purely for preview -- the backend re-derives this from the
  // actual start/end timestamps sent below and is the real source of truth.
  const coveredSessions = rangeValid ? eligibleSessions.filter((s) => s.date >= fromDate && s.date <= toDate) : [];
  const earliestBlocking = coveredSessions.find((s) => hoursBetween(sessionDateTime(s), now) < MIN_HOURS_NOTICE) ?? null;
  const isBlocked = !!earliestBlocking;
  const canSubmit = rangeValid && reason.trim().length > 0 && !isBlocked;

  function resetForm() {
    setFromDate("");
    setToDate("");
    setReason("");
  }

  function rangeLabel() {
    return fromDate === toDate ? formatDate(fromDate, "long") : `${formatDate(fromDate, "long")} – ${formatDate(toDate, "long")}`;
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);

    if (apiEnabled()) {
      // Whole selected days, in the teacher's own timezone -- covers every session on
      // those dates regardless of what time each one happens to start/end.
      const startAtUtc = localToUtcIso(fromDate, "00:00");
      const endAtUtc = localToUtcIso(addDays(toDate, 1), "00:00");
      submitLeave({ startAtUtc, endAtUtc, reason: reason.trim() })
        .then((created) => {
          // The request already succeeded server-side by this point — nothing below should
          // be able to make it look like it didn't. Confirmation and reload both run
          // unconditionally; the optimistic prepend is a nice-to-have (skips waiting on
          // reloadLeaves's round trip) wrapped so a mapping surprise in toFrontendLeave can't
          // throw out of this .then and land in the .catch below, which used to skip
          // reloadLeaves() entirely and leave the list stuck on stale data until a manual
          // page reload — created but invisible.
          setConfirmation(
            `Leave request for ${rangeLabel()} submitted — pending admin approval` +
              (coveredSessions.length > 0 ? ` (${coveredSessions.length} session(s) affected).` : ".")
          );
          setSubmitError(null);
          try {
            setLeaves((prev) => [toFrontendLeave(created), ...prev]);
          } catch {
            /* reloadLeaves() below still picks it up from the server's own response */
          }
          reloadLeaves();
          toast({ variant: "success", title: "Leave request submitted", description: "Pending admin approval." });
          // Only clear on actual success -- these used to run unconditionally right after
          // the .then/.catch chain regardless of outcome, so a failed submission left the
          // teacher looking at an error banner with an already-blanked form, forcing a full
          // re-entry to retry despite the comment here once claiming otherwise.
          resetForm();
        })
        .catch((err: Error) => {
          // Deliberately not resetting the form here — a failed submission keeps the
          // teacher's selected dates/reason in place so they can fix whatever's wrong and
          // retry without repicking the range and retyping the reason.
          setSubmitError(err.message);
          toast({ variant: "error", title: "Couldn't submit leave request", description: err.message });
        });
      return;
    }

    const earliestCovered = coveredSessions[0] ?? null;
    const newLeave: LeaveRequest = {
      id: `lv-${Date.now()}`,
      teacherId: TEACHER_ID,
      teacherName: TEACHER_NAME,
      date: fromDate,
      session:
        coveredSessions.length === 0
          ? "No sessions in this range"
          : coveredSessions.length === 1
            ? `${coveredSessions[0].title} · ${formatTimeLabel(coveredSessions[0].startTime)}`
            : `${coveredSessions.length} session(s) affected`,
      reason: reason.trim(),
      hoursBeforeSession: earliestCovered ? Math.round(hoursBetween(sessionDateTime(earliestCovered), now) * 10) / 10 : 0,
      status: "pending",
    };
    setLeaves((prev) => [newLeave, ...prev]);
    setConfirmation(
      `Leave request for ${rangeLabel()} submitted — pending admin approval` +
        (coveredSessions.length > 0 ? ` (${coveredSessions.length} session(s) affected).` : ".")
    );
    resetForm();
  }

  const columns: DataTableColumn<LeaveRequest>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        accessor: (row) => row.date,
        sortable: true,
        render: (row) => <span className="text-sm">{formatDate(row.date, "long")}</span>,
      },
      { key: "session", header: "Session", render: (row) => <span className="text-sm text-foreground">{row.session}</span> },
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
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description="Apply for leave from an upcoming class. Requests must be submitted at least 6 hours before the scheduled session."
        eyebrow="My Account"
      />

      {confirmation && (
        <InlineAlert variant="success" bordered className="mb-5">
          {confirmation}
        </InlineAlert>
      )}

      {/* Kept separate from the success banner above — a rejected submitLeave() used to
          write its error text into the same state, which rendered inside the green
          checkmark banner and looked like the request had gone through. */}
      {submitError && (
        <InlineAlert variant="error" bordered className="mb-5">
          {submitError}
        </InlineAlert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Apply for Leave</CardTitle>
          <CardDescription>
            {apiEnabled()
              ? "Notice is calculated against the current time."
              : `Reference time for this demo: ${formatDate(NOW, "long")}, ${formatTimeLabel("12:00")}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leaveFromDate">
                  From date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="leaveFromDate"
                  type="date"
                  min={todayStr}
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    // A "to" date earlier than the newly-picked "from" date is meaningless —
                    // snap it forward instead of leaving an invalid range silently in place.
                    if (toDate && toDate < e.target.value) setToDate(e.target.value);
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leaveToDate">
                  To date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="leaveToDate"
                  type="date"
                  min={fromDate || todayStr}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Briefly describe your reason for leave"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {rangeValid && (
              <InlineAlert variant={isBlocked ? "error" : coveredSessions.length > 0 ? "success" : "info"} className="text-sm">
                {isBlocked && earliestBlocking ? (
                  <span>
                    This covers a class on {formatDate(earliestBlocking.date, "long")} at {formatTimeLabel(earliestBlocking.startTime)}, which
                    starts in <strong>{hoursBetween(sessionDateTime(earliestBlocking), now).toFixed(1)} hours</strong>. Leave requests must be
                    submitted at least {MIN_HOURS_NOTICE} hours before a scheduled class — this request cannot be submitted.
                  </span>
                ) : coveredSessions.length > 0 ? (
                  <span>
                    This covers <strong>{coveredSessions.length} scheduled session(s)</strong>, each with enough notice — you're clear to submit.
                  </span>
                ) : (
                  <span>No scheduled sessions fall in this range yet — the leave will still be recorded for these dates.</span>
                )}
              </InlineAlert>
            )}

            <div>
              <Button disabled={!canSubmit} onClick={handleSubmit}>
                Submit Leave Request
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-foreground">Leave History</h2>
        {leaves.length === 0 && !leavesError ? (
          <EmptyState icon={Clock} title="No leave requests yet" description="Your submitted leave requests will appear here." />
        ) : (
          <DataTable
            data={leaves}
            columns={columns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search leave history…"
            error={apiEnabled() ? leavesError : null}
            onRetry={reloadLeaves}
          />
        )}
      </div>
    </div>
  );
}
