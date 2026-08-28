import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useSession } from "@/state/session";
import { getMyMeetingRoom, type MyMeetingRoom } from "@/api/account";
import JitsiLive from "./JitsiLive";

/**
 * The member's permanent personal meeting room, embedded in-app the same way a real
 * class session is (JitsiLive) — instead of the old behaviour of opening the raw Jitsi
 * URL in a new browser tab, which skipped the app's own header/branding entirely.
 */
export default function PersonalMeetingRoom() {
  const { userName } = useSession();
  const [room, setRoom] = useState<MyMeetingRoom | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyMeetingRoom()
      .then((r) => {
        if (!cancelled) setRoom(r);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Could not open your personal meeting room.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-brand-navyDark px-6 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="max-w-sm text-sm font-medium text-white/80">{error}</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-navyDark">
        <p className="text-sm text-white/60">Opening your meeting room…</p>
      </div>
    );
  }

  return (
    <JitsiLive
      room={room.roomId}
      title={`${userName}'s Personal Meeting Room`}
      mode="teacher"
      displayName={userName}
      joinOverride={{ domain: room.domain, token: room.token }}
    />
  );
}
