import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { apiEnabled, userMessage } from "@/lib/api";
import { guestJoin, type ApiGuestJoin } from "@/api/sessions";
import JitsiLive from "@/features/classroom/JitsiLive";

type Phase = "loading" | "name-entry" | "joining" | "error";

/**
 * Public "Guest Link" bridge page — the URL a "Copy Guest Link" action (RM/Admin/Coordinator
 * Sessions and Calendar screens) copies and hands to a parent/caretaker points here, never
 * straight at Jitsi. No login: the opaque `token` query param (see JwtTokenService.
 * CreateGuestJoinToken) is the only credential, and the backend re-checks the session's LIVE
 * status on every open rather than trusting the token's own generous expiry — so this page can
 * fail with a real, specific reason (class ended, cancelled, not open yet) well after the link
 * was first copied.
 *
 * Renders the SAME interactive classroom (JitsiLive) a logged-in parent/student gets — not a
 * bare Jitsi call — via a second, ClassroomHub-only token (`hubToken`, see JwtTokenService.
 * CreateGuestClassroomHubToken) that lets an unauthenticated connection join the room's
 * roster/whiteboard/quiz/gamification layer, the same mechanism Jibri's recording-observer page
 * already uses to reach ClassroomHub without a real logged-in user. A student-bound link's name
 * is already known (skipPrejoin) and joins straight in; a generic link asks for a name first —
 * JitsiLive itself never shows Jitsi's own prejoin screen (it always supplies displayName up
 * front via the IFrame API), so that ask has to happen here, before JitsiLive ever mounts.
 */
export default function GuestJoin() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [join, setJoin] = useState<ApiGuestJoin | null>(null);
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    if (!apiEnabled()) {
      setPhase("error");
      setError("Guest links aren't available in demo mode.");
      return;
    }
    if (!token) {
      setPhase("error");
      setError("This link is missing its access code — ask for a fresh one.");
      return;
    }

    let cancelled = false;
    guestJoin(token)
      .then((data) => {
        if (cancelled) return;
        setJoin(data);
        setPhase(data.skipPrejoin ? "joining" : "name-entry");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase("error");
        setError(userMessage(err, "This link is invalid or has expired."));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (phase === "joining" && join) {
    return (
      <JitsiLive
        room={join.room}
        mode="student"
        sessionId={join.sessionId}
        displayName={join.skipPrejoin ? join.displayName : typedName.trim() || "Guest"}
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
            <p className="text-lg font-semibold text-white">Can't join this class</p>
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
              <p className="text-base font-semibold text-white">Join the class</p>
              <p className="mt-1 text-sm text-white/70">What's your name? The class will see this while you're in the call.</p>
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
              Join Class
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
