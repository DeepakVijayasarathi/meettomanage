import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { getJitsiJoin, type ApiJitsiJoin } from "@/api/sessions";
import { useSession } from "@/state/session";
import { userMessage } from "@/lib/api";
import JitsiLive from "./JitsiLive";

/**
 * An admin-team member (Admin, RM, Coordinator, Management, ...) dropping into a live class
 * as a monitor — embedded in-app instead of the raw Jitsi tab staff Join Class used to open.
 * The raw Jitsi web client can't be customised: with a screen share on its stage it also kept
 * the same share as a thumbnail in the filmstrip ("two tiles, one big and one small"), which is
 * exactly what JitsiLive's own layout handling removes — verified live on UAT, where the
 * Coordinator's raw tab showed both while the embedded classroom showed one.
 *
 * Joins with the session's jitsi-join token (a moderator token for staff) as a listener:
 * mic starts muted, no whiteboard/roster connection, no attendance, no End Class — this view
 * never changes anything about the class. The GET itself tells the host's classroom who's
 * coming, so the waiting room admits them automatically.
 */
export default function StaffLiveClassroom() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { userName, homePath } = useSession();
  const [join, setJoin] = useState<ApiJitsiJoin | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJitsiJoin(sessionId)
      .then((j) => {
        if (!cancelled) setJoin(j);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(userMessage(err, "Couldn't join this class."));
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function leave() {
    // Opened in its own tab from Join Class — close it; if the browser won't (a tab the user
    // opened themselves), fall back to their portal home.
    window.close();
    navigate(homePath || "/", { replace: true });
  }

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-call-bg px-6 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="max-w-sm text-sm font-medium text-white/80">{error}</p>
      </div>
    );
  }

  if (!join) {
    return (
      <div className="flex h-dvh items-center justify-center bg-call-bg">
        <p className="text-sm text-white/60">Joining the class…</p>
      </div>
    );
  }

  return (
    <JitsiLive
      room={join.room}
      title="Live class"
      mode="student"
      roleLabel="Monitor"
      displayName={userName}
      joinOverride={{ domain: join.domain, token: join.token }}
      onLeave={leave}
    />
  );
}
