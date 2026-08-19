import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, PlayCircle, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MultiChildSwitcher } from "@/components/MultiChildSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/state/session";
import { getChildById } from "@/data/children";
import { SESSIONS } from "@/data/sessions";
import { apiEnabled } from "@/lib/api";
import { getParentSchedule, getSessionRecordings } from "@/api/parentPortal";
import { toFrontendSession, type ApiSessionRecording } from "@/api/sessions";
import { formatDate } from "@/lib/utils";
import { expiryLabelFor } from "./utils";
import type { ClassSession } from "@/types";

/** One recording paired with the session it belongs to — the unit this page renders as a card. */
interface RecordingEntry {
  recording: ApiSessionRecording;
  session: ClassSession;
}

export default function ParentRecordings() {
  const { activeChildId, enrolledChildIds, children: sessionChildren } = useSession();
  const usingApi = apiEnabled();
  const mockChild = getChildById(activeChildId);
  const sessionChild = sessionChildren.find((c) => c.id === activeChildId) ?? sessionChildren[0];
  const child = usingApi
    ? sessionChild
      ? { id: sessionChild.id, name: sessionChild.name }
      : undefined
    : mockChild
      ? { id: mockChild.id, name: mockChild.name }
      : undefined;
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

    // Recordings expire 15 days after class — a 45-day lookback comfortably covers every
    // session that could still have a live (non-expired) recording, with slack for delayed
    // Jibri uploads, without pulling in months of already-expired history.
    const fromUtc = new Date(Date.now() - 45 * 86400_000).toISOString();
    const toUtc = new Date().toISOString();

    getParentSchedule(fromUtc, toUtc)
      .then(async (apiSessions) => {
        const completed = apiSessions
          .map(toFrontendSession)
          .filter((s) => s.status === "completed" && s.childIds.includes(child.id));

        // One recordings lookup per completed session — the backend already scopes each
        // call to this parent's own child and filters out expired rows, so whatever comes
        // back here is exactly what's watchable right now.
        const results = await Promise.all(
          completed.map(async (session) => {
            try {
              const recs = await getSessionRecordings(session.id);
              return recs.map((recording) => ({ recording, session }));
            } catch {
              // No recordings shared for this session (or it 404s the enrollment check) —
              // not an error worth surfacing per-session, just contributes nothing.
              return [];
            }
          })
        );

        if (cancelled) return;
        const flat = results
          .flat()
          .sort((a, b) => new Date(b.recording.createdAtUtc).getTime() - new Date(a.recording.createdAtUtc).getTime());
        setEntries(flat);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load recordings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [usingApi, child?.id]);

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
      <PageHeader title="Recordings" description="Every class recording your child can still watch — available for 15 days after class." />
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
        <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
          Could not load recordings ({error}).
        </p>
      )}

      {!child ? (
        <EmptyState icon={Video} title="No child selected" className="mt-6" />
      ) : loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading recordings…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No recordings yet"
          description="Recordings appear here once a class finishes and stay available for 15 days."
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
                <video controls className="aspect-video w-full rounded-xl bg-black" src={preview.recording.storageUrl} />
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
