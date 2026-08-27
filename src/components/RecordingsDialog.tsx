import { useEffect, useState } from "react";
import { Loader2, PlayCircle, Plus, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listRecordings, registerRecording, type ApiSessionRecording } from "@/api/sessions";
import { apiEnabled } from "@/lib/api";
import { formatDate, safeExternalUrl } from "@/lib/utils";
import type { ClassSession } from "@/types";

function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Recordings management for one session — Admin and Teacher share this exact dialog (same
 * `GET/POST /api/sessions/{id}/recordings` routes, both roles authorized). Auto-recording
 * (Jitsi/Jibri) posts here automatically when configured; the manual "paste a link" form
 * below is the fallback for a class recorded outside the automated pipeline.
 */
export function RecordingsDialog({ session, onClose }: { session: ClassSession; onClose: () => void }) {
  const [recordings, setRecordings] = useState<ApiSessionRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const canManage = apiEnabled() && GUID_RE.test(session.id);

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

  async function handleAdd() {
    if (!url.trim()) return;
    setError(null);
    // Whatever is stored here is later rendered as a link for other staff, so refuse
    // anything that isn't a plain http(s) address rather than storing it and blocking
    // it only at render time.
    const safeUrl = safeExternalUrl(url.trim());
    if (!safeUrl) {
      setError("Enter a full http:// or https:// link to the recording.");
      return;
    }
    setSaving(true);
    try {
      const durationSeconds = minutes.trim() ? Math.round(Number(minutes) * 60) : undefined;
      await registerRecording(session.id, safeUrl, durationSeconds);
      const items = await listRecordings(session.id);
      setRecordings(items);
      setUrl("");
      setMinutes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't register that recording.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recordings — {session.title}</DialogTitle>
          <DialogDescription>
            {formatDate(session.date, "long")} · {formatTimeLabel(session.startTime)}. Parents can view a
            recording for 15 days after it's registered here.
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
            ) : recordings.length === 0 ? (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                No recording registered yet. If this class wasn't auto-recorded, paste the link below.
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
                      {safeUrl && (
                        <Button
                          size="sm"
                          variant={isPlaying ? "outline" : "default"}
                          onClick={() => setPlayingId(isPlaying ? null : r.id)}
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> {isPlaying ? "Hide" : "Play"}
                        </Button>
                      )}
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

            <div className="grid gap-3 rounded-lg border border-dashed border-border p-3">
              <div className="grid gap-1.5">
                <Label htmlFor="rec-url">Recording URL</Label>
                <Input
                  id="rec-url"
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rec-duration">Duration (minutes, optional)</Label>
                <Input
                  id="rec-duration"
                  type="number"
                  min={0}
                  placeholder="45"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-32"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button size="sm" className="self-start" disabled={!url.trim() || saving} onClick={handleAdd}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Register recording
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
