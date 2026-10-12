import { useCallback, useEffect, useState } from "react";
import { PlayCircle, Trash2, Video } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useCanDownloadRecordings } from "@/lib/recordingAccess";
import { useToast } from "@/hooks/use-toast";
import { userMessage } from "@/lib/api";
import { deletePersonalRoomRecording, listAllPersonalRoomRecordings } from "@/api/sessions";
import type { PersonalRoomRecording } from "@/api/account";
import { formatDate, formatTimeLabel, safeExternalUrl } from "@/lib/utils";
import { utcIsoToLocalDateTime } from "@/lib/datetime";

const PAGE_SIZE = 24;

/**
 * Admin-only tab of the Recordings page: every member's Personal Meeting Room recordings,
 * newest first, with whose room each was made in. Owners see only their own (the Recordings
 * button next to "My meeting link"); Admin can watch or remove any of them here.
 */
export function PersonalMeetingRecordingsPanel() {
  const { toast } = useToast();
  const canDownload = useCanDownloadRecordings();
  const [items, setItems] = useState<PersonalRoomRecording[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PersonalRoomRecording | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PersonalRoomRecording | null>(null);

  const load = useCallback((targetPage: number, replace: boolean) => {
    let cancelled = false;
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    listAllPersonalRoomRecordings(targetPage, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
        setTotalCount(result.totalCount);
        setPage(result.page);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(userMessage(err, "Could not load personal meeting recordings."));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(1, true), [load]);

  async function handleDelete(item: PersonalRoomRecording) {
    try {
      await deletePersonalRoomRecording(item.id);
      setItems((prev) => prev.filter((e) => e.id !== item.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (preview?.id === item.id) setPreview(null);
      toast({ variant: "success", title: "Recording deleted" });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't delete the recording", description: "Please try again." });
      throw err;
    }
  }

  const previewUrl = preview ? safeExternalUrl(preview.storageUrl) : null;

  return (
    <div>
      {error && (
        <InlineAlert variant="warning" className="mt-4">
          {error}
        </InlineAlert>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading recordings…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No personal meeting recordings yet"
          description="Recordings made in anyone's personal meeting room appear here a few minutes after the meeting ends."
          className="mt-6"
        />
      ) : (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            {items.length} of {totalCount}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const local = utcIsoToLocalDateTime(item.createdAtUtc);
              return (
                <Card key={item.id} className="flex flex-col p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Video className="h-5 w-5" />
                  </span>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">{item.ownerName}'s personal meeting</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(local.date, "short")} · {formatTimeLabel(local.time)}
                    {item.durationSeconds ? ` · ${Math.max(1, Math.round(item.durationSeconds / 60))} min` : ""}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setPreview(item)}>
                      <PlayCircle className="h-3.5 w-3.5" /> Watch
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Delete this recording"
                      aria-label="Delete this recording"
                      onClick={() => setConfirmDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          {items.length < totalCount && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" disabled={loadingMore} onClick={() => load(page + 1, false)}>
                {loadingMore ? "Loading…" : `Load more (${totalCount - items.length} left)`}
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.ownerName}'s personal meeting</DialogTitle>
                <DialogDescription>Recorded {formatDate(utcIsoToLocalDateTime(preview.createdAtUtc).date, "long")}</DialogDescription>
              </DialogHeader>
              {previewUrl ? (
                <VideoPlayer src={previewUrl} downloadable={canDownload} />
              ) : (
                <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">This recording's link can't be played.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete this recording?"
        description="This can't be undone. Its owner will no longer see it either."
        confirmLabel="Delete recording"
        destructive
        onConfirm={() => {
          if (confirmDelete) return handleDelete(confirmDelete);
        }}
      />
    </div>
  );
}
