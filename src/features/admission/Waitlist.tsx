import { useEffect, useMemo, useState } from "react";
import { ListOrdered, Plus, Sparkles, UserCheck, Users, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, apiFetch, userMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { listBatches, listUnassignedStudents, type ApiUnassignedChild } from "@/api/batches";

interface WaitlistEntry {
  id: string; batchId: string; batchName: string; courseName: string; childId: string; childName: string;
  parentName: string | null; parentEmail: string | null; parentPhone: string | null;
  status: "Waiting" | "Offered"; position: number; seatsFree: number; note: string | null; createdAtUtc: string; offeredAtUtc: string | null;
}

const listWaitlist = () => apiFetch<WaitlistEntry[]>("/api/waitlist");

/** Queues for full batches: seats that open are offered in order, and staff enrol from here. Admission and Admin. */
export default function Waitlist() {
  const { toast } = useToast();
  const entries = useApiData(listWaitlist, []);
  const batches = useApiData(() => listBatches(), []);
  const [adding, setAdding] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [candidates, setCandidates] = useState<ApiUnassignedChild[]>([]);
  const [childId, setChildId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, WaitlistEntry[]>();
    for (const e of entries.data) map.set(e.batchId, [...(map.get(e.batchId) ?? []), e]);
    return [...map.values()];
  }, [entries.data]);
  const offered = entries.data.filter((e) => e.status === "Offered").length;
  const fullBatches = batches.data.filter((b) => b.status === "Active");

  useEffect(() => {
    setChildId("");
    if (!batchId) return setCandidates([]);
    listUnassignedStudents(batchId).then(setCandidates).catch(() => setCandidates([]));
  }, [batchId]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ variant: "success", title: ok });
      entries.reload();
      batches.reload();
    } catch (e) {
      toast({ variant: "error", title: "Couldn't update", description: userMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  };

  const add = () => act(async () => {
    await apiFetch("/api/waitlist", { method: "POST", body: JSON.stringify({ batchId, childId, note: note.trim() || null }) });
    setAdding(false);
    setNote("");
  }, "Added to the waitlist");

  return (
    <div>
      <PageHeader
        eyebrow="Admissions"
        title="Batch Waitlist"
        description="When a batch is full, queue students here. As seats open, the next family in line is told automatically and you confirm the place."
        actions={<>
          <Button variant="outline" disabled={busy} onClick={() => void act(() => apiFetch("/api/waitlist/offer-open-seats", { method: "POST" }), "Checked for open seats")}><Sparkles className="mr-1.5 h-4 w-4" />Offer open seats</Button>
          <Button onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" />Add to waitlist</Button>
        </>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Students waiting" value={String(entries.data.length)} icon={Users} tone="primary" />
        <KpiCard label="Seat offered" value={String(offered)} detail="ready to enrol" icon={UserCheck} tone={offered ? "warning" : "neutral"} />
        <KpiCard label="Batches with a queue" value={String(groups.length)} icon={ListOrdered} tone="neutral" />
      </div>

      {apiEnabled() && entries.error && <p className="mb-4 text-sm text-destructive">{entries.error}</p>}
      {groups.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <ListOrdered className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Nobody is waiting</p>
          <p className="text-sm text-muted-foreground">Add a student when the batch they want is full.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((rows) => (
            <Card key={rows[0].batchId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">{rows[0].batchName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{rows[0].courseName}</p>
                </div>
                <Badge variant={rows[0].seatsFree > 0 ? "secondary" : "outline"}>{rows[0].seatsFree > 0 ? `${rows[0].seatsFree} seat${rows[0].seatsFree === 1 ? "" : "s"} free` : "Full"}</Badge>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {rows.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">{e.position}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{e.childName} {e.status === "Offered" && <Badge className="ml-1">Seat offered</Badge>}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[e.parentName, e.parentPhone, e.parentEmail].filter(Boolean).join(" · ")} · waiting since {formatDate(e.createdAtUtc)}{e.note ? ` · ${e.note}` : ""}
                      </p>
                    </div>
                    <Button size="sm" disabled={busy || e.seatsFree === 0} title={e.seatsFree === 0 ? "No free seat yet" : undefined} onClick={() => void act(() => apiFetch(`/api/waitlist/${e.id}/enroll`, { method: "POST" }), `${e.childName} enrolled`)}>Enrol</Button>
                    <Button size="sm" variant="ghost" aria-label={`Remove ${e.childName}`} disabled={busy} onClick={() => void act(() => apiFetch(`/api/waitlist/${e.id}`, { method: "DELETE" }), "Removed from the waitlist")}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to waitlist</DialogTitle>
            <DialogDescription>The student keeps their place in line until a seat opens.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger><SelectValue placeholder="Choose a batch" /></SelectTrigger>
                <SelectContent>{fullBatches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} · {b.courseName} ({b.enrolledCount}/{b.capacity})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Student</Label>
              <Select value={childId} onValueChange={setChildId} disabled={!batchId}>
                <SelectTrigger><SelectValue placeholder={batchId ? "Choose a student" : "Choose a batch first"} /></SelectTrigger>
                <SelectContent>{candidates.map((c) => <SelectItem key={c.childId} value={c.childId}>{c.childName} · {c.parentName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wl-note">Note (optional)</Label>
              <Input id="wl-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Prefers weekend slots" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={() => void add()} disabled={busy || !batchId || !childId}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
