import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiEnabled } from "@/lib/api";
import { getRecordingRenderJoin, type ApiRecordingRenderJoin } from "@/api/sessions";
import InteractivePanel from "./InteractivePanel";
import GamificationOverlay from "./GamificationOverlay";
import { startRecordingCapture, type RecordingCaptureHandle } from "./recordingCaptureTrack";
import type { LeaderboardEntry } from "./classroomData";

/**
 * Loaded only by the recording-render bot's own headless Playwright browser (see
 * docs/JITSI_ARCHITECTURE.md's recording-render section) — never by a real person. Renders
 * exactly what a student's InteractivePanel shows (whiteboard, quiz, gamification), reusing
 * those components directly rather than reimplementing their rendering, then captures this
 * tab's own rendered content via getDisplayMedia (auto-granted for this automated browser
 * context, never prompting) and publishes it as a video track into the same Jitsi room,
 * joined separately by the bot process itself through Jitsi's hidden XMPP domain — see
 * recordingCaptureTrack.ts. This page never touches the Jitsi IFrame API or JitsiLive.tsx at
 * all; it has no video call UI of its own, since the bot's video connection is a completely
 * separate, silent participant real teachers/students never see.
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

  // Starts capturing + publishing this tab's own render as soon as the page is ready — the
  // bot process that navigated here already only does so once a class is actually recording,
  // so there's no separate "wait for recording to start" gate needed on this side.
  useEffect(() => {
    if (!ready || !join) return;
    let handle: RecordingCaptureHandle | null = null;
    let cancelled = false;
    startRecordingCapture(join.room).then((h) => {
      if (cancelled) {
        h.dispose();
      } else {
        handle = h;
      }
    });
    return () => {
      cancelled = true;
      handle?.dispose();
    };
  }, [ready, join]);

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
