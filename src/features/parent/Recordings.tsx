import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, PlayCircle, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { MultiChildSwitcher } from "@/components/MultiChildSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useSession } from "@/state/session";
import { getChildById } from "@/data/children";
import { SESSIONS } from "@/data/sessions";
import { apiEnabled, userMessage } from "@/lib/api";
import { listMyRecordings, type ApiParentRecording } from "@/api/parentPortal";
import type { ApiSessionRecording } from "@/api/sessions";
import { formatDate } from "@/lib/utils";
import { utcIsoToLocalDateTime } from "@/lib/datetime";
import { expiryLabelFor } from "./utils";

/** One recording paired with the (title, date) of the session it belongs to — the unit this
 *  page renders as a card. Deliberately not a full ClassSession: listMyRecordings' bulk
 *  endpoint doesn't carry (and this page doesn't need) anything beyond these two fields. */
interface RecordingEntry {
  recording: ApiSessionRecording;
  session: { title: string; date: string };
}

export default function ParentRecordings() {
  const { activeChildId, enrolledChildIds, children: sessionChildren } = useSession();
  const usingApi = apiEnabled();
  const mockChild = getChildById(activeChildId);
  const sessionChild = sessionChildren.find((c) => c.id === activeChildId) ?? sessionChildren[0];
  // Memoized so `child` keeps a stable identity across renders when the underlying id/name
  // haven't actually changed — otherwise this object-literal-per-render would make every
  // downstream hook that depends on `child` (the useEffect and useMemo below) recompute on
  // every unrelated render if `child` were added to their deps.
  const child = useMemo(
    () =>
      usingApi
        ? sessionChild
          ? { id: sessionChild.id, name: sessionChild.name }
          : undefined
        : mockChild
          ? { id: mockChild.id, name: mockChild.name }
          : undefined,
    [usingApi, sessionChild, mockChild]
  );
  const isEnrolled = usingApi ? (sessionChild?.enrollmentComplete ?? false) : mockChild ? enrolledChildIds.includes(mockChild.id) : false;

  const [entries, setEntries] = useState<RecordingEntry[]>([]);
  const [loading, setLoading] = useState(usingApi);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RecordingEntry | null>(null);

  useEffect(() => {
    if (!usingApi || !child) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    // One paged, server-filtered call for every recording across every batch this parent's
    // children are in — replaces fetching the schedule then calling getSessionRecordings once
    // per completed session (each doing its own enrollment + suspension check), the same N+1
    // shape already found and fixed on the admin and teacher Recordings pages.
    listMyRecordings()
      .then((recs: ApiParentRecording[]) => {
        if (cancelled) return;
        const flat = recs
          .filter((r) => r.childIds.includes(child.id))
          .map((r) => ({
            recording: {
              id: r.id,
              classSessionId: r.classSessionId,
              storageUrl: r.storageUrl,
              durationSeconds: r.durationSeconds,
              expiresAtUtc: r.expiresAtUtc,
              createdAtUtc: r.createdAtUtc,
            },
            session: {
              title: r.batchName ?? "Class session",
              date: utcIsoToLocalDateTime(r.scheduledStartAtUtc).date,
            },
          }))
          .sort((a, b) => new Date(b.recording.createdAtUtc).getTime() - new Date(a.recording.createdAtUtc).getTime());
        setEntries(flat);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(userMessage(err, "Could not load recordings."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [usingApi, child]);

  const demoEntries = useMemo<RecordingEntry[]>(() => {
    if (usingApi || !child) return [];
    return SESSIONS.filter((s) => s.recordingAvailable && s.childIds.includes(child.id)).map((session) => ({
      session,
      recording: {
        id: session.id,
        classSessionId: session.id,
        storageUrl: "",
        durationSeconds: session.duration * 60,
        expiresAtUtc: session.recordingExpiresOn ?? null,
        createdAtUtc: session.date,
      },
    }));
  }, [usingApi, child]);

  const rows = usingApi ? entries : demoEntries;

  return (
    <div>
      <PageHeader eyebrow="Learning" title="Recordings" description="Every class recording your child can still watch — available for 15 days after class." />
      <MultiChildSwitcher />

      {child && !isEnrolled && (
        <Card className="mt-4 border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
            <p className="text-sm text-foreground">
              Recordings unlock once {child.name.split(" ")[0]}'s enrollment is complete.{" "}
              <Link to={`/parent/enrollment?childId=${child.id}`} className="font-semibold text-primary hover:underline">
                Finish enrollment →
              </Link>
            </p>
          </div>
        </Card>
      )}

      {usingApi && error && (
        <InlineAlert variant="warning" className="mt-4">
          Could not load recordings ({error}).
        </InlineAlert>
      )}

      {!child ? (
        <EmptyState icon={Video} title="No child selected" className="mt-6" />
      ) : loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex flex-col p-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-4 h-8 w-full rounded-md" />
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No recordings yet"
          description="Recordings appear here a few minutes after a class finishes, not during it, and stay available for 15 days."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((entry) => {
            const info = expiryLabelFor(entry.recording.expiresAtUtc ?? undefined);
            return (
              <Card key={entry.recording.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Video className="h-5 w-5" />
                  </span>
                  <Badge variant={info.expired ? "muted" : "warning"}>{info.label}</Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">{entry.session.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(entry.session.date, "short")}
                  {entry.recording.durationSeconds ? ` · ${Math.round(entry.recording.durationSeconds / 60)} min` : ""}
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant={info.expired ? "outline" : "default"}
                    className="w-full"
                    disabled={info.expired}
                    onClick={() => setPreview(entry)}
                  >
                    <PlayCircle className="h-3.5 w-3.5" /> {info.expired ? "Expired" : "Watch"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.session.title}</DialogTitle>
                <DialogDescription>
                  Recorded {formatDate(preview.session.date, "long")} ·{" "}
                  {expiryLabelFor(preview.recording.expiresAtUtc ?? undefined).label}
                </DialogDescription>
              </DialogHeader>
              {preview.recording.storageUrl ? (
                <VideoPlayer src={preview.recording.storageUrl} />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl bg-muted/60">
                  <PlayCircle className="h-12 w-12 text-muted-foreground/60" />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
