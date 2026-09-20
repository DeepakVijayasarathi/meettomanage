import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayCircle, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/VideoPlayer";
import { apiEnabled, userMessage } from "@/lib/api";
import { listMyRecordings, type ApiRecordingListItem } from "@/api/sessions";
import { getSessionsForTeacher } from "@/data/sessions";
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
 * A teacher's own recordings, one page across every class — replaces having to open each
 * completed session's Recordings dialog on My Classes one at a time just to check whether
 * (or watch what) got recorded. Manual "paste a link" registration still lives on that
 * per-session dialog (RecordingsDialog); this page is read-only browsing.
 *
 * Paged, server-driven load (listMyRecordings) — this used to fetch every one of the
 * teacher's completed sessions then call listRecordings once per session, the identical N+1
 * pattern confirmed live as the actual cause of the admin-wide Recordings page's "Loading
 * recordings..." never finishing (AdminRecordings.tsx). Only a matter of time before the
 * same slowdown showed up here too as any one teacher's own history grew.
 */
export default function TeacherRecordings() {
  const usingApi = apiEnabled();

  const [items, setItems] = useState<ApiRecordingListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(usingApi);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ApiRecordingListItem | null>(null);

  const load = useCallback((targetPage: number, replace: boolean) => {
    if (!usingApi) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    listMyRecordings(targetPage, PAGE_SIZE)
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
  }, [usingApi]);

  useEffect(() => load(1, true), [load]);

  const demoItems = useMemo<ApiRecordingListItem[]>(() => {
    if (usingApi) return [];
    return getSessionsForTeacher("t-1")
      .filter((s) => s.recordingAvailable)
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
  }, [usingApi]);

  const rows = usingApi ? items : demoItems;
  const hasMore = usingApi && items.length < totalCount;

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
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(local.date, "short")} · {formatTimeLabel(local.time)}
                    {item.durationSeconds ? ` · ${Math.round(item.durationSeconds / 60)} min` : ""}
                  </p>
                  <div className="mt-4">
                    <Button size="sm" className="w-full" onClick={() => setPreview(item)}>
                      <PlayCircle className="h-3.5 w-3.5" /> Watch
                    </Button>
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
                <DialogDescription>Recorded {formatDate(utcIsoToLocalDateTime(preview.scheduledStartAtUtc).date, "long")}</DialogDescription>
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
    </div>
  );
}
