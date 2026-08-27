import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  History,
  Search,
  UserCog,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  getDemoBooking,
  getDemoReassignmentHistory,
  getDemoTeacherWorkload,
  listDemoBookings,
  reassignDemoTeacher,
  type ApiDemoBooking,
  type ApiDemoReassignmentHistory,
  type ApiTeacherWorkload,
} from "@/api/demoBookings";
import { SESSIONS } from "@/data/sessions";
import { TEACHERS } from "@/data/users";
import { LEADS } from "./data";
import { formatDate, getInitials } from "@/lib/utils";
import { utcIsoToLocalDateTime } from "@/lib/datetime";

interface PickerRow {
  id: string;
  childName: string;
  parentName: string;
  dateLabel: string;
  timeLabel: string;
  teacherId: string;
  teacherName: string;
}

function apiBookingToPickerRow(booking: ApiDemoBooking): PickerRow {
  const local = booking.scheduledStartAtUtc ? utcIsoToLocalDateTime(booking.scheduledStartAtUtc) : null;
  return {
    id: booking.id,
    childName: booking.childName,
    parentName: booking.parentName,
    dateLabel: local ? formatDate(local.date) : "—",
    timeLabel: local ? local.time : "—",
    teacherId: booking.teacherProfileId ?? "",
    teacherName: booking.teacherName ?? "Unassigned",
  };
}

/** Demo-mode picker rows: upcoming demo sessions from the mock dataset, mirroring DemoScheduling's own seed logic. */
function mockPickerRows(): PickerRow[] {
  return SESSIONS.filter((s) => s.type === "demo" && s.status === "demo")
    .map((s) => {
      const lead = LEADS.find((l) => l.demoSessionId === s.id);
      return {
        id: s.id,
        childName: lead?.childName ?? s.title.replace("Demo · ", ""),
        parentName: lead?.parentName ?? "—",
        dateLabel: formatDate(s.date),
        timeLabel: s.startTime,
        teacherId: s.teacherId,
        teacherName: s.teacherName,
      };
    });
}

function mockWorkload(currentTeacherId: string): ApiTeacherWorkload[] {
  return TEACHERS.filter((t) => t.status === "active").map((t) => ({
    teacherProfileId: t.id,
    teacherName: t.name,
    departmentId: t.department ?? null,
    departmentName: t.department ?? null,
    isBusyAtSlot: false,
    sessionsToday: t.id === currentTeacherId ? 1 : 0,
    sessionsThisWeek: t.id === currentTeacherId ? 3 : Math.floor(Math.random() * 3),
  }));
}

export default function DemoTeacherAssignment() {
  const { bookingId } = useParams<{ bookingId?: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: pickerRows, loading: pickerLoading } = useApiData(
    () => listDemoBookings("DemoScheduled").then((rows) => rows.map(apiBookingToPickerRow)),
    mockPickerRows()
  );

  const [detail, setDetail] = useState<PickerRow | null>(null);
  const [workload, setWorkload] = useState<ApiTeacherWorkload[]>([]);
  const [history, setHistoryList] = useState<ApiDemoReassignmentHistory[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  function loadDetail(id: string) {
    setDetailLoading(true);
    setDetailError(null);
    setCandidateId(null);
    setReasonInput("");

    if (!apiEnabled()) {
      const row = mockPickerRows().find((r) => r.id === id) ?? pickerRows.find((r) => r.id === id) ?? null;
      setDetail(row);
      setWorkload(row ? mockWorkload(row.teacherId) : []);
      setHistoryList([]);
      setDetailLoading(false);
      return;
    }

    Promise.all([getDemoBooking(id), getDemoTeacherWorkload(id), getDemoReassignmentHistory(id)])
      .then(([booking, workloadRows, historyRows]) => {
        setDetail(apiBookingToPickerRow(booking));
        setWorkload(workloadRows);
        setHistoryList(historyRows);
      })
      .catch((err: Error) => setDetailError(err.message))
      .finally(() => setDetailLoading(false));
  }

  useEffect(() => {
    if (bookingId) {
      loadDetail(bookingId);
    } else {
      setDetail(null);
      setWorkload([]);
      setHistoryList([]);
    }
    setSuccessMessage(null);
    setActionError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const filteredPicker = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pickerRows;
    return pickerRows.filter(
      (r) =>
        r.childName.toLowerCase().includes(term) ||
        r.parentName.toLowerCase().includes(term) ||
        r.teacherName.toLowerCase().includes(term)
    );
  }, [pickerRows, search]);

  const selectedCandidate = workload.find((w) => w.teacherProfileId === candidateId) ?? null;
  const canSubmit = !!candidateId && candidateId !== detail?.teacherId && !selectedCandidate?.isBusyAtSlot;

  function handleReassign() {
    if (!detail || !candidateId || !canSubmit || submitting) return;

    if (!apiEnabled()) {
      const candidate = workload.find((w) => w.teacherProfileId === candidateId);
      if (!candidate) return;
      setHistoryList((prev) => [
        {
          id: `demo-history-${Math.random().toString(36).slice(2, 9)}`,
          atUtc: new Date().toISOString(),
          actorName: "You (Demo mode)",
          oldTeacherName: detail.teacherName,
          newTeacherName: candidate.teacherName,
          reason: reasonInput.trim() || null,
        },
        ...prev,
      ]);
      setDetail({ ...detail, teacherId: candidate.teacherProfileId, teacherName: candidate.teacherName });
      setWorkload(mockWorkload(candidate.teacherProfileId));
      setCandidateId(null);
      setReasonInput("");
      setSuccessMessage(`${candidate.teacherName} is now assigned to ${detail.childName}'s demo.`);
      return;
    }

    setSubmitting(true);
    setActionError(null);
    reassignDemoTeacher(detail.id, candidateId, reasonInput.trim() || undefined)
      .then((booking) => {
        setSuccessMessage(`${booking.teacherName} is now assigned to ${booking.childName}'s demo.`);
        loadDetail(detail.id);
      })
      .catch((err: Error) => setActionError(err.message))
      .finally(() => setSubmitting(false));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title="Teacher Assignment"
        description="Override the teacher assigned to a demo — see who's free before you move it, and keep a record of why."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admission/demo-scheduling">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Demo Scheduling
            </Link>
          </Button>
        }
      />

      {!bookingId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-[18px] w-[18px] text-primary" /> Choose a demo to reassign
            </CardTitle>
            <CardDescription>Only upcoming, still-scheduled demos are listed — a completed demo has nothing left to reassign.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by child, parent or current teacher…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {pickerLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading upcoming demos…</p>
            ) : filteredPicker.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No upcoming demos found" description="Schedule a demo first, or adjust your search." />
            ) : (
              <div className="flex flex-col gap-2">
                {filteredPicker.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => navigate(`/admission/demo-teacher-assignment/${row.id}`)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{getInitials(row.childName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{row.childName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.parentName} · {row.dateLabel} at {row.timeLabel}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{row.teacherName}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gated on !detail, not !detailLoading -- a background refresh after a successful
          reassignment (loadDetail again) must not unmount this whole panel and flash the
          success banner away while it's still meant to be showing. */}
      {bookingId && detailLoading && !detail && <p className="py-10 text-center text-sm text-muted-foreground">Loading booking…</p>}

      {bookingId && !detailLoading && detailError && (
        <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4" /> {detailError}
        </div>
      )}

      {bookingId && !detailError && detail && (
        <div className="flex flex-col gap-6">
          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> {successMessage}
            </div>
          )}
          {actionError && (
            <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" /> {actionError}
            </div>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{detail.childName}</CardTitle>
                <CardDescription>
                  {detail.parentName} · {detail.dateLabel} at {detail.timeLabel}
                </CardDescription>
              </div>
              <Badge variant="default">Currently: {detail.teacherName}</Badge>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-[18px] w-[18px] text-primary" /> Reassign teacher
              </CardTitle>
              <CardDescription>Each teacher's load around this slot, so you can see who's actually free before overriding.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {workload.map((t) => {
                  const isCurrent = t.teacherProfileId === detail.teacherId;
                  const disabled = isCurrent || t.isBusyAtSlot;
                  const selected = candidateId === t.teacherProfileId;
                  return (
                    <button
                      key={t.teacherProfileId}
                      type="button"
                      disabled={disabled}
                      onClick={() => setCandidateId(t.teacherProfileId)}
                      className={`flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : disabled
                            ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                            : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{t.teacherName}</span>
                        {isCurrent ? (
                          <Badge variant="secondary">Current</Badge>
                        ) : t.isBusyAtSlot ? (
                          <Badge variant="destructive">Busy at this time</Badge>
                        ) : (
                          <Badge variant="success">Free</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.departmentName ?? "No department"} · {t.sessionsToday} today · {t.sessionsThisWeek} this week
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reassignReason">Reason (optional, kept in the audit trail)</Label>
                <Textarea
                  id="reassignReason"
                  placeholder="e.g. Original teacher called in sick"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button disabled={!canSubmit || submitting} onClick={handleReassign}>
                  <UserCog className="h-4 w-4" /> {submitting ? "Reassigning…" : "Reassign Teacher"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-[18px] w-[18px] text-primary" /> Reassignment history
              </CardTitle>
              <CardDescription>Every manual override made on this booking, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No manual reassignments have been made on this booking yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {history.map((h) => (
                    <div key={h.id} className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {h.oldTeacherName ? `${h.oldTeacherName} → ${h.newTeacherName}` : `Assigned ${h.newTeacherName}`}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(h.atUtc, "datetime")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        By {h.actorName ?? "System"}
                        {h.reason ? ` — ${h.reason}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
