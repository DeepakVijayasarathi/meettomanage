import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, DoorOpen, PartyPopper, PhoneOff, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Logo } from "@/components/Logo";
import { useSession } from "@/state/session";
import { postEngagement } from "@/api/engagement";
import { getClassroomSettings, getJitsiJoin, registerRecording } from "@/api/sessions";
import { cn } from "@/lib/utils";
import { primeAudioUnlock } from "@/lib/sounds";
import InteractivePanel from "./InteractivePanel";
import GamificationOverlay from "./GamificationOverlay";
import type { LeaderboardEntry } from "./classroomData";

// Fallback only — used for demo-mode/mock sessions and if the authorized
// /jitsi-join lookup fails. Real sessions get their domain from that endpoint
// instead, since it must match whatever's configured on the "jitsi" integration.
const JITSI_DOMAIN_FALLBACK = (import.meta.env.VITE_JITSI_DOMAIN as string | undefined) ?? "meet.jit.si";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shared by the Window global below and the local `api` variable in the effect further
 *  down — kept as one named type so the two can never drift apart again (they used to be
 *  two independent inline copies, and only one of them got the `error` field added). */
type JitsiExternalApi = {
  dispose: () => void;
  addListener: (
    event: string,
    listener: (payload: {
      id?: string;
      muted?: boolean;
      link?: string;
      on?: boolean;
      displayName?: string;
      handRaised?: boolean;
      // recordingStatusChanged only: Jitsi's own reason when a recording request is
      // rejected or drops (e.g. "resource-constraint", "service-unavailable" — no Jibri
      // free in the pool; "error" — a generic Jibri-side failure).
      error?: string;
    }) => void
  ) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiExternalApi;
  }
}

const scriptPromises = new Map<string, Promise<void>>();

function loadJitsiScript(domain: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  let promise = scriptPromises.get(domain);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load the Jitsi Meet API."));
      document.head.appendChild(script);
    });
    scriptPromises.set(domain, promise);
  }
  return promise;
}

/**
 * One-click live classroom: embeds the Jitsi room generated for the session.
 * Video/audio, screen share, chat, reactions, raise hand and the tile controls
 * are native Jitsi; the Interactive panel layers the shared whiteboard, live
 * quiz, leaderboard and roster on top via the classroom SignalR hub.
 */
export default function JitsiLive({
  room,
  title,
  mode,
  sessionId,
  displayName,
}: {
  room: string;
  title?: string;
  mode: "teacher" | "student";
  sessionId?: string;
  /** Overrides the Jitsi participant name — e.g. the student's own name when a parent
   *  is joining on their child's behalf, rather than the parent account's name. */
  displayName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { userName: accountName } = useSession();
  const userName = displayName || accountName;
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | undefined>(undefined);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const celebrateAllRef = useRef<((message?: string) => void) | null>(null);
  const raiseHandRef = useRef<((raised: boolean) => void) | null>(null);
  const jitsiApiRef = useRef<{ executeCommand: (command: string, ...args: unknown[]) => void } | null>(null);
  const [lobbyEnabled, setLobbyEnabled] = useState(false);
  // jitsiApiRef being populated doesn't itself trigger a re-render (it's a ref) — this
  // tracks the same fact as state so the Waiting Room button can disable itself until
  // Jitsi has actually loaded, instead of looking clickable and silently no-oping.
  const [jitsiReady, setJitsiReady] = useState(false);
  const [callDegraded, setCallDegraded] = useState(false);
  const [recording, setRecording] = useState(false);
  // Auto-recording has no success confirmation of its own — startRecording is a fire-and-
  // forget IFrame command, so the only signals that it actually took are recordingStatusChanged
  // (on: true) or its own reported error. Without this, a deployment with no Jibri pool (the
  // documented "no-op until Jibri exists" state — see docs/JITSI_ARCHITECTURE.md) recorded
  // nothing and told nobody: the teacher just never saw a REC badge, with no way to tell that
  // apart from "recording is fine, just not showing." Null = nothing wrong (or not attempted);
  // a string = shown as a dismissible banner with the reason, teacher-only.
  const [recordingIssue, setRecordingIssue] = useState<string | null>(null);
  const recordingWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  // Sourced from Jitsi's own participantJoined/Left events rather than the SignalR
  // interactive-layer roster: a demo lead has no account and joins straight from the
  // confirmation email's Jitsi link, so they never touch the app or its hub — but
  // they're still a real participant in the call itself, which this always sees.
  const [participants, setParticipants] = useState<{ id: string; displayName: string }[]>([]);
  // Defaults true (today's unconditional behaviour) until the real Settings value loads,
  // and stays true if the request fails — so a slow/offline check never silently disables
  // recording for a teacher who already relies on it.
  const autoRecordRef = useRef(true);

  // So the celebration clap sound is ready on whichever gesture a student makes
  // first — joining, clicking a tab — instead of waiting for one that never comes
  // before the class's first celebration and landing silently for that student.
  useEffect(() => primeAudioUnlock(), []);

  useEffect(() => {
    let cancelled = false;
    getClassroomSettings()
      .then((settings) => {
        if (!cancelled) autoRecordRef.current = settings.autoRecordEnabled;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Real waiting room: toggles Jitsi's native lobby, which then handles admit/deny
  // through Jitsi's own UI. Only meaningful for whoever holds moderator on this
  // deployment (self-hosted, no JWT auth configured — see docs/JITSI_ARCHITECTURE.md);
  // the command itself is a stable, long-standing part of the Jitsi IFrame API.
  function toggleWaitingRoom() {
    if (!jitsiApiRef.current) return;
    const next = !lobbyEnabled;
    jitsiApiRef.current.executeCommand("toggleLobby", next);
    setLobbyEnabled(next);
  }

  // The interactive layer needs a real session id for the hub group + engagement.
  const interactive = !!sessionId && GUID_RE.test(sessionId);

  function celebrate(message?: string) {
    setCelebrationMessage(message);
    setCelebrating(true);
  }

  // Shared chip styling for the two header toggles (Waiting Room / Interactive) so
  // both read as one family of controls instead of two independently-styled buttons.
  const headerToggleClass =
    "gap-1.5 border border-white/10 bg-white/10 text-white hover:bg-white/20 aria-pressed:border-transparent aria-pressed:bg-brand-violet aria-pressed:text-white";

  useEffect(() => {
    let api: JitsiExternalApi | undefined;
    let cancelled = false;

    // Talk-time & camera attentiveness: accumulated from Jitsi media signals,
    // flushed as engagement events when the participant leaves.
    const media = {
      selfId: "",
      talkMs: 0,
      talkSince: 0,
      camMs: 0,
      camSince: 0,
    };
    const flushMedia = () => {
      const now = Date.now();
      if (media.talkSince) {
        media.talkMs += now - media.talkSince;
        media.talkSince = 0;
      }
      if (media.camSince) {
        media.camMs += now - media.camSince;
        media.camSince = 0;
      }
      const talkSeconds = Math.round(media.talkMs / 1000);
      const camSeconds = Math.round(media.camMs / 1000);
      if (talkSeconds > 0) postEngagement(sessionId, userName, "TalkTimeSeconds", talkSeconds);
      if (camSeconds > 0) postEngagement(sessionId, userName, "CameraOnSeconds", camSeconds);
      media.talkMs = 0;
      media.camMs = 0;
    };

    async function init() {
      // Re-authorize right before joining rather than trusting the room name carried in
      // route state: this is also the only source of a signed join token, so a forwarded
      // link with no valid session/child relationship never gets past this call once the
      // Jitsi deployment enforces token verification (see docs/JITSI_ARCHITECTURE.md). A
      // failed/skipped lookup (demo mode, offline) falls back to the room passed in — the
      // classroom SignalR hub's own JoinSession still gates the interactive layer.
      let joinRoom = room;
      let joinDomain = JITSI_DOMAIN_FALLBACK;
      let joinToken: string | undefined;
      if (interactive) {
        try {
          const join = await getJitsiJoin(sessionId!);
          joinRoom = join.room;
          joinDomain = join.domain;
          joinToken = join.token ?? undefined;
        } catch {
          /* fall back to the route-state room below */
        }
      }

      await loadJitsiScript(joinDomain);
      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
      api = new window.JitsiMeetExternalAPI(joinDomain, {
        roomName: joinRoom,
        jwt: joinToken,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: userName },
        configOverwrite: {
          prejoinConfig: { enabled: false },
          startWithAudioMuted: mode === "student",
          disableDeepLinking: true,
          // Don't let the browser suggest/remember this room outside our own scheduling flow.
          doNotStoreRoom: true,
          // Without an explicit subject, Jitsi's own top bar falls back to displaying the
          // raw room slug (an opaque, scrambled-looking id string) — this replaces it with
          // the same class title already shown in our own header just above it.
          subject: title ?? "Live class",
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          DEFAULT_REMOTE_DISPLAY_NAME: "Student",
          // Video-tile letterbox before a camera loads, matched to our own dark panel color.
          DEFAULT_BACKGROUND: "#161B33",
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          // Curated for a small tutoring classroom — drop enterprise features (livestream,
          // shared video/audio, security/profile, dial-in, stats) that don't apply here.
          // Jitsi still hides moderator-only entries (recording, mute-everyone) from students.
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "raisehand",
            "tileview",
            "videobackgroundblur",
            "recording",
            "mute-everyone",
            "fullscreen",
            "settings",
            "hangup",
          ],
        },
      });
      jitsiApiRef.current = api;
      setJitsiReady(true);
      api.addListener("readyToClose", () => navigate(-1));
      api.addListener("videoConferenceJoined", (payload) => {
        media.selfId = payload?.id ?? "";
        media.camSince = Date.now(); // camera starts unmuted unless Jitsi says otherwise
        // A small class reads better as a grid of faces than one spotlighted speaker.
        api?.executeCommand("setTileView", true);
        if (mode === "teacher" && autoRecordRef.current) {
          // Auto session recording: starts when the host joins; requires Jibri
          // on the Jitsi deployment (no-op on deployments without it). Admin can
          // turn this off in Settings → Integrations → Jitsi Meet ("autoRecord"),
          // which leaves recording to the manual fallback on teacher My Classes.
          api?.executeCommand("startRecording", { mode: "file" });
          // startRecording has no success callback of its own — a deployment with no
          // Jibri pool (or one that's exhausted) either fires recordingStatusChanged
          // with on:false + a reason, or in some configurations fires nothing back at
          // all (Jicofo simply can't dispatch the request). Either way, if the "on"
          // confirmation hasn't arrived within a reasonable window, treat it as failed
          // rather than leaving the teacher to guess why no REC badge ever appeared.
          if (recordingWatchdogRef.current) clearTimeout(recordingWatchdogRef.current);
          recordingWatchdogRef.current = setTimeout(() => {
            setRecording((current) => {
              if (!current) {
                setRecordingIssue(
                  "Auto-recording didn't start (likely no recording capacity on the video server). " +
                    "This class is not being recorded automatically — use the manual \"Recording\" button on My Classes if you need one."
                );
              }
              return current;
            });
          }, 15000);
        }
      });
      // Auto recording registration: when the deployment publishes the recording
      // link, file it against the session (drives the 15-day parent window).
      api.addListener("recordingLinkAvailable", (payload) => {
        if (mode === "teacher" && interactive && payload?.link) {
          registerRecording(sessionId!, payload.link).catch(() => undefined);
          setRecordingIssue(null);
        }
      });
      // Forwards Jitsi's own native "raise hand" toolbar button into the classroom hub's
      // roster, which is what actually drives the hand-raise indicator other participants
      // see (InteractivePanel's People tab, ParticipantsPanel) — this event fires for every
      // participant's hand-raise change, not just the local one, so it's filtered to self.
      api.addListener("raiseHandUpdated", (payload) => {
        if (payload?.id !== media.selfId) return;
        raiseHandRef.current?.(!!payload?.handRaised);
      });
      api.addListener("dominantSpeakerChanged", (payload) => {
        const now = Date.now();
        if (payload?.id === media.selfId) {
          media.talkSince ||= now;
        } else if (media.talkSince) {
          media.talkMs += now - media.talkSince;
          media.talkSince = 0;
        }
      });
      api.addListener("videoMuteStatusChanged", (payload) => {
        const now = Date.now();
        if (payload?.muted && media.camSince) {
          media.camMs += now - media.camSince;
          media.camSince = 0;
        } else if (payload?.muted === false) {
          media.camSince ||= now;
        }
      });
      api.addListener("videoConferenceLeft", () => flushMedia());
      api.addListener("participantJoined", (payload) => {
        const id = payload?.id;
        if (!id) return;
        const displayName = payload.displayName?.trim() || "Student";
        setParticipants((prev) => [...prev.filter((p) => p.id !== id), { id, displayName }]);
      });
      api.addListener("participantLeft", (payload) => {
        setParticipants((prev) => prev.filter((p) => p.id !== payload?.id));
      });
      // Jitsi's own signal for a dropped media/XMPP connection mid-call — the video
      // tiles freeze silently otherwise, with nothing in our own chrome saying why.
      api.addListener("connectionInterrupted", () => setCallDegraded(true));
      api.addListener("connectionRestored", () => setCallDegraded(false));
      // Without these, a video server/room misconfiguration (e.g. the Jitsi deployment's
      // focus component rejecting the room outright) left the whole screen looking
      // "normal" — just a static avatar with no call ever connecting, no explanation, and
      // the class silently never starting. This reuses the same full-screen error state
      // init() itself falls back to, since a failed conference makes the rest of the
      // screen (interactive panel included) meaningless without a working call underneath.
      api.addListener("conferenceFailed", (payload) => {
        setError(
          `The video call couldn't connect (${payload?.error ?? "unknown error"}). ` +
            "Try rejoining — if this keeps happening, the video server may be down."
        );
      });
      api.addListener("connectionFailed", () => {
        setError("Couldn't reach the video server. Check your connection and try rejoining.");
      });
      api.addListener("recordingStatusChanged", (payload) => {
        const isOn = !!payload?.on;
        setRecording(isOn);
        if (isOn) {
          // Confirmed running — cancel the watchdog and clear any earlier warning.
          if (recordingWatchdogRef.current) {
            clearTimeout(recordingWatchdogRef.current);
            recordingWatchdogRef.current = null;
          }
          setRecordingIssue(null);
        } else if (mode === "teacher" && autoRecordRef.current && payload?.error) {
          // An explicit rejection reason arrived before the watchdog even fired —
          // surface it immediately instead of waiting out the full timeout.
          if (recordingWatchdogRef.current) {
            clearTimeout(recordingWatchdogRef.current);
            recordingWatchdogRef.current = null;
          }
          setRecordingIssue(
            `Auto-recording failed to start (${payload.error}). This class is not being recorded automatically — ` +
              'use the manual "Recording" button on My Classes if you need one.'
          );
        }
      });
    }

    init().catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
      flushMedia();
      api?.dispose();
      jitsiApiRef.current = null;
      setParticipants([]);
      if (recordingWatchdogRef.current) {
        clearTimeout(recordingWatchdogRef.current);
        recordingWatchdogRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, mode]);

  return (
    <div className="flex h-screen flex-col bg-brand-navyDark">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-brand-navyDark/60 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Logo showWordmark={false} imgClassName="h-8 w-8" />
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          <p className="truncate text-sm font-semibold text-white">{title ?? "Live class"}</p>
          {recording && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> Rec
            </span>
          )}
          {callDegraded && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-amber/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-amber">
              <WifiOff className="h-3 w-3" /> Reconnecting…
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mode === "teacher" && (
            <Button
              size="pill"
              variant="secondary"
              aria-pressed={lobbyEnabled}
              disabled={!jitsiReady}
              className={headerToggleClass}
              onClick={toggleWaitingRoom}
              title={jitsiReady ? "New joiners wait for you to admit them" : "Loading the call…"}
            >
              <DoorOpen className="h-3.5 w-3.5" />
              {lobbyEnabled ? "Waiting Room: On" : "Waiting Room"}
            </Button>
          )}
          {interactive && (
            <Button size="pill" variant="secondary" aria-pressed={panelOpen} className={headerToggleClass} onClick={() => setPanelOpen((o) => !o)}>
              <Sparkles className="h-3.5 w-3.5" /> Interactive
            </Button>
          )}
          <div className="h-6 w-px bg-white/10" aria-hidden="true" />
          <Button size="sm" variant="destructive" className="gap-1.5 rounded-full" onClick={() => setLeaveConfirmOpen(true)}>
            <PhoneOff className="h-4 w-4" />
            Leave
          </Button>
        </div>
      </header>
      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title="Leave the class?"
        description={
          mode === "teacher"
            ? "The whiteboard, quiz and roster controls will pause for your students until you rejoin. You can rejoin any time from My Classes."
            : "You can rejoin any time before the class ends."
        }
        confirmLabel="Leave"
        destructive
        onConfirm={() => navigate(-1)}
      />
      {/* Teacher-only, dismissible: makes a silent auto-recording failure (most commonly
          "no Jibri pool provisioned on the video server" — see docs/JITSI_ARCHITECTURE.md)
          visible instead of the teacher just never noticing the REC badge never appeared. */}
      {mode === "teacher" && recordingIssue && (
        <div className="flex shrink-0 items-start gap-2.5 border-b border-brand-amber/20 bg-brand-amber/10 px-4 py-2.5 text-xs text-brand-amber">
          <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5" />
          <p className="flex-1">{recordingIssue}</p>
          <button
            type="button"
            onClick={() => setRecordingIssue(null)}
            className="shrink-0 font-semibold underline decoration-brand-amber/50 underline-offset-2 hover:decoration-brand-amber"
          >
            Dismiss
          </button>
        </div>
      )}
      {error ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex max-w-sm items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3.5 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5 text-red-300" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="relative min-h-0 min-w-0 flex-1">
            <div ref={containerRef} className="h-full w-full" />
            {mode === "teacher" && interactive && (
              <button
                title="Send a celebration to the class"
                aria-label="Send a celebration to the class"
                onClick={() => (celebrateAllRef.current ?? celebrate)("Great job, everyone! 🎉")}
                className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy/95 text-white backdrop-blur transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PartyPopper className="h-4 w-4" />
              </button>
            )}
            {/* Wraps the (now non-self-positioning) leaderboard card above it — via
                GamificationOverlay's `stacked` prop — together with the Joined roster card
                in one flex column, both anchored once at this single corner. Both are
                teacher-only and share the exact same "panel closed" visibility condition,
                so they always show or hide together; independently self-positioning at the
                same right-3 top-3 corner used to render them directly on top of each other
                (confirmed from a live screenshot: the leaderboard's trophy icon peeking out
                from behind the Joined card). */}
            <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
              {/* The celebration confetti/banner portion of GamificationOverlay uses `fixed
                  inset-0` internally, so mounting it inside this flex stack doesn't affect
                  where that renders — only the leaderboard mini-card (stacked) is laid out
                  by this wrapper, right above the Joined card it used to collide with. */}
              <GamificationOverlay
                celebrating={celebrating}
                onCelebrationEnd={() => {
                  setCelebrating(false);
                  setCelebrationMessage(undefined);
                }}
                leaderboard={leaderboard}
                message={celebrationMessage}
                // Once the Interactive panel is open, its own Stars tab already shows this
                // leaderboard, so the floating card would be a redundant duplicate.
                showLeaderboardCard={!interactive || !panelOpen}
                stacked
              />
              {mode === "teacher" && (!interactive || !panelOpen) && (
                <div className="max-w-[220px] rounded-2xl border border-white/10 bg-brand-navy/95 p-3 text-white shadow-pop backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Joined ({participants.length})</p>
                  {participants.length === 0 ? (
                    <p className="mt-1 text-xs text-white/50">Waiting for students to join…</p>
                  ) : (
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {participants.map((p) => (
                        <li key={p.id} className="flex items-center gap-1.5 text-sm">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                          <span className="truncate">{p.displayName}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
          {interactive && (
            <aside className={cn("min-h-0 w-full shrink-0 border-t border-white/10 md:w-[380px] md:border-l md:border-t-0", !panelOpen && "hidden")}>
              <InteractivePanel
                sessionId={sessionId!}
                mode={mode}
                displayName={userName}
                onCelebrate={celebrate}
                onLeaderboard={setLeaderboard}
                onReady={({ celebrateAll, raiseHand }) => {
                  celebrateAllRef.current = celebrateAll;
                  raiseHandRef.current = raiseHand;
                }}
              />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
