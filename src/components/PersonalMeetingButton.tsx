import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Check, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiEnabled } from "@/lib/api";
import { getMyMeetingRoomShortLink } from "@/api/account";

/**
 * The member's permanent personal meeting room (Zoom-style): one stable room,
 * startable any time of day. "Start" opens it embedded in-app (same JitsiLive
 * experience a real class session uses); "copy" puts the standalone join URL
 * on the clipboard, for sharing with someone outside the app entirely.
 */
export function PersonalMeetingButton() {
  const navigate = useNavigate();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [busy, setBusy] = useState(false);
  // The room itself only finishes loading once JitsiLive's own init effect resolves (external
  // script load, join-token fetch, iframe init — a few real seconds), but this button gave zero
  // feedback the moment it was clicked. With nothing on screen changing, a click that seemed to
  // do nothing reads as "the click didn't register" rather than "it's working" — inviting a
  // second, third click while still waiting. This only needs to survive the click-to-navigate
  // gap (starting() below), not the destination page's own loading state.
  const [starting, setStarting] = useState(false);

  if (!apiEnabled()) return null;

  async function copyLink() {
    setBusy(true);
    try {
      // The short link (a plain /m/<slug> redirect) instead of the raw long Jitsi URL --
      // that carries a full signed JWT in its fragment, which reads as broken/suspicious
      // pasted into WhatsApp or email. No displayName baked in either way (see
      // buildPersonalMeetingUrl's doc comment): this link is meant to be shared, and
      // whoever actually opens it isn't necessarily the account whose name useSession()
      // would supply.
      const { url } = await getMyMeetingRoomShortLink();
      // Was previously fire-and-forget: writeText's rejection was swallowed and "Link
      // copied" showed regardless of whether anything actually landed on the clipboard --
      // e.g. when the Clipboard API isn't available at all (no navigator.clipboard) or the
      // browser denies the write (no recent user gesture, no clipboard-write permission).
      // Now the success state only shows once the write is confirmed; anything else falls
      // back to a manual copy so the link is never just silently lost.
      if (!navigator.clipboard) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        title={copyState === "failed" ? "Couldn't copy automatically — check your browser's clipboard permission" : "Copy your permanent personal meeting link"}
        aria-live="polite"
        onClick={copyLink}
      >
        {copyState === "copied" && <Check className="h-3.5 w-3.5" />}
        {copyState === "failed" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
        {copyState === "idle" && <Video className="h-3.5 w-3.5" />}
        {copyState === "copied" ? "Link copied" : copyState === "failed" ? "Couldn't copy" : "My meeting link"}
      </Button>
      <Button
        size="sm"
        disabled={starting}
        title="Start your personal meeting room now"
        onClick={() => {
          setStarting(true);
          navigate("/meet/personal");
        }}
      >
        {starting ? "Starting…" : "Start"}
      </Button>
    </div>
  );
}
