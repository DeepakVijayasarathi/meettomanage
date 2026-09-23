import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Clock, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getLeavesForTeacher } from "@/data/leaves";
import { getSessionsForTeacher } from "@/data/sessions";
import { apiEnabled, userMessage } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listMySessions, toFrontendSession } from "@/api/sessions";
import {
  cancelLeave,
  getMyLeaveAllowanceStatus,
  listMyLeave,
  submitLeave,
  toFrontendLeave,
  type ApiLeaveAllowanceStatus,
} from "@/api/academicOps";
import { localToUtcIso } from "@/lib/datetime";
import { formatDate, formatDateRange, formatTimeLabel } from "@/lib/utils";
import type { ClassSession, LeaveRequest } from "@/types";

const EMPTY_ALLOWANCE_STATUS: ApiLeaveAllowanceStatus = { monthlyAllowance: 0, usedThisMonth: 0, remaining: 0 };

const TEACHER_ID = "t-1";
const TEACHER_NAME = "Karan Mehta";
// Deterministic reference "now" for this demo — never use new Date() with no args here.
const NOW = new Date("2026-07-09T12:00:00");
const MIN_HOURS_NOTICE = 6;


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
  cancelled: "Cancelled",
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
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  // Class-wise leave (WBS Round 2 feedback #23): cancel specific classes instead of a whole
  // day, against the admin-configured monthly allowance below. Demo mode has no real
  // allowance data, so this tab only appears once the API is actually connected.
  const [applyMode, setApplyMode] = useState<"window" | "classwise">("window");
  const [classWiseDate, setClassWiseDate] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [classWiseReason, setClassWiseReason] = useState("");
  const [classWiseSubmitting, setClassWiseSubmitting] = useState(false);
  const { data: allowanceStatus, reload: reloadAllowance } = useApiData(getMyLeaveAllowanceStatus, EMPTY_ALLOWANCE_STATUS);

  const sessionsOnClassWiseDate = classWiseDate ? eligibleSessions.filter((s) => s.date === classWiseDate) : [];
  const selectedCount = selectedSessionIds.size;
  const classWiseCanSubmit = selectedCount > 0 && classWiseReason.trim().length > 0 && !classWiseSubmitting;

  function toggleSession(sessionId: string, checked: boolean) {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sessionId);
      else next.delete(sessionId);
      return next;
    });
  }

  function resetClassWiseForm() {
    setClassWiseDate("");
    setSelectedSessionIds(new Set());
    setClassWiseReason("");
  }

  function handleSubmitClassWise() {
    if (!classWiseCanSubmit) return;
    setSubmitError(null);
    setClassWiseSubmitting(true);
    submitLeave({ sessionIds: [...selectedSessionIds], reason: classWiseReason.trim() })
      .then((created) => {
        setConfirmation(
          created.status === "Approved"
            ? `${created.affectedSessionCount} class(es) cancelled — auto-approved within your monthly allowance.`
            : `Request for ${created.affectedSessionCount} class(es) submitted — this exceeds your remaining monthly allowance, so it needs admin approval first.`
        );
        setSubmitError(null);
        try {
          setLeaves((prev) => [toFrontendLeave(created), ...prev]);
        } catch {
          /* reloadLeaves() below still picks it up from the server's own response */
        }
        reloadLeaves();
        reloadAllowance();
        toast({
          variant: "success",
          title: created.status === "Approved" ? "Class(es) cancelled" : "Leave request submitted",
          description: created.status === "Approved" ? "Auto-approved within your allowance." : "Pending admin approval.",
        });
        resetClassWiseForm();
      })
      .catch((err: unknown) => {
        const message = userMessage(err, "Could not submit this leave request.");
        setSubmitError(message);
        toast({ variant: "error", title: "Couldn't submit leave request", description: message });
      })
      .finally(() => setClassWiseSubmitting(false));
  }

  const rangeValid = fromDate.length > 0 && toDate.length > 0 && toDate >= fromDate;
  // Whole-day range: any of the teacher's own upcoming sessions falling on one of the
  // selected calendar days, purely for preview -- the backend re-derives this from the
  // actual start/end timestamps sent below and is the real source of truth.
  const coveredSessions = rangeValid ? eligibleSessions.filter((s) => s.date >= fromDate && s.date <= toDate) : [];
  const earliestBlocking = coveredSessions.find((s) => hoursBetween(sessionDateTime(s), now) < MIN_HOURS_NOTICE) ?? null;
  const isBlocked = !!earliestBlocking;

  // Nothing stopped picking a range that's already covered (in whole or in part) by an
  // earlier request of your own — SubmitLeaveAsync rejects it server-side, but silently,
  // only after the round trip. Checked the same way the backend does: any of my own
  // Pending/Approved leaves whose window overlaps the selected [fromDate 00:00, toDate+1
  // 00:00) range. API-mode leaves only — demo-mode mock rows don't carry real
  // startAtUtc/endAtUtc.
  const rangeStartUtc = rangeValid ? localToUtcIso(fromDate, "00:00") : null;
  const rangeEndUtc = rangeValid ? localToUtcIso(addDays(toDate, 1), "00:00") : null;
  const overlappingLeave =
    apiEnabled() && rangeStartUtc && rangeEndUtc
      ? (leaves.find(
          (l) =>
            (l.status === "pending" || l.status === "approved") &&
            l.startAtUtc &&
            l.endAtUtc &&
            new Date(l.startAtUtc) < new Date(rangeEndUtc) &&
            new Date(l.endAtUtc) > new Date(rangeStartUtc)
        ) ?? null)
      : null;

  const canSubmit = rangeValid && reason.trim().length > 0 && !isBlocked && !overlappingLeave;

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
          setSubmitError(userMessage(err));
          toast({ variant: "error", title: "Couldn't submit leave request", description: userMessage(err) });
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

  // Matches admin/Leave.tsx's own decide(): ConfirmDialog handles busy/close-on-success and
  // inline-error-on-reject itself off this Promise, so this rethrows rather than swallowing
  // the error after showing the toast.
  function handleCancel(target: LeaveRequest) {
    if (!apiEnabled()) {
      setLeaves((prev) => prev.map((l) => (l.id === target.id ? { ...l, status: "cancelled" } : l)));
      return;
    }
    return cancelLeave(target.id)
      .then(() => {
        setLeaves((prev) => prev.map((l) => (l.id === target.id ? { ...l, status: "cancelled" } : l)));
        reloadLeaves();
        toast({ variant: "success", title: "Leave request cancelled" });
      })
      .catch((err: unknown) => {
        const message = userMessage(err, "Could not cancel this leave request.");
        toast({ variant: "error", title: "Couldn't cancel leave request", description: message });
        throw err;
      });
  }

  const columns: DataTableColumn<LeaveRequest>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        accessor: (row) => row.date,
        sortable: true,
        // row.date is only ever the leave's *start* — for a multi-day request the start
        // alone hides how long it actually runs.
        render: (row) => (
          <span className="text-sm">{row.startAtUtc && row.endAtUtc ? formatDateRange(row.startAtUtc, row.endAtUtc) : formatDate(row.date, "long")}</span>
        ),
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
      {
        key: "actions",
        header: "",
        // Only a Pending request is still yours to withdraw — once an admin has approved or
        // rejected it, that decision stands (matches CancelLeaveAsync's own guard).
        render: (row) =>
          row.status === "pending" ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setCancelTarget(row);
              }}
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description="Apply for leave over any date range, whenever you need it."
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
          {/* Class-wise cancellation needs real allowance data from the API, so this
              second way to apply only appears once the API is actually connected —
              demo mode keeps the single whole-day/range form it always had. */}
          {apiEnabled() && (
            <Tabs value={applyMode} onValueChange={(v) => setApplyMode(v as "window" | "classwise")} className="pt-2">
              <TabsList>
                <TabsTrigger value="window">
                  <span className="sm:hidden">Date range</span>
                  <span className="hidden sm:inline">Whole Day / Date Range</span>
                </TabsTrigger>
                <TabsTrigger value="classwise">Specific Classes</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {(!apiEnabled() || applyMode === "window") && (
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
                  maxLength={1000}
                  onChange={(e) => setReason(e.target.value)}
                />
                <p className="text-right text-xs text-muted-foreground">{reason.length}/1000</p>
              </div>

              {rangeValid && overlappingLeave && (
                <InlineAlert variant="error" className="text-sm">
                  <span>
                    You already have a <strong>{overlappingLeave.status}</strong> leave request covering part of this range (
                    {overlappingLeave.startAtUtc && overlappingLeave.endAtUtc
                      ? formatDateRange(overlappingLeave.startAtUtc, overlappingLeave.endAtUtc)
                      : formatDate(overlappingLeave.date, "short")}
                    ) — this request cannot be submitted.
                  </span>
                </InlineAlert>
              )}

              {rangeValid && !overlappingLeave && (
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
          )}

          {apiEnabled() && applyMode === "classwise" && (
            <div className="flex flex-col gap-4">
              <InlineAlert variant={allowanceStatus.remaining > 0 ? "info" : "warning"} className="text-sm">
                <span>
                  You have <strong>{allowanceStatus.remaining}</strong> of <strong>{allowanceStatus.monthlyAllowance}</strong> class-wise
                  cancellations left this calendar month. Pick classes within that limit and they're cancelled immediately — no admin
                  approval needed; beyond it, your request still goes through for admin review, same as whole-day leave.
                </span>
              </InlineAlert>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="classWiseDate">
                  Class date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="classWiseDate"
                  type="date"
                  min={todayStr}
                  value={classWiseDate}
                  onChange={(e) => {
                    setClassWiseDate(e.target.value);
                    setSelectedSessionIds(new Set());
                  }}
                />
              </div>

              {classWiseDate && (
                <div className="flex flex-col gap-1.5">
                  <Label>
                    Classes on {formatDate(classWiseDate, "long")} <span className="text-destructive">*</span>
                  </Label>
                  {sessionsOnClassWiseDate.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                      You have no scheduled classes on this date.
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                      {sessionsOnClassWiseDate.map((session) => {
                        const tooSoon = hoursBetween(sessionDateTime(session), now) < MIN_HOURS_NOTICE;
                        return (
                          <label
                            key={session.id}
                            className={`flex items-center gap-3 px-3 py-2.5 text-sm ${tooSoon ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/40"}`}
                          >
                            <Checkbox
                              checked={selectedSessionIds.has(session.id)}
                              disabled={tooSoon}
                              onCheckedChange={(checked) => toggleSession(session.id, checked === true)}
                            />
                            <span className="flex-1">
                              <span className="font-medium text-foreground">{session.title}</span>{" "}
                              <span className="text-muted-foreground">· {formatTimeLabel(session.startTime)}</span>
                            </span>
                            {tooSoon && <span className="text-xs font-medium text-destructive">Too soon (needs {MIN_HOURS_NOTICE}h notice)</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="classWiseReason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="classWiseReason"
                  placeholder="Briefly describe your reason for cancelling these classes"
                  value={classWiseReason}
                  maxLength={1000}
                  onChange={(e) => setClassWiseReason(e.target.value)}
                />
                <p className="text-right text-xs text-muted-foreground">{classWiseReason.length}/1000</p>
              </div>

              {selectedCount > 0 && (
                <InlineAlert variant={selectedCount <= allowanceStatus.remaining ? "success" : "warning"} className="text-sm">
                  {selectedCount <= allowanceStatus.remaining ? (
                    <span>
                      <strong>{selectedCount} class(es)</strong> selected — within your remaining allowance, so this will be cancelled
                      immediately on submit.
                    </span>
                  ) : (
                    <span>
                      <strong>{selectedCount} class(es)</strong> selected, but only <strong>{allowanceStatus.remaining}</strong> remain in
                      your allowance this month — this request will need admin approval instead of being immediate.
                    </span>
                  )}
                </InlineAlert>
              )}

              <div>
                <Button disabled={!classWiseCanSubmit} onClick={handleSubmitClassWise}>
                  {classWiseSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck2 className="h-4 w-4" />}
                  {classWiseSubmitting ? "Submitting…" : "Cancel Selected Classes"}
                </Button>
              </div>
            </div>
          )}
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

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel this leave request?"
        description={
          cancelTarget
            ? `Your leave request for "${cancelTarget.session}" on ${
                cancelTarget.startAtUtc && cancelTarget.endAtUtc
                  ? formatDateRange(cancelTarget.startAtUtc, cancelTarget.endAtUtc)
                  : formatDate(cancelTarget.date, "long")
              } will be withdrawn. You can apply again for the same or a different range afterward.`
            : undefined
        }
        confirmLabel="Cancel Request"
        destructive
        onConfirm={() => {
          if (!cancelTarget) return;
          return handleCancel(cancelTarget);
        }}
      />
    </div>
  );
}
