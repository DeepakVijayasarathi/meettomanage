import { useState } from "react";
import { Check, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiEnabled, apiFetch } from "@/lib/api";

const JITSI_DOMAIN = (import.meta.env.VITE_JITSI_DOMAIN as string | undefined) ?? "meet.jit.si";

async function getMyMeetingRoom(): Promise<string> {
  const { roomId } = await apiFetch<{ roomId: string }>("/api/users/me/meeting-room");
  return roomId;
}

/**
 * The member's permanent personal meeting room (Zoom-style): one stable link,
 * startable any time of day. "Start" opens the room; "copy" puts the same
 * permanent URL on the clipboard to share.
 */
export function PersonalMeetingButton() {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!apiEnabled()) return null;

  async function withRoom(action: (url: string) => void) {
    setBusy(true);
    try {
      const roomId = await getMyMeetingRoom();
      action(`https://${JITSI_DOMAIN}/${roomId}`);
    } catch {
      /* room unavailable — nothing to open */
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
        onClick={() =>
          withRoom((url) => {
            navigator.clipboard?.writeText(url).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          })
        }
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
        {copied ? "Link copied" : "My meeting link"}
      </Button>
      <Button size="sm" disabled={busy} title="Start your personal meeting room now" onClick={() => withRoom((url) => window.open(url, "_blank", "noopener"))}>
        Start
      </Button>
    </div>
  );
}
