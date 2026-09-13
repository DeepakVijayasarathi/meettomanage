import { useEffect, useMemo, useState } from "react";
import { PlayCircle, Trash2, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled } from "@/lib/api";
import { deleteRecording, listRecordings, listSessions, toFrontendSession, type ApiSessionRecording } from "@/api/sessions";
import { SESSIONS } from "@/data/sessions";
import { formatDate } from "@/lib/utils";
import type { ClassSession } from "@/types";

/** One recording paired with the class (and teacher) it belongs to — the unit this page renders as a card. */
interface RecordingEntry {
  recording: ApiSessionRecording;
  session: ClassSession;
}

/**
 * Every registered recording across the whole institution, one page — the admin-side
 * counterpart to TeacherRecordings.tsx (that one is scoped to "my classes"; this one has no
 * such scope, since Admin needs to find and, when necessary, remove any class's recording,
 * not just their own). Deleting was previously only reachable by opening the right session's
 * row on Sessions one at a time via RecordingsDialog — this page reuses the same delete
 * endpoint (Admin-only server-side) directly, so a stray or wrong recording can be found and
 * removed without knowing in advance which teacher/date it belongs to.
 */
export default function AdminRecordings() {
  const usingApi = apiEnabled();
  const { toast } = useToast();

  const [entries, setEntries] = useState<RecordingEntry[]>([]);
  const [loading, setLoading] = useState(usingApi);
  const [error, setError] = useState<string | null>(null);
  // Count of completed classes whose recordings lookup actually failed (network/permission/
  // server error) — distinct from a class that legitimately has none registered. The list
  // endpoint returns 200 + [] for "none registered", so anything landing in the catch below
  // is a real failure and shouldn't be silently indistinguishable from an empty result.
  const [partialErrorCount, setPartialErrorCount] = useState(0);
  const [preview, setPreview] = useState<RecordingEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<RecordingEntry | null>(null);

  function load() {
    if (!usingApi) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPartialErrorCount(0);

    listSessions()
      .then(async (apiSessions) => {
        const completed = apiSessions.map(toFrontendSession).filter((s) => s.status === "completed");

        const results = await Promise.all(
          completed.map(async (session) => {
            try {
              const recs = await listRecordings(session.id);
              return { recs: recs.map((recording) => ({ recording, session })), failed: false };
            } catch {
              return { recs: [] as RecordingEntry[], failed: true };
            }
          })
        );

        if (cancelled) return;
        const flat = results
          .flatMap((r) => r.recs)
          .sort((a, b) => new Date(b.recording.createdAtUtc).getTime() - new Date(a.recording.createdAtUtc).getTime());
        setEntries(flat);
        setPartialErrorCount(results.filter((r) => r.failed).length);
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
  }

  useEffect(load, [usingApi]);

  const demoEntries = useMemo<RecordingEntry[]>(() => {
    if (usingApi) return [];
    return SESSIONS.filter((s) => s.recordingAvailable).map((session) => ({
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

  async function handleDelete(entry: RecordingEntry) {
    setDeletingId(entry.recording.id);
    try {
      await deleteRecording(entry.session.id, entry.recording.id);
      setEntries((prev) => prev.filter((e) => e.recording.id !== entry.recording.id));
      if (preview?.recording.id === entry.recording.id) setPreview(null);
      toast({ variant: "success", title: "Recording deleted" });
    } catch {
      toast({ variant: "error", title: "Couldn't delete the recording", description: "Please try again." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Academics"
        title="Recordings"
        description="Every registered recording across every teacher and class, newest first."
      />

      {usingApi && error && (
        <InlineAlert variant="warning" className="mt-4">
          Could not load recordings ({error}).
        </InlineAlert>
      )}

      {usingApi && !error && partialErrorCount > 0 && (
        <InlineAlert variant="warning" className="mt-4">
          Couldn't load recordings for {partialErrorCount} classes — they may be missing from the list below.
        </InlineAlert>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading recordings…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No recordings yet"
          description="Recordings appear here once a class finishes and one was registered for it."
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
              <p className="mt-1 text-xs text-muted-foreground">{entry.session.teacherName || "Unassigned teacher"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(entry.session.date, "short")}
                {entry.recording.durationSeconds ? ` · ${Math.round(entry.recording.durationSeconds / 60)} min` : ""}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" className="flex-1" onClick={() => setPreview(entry)}>
                  <PlayCircle className="h-3.5 w-3.5" /> Watch
                </Button>
                {usingApi && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deletingId === entry.recording.id}
                    title="Delete this recording"
                    aria-label="Delete this recording"
                    onClick={() => setConfirmDeleteEntry(entry)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
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
                <DialogDescription>
                  {preview.session.teacherName ? `${preview.session.teacherName} · ` : ""}
                  Recorded {formatDate(preview.session.date, "long")}
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

      <ConfirmDialog
        open={confirmDeleteEntry !== null}
        onOpenChange={(open) => !open && setConfirmDeleteEntry(null)}
        title="Delete this recording?"
        description="This can't be undone. Parents currently viewing it will lose access immediately."
        confirmLabel="Delete recording"
        destructive
        onConfirm={() => {
          if (confirmDeleteEntry) return handleDelete(confirmDeleteEntry);
        }}
      />
    </div>
  );
}
