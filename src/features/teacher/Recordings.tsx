import { useEffect, useMemo, useState } from "react";
import { PlayCircle, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiEnabled } from "@/lib/api";
import { listMySessions, listRecordings, toFrontendSession, type ApiSessionRecording } from "@/api/sessions";
import { getSessionsForTeacher } from "@/data/sessions";
import { formatDate } from "@/lib/utils";
import type { ClassSession } from "@/types";

/** One recording paired with the class it belongs to — the unit this page renders as a card. */
interface RecordingEntry {
  recording: ApiSessionRecording;
  session: ClassSession;
}

/**
 * A teacher's own recordings, one page across every class — replaces having to open each
 * completed session's Recordings dialog on My Classes one at a time just to check whether
 * (or watch what) got recorded. Manual "paste a link" registration still lives on that
 * per-session dialog (RecordingsDialog); this page is read-only browsing.
 */
export default function TeacherRecordings() {
  const usingApi = apiEnabled();

  const [entries, setEntries] = useState<RecordingEntry[]>([]);
  const [loading, setLoading] = useState(usingApi);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RecordingEntry | null>(null);

  useEffect(() => {
    if (!usingApi) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    listMySessions()
      .then(async (apiSessions) => {
        const completed = apiSessions.map(toFrontendSession).filter((s) => s.status === "completed");

        // One recordings lookup per completed class — mirrors ParentRecordings' approach;
        // a class with nothing registered just contributes nothing rather than an error.
        const results = await Promise.all(
          completed.map(async (session) => {
            try {
              const recs = await listRecordings(session.id);
              return recs.map((recording) => ({ recording, session }));
            } catch {
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
  }, [usingApi]);

  const demoEntries = useMemo<RecordingEntry[]>(() => {
    if (usingApi) return [];
    return getSessionsForTeacher("t-1")
      .filter((s) => s.recordingAvailable)
      .map((session) => ({
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
  }, [usingApi]);

  const rows = usingApi ? entries : demoEntries;

  return (
    <div>
      <PageHeader eyebrow="Teaching" title="Recordings" description="Every recording from your own classes, newest first." />

      {usingApi && error && (
        <InlineAlert variant="warning" className="mt-4">
          Could not load recordings ({error}).
        </InlineAlert>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading recordings…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No recordings yet"
          description="Recordings appear here once a class you taught finishes and one was registered for it."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((entry) => (
            <Card key={entry.recording.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Video className="h-5 w-5" />
                </span>
                {entry.recording.expiresAtUtc && (
                  <Badge variant="muted">Visible to parents until {formatDate(entry.recording.expiresAtUtc.slice(0, 10), "short")}</Badge>
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">{entry.session.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(entry.session.date, "short")}
                {entry.recording.durationSeconds ? ` · ${Math.round(entry.recording.durationSeconds / 60)} min` : ""}
              </p>
              <div className="mt-4">
                <Button size="sm" className="w-full" onClick={() => setPreview(entry)}>
                  <PlayCircle className="h-3.5 w-3.5" /> Watch
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.session.title}</DialogTitle>
                <DialogDescription>Recorded {formatDate(preview.session.date, "long")}</DialogDescription>
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
