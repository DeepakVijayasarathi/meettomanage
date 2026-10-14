import { useState } from "react";
import { CalendarOff, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { applyStaffLeave, formatLeaveDates, listMyStaffLeave, withdrawStaffLeave, type ApiStaffLeave, type StaffLeaveStatus } from "@/api/staffLeave";
import { toast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";

export const STAFF_LEAVE_VARIANT: Record<StaffLeaveStatus, "warning" | "success" | "destructive" | "muted"> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "destructive",
  Cancelled: "muted",
};

export const STAFF_LEAVE_LABEL: Record<StaffLeaveStatus, string> = {
  Pending: "Awaiting approval",
  Approved: "Approved",
  Rejected: "Not approved",
  Cancelled: "Withdrawn",
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * "My Leave" for admin-team members (RM, Coordinator, Management, Admission) — apply whenever
 * needed, no minimum notice; Admin / Founder approve. Shared across those portals.
 *
 * `approverLabel` overrides who the description says reviews it — used for Admin's own leave
 * (mounted under /admin and /executive), which only Management can approve, never another
 * Admin (StaffLeaveService.ReviewAsync's own carve-out); every other portal keeps the default.
 */
export default function MyLeave({ approverLabel = "Admin" }: { approverLabel?: string }) {
  const { data: leaves, loading, error, reload } = useApiData(() => listMyStaffLeave(), [] as ApiStaffLeave[]);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  function startNew() {
    setStartDate(todayIso());
    setEndDate(todayIso());
    setReason("");
    setOpen(true);
  }

  async function submit() {
    if (!startDate || !endDate || !reason.trim()) return;
    if (endDate < startDate) {
      toast({ variant: "error", title: "Check the dates", description: "The end date can't be before the start date." });
      return;
    }
    if (!apiEnabled()) {
      toast({ variant: "success", title: "Demo mode", description: "Leave isn't saved without the API." });
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await applyStaffLeave({ startDate, endDate, reason: reason.trim() });
      toast({ variant: "success", title: "Leave applied", description: `${approverLabel} has been notified for approval.` });
      setOpen(false);
      reload();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't apply for leave", description: userMessage(err, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  async function withdraw(id: string) {
    setWithdrawingId(id);
    try {
      await withdrawStaffLeave(id);
      toast({ variant: "success", title: "Leave withdrawn" });
      reload();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't withdraw", description: userMessage(err, "Please try again.") });
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Leave"
        title="My Leave"
        description={`Apply for leave whenever you need it — there's no minimum notice. ${approverLabel} reviews every request.`}
        actions={
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" /> Apply for leave
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error && apiEnabled() ? (
        <EmptyState icon={CalendarOff} title="Couldn't load your leave" description={error} action={<Button variant="outline" onClick={reload}>Try again</Button>} />
      ) : leaves.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No leave applied yet" description="Your leave requests and their approval status show up here." />
      ) : (
        <Card className="divide-y overflow-hidden p-0">
          {leaves.map((l) => (
            <div key={l.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{formatLeaveDates(l.startDate, l.endDate)}</p>
                  <span className="text-sm text-muted-foreground">· {l.days} day{l.days === 1 ? "" : "s"}</span>
                  <Badge variant={STAFF_LEAVE_VARIANT[l.status]}>{STAFF_LEAVE_LABEL[l.status]}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{l.reason}</p>
                {l.reviewNote && <p className="mt-0.5 text-xs text-muted-foreground">Admin note: {l.reviewNote}</p>}
              </div>
              {l.status === "Pending" && (
                <Button size="sm" variant="outline" disabled={withdrawingId === l.id} onClick={() => void withdraw(l.id)}>
                  {withdrawingId === l.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Withdraw
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for leave</DialogTitle>
            <DialogDescription>Whole days. Admin is notified straight away.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="leave-start">From</Label>
              <Input id="leave-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="leave-end">To</Label>
              <Input id="leave-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="leave-reason">Reason</Label>
            <Textarea id="leave-reason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={saving || !reason.trim()} onClick={() => void submit()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
