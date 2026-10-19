import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useSession } from "@/state/session";
import { getMyMeetingRoom, getMyMeetingRoomShortLink, type MyMeetingRoom } from "@/api/account";
import JitsiLive from "./JitsiLive";
import { userMessage } from "@/lib/api";

/**
 * The member's permanent personal meeting room, embedded in-app the same way a real
 * class session is (JitsiLive) — instead of the old behaviour of opening the raw Jitsi
 * URL in a new browser tab, which skipped the app's own header/branding entirely.
 */
export default function PersonalMeetingRoom() {
  const { userName } = useSession();
  const [room, setRoom] = useState<MyMeetingRoom | null>(null);
  // The in-call "Invite" button's link — fetched separately (a short /m/<slug> redirect,
  // not the raw long Jitsi URL with its JWT fragment, which reads as broken/suspicious
  // pasted into WhatsApp) so it can be undefined (button hidden) until it's actually ready,
  // rather than blocking the room itself on this second request.
  const [inviteUrl, setInviteUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyMeetingRoom()
      .then((r) => {
        if (!cancelled) setRoom(r);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(userMessage(err, "Could not open your personal meeting room."));
      });
    getMyMeetingRoomShortLink()
      .then(({ url }) => {
        if (!cancelled) setInviteUrl(url);
      })
      .catch(() => undefined); // Invite button just stays hidden — the room itself doesn't depend on this.
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-call-bg px-6 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="max-w-sm text-sm font-medium text-white/80">{error}</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-dvh items-center justify-center bg-call-bg">
        <p className="text-sm text-white/60">Opening your meeting room…</p>
      </div>
    );
  }

  return (
    <JitsiLive
      room={room.roomId}
      title={`${userName}'s Personal Meeting Room`}
      mode="teacher"
      // The owner's own account id doubles as this room's ClassroomHub sessionId (see
      // ClassroomHub.JoinSession's isPersonalRoomOwner check) -- this is what turns on the
      // Interactive panel (whiteboard/quiz/roster/chat) for the room, the same way a real
      // sessionId does for a class. No hubToken needed: the owner is a real logged-in user,
      // so InteractivePanel's hub connection authenticates with their normal access token.
      sessionId={room.ownerId}
      isPersonalRoom
      displayName={userName}
      joinOverride={{ domain: room.domain, token: room.token }}
      // No displayName baked into this one -- this link is meant to be shared, so whoever
      // opens it should be asked their own name rather than joining misattributed as
      // whoever's account started the call.
      inviteUrl={inviteUrl}
    />
  );
}
