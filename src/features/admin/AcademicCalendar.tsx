import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CalendarBoard } from "@/components/CalendarBoard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SessionStatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SESSIONS } from "@/data/sessions";
import { getBatchById } from "@/data/batches";
import { getChildById } from "@/data/children";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listSessions, toFrontendSession } from "@/api/sessions";
import { createHoliday, deleteHoliday, listHolidays, listLeave, type ApiHoliday, type ApiLeaveRequest } from "@/api/academicOps";
import { approvedLeaveToCalendarEvents, holidaysToCalendarEvents } from "@/lib/calendarEvents";
import type { ClassSession } from "@/types";
import { formatDate } from "@/lib/utils";

export default function AdminAcademicCalendar() {
  const [selected, setSelected] = useState<ClassSession | null>(null);
  const { data: sessions } = useApiData<ClassSession[]>(
    () => listSessions().then((items) => items.map(toFrontendSession)),
    SESSIONS
  );
  const { data: holidays, reload: reloadHolidays } = useApiData<ApiHoliday[]>(() => listHolidays(), []);
  const { data: approvedLeave } = useApiData<ApiLeaveRequest[]>(() => listLeave("Approved"), []);
  // Holidays/leave are their own entities, not ClassSession rows — merged in here as
  // synthetic "holiday"/"leave" calendar events so the colour coding actually shows them.
  const calendarEvents = useMemo(
    () =>
      apiEnabled()
        ? [...sessions, ...holidaysToCalendarEvents(holidays), ...approvedLeaveToCalendarEvents(approvedLeave)]
        : sessions,
    [sessions, holidays, approvedLeave]
  );
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);

  async function handleAddHoliday() {
    if (!holidayDate || !holidayName.trim()) return;
    setSavingHoliday(true);
    setHolidayError(null);
    try {
      await createHoliday({ date: holidayDate, name: holidayName.trim() });
      setHolidayDate("");
      setHolidayName("");
      reloadHolidays();
    } catch (err) {
      setHolidayError(err instanceof Error ? err.message : "Could not add the holiday.");
    } finally {
      setSavingHoliday(false);
    }
  }

  async function handleDeleteHoliday(id: string) {
    setDeletingHolidayId(id);
    setHolidayError(null);
    try {
      await deleteHoliday(id);
      reloadHolidays();
    } catch (err) {
      setHolidayError(err instanceof Error ? err.message : "Could not remove the holiday.");
    } finally {
      setDeletingHolidayId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Scheduling"
        title="Academic Calendar"
        description="A colour-coded, real-time overview of every scheduled session, demo, holiday and leave across the academy."
      />

      <Card className="p-5">
        <CalendarBoard
          sessions={calendarEvents}
          initialMonth={apiEnabled() ? new Date() : new Date(2026, 6, 1)}
          onSessionClick={setSelected}
        />
      </Card>

      {apiEnabled() && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Holiday Calendar</CardTitle>
            <CardDescription>Automated scheduling skips these dates when generating batch sessions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="holiday-date">Date</Label>
                <Input id="holiday-date" type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="w-44" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="holiday-name">Name</Label>
                <Input id="holiday-name" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g. Diwali" className="w-56" />
              </div>
              <Button onClick={handleAddHoliday} disabled={savingHoliday || !holidayDate || !holidayName.trim()}>
                <Plus className="h-4 w-4" /> {savingHoliday ? "Adding…" : "Add Holiday"}
              </Button>
            </div>
            {holidayError && <p className="text-sm font-medium text-destructive">{holidayError}</p>}
            {holidays.length > 0 && (
              <ul className="flex flex-col divide-y divide-border">
                {holidays.map((h) => (
                  <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-foreground">
                      {formatDate(h.date)} — {h.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingHolidayId === h.id}
                      onClick={() => handleDeleteHoliday(h.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {formatDate(selected.date, "long")} · {selected.startTime} · {selected.duration} min
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <SessionStatusBadge status={selected.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</p>
                  <p className="mt-1 font-medium capitalize text-foreground">{selected.type}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teacher</p>
                  <p className="mt-1 font-medium text-foreground">{selected.teacherName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Batch</p>
                  {/* API sessions carry the batch name as the title; the mock lookup is demo-only */}
                  <p className="mt-1 font-medium text-foreground">
                    {selected.batchId ? (apiEnabled() ? selected.title : getBatchById(selected.batchId)?.name ?? "—") : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students</p>
                  <p className="mt-1 font-medium text-foreground">
                    {selected.childIds.length === 0
                      ? "No students assigned"
                      : selected.childIds.map((id) => getChildById(id)?.name ?? id).join(", ")}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                {selected.status !== "holiday" && selected.status !== "leave" && (
                  <Button variant="outline" asChild>
                    <Link to="/admin/sessions">Manage in Sessions</Link>
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
