import { useEffect, useState } from "react";
import { Loader2, PlayCircle, Trash2, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteRecording, listRecordings, type ApiSessionRecording } from "@/api/sessions";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTimeLabel, safeExternalUrl } from "@/lib/utils";
import type { ClassSession } from "@/types";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Recordings viewer for one session — Admin and Teacher share this exact dialog (same
 * `GET /api/sessions/{id}/recordings` route, both roles authorized). Recordings are
 * auto-registered by the Jitsi/Jibri pipeline, no manual "paste a link" path anymore.
 * Deleting one is Admin-only — it unregisters the row, the underlying file is untouched.
 */
export function RecordingsDialog({ session, onClose }: { session: ClassSession; onClose: () => void }) {
  const { role } = useSession();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<ApiSessionRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canManage = apiEnabled() && GUID_RE.test(session.id);
  const canDelete = role === "admin";

  async function handleDelete(recordingId: string) {
    setDeletingId(recordingId);
    try {
      await deleteRecording(session.id, recordingId);
      setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
      if (playingId === recordingId) setPlayingId(null);
      toast({ variant: "success", title: "Recording deleted" });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't delete the recording", description: "Please try again." });
      throw err;
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listRecordings(session.id)
      .then((items) => !cancelled && setRecordings(items))
      .catch(() => !cancelled && setError("Couldn't load existing recordings."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [session.id, canManage]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recordings — {session.title}</DialogTitle>
          <DialogDescription>
            {formatDate(session.date, "long")} · {formatTimeLabel(session.startTime)}. Parents can view a
            recording for 15 days after it's ready.
          </DialogDescription>
        </DialogHeader>

        {!canManage ? (
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            Recording management needs a real, connected session — not available in demo mode.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : error ? (
              <p className="rounded-lg bg-warning/10 p-3 text-sm font-medium text-warning-foreground">{error}</p>
            ) : recordings.length === 0 ? (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                No recording yet. It'll appear here automatically once the class finishes processing.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recordings.map((r, i) => {
                  // Registered links are free text (pasted here, or handed over by the Jitsi
                  // deployment) — never turn one into a playable src unless it is http(s).
                  // The raw link is never shown as label text either way — a pasted storage
                  // URL is long, ugly and technical, exactly the kind of thing that used to
                  // force this whole dialog into horizontal scroll; a short, friendly label
                  // plus an actual inline player (same pattern as Parent → Recordings) says
                  // the same thing without any of that risk.
                  const safeUrl = safeExternalUrl(r.storageUrl);
                  const label = recordings.length > 1 ? `Recording ${i + 1}` : "Recording";
                  const isPlaying = playingId === r.id;
                  return (
                  <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {safeUrl ? label : "Blocked link (not a http/https address)"}
                      </p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {safeUrl && (
                          <Button
                            size="sm"
                            variant={isPlaying ? "outline" : "default"}
                            onClick={() => setPlayingId(isPlaying ? null : r.id)}
                          >
                            <PlayCircle className="h-3.5 w-3.5" /> {isPlaying ? "Hide" : "Play"}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={deletingId === r.id}
                            title="Delete this recording"
                            aria-label="Delete this recording"
                            onClick={() => setConfirmDeleteId(r.id)}
                          >
                            {deletingId === r.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.expiresAtUtc
                        ? `Visible to parents until ${formatDate(r.expiresAtUtc.slice(0, 10), "long")}`
                        : "Registered"}
                    </p>
                    {isPlaying && safeUrl && (
                      <video controls autoPlay className="mt-3 aspect-video w-full rounded-xl bg-black" src={safeUrl} />
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="Delete this recording?"
        description="This can't be undone. Parents currently viewing it will lose access immediately."
        confirmLabel="Delete recording"
        destructive
        onConfirm={() => {
          if (confirmDeleteId) return handleDelete(confirmDeleteId);
        }}
      />
    </Dialog>
  );
}
