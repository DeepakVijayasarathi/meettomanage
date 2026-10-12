import { useEffect, useState } from "react";
import { Loader2, PlayCircle, Trash2, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import {
  deleteMyMeetingRoomRecording,
  listMyMeetingRoomRecordings,
  type PersonalRoomRecording,
} from "@/api/account";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTimeLabel, safeExternalUrl } from "@/lib/utils";
import { utcIsoToLocalDateTime } from "@/lib/datetime";

/**
 * The member's own Personal Meeting Room recordings — the per-owner counterpart of
 * RecordingsDialog (which is per class session). Only the room's owner ever sees these;
 * deleting one unregisters the row, the underlying file is untouched.
 */
export function PersonalMeetingRecordingsDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<PersonalRoomRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyMeetingRoomRecordings()
      .then((items) => !cancelled && setRecordings(items))
      .catch(() => !cancelled && setError("Couldn't load your recordings."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(recordingId: string) {
    setDeletingId(recordingId);
    try {
      await deleteMyMeetingRoomRecording(recordingId);
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>My meeting recordings</DialogTitle>
          <DialogDescription>
            Recordings you started in your personal meeting room. Only you can see these.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-warning/10 p-3 text-sm font-medium text-warning-foreground">{error}</p>
        ) : recordings.length === 0 ? (
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            No recordings yet. Start your meeting, press the Recording button in the meeting toolbar, and it'll
            appear here a few minutes after the meeting ends.
          </p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {recordings.map((r) => {
              // Same rule as RecordingsDialog: never turn a stored link into a playable src
              // unless it is http(s).
              const safeUrl = safeExternalUrl(r.storageUrl);
              const local = utcIsoToLocalDateTime(r.createdAtUtc);
              const isPlaying = playingId === r.id;
              return (
                <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {safeUrl
                        ? `${formatDate(local.date, "short")} · ${formatTimeLabel(local.time)}`
                        : "Blocked link (not a http/https address)"}
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
                    </div>
                  </div>
                  {r.durationSeconds ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{Math.max(1, Math.round(r.durationSeconds / 60))} min</p>
                  ) : null}
                  {isPlaying && safeUrl && <VideoPlayer src={safeUrl} autoPlay className="mt-3" />}
                </div>
              );
            })}
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
        description="This can't be undone."
        confirmLabel="Delete recording"
        destructive
        onConfirm={() => {
          if (confirmDeleteId) return handleDelete(confirmDeleteId);
        }}
      />
    </Dialog>
  );
}
