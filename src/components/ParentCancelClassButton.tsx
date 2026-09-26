import { useState } from "react";
import { CalendarX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cancelSessionAsParent } from "@/api/sessions";
import { toast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { formatDate, formatTimeLabel } from "@/lib/utils";
import type { ClassSession } from "@/types";
import { minutesUntilStart } from "@/features/parent/utils";
import { DEFAULT_CANCEL_CUTOFF_MINUTES, usePolicies } from "@/lib/policies";

/** Upcoming batch classes only — a demo, a class already under way, or a finished one can't be cancelled here. */
export function canParentCancel(session: ClassSession, cutoffMinutes = DEFAULT_CANCEL_CUTOFF_MINUTES): boolean {
  // Cancelling closes `cutoffMinutes` before the class (e.g. a 4:00 PM class, 60 min: until 3:00 PM);
  // after that the button disappears and the class stays as scheduled. The API enforces it too.
  return session.status === "scheduled" && Boolean(session.batchId) && minutesUntilStart(session) >= cutoffMinutes;
}

/**
 * Parent-side "Cancel class": takes effect immediately (no admin approval) and emails the
 * class's teacher that the parent cancelled, with the reason given here. The family's own
 * class is cancelled with a make-up scheduled automatically; in a shared group class only
 * their child is marked absent and the class goes ahead for everyone else.
 */
export function ParentCancelClassButton({
  session,
  onCancelled,
  size = "sm",
}: {
  session: ClassSession;
  onCancelled?: () => void;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { cancelCutoffMinutes } = usePolicies();

  if (!canParentCancel(session, cancelCutoffMinutes)) return null;

  async function submit() {
    if (!reason.trim()) return;
    if (!apiEnabled()) {
      toast({ variant: "success", title: "Demo mode", description: "Cancelling a class needs the API connected." });
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await cancelSessionAsParent(session.id, reason.trim());
      toast({ variant: "success", title: "Cancellation sent", description: "The teacher has been notified with your reason. Any make-up class appears on your schedule." });
      setOpen(false);
      setReason("");
      onCancelled?.();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't cancel the class", description: userMessage(err, "Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size={size} variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
        <CalendarX className="h-3.5 w-3.5" /> Cancel
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this class?</DialogTitle>
            <DialogDescription>
              {session.title} · {formatDate(session.date, "long")} · {formatTimeLabel(session.startTime)} with {session.teacherName}.
              Your own class is cancelled straight away and a make-up class is scheduled for you; in a group class, your
              child is marked as not attending and the class goes ahead for the others. The teacher is emailed your reason. Cancellations close {cancelCutoffMinutes} minutes before the class starts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor={`cancel-reason-${session.id}`}>Reason for cancelling</Label>
            <Textarea
              id={`cancel-reason-${session.id}`}
              rows={3}
              maxLength={400}
              value={reason}
              placeholder="e.g. My child is unwell today."
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Keep class</Button>
            <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => void submit()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Cancel class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
