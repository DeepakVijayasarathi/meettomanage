import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, ChevronDown, ChevronUp, Loader2, Trash2, UserPlus, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SESSIONS } from "@/data/sessions";
import { TEACHERS } from "@/data/users";
import { LEADS } from "./data";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import { useApiData } from "@/api/hooks";
import { listTeacherOptions } from "@/api/batches";
import { createDemoBooking, deleteDemoBooking, getDemoJoinLink, listDemoBookings, rescheduleDemoBooking, resendDemoLink, updateConversionStatus, type ApiDemoBooking } from "@/api/demoBookings";
import { formatDate, formatTimeLabel, getInitials } from "@/lib/utils";
import { getUserTimeZoneAbbreviation, localToUtcIso, utcIsoToLocalDateTime } from "@/lib/datetime";
import { CHART_PALETTE } from "@/lib/roles";
import { usePortalBase } from "@/lib/portalBase";
import type { SessionStatus } from "@/types";

interface DemoParentField {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface DemoRow {
  id: string;
  childName: string;
  childAge?: number;
  /** Additional children attending the same demo (a demo can host several kids). */
  extraChildren: string[];
  parents: DemoParentField[];
  date: string;
  startTime: string;
  /** Only present for a real API-backed booking (needs both UTC timestamps) — used to
   *  prefill the reschedule dialog's duration field. */
  durationMinutes?: number;
  teacherId: string;
  teacherName: string;
  status: SessionStatus;
  /** Auto-calculated demo fee: ₹50 per demo, ₹100 once the lead is Enrolled. */
  payableAmount: number;
  notes?: string;
  isNew?: boolean;
}

function blankParent(): DemoParentField {
  return { id: `p-${Math.random().toString(36).slice(2, 9)}`, name: "", phone: "", email: "" };
}

function seedRows(): DemoRow[] {
  return SESSIONS.filter((s) => s.type === "demo").map((s) => {
    const lead = LEADS.find((l) => l.demoSessionId === s.id);
    const parents: DemoParentField[] = lead
      ? [{ id: `${s.id}-p1`, name: lead.parentName, phone: lead.phone, email: lead.email }]
      : [{ id: `${s.id}-p1`, name: "—", phone: "—", email: "—" }];
    if (s.id === "s-25") {
      parents.push({ id: "s-25-p2", name: "Meera Reddy (Grandmother)", phone: "+91 99000 77778", email: "" });
    }
    return {
      id: s.id,
      childName: lead?.childName ?? s.title.replace("Demo · ", ""),
      childAge: lead?.childAge,
      extraChildren: [],
      parents,
      date: s.date,
      startTime: s.startTime,
      teacherId: s.teacherId,
      teacherName: s.teacherName,
      status: s.status,
      payableAmount: lead?.conversionStage === "Enrolled" ? 100 : 50,
      notes: lead?.notes[0]?.note,
    };
  });
}

function bookingToRow(booking: ApiDemoBooking): DemoRow {
  const ist = booking.scheduledStartAtUtc ? utcIsoToLocalDateTime(booking.scheduledStartAtUtc) : null;
  const status: SessionStatus =
    booking.conversionStatus === "DemoScheduled" ? "demo" : booking.conversionStatus === "NotInterested" ? "cancelled" : "completed";
  const adults = booking.participants.filter((p) => !p.isChild);
  const kids = booking.participants.filter((p) => p.isChild);
  return {
    id: booking.id,
    childName: booking.childName,
    childAge: booking.childAge ?? undefined,
    extraChildren: kids.map((k) => k.name),
    parents: [
      { id: `${booking.id}-p1`, name: booking.parentName, phone: booking.parentPhone ?? "—", email: booking.parentEmail },
      ...adults.map((p, index) => ({
        id: `${booking.id}-x${index}`,
        name: p.name,
        phone: p.phone ?? "",
        email: p.email ?? "",
      })),
    ],
    date: ist ? ist.date : "",
    startTime: ist ? ist.time : "",
    durationMinutes:
      booking.scheduledStartAtUtc && booking.scheduledEndAtUtc
        ? Math.round((new Date(booking.scheduledEndAtUtc).getTime() - new Date(booking.scheduledStartAtUtc).getTime()) / 60000)
        : undefined,
    teacherId: booking.teacherProfileId ?? "",
    teacherName: booking.teacherName ?? "Auto-assigned",
    status,
    payableAmount: booking.payableAmount,
    notes: booking.followUpNotes ?? undefined,
  };
}

export default function AdmissionDemoScheduling() {
  const { toast } = useToast();
  const { hasPermission } = useSession();
  // View-level access already gates the whole page (via the menu); this gates the
  // "Schedule a Demo" form specifically against the account's Create grant -- POST
  // /api/demo-bookings needs Admission:Create, not just Admission:View.
  const canCreate = !apiEnabled() || hasPermission("Admission", "Create");
  const base = usePortalBase();
  const { data: apiRows, error: rowsError, reload: reloadRows } = useApiData(
    () => listDemoBookings().then((bookings) => bookings.map(bookingToRow)),
    seedRows()
  );
  const { data: teacherOptions } = useApiData(
    () => listTeacherOptions().then((teachers) => teachers.map((t) => ({ id: t.teacherProfileId, name: t.fullName }))),
    TEACHERS.filter((t) => t.status === "active").map((t) => ({ id: t.id, name: t.name }))
  );
  const [rows, setRows] = useState<DemoRow[]>(seedRows);
  useEffect(() => setRows(apiRows), [apiRows]);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  // A demo can host more than two kids — extra children join by name only.
  const [extraChildren, setExtraChildren] = useState<string[]>([]);
  const [parents, setParents] = useState<DemoParentField[]>([blankParent()]);
  const [date, setDate] = useState(apiEnabled() ? new Date().toISOString().slice(0, 10) : "2026-07-14");
  const [time, setTime] = useState("16:00");
  const [teacherId, setTeacherId] = useState("");
  const [notes, setNotes] = useState("");
  const [justScheduled, setJustScheduled] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  // Collapsed by default: this screen is visited many times a day mainly to check/update
  // existing demos, so the demo list — not the creation form — should be what's in view.
  const [formOpen, setFormOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<DemoRow | null>(null);
  // Tracks which row's "Resend Link" is in flight, so only that row's button shows busy --
  // multiple demos in the list could each be resent independently.
  const [resendingId, setResendingId] = useState<string | null>(null);
  // Tracks which row's "Copy Link" is in flight / just succeeded / just failed, per row.
  const [copyState, setCopyState] = useState<{ id: string; status: "copying" | "copied" | "failed" } | null>(null);
  const [completeTarget, setCompleteTarget] = useState<DemoRow | null>(null);
  // Distinct from cancelTarget/"Cancel" above -- that just marks the lead NotInterested and
  // keeps it on the list (notifying invitees); this removes the row entirely and frees the
  // teacher's slot, for a test entry or a mistaken double-booking rather than a real cancellation.
  const [deleteTarget, setDeleteTarget] = useState<DemoRow | null>(null);
  // Set once the user has tried to submit an invalid form -- gates the per-field error
  // messages below so they don't show up before the user has even touched the form.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Reschedule dialog — was previously the one thing missing here: Cancel kills the lead,
  // Delete loses the record, and neither actually just moves a wrongly-booked demo to a
  // different date/time the way regular sessions' own Reschedule already can.
  const [rescheduleTarget, setRescheduleTarget] = useState<DemoRow | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("10:00");
  const [reschedDuration, setReschedDuration] = useState("30");
  const [reschedBusy, setReschedBusy] = useState(false);
  const [reschedError, setReschedError] = useState<string | null>(null);
  const reschedDurationMinutes = Number(reschedDuration);
  const reschedDurationValid = Number.isFinite(reschedDurationMinutes) && reschedDurationMinutes > 0;

  function openReschedule(row: DemoRow) {
    setReschedError(null);
    setReschedDate(row.date);
    setReschedTime(row.startTime);
    setReschedDuration(String(row.durationMinutes ?? 30));
    setRescheduleTarget(row);
  }

  async function handleReschedule() {
    if (!rescheduleTarget || !reschedDate || !reschedDurationValid) return;
    if (!apiEnabled()) {
      toast({ variant: "success", title: "Done", description: "Demo mode — nothing actually rescheduled." });
      setRescheduleTarget(null);
      return;
    }
    setReschedBusy(true);
    setReschedError(null);
    try {
      const start = localToUtcIso(reschedDate, reschedTime);
      const end = new Date(new Date(start).getTime() + reschedDurationMinutes * 60000).toISOString();
      await rescheduleDemoBooking(rescheduleTarget.id, start, end);
      toast({
        variant: "success",
        title: "Rescheduled",
        description: `${rescheduleTarget.childName}'s demo moved to ${formatDate(reschedDate)} ${formatTimeLabel(reschedTime)} — the parent and teacher have been emailed the new time.`,
      });
      setRescheduleTarget(null);
      reloadRows();
    } catch (err) {
      setReschedError(err instanceof Error ? err.message : "Could not reschedule this demo.");
    } finally {
      setReschedBusy(false);
    }
  }

  const activeTeachers = teacherOptions;

  function updateParent(id: string, field: keyof DemoParentField, value: string) {
    setParents((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function addParent() {
    setParents((prev) => [...prev, blankParent()]);
  }

  function removeParent(id: string) {
    setParents((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }

  // Optional, but if given must match the backend's own [Range(1, 18)] — the input's
  // min/max attributes are cosmetic (they don't stop someone typing or pasting "60"),
  // so without this the only feedback was a 400 from the server after submitting.
  const childAgeError =
    childAge.trim().length > 0 && (!Number.isInteger(Number(childAge)) || Number(childAge) < 1 || Number(childAge) > 18)
      ? "Age must be a whole number between 1 and 18."
      : null;

  const isValid =
    childName.trim().length > 0 &&
    !childAgeError &&
    date.length > 0 &&
    time.length > 0 &&
    // API mode auto-assigns a teacher when none is picked, but needs the parent's email
    (apiEnabled() ? parents[0].email.trim().length > 0 : teacherId.length > 0) &&
    parents.every((p) => p.name.trim().length > 0 && p.phone.trim().length > 0) &&
    // Every parent past the first is only ever added to be invited as a participant, and the
    // API requires an email for any adult invitee (it has no other way to send a confirmation/
    // join link) -- requiring it here too means the success toast's "all invited parents will
    // receive an invite" is actually true, instead of quietly dropping anyone left blank.
    (!apiEnabled() || parents.every((p) => p.email.trim().length > 0));

  function resetForm() {
    setChildName("");
    setChildAge("");
    setExtraChildren([]);
    setParents([blankParent()]);
    setDate(apiEnabled() ? new Date().toISOString().slice(0, 10) : "2026-07-14");
    setTime("16:00");
    setTeacherId("");
    setNotes("");
    setFormOpen(false);
    setAttemptedSubmit(false);
  }

  function handleSchedule() {
    setAttemptedSubmit(true);
    if (!isValid || scheduling) return;

    if (apiEnabled()) {
      setScheduling(true);
      const primary = parents[0];
      const startUtc = localToUtcIso(date, time);
      const endUtc = new Date(new Date(startUtc).getTime() + 30 * 60_000).toISOString();
      createDemoBooking({
        parentName: primary.name.trim(),
        parentEmail: primary.email.trim(),
        parentPhone: primary.phone.trim() || undefined,
        childName: childName.trim(),
        childAge: childAge ? Number(childAge) : undefined,
        teacherProfileId: teacherId || undefined,
        scheduledStartAtUtc: startUtc,
        scheduledEndAtUtc: endUtc,
        participants: [
          ...parents.slice(1).map((p) => ({ name: p.name.trim(), email: p.email.trim(), phone: p.phone.trim() || null })),
          ...extraChildren
            .filter((name) => name.trim().length > 0)
            .map((name) => ({ name: name.trim(), email: null, phone: null, isChild: true })),
        ],
      })
        .then(() => {
          reloadRows();
          setActionError(null);
          setJustScheduled(childName.trim());
          resetForm();
          toast({ variant: "success", title: "Demo scheduled" });
        })
        .catch((err: Error) => {
          setActionError(err.message);
          toast({ variant: "error", title: "Couldn't schedule demo", description: err.message });
        })
        .finally(() => setScheduling(false));
      return;
    }

    const teacher = TEACHERS.find((t) => t.id === teacherId);
    const newRow: DemoRow = {
      id: `demo-${Math.random().toString(36).slice(2, 9)}`,
      childName: childName.trim(),
      childAge: childAge ? Number(childAge) : undefined,
      extraChildren: extraChildren.filter((n) => n.trim().length > 0),
      parents,
      date,
      startTime: time,
      teacherId,
      teacherName: teacher?.name ?? "—",
      status: "demo",
      payableAmount: 50,
      notes: notes.trim() || undefined,
      isNew: true,
    };
    setRows((prev) => [newRow, ...prev]);
    setActionError(null);
    setJustScheduled(childName.trim());
    resetForm();
  }

  // Re-sends the demo's join link to the parent, every extra invitee, and the assigned
  // teacher — for when a parent reports never getting (or losing) the original email. Always
  // the teacher's fixed meeting link, so it's identical to what they already have.
  function handleResendLink(row: DemoRow) {
    if (!apiEnabled()) {
      toast({ variant: "success", title: "Link resent", description: "(Demo mode — no real email is sent.)" });
      return;
    }
    setResendingId(row.id);
    resendDemoLink(row.id)
      .then(() => {
        toast({ variant: "success", title: "Link resent", description: `${row.childName}'s demo link was re-sent to the parent and teacher.` });
      })
      .catch((err: Error) => {
        toast({ variant: "error", title: "Couldn't resend link", description: err.message });
      })
      .finally(() => setResendingId(null));
  }

  // Copies the parent's join link to the clipboard for manual sharing (WhatsApp, SMS) --
  // demo mode has no real link to copy, so this is API-only.
  function handleCopyLink(row: DemoRow) {
    if (!apiEnabled()) {
      toast({ variant: "error", title: "Not available in demo mode" });
      return;
    }
    setCopyState({ id: row.id, status: "copying" });
    getDemoJoinLink(row.id)
      .then(async ({ shortUrl }) => {
        if (!navigator.clipboard) {
          throw new Error("Clipboard API unavailable");
        }
        await navigator.clipboard.writeText(shortUrl);
        setCopyState({ id: row.id, status: "copied" });
      })
      .catch((err: Error) => {
        setCopyState({ id: row.id, status: "failed" });
        toast({ variant: "error", title: "Couldn't copy link", description: err.message });
      })
      .finally(() => {
        setTimeout(() => setCopyState((s) => (s?.id === row.id ? null : s)), 2500);
      });
  }

  const columns: DataTableColumn<DemoRow>[] = useMemo(
    () => [
      {
        key: "child",
        header: "Child",
        sortable: true,
        accessor: (row) => row.childName,
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback
                style={{ backgroundColor: `${CHART_PALETTE[row.childName.length % CHART_PALETTE.length]}22`, color: CHART_PALETTE[row.childName.length % CHART_PALETTE.length] }}
              >
                {getInitials(row.childName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{row.childName}</p>
              {row.childAge && <p className="text-xs text-muted-foreground">Age {row.childAge}</p>}
              {row.extraChildren.length > 0 && (
                <p className="text-xs font-medium text-primary">+ {row.extraChildren.join(", ")}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "parents",
        header: "Parent(s) / Guardian(s)",
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            {row.parents.map((p) => (
              <span key={p.id} className="text-sm text-foreground">
                {p.name}
                {p.phone !== "—" && <span className="text-xs text-muted-foreground"> · {p.phone}</span>}
              </span>
            ))}
            {row.parents.length > 1 && (
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Users2 className="h-3 w-3" /> {row.parents.length} invited
              </span>
            )}
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
            {row.date ? `${formatDate(row.date)} · ${formatTimeLabel(row.startTime)}` : "—"}
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
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => (
          <div className="flex items-center gap-2">
            <SessionStatusBadge status={row.status} />
            {row.isNew && <span className="text-xs font-semibold text-primary">New</span>}
          </div>
        ),
      },
      {
        key: "fee",
        header: "Demo Fee",
        sortable: true,
        accessor: (row) => row.payableAmount,
        render: (row) => (
          <span className="text-sm font-semibold text-foreground" title="₹50 per demo · ₹100 once enrolled">
            ₹{row.payableAmount}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        // min-w-max: without it, the browser's table auto-layout mis-measures this
        // wrapping flex row's min-content width and can shrink the column below what
        // even a single button needs, clipping button labels at the table's right edge
        // instead of wrapping them onto their own line as intended.
        render: (row) => (
          <div className="flex min-w-max flex-wrap items-center gap-1.5">
            {row.status === "demo" ? (
              <Button asChild variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                <Link to={`${base}/demo-teacher-assignment/${row.id}`}>Reassign</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Reassign
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={row.status !== "demo"}
              onClick={(e) => {
                e.stopPropagation();
                openReschedule(row);
              }}
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={row.status !== "demo"}
              onClick={(e) => {
                e.stopPropagation();
                setCompleteTarget(row);
              }}
            >
              Mark Completed
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={row.status !== "demo"}
              onClick={(e) => {
                e.stopPropagation();
                setCancelTarget(row);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={row.status !== "demo" || resendingId === row.id}
              title="Re-send the join link to the parent and teacher"
              onClick={(e) => {
                e.stopPropagation();
                handleResendLink(row);
              }}
            >
              {resendingId === row.id ? "Resending…" : "Resend Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={row.status !== "demo" || copyState?.id === row.id}
              title="Copy the parent's join link to share manually"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink(row);
              }}
            >
              {copyState?.id === row.id
                ? copyState.status === "copying"
                  ? "Copying…"
                  : copyState.status === "copied"
                    ? "Copied"
                    : "Failed"
                : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-destructive hover:text-destructive"
              title="Permanently remove this demo booking"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        ),
      },
    ],
    [base, resendingId, copyState]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title="Demo Scheduling"
        description="Book flexible, one-time demo classes — invite more than one parent or guardian to join the same session."
      />

      <p className="mb-5 text-xs text-muted-foreground">
        Demo fee: <span className="font-semibold text-foreground">₹50 per demo</span>, rising to{" "}
        <span className="font-semibold text-foreground">₹100</span> once the lead is enrolled.
      </p>

      {justScheduled && (
        <InlineAlert variant="success" bordered className="mb-5">
          Demo scheduled for {justScheduled}. All invited parents/guardians will receive an invite.
        </InlineAlert>
      )}

      {actionError && (
        <InlineAlert variant="error" bordered className="mb-5">
          {actionError}
        </InlineAlert>
      )}

      {canCreate && (
      <Card className="mb-6">
        <CardHeader
          role="button"
          tabIndex={0}
          aria-expanded={formOpen}
          onClick={() => setFormOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFormOpen((o) => !o);
            }
          }}
          className="cursor-pointer flex-row items-center justify-between space-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="h-[18px] w-[18px] text-primary" /> Schedule a Demo
            </CardTitle>
            <CardDescription>One demo class can be shared with multiple parents/guardians — add as many as you need.</CardDescription>
          </div>
          {formOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </CardHeader>
        {!formOpen && (
          <CardContent>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <CalendarPlus className="h-3.5 w-3.5" /> New Demo
            </Button>
          </CardContent>
        )}
        {formOpen && (
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="childName">
                Child Name <span className="text-destructive">*</span>
              </Label>
              <Input id="childName" placeholder="e.g. Aanya Verma" value={childName} onChange={(e) => setChildName(e.target.value)} />
              {attemptedSubmit && childName.trim().length === 0 && (
                <p role="alert" className="text-xs text-destructive">Child name is required.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="childAge">Child Age</Label>
              <Input
                id="childAge"
                type="number"
                min={1}
                max={18}
                placeholder="e.g. 6"
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                aria-invalid={!!childAgeError}
              />
              {childAgeError && <p className="text-xs font-medium text-destructive">{childAgeError}</p>}
            </div>
          </div>

          {/* A demo can host more than two kids — add each additional child by name. */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Additional children attending</Label>
              <Button type="button" variant="soft" size="sm" onClick={() => setExtraChildren((prev) => [...prev, ""])}>
                <UserPlus className="h-3.5 w-3.5" /> Add another child
              </Button>
            </div>
            {extraChildren.length > 0 && (
              <div className="flex flex-col gap-2">
                {extraChildren.map((name, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-border bg-muted/30 p-3">
                    <Input
                      placeholder={`Child ${idx + 2} name`}
                      aria-label={`Child ${idx + 2} name`}
                      value={name}
                      onChange={(e) =>
                        setExtraChildren((prev) => prev.map((n, i) => (i === idx ? e.target.value : n)))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="justify-self-end text-destructive hover:text-destructive"
                      onClick={() => setExtraChildren((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove this child"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                Parents / Guardians to invite <span className="text-destructive">*</span>
              </Label>
              <Button type="button" variant="soft" size="sm" onClick={addParent}>
                <UserPlus className="h-3.5 w-3.5" /> Add another parent
              </Button>
            </div>
            <div className="hidden gap-3 px-3 sm:grid sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Label className="text-xs text-muted-foreground">
                Email {apiEnabled() ? <span className="text-destructive">*</span> : "(required to invite)"}
              </Label>
              <span />
            </div>
            <div className="flex flex-col gap-3">
              {parents.map((p, idx) => {
                const nameMissing = attemptedSubmit && p.name.trim().length === 0;
                const phoneMissing = attemptedSubmit && p.phone.trim().length === 0;
                const emailMissing = attemptedSubmit && apiEnabled() && p.email.trim().length === 0;
                return (
                <div key={p.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <div className="flex flex-col gap-1">
                    <Input placeholder={`Parent/guardian ${idx + 1} name`} aria-label={`Parent/guardian ${idx + 1} name`} value={p.name} onChange={(e) => updateParent(p.id, "name", e.target.value)} aria-invalid={nameMissing} />
                    {nameMissing && <p role="alert" className="text-xs text-destructive">Name is required.</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Input placeholder="Phone number" aria-label={`Parent/guardian ${idx + 1} phone number`} value={p.phone} onChange={(e) => updateParent(p.id, "phone", e.target.value)} aria-invalid={phoneMissing} />
                    {phoneMissing && <p role="alert" className="text-xs text-destructive">Phone number is required.</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Input
                      placeholder={apiEnabled() ? "Email address (required)" : "Email address"}
                      aria-label={`Parent/guardian ${idx + 1} email address${apiEnabled() ? " (required)" : ""}`}
                      value={p.email}
                      onChange={(e) => updateParent(p.id, "email", e.target.value)}
                      aria-invalid={emailMissing}
                    />
                    {emailMissing && <p role="alert" className="text-xs text-destructive">Email is required to send an invite.</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive justify-self-end"
                    disabled={parents.length === 1}
                    onClick={() => removeParent(p.id)}
                    title="Remove this parent/guardian"
                    aria-label="Remove this parent/guardian"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demoDate">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input id="demoDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={attemptedSubmit && date.length === 0} />
              {attemptedSubmit && date.length === 0 && (
                <p role="alert" className="text-xs text-destructive">Date is required.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demoTime">
                Time ({getUserTimeZoneAbbreviation()}) <span className="text-destructive">*</span>
              </Label>
              <Input id="demoTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-invalid={attemptedSubmit && time.length === 0} />
              {attemptedSubmit && time.length === 0 && (
                <p role="alert" className="text-xs text-destructive">Time is required.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demo-teacher-select">
                Teacher {!apiEnabled() && <span className="text-destructive">*</span>}
              </Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger id="demo-teacher-select" aria-invalid={attemptedSubmit && !apiEnabled() && teacherId.length === 0}>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {activeTeachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {attemptedSubmit && !apiEnabled() && teacherId.length === 0 && (
                <p role="alert" className="text-xs text-destructive">Teacher is required.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="demoNotes">Notes for the teacher (optional)</Label>
            <Textarea
              id="demoNotes"
              placeholder="Anything the teacher should know before the demo — e.g. child's interests, prior learning, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Clear
            </Button>
            <Button disabled={!isValid || scheduling} onClick={handleSchedule}>
              {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}{scheduling ? "Scheduling…" : "Schedule Demo"}
            </Button>
          </div>
        </CardContent>
        )}
      </Card>
      )}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search by child, parent or teacher…"
        emptyTitle="No demos scheduled yet"
        emptyDescription="Use the form above to schedule your first demo class."
        error={apiEnabled() ? rowsError : null}
        onRetry={reloadRows}
      />

      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="max-w-sm">
          {rescheduleTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Reschedule demo</DialogTitle>
                <DialogDescription>
                  "{rescheduleTarget.childName}" — pick the new slot. The parent and teacher are emailed the change immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="demo-rs-date">New date</Label>
                  <Input id="demo-rs-date" type="date" value={reschedDate} onChange={(e) => setReschedDate(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="demo-rs-time">New time ({getUserTimeZoneAbbreviation()})</Label>
                  <Input id="demo-rs-time" type="time" value={reschedTime} onChange={(e) => setReschedTime(e.target.value)} />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="demo-rs-duration">Duration (min)</Label>
                  <Input
                    id="demo-rs-duration"
                    type="number"
                    min={1}
                    step={1}
                    value={reschedDuration}
                    onChange={(e) => setReschedDuration(e.target.value)}
                    aria-invalid={!reschedDurationValid}
                  />
                  {!reschedDurationValid && <p className="text-xs font-medium text-destructive">Enter a duration greater than 0.</p>}
                </div>
              </div>
              {reschedError && <p className="text-sm font-medium text-destructive">{reschedError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
                  Close
                </Button>
                <Button disabled={reschedBusy || !reschedDate || !reschedDurationValid} onClick={handleReschedule}>
                  {reschedBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {reschedBusy ? "Rescheduling…" : "Reschedule"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!completeTarget}
        onOpenChange={(open) => !open && setCompleteTarget(null)}
        title="Mark demo as completed?"
        description={completeTarget ? `"${completeTarget.childName}"'s demo will be marked completed. Remember to check in with the teacher for feedback.` : undefined}
        confirmLabel="Mark Completed"
        onConfirm={() => {
          if (!completeTarget) return;
          if (apiEnabled()) {
            // Returned (not caught here) so ConfirmDialog's own busy/inline-error handling
            // applies — it used to close the instant the request was fired, regardless of
            // whether it actually succeeded, with no feedback in the dialog either way.
            return updateConversionStatus(completeTarget.id, "DemoCompleted").then(() => {
              setActionError(null);
              reloadRows();
              toast({ variant: "success", title: "Demo marked completed" });
            });
          }
          setRows((prev) => prev.map((r) => (r.id === completeTarget.id ? { ...r, status: "completed" } : r)));
        }}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel this demo?"
        description={cancelTarget ? `"${cancelTarget.childName}"'s demo will be cancelled. All invited parents/guardians will be notified.` : undefined}
        confirmLabel="Cancel Demo"
        destructive
        onConfirm={() => {
          if (!cancelTarget) return;
          if (apiEnabled()) {
            // See the Mark Completed dialog above — returned, not caught here, so
            // ConfirmDialog stays open with an inline error on failure instead of closing
            // unconditionally before the request has even settled.
            return updateConversionStatus(cancelTarget.id, "NotInterested").then(() => {
              setActionError(null);
              reloadRows();
              toast({ variant: "success", title: "Demo cancelled" });
            });
          }
          setRows((prev) => prev.map((r) => (r.id === cancelTarget.id ? { ...r, status: "cancelled" } : r)));
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this demo booking?"
        description={
          deleteTarget
            ? `"${deleteTarget.childName}"'s demo booking will be permanently removed and the teacher's slot freed. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleteTarget) return;
          if (apiEnabled()) {
            // Returned (not caught) so ConfirmDialog shows the backend's refusal inline (e.g.
            // "already invoiced or enrolled") instead of closing before the request settles.
            return deleteDemoBooking(deleteTarget.id).then(() => {
              setActionError(null);
              reloadRows();
              toast({ variant: "success", title: "Demo booking deleted" });
            });
          }
          setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        }}
      />
    </div>
  );
}
