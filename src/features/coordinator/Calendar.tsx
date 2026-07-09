import { useState } from "react";
import { CalendarClock, PartyPopper, RefreshCcw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CalendarBoard } from "@/components/CalendarBoard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { ClassSession } from "@/types";
import { formatDate } from "@/lib/utils";

const LOCKED_STATUSES: ClassSession["status"][] = ["cancelled", "completed", "holiday", "leave"];

export default function CoordinatorCalendar() {
  const [sessions, setSessions] = useState<ClassSession[]>(SESSIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);

  const selected = selectedId ? sessions.find((s) => s.id === selectedId) ?? null : null;
  const locked = selected ? LOCKED_STATUSES.includes(selected.status) : true;

  function updateStatus(id: string, status: ClassSession["status"]) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Coordination"
        title="Academic Calendar"
        description="The single, colour-coded source of truth for every scheduled session, demo, holiday and teacher leave across the academy. Click any session to inspect or action it."
      />

      <Card className="p-5">
        <CalendarBoard
          sessions={sessions}
          initialMonth={new Date(2026, 6, 1)}
          onSessionClick={(s) => setSelectedId(s.id)}
        />
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
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
                  <p className="mt-1 font-medium text-foreground">{selected.batchId ? getBatchById(selected.batchId)?.name ?? "—" : "—"}</p>
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
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
                <Button variant="outline" disabled={locked} onClick={() => setHolidayOpen(true)}>
                  <PartyPopper className="h-4 w-4" /> Mark Holiday
                </Button>
                <Button disabled={locked} onClick={() => setRescheduleOpen(true)}>
                  <RefreshCcw className="h-4 w-4" /> Reschedule
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        title="Reschedule this session?"
        description={selected ? `"${selected.title}" will be marked as rescheduled on the calendar. The teacher and parents will be notified to confirm the new slot.` : undefined}
        confirmLabel="Mark Rescheduled"
        onConfirm={() => {
          if (!selected) return;
          updateStatus(selected.id, "rescheduled");
        }}
      />

      <ConfirmDialog
        open={holidayOpen}
        onOpenChange={setHolidayOpen}
        title="Mark this slot as a holiday?"
        description={selected ? `"${selected.title}" will be converted to a holiday block. Any assigned students and the teacher will be freed from this slot.` : undefined}
        confirmLabel="Mark Holiday"
        onConfirm={() => {
          if (!selected) return;
          updateStatus(selected.id, "holiday");
        }}
      />
    </div>
  );
}
