import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayCircle, Trash2, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/state/session";
import { apiEnabled, userMessage } from "@/lib/api";
import { deleteRecording, listAllRecordings, type ApiRecordingListItem } from "@/api/sessions";
import { SESSIONS } from "@/data/sessions";
import { formatDate, formatTimeLabel } from "@/lib/utils";
import { utcIsoToLocalDateTime } from "@/lib/datetime";

const PAGE_SIZE = 24;

/** Same title fallback toFrontendSession (api/sessions.ts) already applies for a session
 *  without a batch — this page doesn't carry a demo child's name, so a nameless Demo just
 *  reads as "Demo class" rather than a blank title. */
function recordingTitle(item: ApiRecordingListItem): string {
  return item.batchName ?? (item.sessionType === "Demo" ? "Demo class" : "Class session");
}

/**
 * Every registered recording across the whole institution, one page — the admin-side
 * counterpart to TeacherRecordings.tsx (that one is scoped to "my classes"; this one has no
 * such scope, since Admin needs to find and, when necessary, remove any class's recording,
 * not just their own). Deleting was previously only reachable by opening the right session's
 * row on Sessions one at a time via RecordingsDialog — this page reuses the same delete
 * endpoint (Admin-only server-side) directly, so a stray or wrong recording can be found and
 * removed without knowing in advance which teacher/date it belongs to.
 *
 * Paged, server-driven load (listAllRecordings) — this used to fetch every completed session
 * then call listRecordings once per session, an N+1 pattern confirmed live as the actual
 * cause behind "Loading recordings..." never seeming to finish once there were enough
 * completed classes. The date filter is server-side too, for the same reason.
 */
export default function AdminRecordings() {
  const usingApi = apiEnabled();
  const { toast } = useToast();
  // Mounted under every Sub Admin-type portal too (Coordinator, IT Admin, ...) — those can
  // watch any recording, but only Admin may delete one (server-side rule as well).
  const { role } = useSession();
  const canDelete = role === "admin";

  const [items, setItems] = useState<ApiRecordingListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(usingApi);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ApiRecordingListItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<ApiRecordingListItem | null>(null);
  const [dateFilter, setDateFilter] = useState("");

  const load = useCallback((targetPage: number, replace: boolean) => {
    if (!usingApi) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    listAllRecordings(targetPage, PAGE_SIZE, dateFilter || undefined)
      .then((result) => {
        if (cancelled) return;
        setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
        setTotalCount(result.totalCount);
        setPage(result.page);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(userMessage(err, "Could not load recordings."));
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
  }, [usingApi, dateFilter]);

  // Refetches from page 1 whenever the date filter changes, not just on mount.
  useEffect(() => load(1, true), [load]);

  const demoItems = useMemo<ApiRecordingListItem[]>(() => {
    if (usingApi) return [];
    return SESSIONS.filter((s) => s.recordingAvailable)
      .filter((s) => !dateFilter || s.date === dateFilter)
      .map((session) => ({
        id: session.id,
        classSessionId: session.id,
        storageUrl: "",
        durationSeconds: session.duration * 60,
        expiresAtUtc: session.recordingExpiresOn ?? null,
        createdAtUtc: session.date,
        batchName: session.title,
        sessionType: session.type === "demo" ? ("Demo" as const) : ("Regular" as const),
        teacherName: session.teacherName,
        scheduledStartAtUtc: session.date,
      }));
  }, [usingApi, dateFilter]);

  const rows = usingApi ? items : demoItems;
  const hasMore = usingApi && items.length < totalCount;

  async function handleDelete(item: ApiRecordingListItem) {
    setDeletingId(item.id);
    try {
      await deleteRecording(item.classSessionId, item.id);
      setItems((prev) => prev.filter((e) => e.id !== item.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (preview?.id === item.id) setPreview(null);
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          type="date"
          aria-label="Filter by class date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-44"
        />
        {dateFilter && (
          <Button variant="ghost" size="sm" className="h-9 px-2 text-xs text-muted-foreground" onClick={() => setDateFilter("")}>
            Clear date
          </Button>
        )}
        {usingApi && totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {items.length} of {totalCount}
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading recordings…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Video}
          title={dateFilter ? "No recordings on this date" : "No recordings yet"}
          description={
            dateFilter
              ? "Try a different date, or clear the filter to see every recording."
              : "Recordings appear here once a class finishes and one was registered for it."
          }
          className="mt-6"
        />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((item) => {
              const local = utcIsoToLocalDateTime(item.scheduledStartAtUtc);
              return (
                <Card key={item.id} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Video className="h-5 w-5" />
                    </span>
                    {item.expiresAtUtc && (
                      <Badge variant="muted">Visible to parents until {formatDate(item.expiresAtUtc.slice(0, 10), "short")}</Badge>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">{recordingTitle(item)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.teacherName || "Unassigned teacher"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(local.date, "short")} · {formatTimeLabel(local.time)}
                    {item.durationSeconds ? ` · ${Math.round(item.durationSeconds / 60)} min` : ""}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setPreview(item)}>
                      <PlayCircle className="h-3.5 w-3.5" /> Watch
                    </Button>
                    {usingApi && canDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deletingId === item.id}
                        title="Delete this recording"
                        aria-label="Delete this recording"
                        onClick={() => setConfirmDeleteEntry(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
          {hasMore && (
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
                <DialogTitle>{recordingTitle(preview)}</DialogTitle>
                <DialogDescription>
                  {preview.teacherName ? `${preview.teacherName} · ` : ""}
                  Recorded {formatDate(utcIsoToLocalDateTime(preview.scheduledStartAtUtc).date, "long")}
                </DialogDescription>
              </DialogHeader>
              {preview.storageUrl ? (
                <VideoPlayer src={preview.storageUrl} />
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
