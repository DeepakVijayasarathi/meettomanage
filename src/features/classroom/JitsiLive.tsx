import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, DoorOpen, Pencil, PartyPopper, PhoneOff, Sparkles, UserPlus, Users, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { useSession } from "@/state/session";
import { useToast } from "@/hooks/use-toast";
import { postEngagement } from "@/api/engagement";
import { completeSession, getClassroomSettings, getJitsiJoin, registerRecording } from "@/api/sessions";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { primeAudioUnlock } from "@/lib/sounds";
import InteractivePanel from "./InteractivePanel";
import GamificationOverlay from "./GamificationOverlay";
import AnnotationOverlay, { type AnnotationOverlayHandle, type AnnotationOp } from "./AnnotationOverlay";
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
  joinOverride,
  inviteUrl,
  isRecordingObserver,
  hubToken,
}: {
  room: string;
  title?: string;
  mode: "teacher" | "student";
  sessionId?: string;
  /** Overrides the Jitsi participant name — e.g. the student's own name when a parent
   *  is joining on their child's behalf, rather than the parent account's name. */
  displayName?: string;
  /** Skips the /jitsi-join session lookup and joins with this domain/token directly --
   *  for rooms with no backing ClassSession (e.g. a member's personal meeting room),
   *  where GetJitsiJoinAsync's session-participant/join-window checks don't apply. */
  joinOverride?: { domain: string; token?: string | null };
  /** Shows an in-call "Invite" button that copies this link — a shareable short link
   *  (PersonalMeetingRoom.tsx fetches it via getMyMeetingRoomShortLink) with no personal
   *  name baked in, so anyone who opens it is asked their own name rather than joining
   *  misattributed as whoever's account started the call. Only meaningful for a personal
   *  meeting room; a real class session invites people through enrollment instead, so this
   *  is omitted there. */
  inviteUrl?: string;
  /** Set only by RecordingObserver.tsx: this is Jibri's own headless browser, not a human.
   *  Suppresses actions that only make sense for a real teacher and would otherwise double up
   *  with (or fight) the very Jibri recording that's already capturing this page — a second
   *  auto-started recording, a duplicate recording registration, a Leave button nobody can
   *  click, a "back" navigation with no history to go back to. */
  isRecordingObserver?: boolean;
  /** Passed through to InteractivePanel's ClassroomHubClient in place of getAccessToken() —
   *  see ClassroomHubClient's own doc comment. Only meaningful alongside isRecordingObserver. */
  hubToken?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { userName: accountName } = useSession();
  const userName = displayName || accountName;
  const { toast } = useToast();

  async function copyInviteLink() {
    if (!inviteUrl) return;
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(inviteUrl);
      toast({ variant: "success", title: "Invite link copied", description: "Anyone who opens it will be asked their own name before joining." });
    } catch {
      toast({ variant: "error", title: "Couldn't copy the invite link", description: "Check your browser's clipboard permission and try again." });
    }
  }

  // Nothing else in the app ever calls POST /sessions/{id}/complete — this screen leaving
  // is the one and only trigger, so it must actually fire exactly once per class, not get
  // skipped (session stuck "Scheduled" forever, invisible on Attendance, payout never
  // accrues) or double-fire (readyToClose + the Leave button both reachable in one visit).
  const completedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | undefined>(undefined);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const celebrateAllRef = useRef<((message?: string) => void) | null>(null);
  const raiseHandRef = useRef<((raised: boolean) => void) | null>(null);
  const sendAnnotationRef = useRef<((opJson: string) => void) | null>(null);
  // Teacher-only: broadcasts her own pin/spotlight choice to the class (see the
  // pinnedEndpointChanged listener below) — set once InteractivePanel's hub connection
  // is ready, same pattern as the other senders it hands back via onReady.
  const setPinnedRef = useRef<((participantId: string | null) => void) | null>(null);
  const annotationOverlayRef = useRef<AnnotationOverlayHandle>(null);
  // Teacher-only "mark on top of what's on screen" tool — off by default so it never
  // steals pointer events from Jitsi's own controls (screen-share picker, mute, etc.)
  // unless the teacher deliberately turns it on. See AnnotationOverlay for why it's
  // deliberately ephemeral (no history the way the whiteboard has).
  const [annotateOn, setAnnotateOn] = useState(false);
  const [annotateColor] = useState("#EF4444");
  const jitsiApiRef = useRef<{ executeCommand: (command: string, ...args: unknown[]) => void } | null>(null);
  const [lobbyEnabled, setLobbyEnabled] = useState(false);
  // jitsiApiRef being populated doesn't itself trigger a re-render (it's a ref) — this
  // tracks the same fact as state so the Waiting Room button can disable itself until
  // Jitsi has actually loaded, instead of looking clickable and silently no-oping.
  const [jitsiReady, setJitsiReady] = useState(false);
  const [callDegraded, setCallDegraded] = useState(false);
  // Recording-observer only — see the readyToClose listener below.
  const [callEnded, setCallEnded] = useState(false);
  const [recording, setRecording] = useState(false);
  // Auto-recording has no success confirmation of its own — startRecording is a fire-and-
  // forget IFrame command, so the only signals that it actually took are recordingStatusChanged
  // (on: true) or its own reported error. Without this, a deployment with no Jibri pool (the
  // documented "no-op until Jibri exists" state — see docs/JITSI_ARCHITECTURE.md) recorded
  // nothing and told nobody: the teacher just never saw a REC badge, with no way to tell that
  // apart from "recording is fine, just not showing." Null = nothing wrong (or not attempted);
  // a string = shown as a dismissible banner with the reason, teacher-only.
  const [recordingIssue, setRecordingIssue] = useState<string | null>(null);
  // Jibri only ever records the room's own stage/dominant view -- it can't see our whiteboard/
  // quiz overlay, which lives in a separate cross-origin-iframed page it has no access to. The
  // one reliable fix that needs no server-side changes: have the teacher screen-share this same
  // tab, which Jitsi already treats as normal recordable content. Tracks Jitsi's own
  // screenSharingStatusChanged event so the nudge banner below can reappear if sharing stops.
  const [screenShareActive, setScreenShareActive] = useState(false);
  // Dismissible without being permanently silenced: cleared again on the next successful
  // share-start, so if the teacher shares then later stops mid-class, the reminder comes back
  // rather than staying dismissed for the rest of the call.
  const [screenShareBannerDismissed, setScreenShareBannerDismissed] = useState(false);
  const recordingWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // An "off" recordingStatusChanged with an error used to declare auto-recording failed the
  // instant it arrived — but Jibri can report a transient failure (e.g. its first-picked
  // instance was busy) and then succeed moments later on its own retry, or simply take longer
  // than a hopeful guess at how fast recording should start. Confirmed live: the warning
  // flashed even though recording was in fact on. Stashing the reason here instead lets the
  // watchdog below stay the single point that actually declares failure, only once nothing
  // has succeeded by the time it fires — the "off+error" event just supplies a real reason
  // for that eventual message instead of a generic guess.
  const recordingErrorReasonRef = useRef<string | null>(null);
  // Teacher-only, advisory: nothing on this self-hosted Jitsi deployment actually cuts a
  // call off at its scheduled end (no duration cap — see Docs/LONG_DURATION_SESSIONS.md),
  // so a class quietly running long has no signal at all today. Polls rather than a single
  // setTimeout because scheduledEndAtUtc isn't known until the async jitsi-join lookup in
  // init() below resolves, and this effect can't depend on that without re-running the
  // whole Jitsi connection setup.
  const [timeUpAlerted, setTimeUpAlerted] = useState(false);
  const timeUpFiredRef = useRef(false);
  const scheduledEndRef = useRef<string | null>(null);
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
  const defaultLobbyRef = useRef(true);
  // The init effect below only depends on [room, mode] (see its own comment on why), so
  // anything it closes over from render — including userName — would otherwise be frozen
  // at whatever it was on first mount. flushMedia posts engagement (talk-time, camera-on)
  // under that name when the participant leaves; without this ref it kept attributing a
  // parent's own account name instead of the student's, even after `displayName` resolved
  // moments later (e.g. the parent's child list hadn't finished loading yet on first render).
  const userNameRef = useRef(userName);
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  // So the celebration clap sound is ready on whichever gesture a student makes
  // first — joining, clicking a tab — instead of waiting for one that never comes
  // before the class's first celebration and landing silently for that student.
  useEffect(() => primeAudioUnlock(), []);

  useEffect(() => {
    let cancelled = false;
    getClassroomSettings()
      .then((settings) => {
        if (!cancelled) {
          autoRecordRef.current = settings.autoRecordEnabled;
          defaultLobbyRef.current = settings.defaultLobbyEnabled;
        }
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

  // "End Class" handler — the only place in the whole app that ever calls the complete-
  // session endpoint (nothing runs this on a timer or on plain Leave, which stays a
  // non-terminal pause). Marks the class delivered: accrues the teacher's payout for it,
  // generates/sends the class summary. Never blocks the teacher's exit on the network call
  // — fire-and-forget, with a toast only on a real failure so a stuck-Scheduled session
  // doesn't silently stay invisible on Attendance/Payout with no indication anything went wrong.
  function completeAndLeave(summary?: string) {
    if (mode === "teacher" && interactive && !completedRef.current) {
      completedRef.current = true;
      completeSession(sessionId!, summary)
        .then(() => toast({ variant: "success", title: "Class ended", description: "Marked delivered — your payout for it will reflect shortly." }))
        .catch((err: unknown) => {
          // 400 here is almost always "already completed" (e.g. a double-click on the
          // confirm button) — not a real failure, so nothing needs surfacing.
          if (err instanceof ApiError && err.status === 400) return;
          const message = err instanceof Error ? err.message : "Could not save this class's completion.";
          toast({
            variant: "error",
            title: "Class ended, but completion didn't save",
            description: `${message} Ask an admin to check "${title ?? "this class"}" if it doesn't show as delivered.`,
          });
        });
    }
    navigate(-1);
  }

  // Post-class feedback (teacher feedback: parents want to know what was actually covered,
  // not the engagement-stats auto-summary CompleteAsync falls back to when this is skipped).
  // Composed into the same free-text `summary` completeSession already accepts and emails to
  // the batch's parents — no new backend field needed, just an actual prompt for content.
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTopic, setFeedbackTopic] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"completed" | "partial">("completed");
  const [feedbackRemarks, setFeedbackRemarks] = useState("");

  function openFeedbackForm() {
    setLeaveConfirmOpen(false);
    setTimeUpAlerted(false);
    setFeedbackOpen(true);
  }

  function submitFeedback() {
    const lines = [
      feedbackTopic.trim() ? `Topic: ${feedbackTopic.trim()}` : null,
      `Status: ${feedbackStatus === "completed" ? "Completed" : "Partially completed"}`,
      feedbackRemarks.trim() ? `Remarks: ${feedbackRemarks.trim()}` : null,
    ].filter((line): line is string => line !== null);
    setFeedbackOpen(false);
    completeAndLeave(lines.length > 0 ? lines.join("\n") : undefined);
  }

  function skipFeedback() {
    setFeedbackOpen(false);
    completeAndLeave();
  }

  function celebrate(message?: string) {
    setCelebrationMessage(message);
    setCelebrating(true);
  }

  // Shared chip styling for the two header toggles (Waiting Room / Interactive) — both
  // now sit inside one segmented-control wrapper (see header JSX) that supplies the
  // shared border/background, so the buttons themselves only need to style their own
  // text and "engaged" (aria-pressed) state, not fake being a standalone chip anymore.
  const headerToggleClass =
    "gap-1.5 border-0 bg-transparent text-white/70 shadow-none transition-colors hover:bg-white/10 hover:text-white aria-pressed:bg-brand-violet aria-pressed:text-white aria-pressed:shadow-md aria-pressed:shadow-brand-violet/25";

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
      if (talkSeconds > 0) postEngagement(sessionId, userNameRef.current, "TalkTimeSeconds", talkSeconds);
      if (camSeconds > 0) postEngagement(sessionId, userNameRef.current, "CameraOnSeconds", camSeconds);
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
      if (joinOverride) {
        joinDomain = joinOverride.domain;
        joinToken = joinOverride.token ?? undefined;
      } else if (interactive) {
        try {
          const join = await getJitsiJoin(sessionId!);
          joinRoom = join.room;
          joinDomain = join.domain;
          joinToken = join.token ?? undefined;
          scheduledEndRef.current = join.scheduledEndAtUtc;
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
          // Force every call through the JVB media bridge instead of a direct
          // peer-to-peer WebRTC connection. P2P has much weaker NAT traversal (no
          // TURN fallback) than JVB-relayed media — on this self-hosted deployment
          // that's the standard cause of "I can see their name/tile but hear and
          // see nothing," since presence/roster still work (XMPP) while the actual
          // media never connects. The JVB sits on a public IP with the right ports
          // mapped, so relaying through it is far more likely to succeed.
          p2p: { enabled: false },
          // Screen share reported as laggy/slow — expected consequence of the p2p:false
          // fix above: it now competes with everyone's camera video for the same JVB
          // uplink instead of going direct. Screen content (slides, documents) doesn't
          // need 30fps to read; capping it trades away motion smoothness nobody needs
          // here for a meaningfully lower, steadier bitrate, which is what actually
          // fixes "lag" (encoder/network backlog) as opposed to visual quality.
          desktopSharingFrameRate: { min: 5, max: 15 },
          // Teacher feedback: voice sometimes too quiet, sometimes suddenly loud/high-pitched.
          // Never explicitly requested before — Jitsi/the browser only applied whatever a given
          // device's own default happened to be, so behavior varied by laptop/headset instead of
          // being consistent. Explicitly requesting all three standard WebRTC audio-processing
          // constraints on every mic capture (not just relying on an unset default) is the
          // standard mitigation for this class of complaint: auto-gain leveling instead of raw
          // mic gain swings, plus echo/noise cleanup that can otherwise read as pitch/clarity
          // artifacts. Doesn't need a Jibri/server change — applied client-side per participant.
          constraints: {
            audio: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
          },
          // A curated default virtual background (our own brand navy/violet/amber gradient,
          // offered as a preset next to Jitsi's own stock options in the camera-background
          // picker) instead of everyone starting from Jitsi's generic defaults or having to
          // upload their own — same idea as Google Meet's built-in background gallery.
          // branding.json's "virtualBackgrounds" array is what actually supplies it; this
          // config key just tells Jitsi where to fetch that JSON from. Served by the same
          // Jitsi web container as everything else (see docker-compose.yml's web volumes).
          dynamicBrandingUrl: "https://thereadernest.co.in/branding/branding.json",
          // Don't let the browser suggest/remember this room outside our own scheduling flow.
          doNotStoreRoom: true,
          // Without an explicit subject, Jitsi's own top bar falls back to displaying the
          // raw room slug (an opaque, scrambled-looking id string) — this replaces it with
          // the same class title already shown in our own header just above it.
          subject: title ?? "Live class",
          // Moderator controls (mute/stop-video/stop-screenshare-for-someone-else, kick,
          // grant moderator) belong to the teacher only — a parent or student must never
          // see those entries on another participant's tile menu. The authoritative gate
          // is the `moderator` claim on the signed join token (SessionService/JitsiTokenService
          // — Teacher/Admin only, see JITSI_ARCHITECTURE.md), which prosody's token auth
          // turns into real room affiliation once Settings → Integrations → Jitsi Meet has
          // appId/appSecret configured. This config is a client-side backstop for that same
          // rule: on a deployment without JWT room auth wired up yet, Jitsi's own fallback
          // is "first participant to join becomes moderator," which could hand a parent or
          // student full moderator controls if they happen to join first. Disabling these
          // per this embed's own `mode` means a parent/student session never renders the
          // controls at all, regardless of which side of that fallback it lands on.
          disableRemoteMute: mode !== "teacher",
          remoteVideoMenu: {
            disableKick: mode !== "teacher",
            disableGrantModerator: mode !== "teacher",
          },
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          DEFAULT_REMOTE_DISPLAY_NAME: "Student",
          // Video-tile letterbox before a camera loads, matched to our own dark panel color.
          DEFAULT_BACKGROUND: "#161B33",
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          // Teacher feedback: tile view only showed 4 students at once. Never overridden here
          // before — the self-hosted deployment's own default interface_config.js was the only
          // thing setting it. 3 columns gives a 3x3 = 9-tile grid before Jitsi starts paging.
          TILE_VIEW_MAX_COLUMNS: 3,
          // Curated for a small tutoring classroom — drop enterprise features (livestream,
          // shared video/audio, security/profile, dial-in, stats) that don't apply here.
          // "recording" and "mute-everyone" are moderator-only actions — Jitsi hides them
          // from a genuinely non-moderator participant on its own, but (same reasoning as
          // the remoteVideoMenu/disableRemoteMute config above) that's only reliable once
          // JWT room auth is wired up; leaving them out of a non-teacher embed's own
          // button list entirely is the backstop for a deployment that isn't there yet.
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "raisehand",
            "tileview",
            "videobackgroundblur",
            ...(mode === "teacher" && !isRecordingObserver ? (["recording", "mute-everyone"] as const) : []),
            "fullscreen",
            "settings",
            // Deliberately no "hangup" here — our own Leave button (header, top-right)
            // is the one and only way to leave: it asks for confirmation first and lets
            // the InteractivePanel/hub cleanup run through React's normal unmount, same
            // as any other navigation away from this screen. Jitsi's own hangup button
            // fires `readyToClose` straight into navigate(-1) with no confirmation at
            // all — a second, inconsistent exit path is worse than just not having it.
          ],
        },
      });
      jitsiApiRef.current = api;
      setJitsiReady(true);
      // The recording observer has no browser history to go back to (Jibri navigated here
      // directly via nginx's proxy, not through the app's own router) -- navigate(-1) on this
      // route is undefined-ish. Just mark the call ended and stop; there's nowhere else to send it.
      api.addListener("readyToClose", () => {
        if (isRecordingObserver) {
          setCallEnded(true);
        } else {
          navigate(-1);
        }
      });
      api.addListener("videoConferenceJoined", (payload) => {
        media.selfId = payload?.id ?? "";
        media.camSince = Date.now(); // camera starts unmuted unless Jitsi says otherwise
        // A small class reads better as a grid of faces than one spotlighted speaker.
        api?.executeCommand("setTileView", true);
        // Waiting room on by default (admin-configurable, Settings → Integrations →
        // Jitsi Meet "defaultLobby") — a student joining before the teacher shouldn't land
        // straight into an unattended room. Only the teacher's own join actually enables the
        // room's lobby (toggleLobby is a moderator action); a student who arrives before the
        // teacher already can't get further than Jitsi's own prejoin/lobby screen regardless,
        // and re-toggling it here on the student's side would just flicker the same state.
        if (mode === "teacher" && defaultLobbyRef.current) {
          api?.executeCommand("toggleLobby", true);
          setLobbyEnabled(true);
        }
        // Auto-apply our own on-brand background as the teacher's starting camera
        // background — dynamicBrandingUrl (above) only adds it to the picker as an
        // available *choice*; this is what actually makes it the default someone sees
        // without picking anything, same as branding.json's src. Still just a starting
        // point: the toolbar's own background button lets the teacher turn it off or
        // pick something else afterward.
        // Students/children stay on "none" (their own real camera) instead of having
        // this forced on them — a parent joining on a child's behalf doesn't expect the
        // app to silently change what the child's camera shows.
        if (mode === "teacher") {
          api?.executeCommand("setVirtualBackground", true, "https://thereadernest.co.in/images/meeting-bg-default.jpg");
        } else {
          // Not just "skip setting one" — Jitsi remembers the last-picked virtual
          // background per browser (jitsi-meet.localStorage), so a child's device that
          // got the branded background force-applied before this fix still has it saved
          // as their "last choice" and would silently keep reapplying it on every future
          // join even though nothing here sets it anymore. Explicitly turning it off
          // clears that remembered choice too, actually landing on "none" rather than
          // just not making it worse going forward.
          api?.executeCommand("setVirtualBackground", false);
        }
        // Skipped for the recording observer -- it only ever renders because a recording is
        // already running (it's Jibri's own capture of this exact call), so firing this again
        // would double-start it against the same room.
        if (mode === "teacher" && autoRecordRef.current && !isRecordingObserver) {
          // Auto session recording: starts when the host joins; requires Jibri
          // on the Jitsi deployment (no-op on deployments without it). Admin can
          // turn this off in Settings → Integrations → Jitsi Meet ("autoRecord"),
          // which leaves recording to the manual fallback on teacher My Classes.
          recordingErrorReasonRef.current = null;
          api?.executeCommand("startRecording", { mode: "file" });
          // startRecording has no success callback of its own — a deployment with no
          // Jibri pool (or one that's exhausted) either fires recordingStatusChanged
          // with on:false + a reason, or in some configurations fires nothing back at
          // all (Jicofo simply can't dispatch the request). Either way, if the "on"
          // confirmation hasn't arrived within a generous window, treat it as failed
          // rather than leaving the teacher to guess why no REC badge ever appeared —
          // generous because Jibri legitimately takes a while to spin up under load,
          // and firing this too eagerly is worse than firing it a few seconds late.
          if (recordingWatchdogRef.current) clearTimeout(recordingWatchdogRef.current);
          recordingWatchdogRef.current = setTimeout(() => {
            setRecording((current) => {
              if (!current) {
                setRecordingIssue(
                  recordingErrorReasonRef.current
                    ? `Auto-recording failed to start (${recordingErrorReasonRef.current}). This class is not being recorded automatically — ` +
                        'use the manual "Recording" button on My Classes if you need one.'
                    : "Auto-recording didn't start (likely no recording capacity on the video server). " +
                        "This class is not being recorded automatically — use the manual \"Recording\" button on My Classes if you need one."
                );
              }
              return current;
            });
          }, 25000);
        }
      });
      // Auto recording registration: when the deployment publishes the recording
      // link, file it against the session (drives the 15-day parent window).
      api.addListener("recordingLinkAvailable", (payload) => {
        // Skipped for the recording observer -- Jibri's own finalize-recording webhook
        // (FinalizeJibriRecordingAsync) is the single source of truth for registering this
        // recording; registering it again here too would create a duplicate SessionRecording
        // row for the same file.
        if (mode === "teacher" && interactive && !isRecordingObserver && payload?.link) {
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
      // Jitsi's native pin is purely local to whichever browser clicked it — a teacher
      // pinning herself while screen-sharing used to show "Pinned" on her own screen only,
      // with every student still seeing her in the small tile, since nothing relayed that
      // choice anywhere else. Forwarding the teacher's own pin changes over the classroom
      // hub (setPinnedRef, wired once InteractivePanel's connection is ready) is what makes
      // a student's own view actually follow along — see InteractivePanel's onPinChanged.
      // A student pinning someone locally for their own view is deliberately left alone.
      api.addListener("pinnedEndpointChanged", (payload) => {
        if (mode !== "teacher") return;
        setPinnedRef.current?.(payload?.id ?? null);
      });
      // Jitsi's own signal for a dropped media/XMPP connection mid-call — the video
      // tiles freeze silently otherwise, with nothing in our own chrome saying why.
      api.addListener("connectionInterrupted", () => setCallDegraded(true));
      api.addListener("connectionRestored", () => setCallDegraded(false));
      api.addListener("screenSharingStatusChanged", (payload) => {
        const on = !!payload?.on;
        setScreenShareActive(on);
        if (on) setScreenShareBannerDismissed(false);
        // Teacher feedback (grid 4→9, WBS Round 2 #25): Jitsi's own default is to drop out of
        // tile view into a spotlighted "stage" layout the instant anyone starts screen-sharing —
        // the shared content fills most of the screen and everyone else shrinks to a thin
        // filmstrip, which is exactly the "PPT takes over, I can't see my students" complaint.
        // Re-asserting tile view on every share start/stop keeps the shared screen as just one
        // more tile in the same grid (up to the 9 TILE_VIEW_MAX_COLUMNS=3 allows) instead of
        // letting Jitsi silently switch layouts underneath the teacher.
        jitsiApiRef.current?.executeCommand("setTileView", true);
      });
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
          // Deliberately NOT declaring failure here, and NOT clearing the watchdog — an
          // "off + error" event can be a transient hiccup Jibri recovers from on its own
          // (its first-picked instance was busy, it retries the next one) rather than a
          // final answer. Showing "recording failed" immediately used to flash a scary,
          // wrong warning even on classes where recording was in fact about to start
          // fine. Just remember the reason so the watchdog's own eventual verdict — the
          // one place that actually declares failure, once nothing has succeeded by the
          // time it fires — can quote it instead of a generic guess.
          recordingErrorReasonRef.current = payload.error;
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

  // userName is deliberately not a dependency of the init effect above — recreating the
  // whole Jitsi connection just to relabel yourself would drop everyone's call to reconnect
  // over a name change. But that means a parent joining before their child list has finished
  // loading (SessionProvider fetches it async) got initialized with userInfo.displayName
  // still falling back to their own account name, and — since the effect never re-ran —
  // stayed shown as themselves in Jitsi's own UI (self tile, remote participants' view) for
  // the rest of the call even after `displayName` resolved to the student's real name a
  // render or two later. This pushes the correction through Jitsi's own "displayName"
  // command once it's actually known, without touching the connection itself.
  useEffect(() => {
    if (!jitsiReady) return;
    jitsiApiRef.current?.executeCommand("displayName", userName);
  }, [jitsiReady, userName]);

  // Fires once, the first time a check lands at/after the scheduled end — not on every
  // poll — so it's one modal prompt, not a repeat every 30 seconds. Deliberately a choice
  // (Continue Class / Close Class), not just an advisory toast: the call was never actually
  // going to be cut off (see the timeUpFiredRef/scheduledEndRef setup above), but a passive
  // dismiss-only banner left the teacher to figure out on their own that continuing needed
  // no action at all — this makes "keep teaching" as explicit and intentional a choice as
  // ending the class.
  useEffect(() => {
    if (mode !== "teacher" || !interactive) return;
    const check = setInterval(() => {
      if (!scheduledEndRef.current || timeUpFiredRef.current) return;
      if (Date.now() >= new Date(scheduledEndRef.current).getTime()) {
        timeUpFiredRef.current = true;
        setTimeUpAlerted(true);
      }
    }, 30_000);
    return () => clearInterval(check);
  }, [mode, interactive]);

  return (
    <div className="flex h-screen flex-col bg-brand-navyDark bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,252,0.10),transparent_60%)]">
      <header className="relative flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-b from-brand-navyDark/95 to-brand-navyDark/75 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-md sm:px-5">
        {/* Thin brand-gradient hairline instead of a flat border — ties the header to the
            same violet/amber accent used by the celebrate button and active toggles below,
            so the chrome reads as one designed system rather than a plain dark bar. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-violet/60 to-transparent" aria-hidden="true" />
        <div className="flex min-w-0 items-center gap-3">
          <Logo showWordmark={false} imgClassName="h-8 w-8" />
          <div className="hidden h-8 w-px bg-white/10 sm:block" aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
              <p className="truncate text-sm font-semibold tracking-tight text-white">{title ?? "Live class"}</p>
            </div>
            <p className="hidden text-[10px] font-medium uppercase tracking-wide text-white/40 sm:block">Live classroom</p>
          </div>
          {/* Role context: mainly matters for the parent-preview path (mode="student" on a
              parent account) where "whose view is this" is otherwise only implied. */}
          <span
            className={cn(
              "hidden shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex",
              mode === "teacher" ? "bg-role-teacher/15 text-role-teacher" : "bg-role-student/15 text-role-student"
            )}
          >
            {mode === "teacher" ? "Teacher" : "Student"}
          </span>
          {recording && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-300 ring-1 ring-inset ring-destructive/25">
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
          {/* Grouped as one segmented control (shared pill housing) instead of two
              independently-bordered chips — reads as one family of view toggles. */}
          {(mode === "teacher" || interactive) && (
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
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
            </div>
          )}
          {inviteUrl && (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={copyInviteLink}
              title="Copy a shareable link to this meeting"
            >
              <UserPlus className="h-3.5 w-3.5" /> Invite
            </Button>
          )}
          {/* No Leave button for the recording observer -- there's no human to click it, and
              the token it joined with is moderator: false anyway. */}
          {!isRecordingObserver && (
            <>
              <div className="h-6 w-px bg-white/10" aria-hidden="true" />
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 rounded-full shadow-md shadow-destructive/30 transition-transform hover:scale-[1.03]"
                onClick={() => setLeaveConfirmOpen(true)}
              >
                <PhoneOff className="h-4 w-4" />
                Leave
              </Button>
            </>
          )}
        </div>
      </header>
      {/* One button, one dialog: a separate "End Class" button next to Leave meant a
          teacher could just click the familiar red Leave button out of habit and skip
          completion entirely — silently reproducing the exact "class never marked
          delivered" bug this whole flow exists to fix. Asking every single time removes
          that escape hatch. Non-teachers (and non-interactive rooms, e.g. a personal
          meeting) have nothing to complete, so they get the plain single-action dialog. */}
      {mode === "teacher" && interactive ? (
        <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Leaving the class</DialogTitle>
              <DialogDescription>Is this class actually over, or are you just stepping away for a moment?</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {/* Button's own base styling is h-10 + whitespace-nowrap (built for single-line
                  labels) — a two-line label needs h-auto and whitespace-normal explicitly, or
                  it forces the whole dialog wider instead of wrapping (exactly what shipped
                  here the first time: clipped text and a horizontal scrollbar). */}
              <Button
                variant="secondary"
                className="h-auto w-full items-start justify-start gap-2.5 whitespace-normal rounded-xl border border-success/30 bg-success/15 px-3.5 py-3 text-left text-success hover:bg-success/25"
                onClick={openFeedbackForm}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">End the class</span>
                  <span className="text-xs font-normal leading-snug opacity-80">Marks it delivered, calculates your payout, emails today's summary to parents. Can't be undone.</span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto w-full items-start justify-start gap-2.5 whitespace-normal rounded-xl px-3.5 py-3 text-left"
                onClick={() => {
                  setLeaveConfirmOpen(false);
                  navigate(-1);
                }}
              >
                <PhoneOff className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">Just leave for now</span>
                  <span className="text-xs font-normal leading-snug opacity-80">Class stays open — whiteboard/roster pause for students until you rejoin from My Classes.</span>
                </span>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveConfirmOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={leaveConfirmOpen}
          onOpenChange={setLeaveConfirmOpen}
          title="Leave the class?"
          description="You can rejoin any time before the class ends."
          confirmLabel="Leave"
          destructive
          onConfirm={() => navigate(-1)}
        />
      )}
      {/* Teacher-only, fires once at the scheduled end (see the effect above): the call was
          never actually going to be cut off (no duration cap on this self-hosted Jitsi
          deployment — see docs/LONG_DURATION_SESSIONS.md), so this is a deliberate choice
          rather than a passive "time's up" notice. "Close Class" reuses completeAndLeave —
          the exact same payout/summary-email/navigate-away logic the header's own "End the
          class" button already runs. "Continue Class" just dismisses; nothing about the
          call changes either way. */}
      <Dialog open={mode === "teacher" && timeUpAlerted} onOpenChange={setTimeUpAlerted}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-amber/15 text-brand-amber">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <DialogTitle>Scheduled class time is up</DialogTitle>
            <DialogDescription>
              Keep teaching for as long as you need, or close the class now if you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              className="h-auto w-full items-start justify-start gap-2.5 whitespace-normal rounded-xl px-3.5 py-3 text-left"
              onClick={() => setTimeUpAlerted(false)}
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">Continue Class</span>
                <span className="text-xs font-normal leading-snug opacity-80">The call stays open exactly as it is — nothing is restricted.</span>
              </span>
            </Button>
            <Button
              variant="secondary"
              className="h-auto w-full items-start justify-start gap-2.5 whitespace-normal rounded-xl border border-success/30 bg-success/15 px-3.5 py-3 text-left text-success hover:bg-success/25"
              onClick={openFeedbackForm}
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">Close Class</span>
                <span className="text-xs font-normal leading-snug opacity-80">Marks it delivered, calculates your payout, emails today's summary to parents. Can't be undone.</span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Teacher feedback (WBS Round 2 #2): parents only ever saw an engagement-stats
          auto-summary unless a teacher happened to type free-text into completeSession's
          optional `summary` param — nothing ever prompted for it. This is the prompt. */}
      <Dialog open={feedbackOpen} onOpenChange={(open) => !open && skipFeedback()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Before you go — quick class summary</DialogTitle>
            <DialogDescription>Sent straight to today's parents. Skip if you're in a rush.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-topic">What was taught today</Label>
              <Textarea
                id="feedback-topic"
                rows={2}
                value={feedbackTopic}
                onChange={(e) => setFeedbackTopic(e.target.value)}
                placeholder="e.g. Short vowel sounds, blending CVC words"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Topic status</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={feedbackStatus === "completed"}
                  className={cn(feedbackStatus === "completed" && "border-success bg-success/10 text-success")}
                  onClick={() => setFeedbackStatus("completed")}
                >
                  Completed
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={feedbackStatus === "partial"}
                  className={cn(feedbackStatus === "partial" && "border-brand-amber bg-brand-amber/10 text-brand-amber")}
                  onClick={() => setFeedbackStatus("partial")}
                >
                  Partially completed
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="feedback-remarks">Remarks for the parent (optional)</Label>
              <Textarea
                id="feedback-remarks"
                rows={2}
                value={feedbackRemarks}
                onChange={(e) => setFeedbackRemarks(e.target.value)}
                placeholder="e.g. Please practice these words at home this week"
              />
            </div>
          </div>
          <DialogFooter className="flex-wrap">
            <Button variant="outline" onClick={skipFeedback}>
              Skip
            </Button>
            <Button onClick={submitFeedback}>Save &amp; end class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {mode === "teacher" && recordingIssue && (
        <div className="mx-3 mt-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-brand-amber/25 bg-brand-amber/10 px-4 py-3 text-xs text-brand-amber shadow-lg shadow-black/20 backdrop-blur-md">
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
      {/* Jibri (the recording bot) only ever sees this room's own video/stage view -- it has
          no access to our whiteboard/quiz overlay, which lives behind a cross-origin iframe
          boundary no server-side fix can cross. Screen-sharing this same tab is the one
          reliable way to get it into the recording: Jitsi already treats a screen-share as
          normal recordable stage content, the same as it does for anyone else's shared screen.
          Shown only to the real teacher (never the recording observer, which has no one to
          click it) and only once a recording is actually running -- no point nagging before
          there's anything to include the whiteboard in. */}
      {mode === "teacher" && !isRecordingObserver && recording && !screenShareActive && !screenShareBannerDismissed && (
        <div className="mx-3 mt-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-brand-violet/25 bg-brand-violet/10 px-4 py-3 text-xs text-brand-violet shadow-lg shadow-black/20 backdrop-blur-md">
          <Sparkles className="h-4 w-4 shrink-0 translate-y-0.5" />
          <p className="flex-1">
            Share your screen (choose <span className="font-semibold">This Tab</span>) so the recording includes your whiteboard and quiz.
          </p>
          <button
            type="button"
            onClick={() => jitsiApiRef.current?.executeCommand("toggleShareScreen")}
            className="shrink-0 font-semibold underline decoration-brand-violet/50 underline-offset-2 hover:decoration-brand-violet"
          >
            Share screen
          </button>
          <button
            type="button"
            onClick={() => setScreenShareBannerDismissed(true)}
            className="shrink-0 font-semibold underline decoration-brand-violet/50 underline-offset-2 hover:decoration-brand-violet"
          >
            Dismiss
          </button>
        </div>
      )}
      {callEnded ? (
        // Recording observer only (see the readyToClose listener) -- an inert end state with
        // nowhere to navigate to, since Jibri opened this page directly, not through the app's
        // own router.
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/60 shadow-2xl shadow-black/40 backdrop-blur-md">
            <p className="font-medium">Call ended.</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex max-w-sm items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 px-5 py-4 text-sm text-red-200 shadow-2xl shadow-black/40 backdrop-blur-md">
            <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5 text-red-300" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      ) : (
        // Framed "stage" layout: the call and the Interactive panel now sit as two
        // separate inset, rounded cards with real breathing room between them and the
        // window edge, instead of both stretching edge-to-edge with a flat divider —
        // reads as a deliberately designed workspace rather than a raw video embed.
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:flex-row">
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-brand-navy shadow-2xl shadow-black/40 ring-1 ring-white/5">
            <div ref={containerRef} className="h-full w-full" />
            {/* Sits above the Jitsi iframe (which owns nothing above z-20 of its own) so a
                mark drawn here shows on top of whatever's currently on screen — camera or a
                shared screen. Renders for students too (read-only) so they see the teacher's
                marks live; only the teacher's canDraw+active combination ever captures pointer
                events, so it never blocks Jitsi's own controls otherwise. */}
            <AnnotationOverlay
              ref={annotationOverlayRef}
              canDraw={mode === "teacher"}
              active={annotateOn}
              color={annotateColor}
              onLocalOp={(op) => sendAnnotationRef.current?.(JSON.stringify(op))}
            />
            {mode === "teacher" && (
              <button
                type="button"
                title={annotateOn ? "Stop marking on screen" : "Mark on screen — draw over the video or a shared screen"}
                aria-label={annotateOn ? "Stop marking on screen" : "Mark on screen"}
                aria-pressed={annotateOn}
                onClick={() => setAnnotateOn((o) => !o)}
                className={cn(
                  "absolute bottom-20 right-3 z-30 flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  annotateOn ? "bg-red-500 text-white shadow-red-500/40" : "bg-brand-navy/90 text-white/80 shadow-black/30 backdrop-blur-xl"
                )}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {/* The empty room otherwise reads as broken rather than expected — every
                screenshot of this state so far has been just a lone avatar in a large dark
                void with nothing saying that's normal. pointer-events-none + a low z-index
                (behind the corner cards/celebrate button, but still above the Jitsi iframe)
                keeps it purely informational, never intercepting a click meant for Jitsi's
                own controls around/behind it. Sits low, clear of Jitsi's centered avatar and
                its own toolbar (~64px+ tall) at the very bottom. */}
            {mode === "teacher" && jitsiReady && participants.length === 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex justify-center px-6">
                <p className="flex items-center gap-2.5 rounded-full border border-white/10 bg-brand-navy/80 px-4 py-2 text-xs font-medium text-white/70 shadow-xl shadow-black/30 ring-1 ring-white/5 backdrop-blur-xl">
                  <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-amber opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-amber" />
                  </span>
                  Your class is live — students will appear here as they join.
                </p>
              </div>
            )}
            {mode === "teacher" && interactive && (
              // A labeled pill, not a bare icon circle — the earlier icon-only version was
              // the one a live screenshot showed getting missed entirely; text removes any
              // doubt about what the button does. bottom-20 (not bottom-3) clears Jitsi's
              // own toolbar the same way the empty-room hint above does.
              <button
                type="button"
                title="Send a celebration to the class"
                aria-label="Send a celebration to the class"
                onClick={() => (celebrateAllRef.current ?? celebrate)("Great job, everyone! 🎉")}
                className="group absolute bottom-20 left-3 z-20 flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-violet px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-violet/40 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-brand-violet/50 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PartyPopper className="h-4 w-4 transition-transform group-hover:rotate-12" />
                Celebrate
              </button>
            )}
            {/* Wraps the (now non-self-positioning) leaderboard card above it — via
                GamificationOverlay's `stacked` prop — together with the Joined roster card
                in one flex column, both anchored once at this single corner, same fixed
                width and glass treatment so the pair reads as one family of cards. Both are
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
                <div className="w-64 overflow-hidden rounded-2xl border border-white/10 bg-brand-navy/90 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-xl">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <Users className="h-4 w-4 text-brand-violet" /> Joined
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">{participants.length}</span>
                  </div>
                  <div className="px-3 pb-3">
                    {participants.length === 0 ? (
                      <p className="text-xs text-white/50">Waiting for students to join…</p>
                    ) : (
                      <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto pr-1">
                        {participants.map((p) => (
                          <li key={p.id} className="flex min-w-0 items-center gap-1.5 text-sm">
                            <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-white/90">{p.displayName}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {interactive && (
            // max-h-[45vh] (md:max-h-none): below md the body stacks video above this
            // panel instead of sitting side-by-side (flex-col → md:flex-row above), so
            // without its own height cap the panel's content (Board tab's toolbar +
            // canvas, quiz, roster) claims however much height it wants and pushes the
            // video stage off-screen — reported as "can't see the video while changing
            // slides." Same fix already applied to the mock classroom's aside
            // (LiveClassroom.tsx) for the identical layout failure.
            <aside
              className={cn(
                "flex max-h-[45vh] min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-brand-navy shadow-2xl shadow-black/40 ring-1 ring-white/5 md:max-h-none md:w-[380px]",
                !panelOpen && "hidden"
              )}
            >
              <InteractivePanel
                sessionId={sessionId!}
                mode={mode}
                displayName={userName}
                hubToken={hubToken}
                onCelebrate={celebrate}
                onLeaderboard={setLeaderboard}
                onReady={({ celebrateAll, raiseHand, sendAnnotation, setPinned }) => {
                  celebrateAllRef.current = celebrateAll;
                  raiseHandRef.current = raiseHand;
                  sendAnnotationRef.current = sendAnnotation;
                  setPinnedRef.current = setPinned;
                }}
                onAnnotation={(opJson) => {
                  try {
                    annotationOverlayRef.current?.applyRemoteOp(JSON.parse(opJson) as AnnotationOp);
                  } catch {
                    /* malformed op from a stale client — ignore */
                  }
                }}
                // Applies the teacher's pin choice to this viewer's own Jitsi connection —
                // executeCommand("pinParticipant", null) is Jitsi's own documented way to
                // clear a pin, so the teacher unpinning correctly un-spotlights here too.
                onPinChanged={(participantId) => jitsiApiRef.current?.executeCommand("pinParticipant", participantId)}
              />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
