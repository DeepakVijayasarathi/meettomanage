import { useState } from "react";
import { CalendarOff, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApiData } from "@/api/hooks";
import { formatLeaveDates, listStaffLeave, reviewStaffLeave, type ApiStaffLeave } from "@/api/staffLeave";
import { STAFF_LEAVE_LABEL, STAFF_LEAVE_VARIANT } from "@/features/subadmin/MyLeave";
import { toast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";

/** Admin / Founder review of admin-team leave (RM, Coordinator, Management, Admission). */
export default function StaffLeave() {
  const { data: leaves, loading, error, reload } = useApiData(() => listStaffLeave(), [] as ApiStaffLeave[]);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function review(leave: ApiStaffLeave, approve: boolean) {
    setBusy(`${leave.id}:${approve}`);
    try {
      await reviewStaffLeave(leave.id, approve, notes[leave.id]?.trim() || undefined);
      toast({ variant: "success", title: approve ? "Leave approved" : "Leave not approved", description: `${leave.staffName} has been emailed.` });
      reload();
    } catch (err) {
      toast({ variant: "error", title: "Couldn't save the decision", description: userMessage(err, "Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  const pending = leaves.filter((l) => l.status === "Pending");
  const rows = tab === "pending" ? pending : leaves;

  return (
    <div>
      <PageHeader eyebrow="People" title="Staff Leave" description="Leave applied for by the admin team — Relationship Managers, Coordinators, Management and Admission." />

      <div className="mb-4 inline-flex rounded-lg border p-0.5">
        <Button size="sm" variant={tab === "pending" ? "secondary" : "ghost"} onClick={() => setTab("pending")}>
          Awaiting approval ({pending.length})
        </Button>
        <Button size="sm" variant={tab === "all" ? "secondary" : "ghost"} onClick={() => setTab("all")}>
          All
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error && apiEnabled() ? (
        <EmptyState icon={CalendarOff} title="Couldn't load staff leave" description={error} action={<Button variant="outline" onClick={reload}>Try again</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarOff} title={tab === "pending" ? "Nothing awaiting approval" : "No staff leave yet"} />
      ) : (
        <Card className="divide-y overflow-hidden p-0">
          {rows.map((l) => (
            <div key={l.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{l.staffName}</p>
                  {l.roleName && <span className="text-sm text-muted-foreground">· {l.roleName}</span>}
                  <Badge variant={STAFF_LEAVE_VARIANT[l.status]}>{STAFF_LEAVE_LABEL[l.status]}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-foreground">
                  {formatLeaveDates(l.startDate, l.endDate)} · {l.days} day{l.days === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{l.reason}</p>
                {l.reviewedByName && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Reviewed by {l.reviewedByName}
                    {l.reviewNote ? ` — ${l.reviewNote}` : ""}
                  </p>
                )}
              </div>
              {l.status === "Pending" && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    className="h-9 sm:w-56"
                    placeholder="Note (optional)"
                    maxLength={500}
                    value={notes[l.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [l.id]: e.target.value }))}
                  />
                  <Button size="sm" variant="outline" className="text-destructive" disabled={!!busy} onClick={() => void review(l, false)}>
                    {busy === `${l.id}:false` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Reject
                  </Button>
                  <Button size="sm" disabled={!!busy} onClick={() => void review(l, true)}>
                    {busy === `${l.id}:true` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
