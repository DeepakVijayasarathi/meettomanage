import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiEnabled } from "@/lib/api";
import { getRecordingRenderJoin, type ApiRecordingRenderJoin } from "@/api/sessions";
import InteractivePanel from "./InteractivePanel";
import GamificationOverlay from "./GamificationOverlay";
import type { LeaderboardEntry } from "./classroomData";

/**
 * Loaded only by the recording-render bot's own headless Playwright browser (see
 * docs/JITSI_ARCHITECTURE.md's recording-render section) — never by a real person. Renders
 * exactly what a student's InteractivePanel shows (whiteboard, quiz, gamification), reusing
 * those components directly rather than reimplementing their rendering. The bot records this
 * page's own content locally (Playwright's recordVideo) and hands that file off to
 * finalize-recording.sh to composite alongside Jibri's own recording -- this page itself has no
 * idea it's being recorded and never touches Jitsi at all. (An earlier version published this
 * capture as a live Jitsi video track from a hidden-domain participant; confirmed live that a
 * hidden-domain participant's video can never appear in Jibri's own recording regardless of how
 * it's published, since isHidden() gates tile rendering for every client, Jibri's own included
 * -- see bot.js's own header comment for the full root-cause writeup.)
 */
export default function RecordingRender() {
  const { roomName } = useParams<{ roomName: string }>();
  const [join, setJoin] = useState<ApiRecordingRenderJoin | null>(null);
  const [ready, setReady] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | undefined>(undefined);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Same reasoning as RecordingObserver.tsx: this route only ever matters against a real
    // backend + hidden-domain bot setup — nothing meaningful to render in demo mode.
    if (!roomName || !apiEnabled()) {
      return;
    }
    let cancelled = false;
    getRecordingRenderJoin(roomName)
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

  const handleCelebrate = useCallback((message?: string) => {
    setCelebrationMessage(message);
    setCelebrating(true);
  }, []);

  if (!ready || !join) {
    // Covers "still checking," "no InProgress session for this room right now," and demo
    // mode alike — none of them have anything for the render bot to capture.
    return <div className="min-h-screen bg-brand-navyDark" />;
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-brand-navyDark">
      <div className="flex-1" />
      <aside className="flex h-full w-[420px] shrink-0 flex-col border-l border-white/10 bg-brand-navy/60">
        <InteractivePanel
          sessionId={join.sessionId}
          mode="student"
          displayName="Recording"
          hubToken={join.hubToken}
          onCelebrate={handleCelebrate}
          onLeaderboard={setLeaderboard}
        />
      </aside>
      <GamificationOverlay
        celebrating={celebrating}
        onCelebrationEnd={() => setCelebrating(false)}
        leaderboard={leaderboard}
        message={celebrationMessage}
        showLeaderboardCard={false}
      />
    </div>
  );
}
