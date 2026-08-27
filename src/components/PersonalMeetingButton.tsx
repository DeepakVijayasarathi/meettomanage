import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import { buildPersonalMeetingUrl, getMyMeetingRoom } from "@/api/account";

/**
 * The member's permanent personal meeting room (Zoom-style): one stable room,
 * startable any time of day. "Start" opens it embedded in-app (same JitsiLive
 * experience a real class session uses); "copy" puts the standalone join URL
 * on the clipboard, for sharing with someone outside the app entirely.
 */
export function PersonalMeetingButton() {
  const { userName } = useSession();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!apiEnabled()) return null;

  async function copyLink() {
    setBusy(true);
    try {
      const room = await getMyMeetingRoom();
      const url = buildPersonalMeetingUrl(room, userName);
      navigator.clipboard?.writeText(url).catch(() => undefined);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* room unavailable — nothing to copy */
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
        title="Copy your permanent personal meeting link"
        aria-live="polite"
        onClick={copyLink}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
        {copied ? "Link copied" : "My meeting link"}
      </Button>
      <Button size="sm" title="Start your personal meeting room now" onClick={() => navigate("/meet/personal")}>
        Start
      </Button>
    </div>
  );
}
