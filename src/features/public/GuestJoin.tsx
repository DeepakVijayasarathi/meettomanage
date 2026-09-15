import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiEnabled, ApiError } from "@/lib/api";
import { guestJoin } from "@/api/sessions";
import { buildJitsiJoinUrl } from "@/lib/jitsi";

type Phase = "loading" | "redirecting" | "error";

/**
 * Public "Guest Link" bridge page — the URL a "Copy Guest Link" action (RM/Admin/Coordinator
 * Sessions and Calendar screens) copies and hands to a parent/caretaker points here, never
 * straight at Jitsi. No login: the opaque `token` query param (see JwtTokenService.
 * CreateGuestJoinToken) is the only credential, and the backend re-checks the session's LIVE
 * status on every open rather than trusting the token's own generous expiry — so this page can
 * fail with a real, specific reason (class ended, cancelled, not open yet) well after the link
 * was first copied.
 *
 * Deliberately hands off to Jitsi's own hosted web client (same helper the RM's own "Join"
 * button already uses) rather than this app's in-classroom screen (JitsiLive) — that screen's
 * whiteboard/quiz/roster run over an authenticated ClassroomHub SignalR connection a guest
 * never has, so there is nothing for it to connect to here. A student-bound link still gets its
 * name preset and prejoin skipped via the same displayName hash-param trick buildJitsiJoinUrl
 * already uses for the RM's own one-tap join.
 */
export default function GuestJoin() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);

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
      .then((join) => {
        if (cancelled) return;
        setPhase("redirecting");
        const url = buildJitsiJoinUrl(join.domain, join.room, join.token, join.skipPrejoin ? join.displayName : undefined);
        window.location.replace(url);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase("error");
        setError(err instanceof ApiError ? err.message : "This link is invalid or has expired.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-navyDark px-4 text-center">
      <div className="max-w-sm">
        {phase === "error" ? (
          <>
            <p className="text-lg font-semibold text-white">Can't join this class</p>
            <p className="mt-2 text-sm text-white/70">{error}</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-white">Joining the class…</p>
            <p className="mt-2 text-sm text-white/70">Hang tight, this only takes a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
