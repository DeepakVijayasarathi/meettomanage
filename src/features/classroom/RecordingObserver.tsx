import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiEnabled } from "@/lib/api";
import { getRecordingObserverJoin, type ApiRecordingObserverJoin } from "@/api/sessions";
import JitsiLive from "./JitsiLive";

/**
 * Loaded only by Jibri's own headless Chrome — nginx on the Jitsi server proxies its
 * top-level navigation to /<room> here instead of letting it reach the bare Jitsi Meet SPA
 * (see docs/JITSI_ARCHITECTURE.md's recording-observer section), so the recording captures
 * this app's real teacher-facing UI — whiteboard, quiz, gamification — not just raw video
 * tiles. No human ever opens this route directly: there's no logged-in user, no "back" to
 * navigate to, and nothing to click if something goes wrong, so every non-ready state here
 * is a plain, inert screen rather than an error page with actions on it.
 */
export default function RecordingObserver() {
  const { roomName } = useParams<{ roomName: string }>();
  const [join, setJoin] = useState<ApiRecordingObserverJoin | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // This route only ever matters against a real Jibri/nginx setup — demo mode has no
    // backend to ask "is this room live," so there's nothing meaningful to render here.
    if (!roomName || !apiEnabled()) {
      return;
    }
    let cancelled = false;
    getRecordingObserverJoin(roomName)
      .then((data) => {
        if (!cancelled && data) {
          setJoin(data);
          setReady(true);
        }
      })
      .catch(() => {
        /* stays on the inert placeholder below — nothing to retry toward on this route */
      });
    return () => {
      cancelled = true;
    };
  }, [roomName]);

  if (ready && join) {
    return (
      <JitsiLive
        room={join.room}
        mode="teacher"
        sessionId={join.sessionId}
        isPersonalRoom={join.isPersonalRoom}
        displayName="Recording"
        joinOverride={{ domain: join.domain, token: join.token }}
        isRecordingObserver
        hubToken={join.hubToken ?? undefined}
      />
    );
  }

  // Covers "still checking," "no InProgress session for this room right now," and demo
  // mode alike — none of them have anything for Jibri to do, so they all render the same way.
  return <div className="min-h-screen bg-call-bg" />;
}
