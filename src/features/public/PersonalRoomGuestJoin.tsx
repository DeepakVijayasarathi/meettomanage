import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { apiEnabled, userMessage } from "@/lib/api";
import { getPersonalRoomGuestJoin, type PersonalRoomGuestJoin as ApiPersonalRoomGuestJoin } from "@/api/account";
import JitsiLive from "@/features/classroom/JitsiLive";

type Phase = "loading" | "name-entry" | "joining" | "error";

/**
 * Public bridge page a Personal Meeting Room's invite link now opens (see
 * UsersController.MyMeetingRoomShortLink/MeetingRoomGuestJoin) — no login, the owner's account
 * id in the URL is the only credential, same trust model the old direct-to-Jitsi redirect
 * already used. Renders the SAME embedded, interactive classroom (JitsiLive, with the
 * whiteboard/quiz/roster/chat panel) the owner gets, not a bare Jitsi tab, via a
 * ClassroomHub-only guest token — the identical mechanism GuestJoin.tsx already uses for a
 * class Guest Link, just scoped to the owner's own account id instead of a real ClassSession id.
 * Always asks for a name first (unlike a student-bound class Guest Link, there's no enrolled
 * child to skip the ask for).
 */
export default function PersonalRoomGuestJoin() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [join, setJoin] = useState<ApiPersonalRoomGuestJoin | null>(null);
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    if (!apiEnabled()) {
      setPhase("error");
      setError("Guest links aren't available in demo mode.");
      return;
    }
    if (!ownerId) {
      setPhase("error");
      setError("This link is missing its room — ask for a fresh one.");
      return;
    }

    let cancelled = false;
    getPersonalRoomGuestJoin(ownerId)
      .then((data) => {
        if (cancelled) return;
        setJoin(data);
        setPhase("name-entry");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase("error");
        setError(userMessage(err, "This link is invalid or has expired."));
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  if (phase === "joining" && join) {
    return (
      <JitsiLive
        room={join.room}
        mode="student"
        sessionId={join.ownerId}
        isPersonalRoom
        displayName={typedName.trim() || "Guest"}
        joinOverride={{ domain: join.domain, token: join.token }}
        hubToken={join.hubToken}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-navyDark px-4 text-center">
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Logo variant="light" />

        {phase === "loading" && (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
            <p className="text-sm text-white/70">Checking your link…</p>
          </>
        )}

        {phase === "error" && (
          <>
            <p className="text-lg font-semibold text-white">Can't join this room</p>
            <p className="text-sm text-white/70">{error}</p>
          </>
        )}

        {phase === "name-entry" && join && (
          <form
            className="flex w-full flex-col gap-4 rounded-xl bg-white/5 p-5 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              if (typedName.trim()) setPhase("joining");
            }}
          >
            <div>
              <p className="text-base font-semibold text-white">Join {join.ownerName}'s room</p>
              <p className="mt-1 text-sm text-white/70">What's your name? Everyone in the room will see this.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="guest-name" className="text-white/80">
                Your name
              </Label>
              <Input
                id="guest-name"
                autoFocus
                placeholder="e.g. Grandma Sunita"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!typedName.trim()}>
              Join Room
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
