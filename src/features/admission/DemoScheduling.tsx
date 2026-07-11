import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, Trash2, UserPlus, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
import { useApiData } from "@/api/hooks";
import { listTeacherOptions } from "@/api/batches";
import { createDemoBooking, listDemoBookings, type ApiDemoBooking } from "@/api/demoBookings";
import { formatDate, getInitials } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
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
  parents: DemoParentField[];
  date: string;
  startTime: string;
  teacherId: string;
  teacherName: string;
  status: SessionStatus;
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
      parents,
      date: s.date,
      startTime: s.startTime,
      teacherId: s.teacherId,
      teacherName: s.teacherName,
      status: s.status,
      notes: lead?.notes[0]?.note,
    };
  });
}

function bookingToRow(booking: ApiDemoBooking): DemoRow {
  const start = booking.scheduledStartAtUtc ? new Date(booking.scheduledStartAtUtc) : null;
  const status: SessionStatus =
    booking.conversionStatus === "DemoScheduled" ? "demo" : booking.conversionStatus === "NotInterested" ? "cancelled" : "completed";
  return {
    id: booking.id,
    childName: booking.childName,
    childAge: booking.childAge ?? undefined,
    parents: [
      { id: `${booking.id}-p1`, name: booking.parentName, phone: booking.parentPhone ?? "—", email: booking.parentEmail },
      ...booking.participants.map((p, index) => ({
        id: `${booking.id}-x${index}`,
        name: p.name,
        phone: p.phone ?? "",
        email: p.email,
      })),
    ],
    date: start ? start.toISOString().slice(0, 10) : "",
    startTime: start ? start.toISOString().slice(11, 16) : "",
    teacherId: "",
    teacherName: "Auto-assigned",
    status,
    notes: booking.followUpNotes ?? undefined,
  };
}

export default function AdmissionDemoScheduling() {
  const { data: apiRows, reload: reloadRows } = useApiData(
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
  const [parents, setParents] = useState<DemoParentField[]>([blankParent()]);
  const [date, setDate] = useState("2026-07-14");
  const [time, setTime] = useState("16:00");
  const [teacherId, setTeacherId] = useState("");
  const [notes, setNotes] = useState("");
  const [justScheduled, setJustScheduled] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DemoRow | null>(null);
  const [completeTarget, setCompleteTarget] = useState<DemoRow | null>(null);

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

  const isValid =
    childName.trim().length > 0 &&
    date.length > 0 &&
    time.length > 0 &&
    // API mode auto-assigns a teacher when none is picked, but needs the parent's email
    (apiEnabled() ? parents[0].email.trim().length > 0 : teacherId.length > 0) &&
    parents.every((p) => p.name.trim().length > 0 && p.phone.trim().length > 0);

  function resetForm() {
    setChildName("");
    setChildAge("");
    setParents([blankParent()]);
    setDate("2026-07-14");
    setTime("16:00");
    setTeacherId("");
    setNotes("");
  }

  function handleSchedule() {
    if (!isValid) return;

    if (apiEnabled()) {
      const primary = parents[0];
      const startUtc = new Date(`${date}T${time}:00`);
      const endUtc = new Date(startUtc.getTime() + 30 * 60_000);
      createDemoBooking({
        parentName: primary.name.trim(),
        parentEmail: primary.email.trim(),
        parentPhone: primary.phone.trim() || undefined,
        childName: childName.trim(),
        childAge: childAge ? Number(childAge) : undefined,
        teacherProfileId: teacherId || undefined,
        scheduledStartAtUtc: startUtc.toISOString(),
        scheduledEndAtUtc: endUtc.toISOString(),
        participants: parents
          .slice(1)
          .filter((p) => p.email.trim().length > 0)
          .map((p) => ({ name: p.name.trim(), email: p.email.trim(), phone: p.phone.trim() || null })),
      })
        .then(() => {
          reloadRows();
          setJustScheduled(childName.trim());
          resetForm();
        })
        .catch((err: Error) => setJustScheduled(`Error: ${err.message}`));
      return;
    }

    const teacher = TEACHERS.find((t) => t.id === teacherId);
    const newRow: DemoRow = {
      id: `demo-${Math.random().toString(36).slice(2, 9)}`,
      childName: childName.trim(),
      childAge: childAge ? Number(childAge) : undefined,
      parents,
      date,
      startTime: time,
      teacherId,
      teacherName: teacher?.name ?? "—",
      status: "demo",
      notes: notes.trim() || undefined,
      isNew: true,
    };
    setRows((prev) => [newRow, ...prev]);
    setJustScheduled(childName.trim());
    resetForm();
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
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-1.5">
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
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title="Demo Scheduling"
        description="Book flexible, one-time demo classes — invite more than one parent or guardian to join the same session."
      />

      {justScheduled && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          Demo scheduled for {justScheduled}. All invited parents/guardians will receive an invite.
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-[18px] w-[18px] text-primary" /> Schedule a Demo
          </CardTitle>
          <CardDescription>One demo class can be shared with multiple parents/guardians — add as many as you need.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="childName">
                Child Name <span className="text-destructive">*</span>
              </Label>
              <Input id="childName" placeholder="e.g. Aanya Verma" value={childName} onChange={(e) => setChildName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="childAge">Child Age</Label>
              <Input id="childAge" type="number" min={2} max={16} placeholder="e.g. 6" value={childAge} onChange={(e) => setChildAge(e.target.value)} />
            </div>
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
            <div className="flex flex-col gap-3">
              {parents.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <Input placeholder={`Parent/guardian ${idx + 1} name`} value={p.name} onChange={(e) => updateParent(p.id, "name", e.target.value)} />
                  <Input placeholder="Phone number" value={p.phone} onChange={(e) => updateParent(p.id, "phone", e.target.value)} />
                  <Input placeholder="Email address" value={p.email} onChange={(e) => updateParent(p.id, "email", e.target.value)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive justify-self-end"
                    disabled={parents.length === 1}
                    onClick={() => removeParent(p.id)}
                    title="Remove this parent/guardian"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demoDate">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input id="demoDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demoTime">
                Time <span className="text-destructive">*</span>
              </Label>
              <Input id="demoTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Teacher <span className="text-destructive">*</span>
              </Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger>
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
            <Button disabled={!isValid} onClick={handleSchedule}>
              <CalendarPlus className="h-4 w-4" /> Schedule Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search by child, parent or teacher…"
        emptyTitle="No demos scheduled yet"
        emptyDescription="Use the form above to schedule your first demo class."
      />

      <ConfirmDialog
        open={!!completeTarget}
        onOpenChange={(open) => !open && setCompleteTarget(null)}
        title="Mark demo as completed?"
        description={completeTarget ? `"${completeTarget.childName}"'s demo will be marked completed. Remember to check in with the teacher for feedback.` : undefined}
        confirmLabel="Mark Completed"
        onConfirm={() => {
          if (!completeTarget) return;
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
          setRows((prev) => prev.map((r) => (r.id === cancelTarget.id ? { ...r, status: "cancelled" } : r)));
        }}
      />
    </div>
  );
}
