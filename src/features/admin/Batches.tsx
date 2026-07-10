import { useMemo, useState } from "react";
import { CalendarDays, Layers, Moon, Rocket } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BATCHES } from "@/data/batches";
import { getCourseById } from "@/data/courses";
import { getTeacherById, TEACHERS } from "@/data/users";
import type { Batch, BatchStatus } from "@/types";
import { CHART_PALETTE } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listBatches, listTeacherOptions, toFrontendBatch, updateBatch, type ApiBatch, type DisplayBatch } from "@/api/batches";

const STATUS_META: Record<BatchStatus, { label: string; icon: typeof Layers; empty: string }> = {
  active: { label: "Active", icon: Layers, empty: "No active batches at the moment." },
  dormant: { label: "Dormant", icon: Moon, empty: "No dormant batches right now." },
  upcoming: { label: "Upcoming", icon: Rocket, empty: "No upcoming batches scheduled." },
};

function BatchCard({ batch, index, onOpen }: { batch: DisplayBatch; index: number; onOpen: (b: DisplayBatch) => void }) {
  const courseName = getCourseById(batch.courseId)?.name ?? batch.courseName;
  const teacherName = getTeacherById(batch.teacherId)?.name ?? batch.teacherName;
  const color = CHART_PALETTE[index % CHART_PALETTE.length];
  const pct = Math.round((batch.enrolled / Math.max(batch.capacity, 1)) * 100);

  return (
    <Card className="flex flex-col p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1A`, color }}>
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">{batch.name}</p>
            <p className="text-xs text-muted-foreground">{courseName ?? "—"}</p>
          </div>
        </div>
        <Badge variant="outline" className="uppercase">{batch.type}</Badge>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Capacity</span>
          <span className="font-semibold text-foreground">
            {batch.enrolled} / {batch.capacity}
          </span>
        </div>
        <Progress value={pct} className="h-2" indicatorClassName={pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-success"} />
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        {batch.schedule}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
        Teacher: <span className="font-medium text-foreground">{teacherName ?? "Unassigned"}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">Started {formatDate(batch.startDate)}</span>
        <Button variant="outline" size="sm" onClick={() => onOpen(batch)}>
          Manage
        </Button>
      </div>
    </Card>
  );
}

export default function AdminBatches() {
  const { data: batchData, reload } = useApiData<{ raw: ApiBatch[]; mapped: DisplayBatch[] }>(
    async () => {
      const raw = await listBatches();
      return { raw, mapped: raw.map(toFrontendBatch) };
    },
    { raw: [], mapped: BATCHES }
  );
  const { data: teacherOptions } = useApiData(() => listTeacherOptions(), []);

  const [detail, setDetail] = useState<DisplayBatch | null>(null);
  const [teacherAssignment, setTeacherAssignment] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<BatchStatus, DisplayBatch[]> = { active: [], dormant: [], upcoming: [] };
    batchData.mapped.forEach((b) => map[b.status].push(b));
    return map;
  }, [batchData]);

  function openDetail(b: DisplayBatch) {
    setDetail(b);
    setTeacherAssignment(b.teacherId);
    setSaved(false);
    setSaveError(null);
  }

  async function saveDetail() {
    if (!detail) return;

    if (!apiEnabled()) {
      setSaved(true);
      setTimeout(() => setDetail(null), 700);
      return;
    }

    const raw = batchData.raw.find((b) => b.id === detail.id);
    if (!raw) return;

    try {
      await updateBatch(raw, teacherAssignment);
      setSaved(true);
      reload();
      setTimeout(() => setDetail(null), 700);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the batch.");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Batches"
        description="View and manage active, dormant and upcoming batches — capacity, schedule and teacher assignment."
      />

      <Tabs defaultValue="active">
        <TabsList>
          {(Object.keys(STATUS_META) as BatchStatus[]).map((status) => (
            <TabsTrigger key={status} value={status} className="gap-1.5">
              {STATUS_META[status].label}
              <span className="rounded-full bg-background/60 px-1.5 text-[10px] font-bold">{grouped[status].length}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(STATUS_META) as BatchStatus[]).map((status) => (
          <TabsContent key={status} value={status}>
            {grouped[status].length === 0 ? (
              <EmptyState icon={STATUS_META[status].icon} title={`No ${STATUS_META[status].label.toLowerCase()} batches`} description={STATUS_META[status].empty} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[status].map((b, i) => (
                  <BatchCard key={b.id} batch={b} index={i} onOpen={openDetail} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>{getCourseById(detail.courseId)?.name ?? detail.courseName} · {detail.schedule}</DialogDescription>
              </DialogHeader>

              <Card className="bg-muted/30 p-4">
                <CardContent className="grid grid-cols-2 gap-4 p-0 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrolled</p>
                    <p className="mt-1 font-semibold text-foreground">{detail.enrolled} / {detail.capacity}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
                    <p className="mt-1 font-semibold text-foreground">{detail.duration} min</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Date</p>
                    <p className="mt-1 font-semibold text-foreground">{formatDate(detail.startDate, "long")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-1 font-semibold capitalize text-foreground">{detail.status}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Assign teacher</Label>
                  <Select value={teacherAssignment} onValueChange={setTeacherAssignment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {apiEnabled() && teacherOptions.length > 0
                        ? teacherOptions.map((t) => (
                            <SelectItem key={t.teacherProfileId} value={t.teacherProfileId}>
                              {t.fullName} {t.department ? `· ${t.department}` : ""}
                            </SelectItem>
                          ))
                        : TEACHERS.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} · {t.department}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Assign students</Label>
                  <Select defaultValue="">
                    <SelectTrigger>
                      <SelectValue placeholder="Search and add a student…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        No unassigned students available
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {detail.enrolled} of {detail.capacity} seats filled. {detail.capacity - detail.enrolled} seat
                    {detail.capacity - detail.enrolled === 1 ? "" : "s"} remaining.
                  </p>
                </div>
              </div>

              {saveError && <p className="text-sm font-medium text-red-600">{saveError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
                <Button onClick={saveDetail}>{saved ? "Saved!" : "Save Changes"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
