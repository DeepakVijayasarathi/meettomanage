import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, DoorOpen, GripVertical, Loader2, Maximize2, Minimize2, Pencil, PartyPopper, PhoneOff, Pin, PinOff, Sparkles, UserPlus, Users, Video, Volume2, WifiOff, X } from "lucide-react";
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
import { ApiError, userMessage } from "@/lib/api";
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

export const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      // participantRoleChanged only: "moderator" or "none" (Jitsi's own two roles).
      role?: string;
      // recordingStatusChanged only: Jitsi's own reason when a recording request is
      // rejected or drops (e.g. "resource-constraint", "service-unavailable" — no Jibri
      // free in the pool; "error" — a generic Jibri-side failure).
      error?: string;
    }) => void
  ) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  /** Synchronous snapshot of who's in the room right now -- unlike participantJoined/Left,
   *  covers participants who joined before this listener was attached (e.g. before a
   *  reconnect). Excludes the local participant, same as participantJoined/Left. */
  getParticipantsInfo?: () => { participantId: string; displayName?: string }[];
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiExternalApi;
  }
}

const scriptPromises = new Map<string, Promise<void>>();

// Bug fixed 2026-09-16: this cache is module-level, so it outlives every unmount/remount of
// JitsiLive across the whole SPA session. A stale entry here reproduced exactly as "host
// clicks Start Class repeatedly, same stuck screen every time" -- one transient script-load
// failure (or a request that never fires onload/onerror at all, e.g. a flaky network hiccup)
// used to leave a dead/never-settling promise permanently cached for that domain, so every
// later click just re-awaited the same broken promise forever instead of retrying the actual
// <script> load. Now a failed or timed-out attempt removes its own cache entry so the next
// click gets a fresh load.
function loadJitsiScript(domain: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  let promise = scriptPromises.get(domain);
  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      const timeout = setTimeout(() => {
        script.remove();
        reject(new Error("Timed out loading the Jitsi Meet API."));
      }, 15_000);
      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        reject(new Error("Could not load the Jitsi Meet API."));
      };
      document.head.appendChild(script);
    }).catch((err) => {
      scriptPromises.delete(domain);
      throw err;
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
  isPersonalRoom,
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
   *  see ClassroomHubClient's own doc comment. Only meaningful alongside isRecordingObserver,
   *  or alongside isPersonalRoom for a guest joining someone else's personal room. */
  hubToken?: string;
  /** Set by PersonalMeetingRoom.tsx and PersonalRoomGuestJoin.tsx: this room's `sessionId` is
   *  the owner's own account id (ClassroomHub.JoinSession's isPersonalRoomOwner check), not a
   *  real ClassSession -- there's nothing for "End the class" to complete, no attendance/
   *  recording to register, and no Jibri-recording screen-share nudge worth showing (nothing
   *  here is ever recorded). Only gates that session-completion/recording machinery; the
   *  Interactive panel itself (whiteboard/quiz/roster/chat) still mounts normally off `sessionId`
   *  alone, same as a real class. */
  isPersonalRoom?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardMaximized, setBoardMaximized] = useState(false);
  // The floating video tile shown over the full-screen board: it can be shrunk further, or tucked
  // away entirely when the teacher doesn't need to see the class right now (a hidden tile keeps
  // running -- it is only made invisible, never unmounted, so the call doesn't reconnect).
  const [floatCompact, setFloatCompact] = useState(false);
  const [floatHidden, setFloatHidden] = useState(false);
  useEffect(() => {
    if (!boardMaximized) setFloatHidden(false);
  }, [boardMaximized]);
  const navigate = useNavigate();
  const { userName: accountName } = useSession();
  const userName = displayName || accountName;
  const { toast } = useToast();

  // Whiteboard.tsx's "maximize" (fills the viewport, broadcasts to the whole class — see
  // its own doc comment) used to cover this header entirely, including Leave, Focus Mode
  // and Waiting Room. Fine for a normal "keep drawing" session (Escape or the board's own
  // Shrink button gets you back), but it meant a teacher who needed to leave — or who'd
  // want to notice a connection problem via the reconnecting/error banners below — had no
  // way to do either without first un-maximizing the board. Measuring the real header
  // height (not a guessed pixel constant — the header's own content, e.g. the role badge/
  // subtitle, hides below `sm`, so its height genuinely differs by breakpoint) and exposing
  // it as a CSS var lets the maximized board offset itself below the header instead of
  // covering it, so Leave stays reachable no matter what the board is doing.
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setHeaderHeight(Math.ceil(entry.contentRect.height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
  // Non-fatal, auto-clearing: shown while conference.authenticationRequired's own retry
  // (see the conferenceFailed listener below) is in flight, instead of the full-screen
  // `error` state -- that one replaces the whole call UI, which would be a false "it's
  // broken" verdict for a failure this app already knows is often transient (confirmed
  // live: the exact same room/token has gone from rejected to accepted within minutes,
  // with nothing on our side changing in between).
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  // Teacher-reported live (2026-09-17): "whiteboard itself is too small to be able to
  // annotate or write the whole thing" -- the docked Interactive panel had one fixed
  // width (380px) baked into the layout, with no way to make it bigger short of the
  // whiteboard's own separate full-screen "maximize" overlay (a different, more drastic
  // escape hatch -- see Whiteboard.tsx). A resizable panel gives a middle ground: keep
  // the call and the panel both on screen side by side, just less cramped, for a teacher
  // who wants more drawing/reading room without leaving the call view entirely. Widened
  // default (was 380) plus a user-draggable handle (below); persisted per-browser so the
  // choice sticks across classes instead of resetting every join.
  const PANEL_WIDTH_STORAGE_KEY = "trn.classroomPanelWidth";
  const DEFAULT_PANEL_WIDTH = 420;
  const MIN_PANEL_WIDTH = 320;
  const MAX_PANEL_WIDTH = 680;
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_PANEL_WIDTH;
    const stored = Number(window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY));
    return Number.isFinite(stored) && stored >= MIN_PANEL_WIDTH && stored <= MAX_PANEL_WIDTH ? stored : DEFAULT_PANEL_WIDTH;
  });
  const panelResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [resizingPanel, setResizingPanel] = useState(false);
  function resetPanelWidth() {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
    if (typeof window !== "undefined") window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(DEFAULT_PANEL_WIDTH));
  }
  function handlePanelResizeStart(e: React.PointerEvent<HTMLDivElement>) {
    panelResizeRef.current = { startX: e.clientX, startWidth: panelWidth };
    setResizingPanel(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePanelResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!panelResizeRef.current) return;
    // The panel sits on the right of the video card -- dragging the handle LEFT (toward
    // the video) should grow the panel, so the delta is startX-minus-current, not the
    // other way round.
    const delta = panelResizeRef.current.startX - e.clientX;
    setPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, panelResizeRef.current.startWidth + delta)));
  }
  function handlePanelResizeEnd() {
    panelResizeRef.current = null;
    setResizingPanel(false);
    if (typeof window !== "undefined") window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidth));
  }
  // Only cosmetic while actively dragging (matches the col-resize cursor everywhere, not
  // just over the thin handle) and stops the drag from also selecting page text as the
  // pointer sweeps across the video/panel on either side of it.
  useEffect(() => {
    if (!resizingPanel) return;
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };
  }, [resizingPanel]);
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
  // Teacher-reported live: "only works if a parent manually pins the teacher from their
  // end" -- Jitsi's native pin UI has no "pin yourself" affordance on your own tile, only
  // on everyone else's, so becoming the spotlighted main view had no self-service path at
  // all; a student/parent pinning the teacher locally only ever changed that one viewer's
  // own screen, never broadcast to the rest of the class. selfParticipantId (this client's
  // own Jitsi endpoint id, captured on join) and pinnedParticipantId (whoever is currently
  // pinned, from the same pinnedEndpointChanged listener that already forwards a teacher's
  // pin choice to the hub) are what let a header button drive the exact same
  // executeCommand("pinParticipant", ...) path on herself instead of needing anyone else's
  // click.
  const [selfParticipantId, setSelfParticipantId] = useState<string | null>(null);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  // Explicit "declutter" flag for Focus Mode — deliberately its own state, not derived
  // from (pinnedParticipantId === selfParticipantId && !panelOpen) the way the button's
  // pressed-state used to be computed. That derived condition was ALSO exactly the
  // condition that made the floating leaderboard/roster cards below reappear (their own
  // guard is "panel is closed"), so turning on Focus Mode — a teacher explicitly asking
  // for maximum, decluttered video space — silently re-added two chrome cards over the
  // exact corner of the video it was supposed to be clearing. Teacher-reported live:
  // "no way to quickly reduce clutter" and "leaderboard hiding students' names+faces" —
  // this closes the gap between the two: Focus Mode now actually suppresses them, and
  // closing the panel any OTHER way (the plain Interactive toggle, not Focus Mode) still
  // shows them same as before, since that's a real intentional summary view, not a
  // declutter request. Cleared automatically if the pin changes to someone ELSE (see the
  // effect below), so the button never lies about what's actually pinned.
  //
  // Verified live (2026-09-18): confirmed via an actual Focus Mode click in a real call
  // that this self-clearing check was too eager. executeCommand("pinParticipant", ...) is
  // fire-and-forget -- pinnedParticipantId only updates once Jitsi's own pinnedEndpointChanged
  // event echoes back, which isn't guaranteed to fire at all when there's no one else in
  // the room yet to spotlight around (e.g. a teacher turning on Focus Mode before any
  // student has joined). The original check (`!== selfParticipantId`) treated "hasn't
  // caught up yet" the same as "pin genuinely changed to someone else," so it cleared
  // focusMode back off within the same tick it was set -- the panel stayed correctly
  // closed (that part's synchronous, no Jitsi event needed), but the leaderboard/roster
  // cards popped right back, exactly the bug this button exists to prevent. Now only
  // clears on a confirmed, *different*, non-null pin -- still equally honest, since
  // pinnedParticipantId starting at null (or staying null) is never itself evidence the
  // pin changed to something else.
  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => {
    if (focusMode && pinnedParticipantId !== null && pinnedParticipantId !== selfParticipantId) setFocusMode(false);
  }, [focusMode, pinnedParticipantId, selfParticipantId]);
  // Teacher-reported live (2026-09-17): "screen continuously disturbed when someone joined
  // or left," "teacher's screen couldn't be spotlighted neither by us nor by teacher," "the
  // screen I share is too small, I can't pin it for everyone." Root cause: the
  // participantLeft and screenSharingStatusChanged listeners below unconditionally force
  // setTileView(true) back on every single time -- including right after a deliberate pin
  // (this same "Spotlight me" feature, or the teacher spotlighting her own shared screen),
  // silently undoing it the moment the next student joins/leaves or a share toggles, which
  // in a class of 15-20 kids trickling in happens constantly. Mirrors the LOCAL client's own
  // current pin state -- mode-independent (unlike pinnedParticipantId's state, which the
  // pinnedEndpointChanged listener only updates for mode==="teacher") because a student/
  // parent's own Jitsi instance fires this same event too, whether from the teacher's
  // broadcast pin (InteractivePanel's onPinChanged calling executeCommand("pinParticipant"))
  // or a local click, and their own join/leave/share events must respect it just as much.
  // A ref, not state, since the init effect below only depends on [room, mode] and would
  // otherwise close over whatever this was at mount (same reason userNameRef exists).
  const locallyPinnedIdRef = useRef<string | null>(null);
  const annotationOverlayRef = useRef<AnnotationOverlayHandle>(null);
  // Teacher-only "mark on top of what's on screen" tool — off by default so it never
  // steals pointer events from Jitsi's own controls (screen-share picker, mute, etc.)
  // unless the teacher deliberately turns it on. See AnnotationOverlay for why it's
  // deliberately ephemeral (no history the way the whiteboard has).
  const [annotateOn, setAnnotateOn] = useState(false);
  const [annotateColor] = useState("#EF4444");
  // Real teacher complaint, reported as "words disappearing": the annotate tool is
  // deliberately ephemeral (see the comment above), but nothing told the teacher that before
  // they used it -- turning on a tool and watching your own writing vanish reads as a bug,
  // not a laser-pointer feature, if you were never told to expect it. Shown once per session
  // the first time annotate is turned on, not a permanent fixture -- see the effect below.
  const [annotateFadeHintDismissed, setAnnotateFadeHintDismissed] = useState(false);
  const [annotateFadeHintShown, setAnnotateFadeHintShown] = useState(false);
  useEffect(() => {
    if (annotateOn) setAnnotateFadeHintShown(true);
  }, [annotateOn]);
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
  // How many times the auto-record retry loop below has re-issued startRecording for this
  // class. A rejection ("no Jibri available") is a final answer for that specific request —
  // Jicofo doesn't quietly retry it against a newly-freed instance on its own — so getting
  // real resilience out of a brief capacity blip (another class's recording finishing a few
  // seconds later) requires the frontend to actually ask again, not just wait longer.
  const recordingRetryCountRef = useRef(0);
  // Jibri only ever records the room's own stage/dominant view -- it can't see our whiteboard/
  // quiz overlay, which lives in a separate cross-origin-iframed page it has no access to. The
  // one reliable fix that needs no server-side changes: have the teacher screen-share this same
  // tab, which Jitsi already treats as normal recordable content. Tracks Jitsi's own
  // screenSharingStatusChanged event so the nudge banner below can reappear if sharing stops.
  const [screenShareActive, setScreenShareActive] = useState(false);
  // Teacher-reported live: screen-sharing showed as active on the teacher's own side, but
  // students never saw it. screenSharingStatusChanged only reflects local capture (getDisplayMedia
  // succeeded) -- it says nothing about whether that track actually survived to the students'
  // end. A connection blip is a known way for exactly this to happen: the main call's audio/video
  // silently re-negotiates and recovers (connectionRestored fires, callDegraded clears), but the
  // screen-share track -- added separately, after the initial join -- doesn't always come back
  // with it, leaving the teacher's local UI still saying "Sharing" while nothing is arriving on
  // the other end. Since a fresh share requires a real user gesture (browser security -- see the
  // mandatory share-screen dialog above), this can't be silently auto-recovered; the most this can
  // do is tell the teacher it happened and prompt them to restart it themselves.
  const [shareMayHaveDroppedSince, setShareMayHaveDroppedSince] = useState(false);
  // Teacher feedback: "not sure if this is required or if there's an issue with the setup" --
  // a click on Share screen that gets no browser picker at all (or an instantly-cancelled one)
  // gives zero feedback here: the mandatory dialog just sits there looking unchanged, since it
  // only ever closes on the browser's own screenSharingStatusChanged "on" confirmation (see the
  // long comment above the dialog on why it can't do better than that). The single most common
  // real cause of a silent failure like that is macOS's own separate Screen Recording OS
  // permission (distinct from the getUserMedia camera/mic prompt) being off for this browser --
  // Chrome/Safari then either shows no sources or silently no-ops instead of a catchable error.
  // A few seconds after any click with still no "on", surface that specific, actionable hint
  // instead of leaving the teacher to re-click the same button wondering if it's even doing
  // anything.
  const [shareAttempted, setShareAttempted] = useState(false);
  const [showShareOsHint, setShowShareOsHint] = useState(false);
  // Go-live day 1 feedback: "90% of complaints were about teachers being unable to switch
  // on their cameras or mics. Even after clicking, the options seem to get stuck." Those
  // toggle buttons are Jitsi's own, rendered inside its cross-origin iframe -- this app has
  // no way to see a click on them, let alone detect why one didn't take effect, so there's
  // no reliable, evidence-based way to build a targeted fix the way the mic-not-transmitting
  // report got one (that one had a concrete, verifiable cause: Safari's Permissions-Policy
  // enforcement on a cross-origin iframe, confirmed and fixed separately). What a "click does
  // nothing" symptom most commonly means in practice is the OS's own camera/mic privacy
  // setting for the browser being off entirely -- a layer *above* both the site's permission
  // prompt and the Permissions-Policy fix, on Windows as well as Mac, and one this app
  // genuinely cannot detect or bypass. A one-time, dismissible hint on join is the honest,
  // safe thing to ship here: it can't fix a real device/OS block, but it can stop it from
  // reading as a silent, unexplained "stuck" button.
  const [deviceHintDismissed, setDeviceHintDismissed] = useState(false);
  // Real upgrade on the hint above, added after the same "90% stuck camera/mic" feedback
  // recurred a second time: instead of *always* showing every teacher a generic guess,
  // actually test getUserMedia() from this page's own origin (not Jitsi's cross-origin
  // iframe) right before joining. This app can't see a click inside that iframe, but a
  // getUserMedia call made directly from here is fully visible to us -- its rejection
  // reason (NotAllowedError vs NotFoundError vs NotReadableError) is real, specific
  // evidence, not a guess, and this only appears at all for a teacher who actually has a
  // problem, not every teacher on every join. Null = not checked yet, or checked clean.
  const [preflightMediaIssue, setPreflightMediaIssue] = useState<string | null>(null);
  // Meet/Zoom-style permission popup: "asking" while the browser's own Allow/Block prompt is
  // up (points the person at it), "blocked" once denied — browsers never re-prompt after a
  // Block, so the only way back is the address-bar site settings, which this walks through.
  const [mediaDialog, setMediaDialog] = useState<null | "asking" | "blocked">(null);
  const [mediaRetryFailed, setMediaRetryFailed] = useState(false);

  async function retryMediaAccess() {
    setMediaRetryFailed(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      // The call iframe already loaded without devices; a reload is the reliable way for it to pick them up.
      window.location.reload();
    } catch {
      setMediaRetryFailed(true);
    }
  }
  // Admin-triggered app update notice (see MonitoringController.BroadcastReload) — shown
  // to everyone in the class (teacher and students alike, unlike the teacher-only banners
  // above), since anyone's browser could be the one running stale code. Deliberately a
  // dismissible prompt with a manual "Refresh now" action, not an automatic reload — see
  // that endpoint's own comment on why an unannounced refresh mid-class (dropping camera,
  // mic, and recording continuity with no warning) would be worse than the deploy it's
  // trying to deliver.
  const [reloadNotice, setReloadNotice] = useState<string | null>(null);
  // Real report: "recordings not showing on the portal even though the session says
  // recording started." Expected, not a bug -- the file doesn't exist until the class ends
  // and Jibri finishes syncing it (normally seconds now, up to ~1hr worst case via the
  // hourly backup sync job) -- but nobody told the teacher to expect that gap, so an
  // admin/parent checking mid-class or right after reads it as broken. Shown once to the
  // teacher the first time the Rec badge turns on, setting the expectation up front rather
  // than after someone's already worried by an empty recordings list.
  const [recordingTimingHintDismissed, setRecordingTimingHintDismissed] = useState(false);
  const [recordingTimingHintShown, setRecordingTimingHintShown] = useState(false);
  useEffect(() => {
    if (recording) setRecordingTimingHintShown(true);
  }, [recording]);
  // Real parent complaint: a child joined via a demo link and couldn't hear the teacher at
  // all -- video played, audio didn't. Browser autoplay policy (strictest on iPad/iPhone
  // Safari) blocks incoming audio until the viewer makes some gesture on the page; Jitsi's
  // iframe already requests the "autoplay" permission (confirmed in the deployed
  // external_api.js), so this isn't a missing-permission bug, it's the browser waiting for
  // a first tap it never got. Shown once to students/parents only -- a teacher's own audio
  // isn't "incoming," so this never applies to them.
  const [soundHintDismissed, setSoundHintDismissed] = useState(false);
  // Popup asking the teacher to share their screen right when the class starts — a click is
  // unavoidable (getDisplayMedia requires a real user gesture, a browser rule no app can
  // bypass), but a modal right at join is a clearer, earlier ask than waiting for the
  // post-recording banner further down to be the first nudge.
  const [shareScreenPromptOpen, setShareScreenPromptOpen] = useState(false);
  // Guards the "Share your screen?" prompt below to actually match its own documented intent
  // ("rather than this dialog reappearing or blocking anything") -- videoConferenceJoined,
  // which triggers it, fires again on every RECONNECT (see the comment right after
  // setShareScreenPromptOpen(true) below), not just the real first join. Teacher-reported
  // live (2026-09-17): "pop ups happening in between the class on screen" and "we got
  // disconnected automatically" -- with no guard, every one of those reconnects re-showed
  // this modal mid-class, unrelated to anything the teacher was doing at that moment.
  const shareScreenPromptShownRef = useRef(false);
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
  // Guards the one-time enable-lobby-on-join attempt below (see participantRoleChanged) so a
  // role event that fires more than once in one call never issues the command twice.
  const lobbyEnableAttemptedRef = useRef(false);
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

  // The id actually in use for everything session-scoped from here on — starts as the
  // `sessionId` prop, but getJitsiJoin (in init() below) can hand back a DIFFERENT one when
  // this class has since been edited/rescheduled: the prop is whatever this component's own
  // caller already had (e.g. a portal list fetched before the edit), and staying on that stale
  // id is exactly the bug this exists to prevent — a teacher and a student each ending up on a
  // different-but-both-"valid" session id for what they think is the same class lands them in
  // the same Jitsi video room (the room carries over on a reschedule) but two different
  // ClassroomHub groups, so neither's People roster or whiteboard ever reaches the other even
  // though the call itself looks completely normal to both. State (not just a ref) because
  // InteractivePanel's own `sessionId` prop has to re-render with the resolved value; mirrored
  // into a ref too since the init effect below only depends on [room, mode] (see its own
  // comment) and would otherwise close over whatever this was at mount, same reason userNameRef
  // exists.
  const [effectiveSessionId, setEffectiveSessionId] = useState(sessionId);
  const effectiveSessionIdRef = useRef(effectiveSessionId);
  useEffect(() => {
    effectiveSessionIdRef.current = effectiveSessionId;
  }, [effectiveSessionId]);

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
  // Same panel, but a Personal Meeting Room's `sessionId` is the owner's own account id, not a
  // ClassSession -- session-completion, attendance and recording all need a REAL backing
  // session to act on, unlike the panel itself (see isPersonalRoom's own doc comment on the
  // props type above).
  const hasClassSession = interactive && !isPersonalRoom;

  // "End Class" handler — the only place in the whole app that ever calls the complete-
  // session endpoint (nothing runs this on a timer or on plain Leave, which stays a
  // non-terminal pause). Marks the class delivered: accrues the teacher's payout for it,
  // generates/sends the class summary. Never blocks the teacher's exit on the network call
  // — fire-and-forget, with a toast only on a real failure so a stuck-Scheduled session
  // doesn't silently stay invisible on Attendance/Payout with no indication anything went wrong.
  function completeAndLeave(summary?: string) {
    // Teacher feedback: "the session only ends once I end it from my side... children
    // sometimes remain in the session while we are completing the class notes." Ending
    // class only ever completed the session record and navigated the teacher away --
    // Jitsi's own room kept running for anyone still connected, since nothing told it the
    // class was actually over. kickParticipant is the same moderator action already
    // exposed in Jitsi's own per-participant menu (see remoteVideoMenu's disableKick
    // above) -- applying it to everyone still in the room here is "End the class" actually
    // ending it for the class, not just for the teacher. Unconditional on hasClassSession —
    // a personal room's teacher ending the call should clear it out too, not just a real class.
    if (mode === "teacher") {
      for (const p of participants) {
        jitsiApiRef.current?.executeCommand("kickParticipant", p.id);
      }
    }
    if (mode === "teacher" && hasClassSession && !completedRef.current) {
      completedRef.current = true;
      completeSession(effectiveSessionId!, summary)
        .then(() => toast({ variant: "success", title: "Class ended", description: "Marked delivered — your payout for it will reflect shortly." }))
        .catch((err: unknown) => {
          // 400 here is almost always "already completed" (e.g. a double-click on the
          // confirm button) — not a real failure, so nothing needs surfacing.
          if (err instanceof ApiError && err.status === 400) return;
          const message = userMessage(err, "Could not save this class's completion.");
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
    // conference.authenticationRequired retry budget -- see the conferenceFailed listener.
    // Lives here (not a ref) so it resets naturally whenever this effect re-runs (room/mode
    // change), same lifetime as `api`/`cancelled` above.
    let authRetryCount = 0;
    const MAX_AUTH_RETRIES = 4;
    // Same idea, same budget, for connectionFailed -- see that listener below. Teacher-
    // reported live (2026-09-17): "we got disconnected automatically and then joining back
    // was tough." connectionFailed used to go straight to a hard error with zero retry, the
    // one listener in this whole file that didn't get the "a momentary server-side hiccup
    // shouldn't strand someone on a dead screen" treatment conferenceFailed already has --
    // on this same self-hosted deployment, a dropped XMPP/BOSH connection is exactly as
    // plausibly transient as a rejected token, so leaving the person to manually notice,
    // navigate away and rejoin was an inconsistency, not a deliberate distinction.
    let connectionRetryCount = 0;
    const MAX_CONNECTION_RETRIES = 4;

    // Auto-record retry budget: ~12 minutes total before giving up and telling the
    // teacher. Widened from an earlier 48s budget after checking real production data on
    // 2026-09-15: of 24 classes that hit a capacity rejection that day, 11 recovered on
    // the *old* 48s retry alone -- proof the shared recorder pool keeps freeing up
    // throughout a busy period, not that it stays empty. The other 13 never recovered and
    // lost their recording outright, because 48s wasn't long enough to catch the next
    // opening. 12 minutes covers the two real 15-25 minute capacity-crunch windows seen
    // that day without retrying for a class's entire length -- a teacher who genuinely has
    // no capacity for that long still has the manual "Recording" button as a fallback,
    // just later than before.
    //
    // Two-phase backoff, not a flat interval: the first 6 retries are 10s apart (catches
    // a brief blip within the first minute, as fast as the old budget used to give up
    // entirely), then the remaining 22 widen to 30s apart -- still covers the full ~12
    // minutes, but doesn't hammer Jicofo with a request every 20s for the whole duration
    // of a prolonged crunch when the first minute's worth of quick tries didn't land.
    const RECORDING_FAST_RETRIES = 6;
    const RECORDING_FAST_INTERVAL_MS = 10000;
    const RECORDING_SLOW_INTERVAL_MS = 30000;
    const MAX_RECORDING_RETRIES = 28;

    function nextRecordingRetryDelayMs(retryCount: number) {
      return retryCount < RECORDING_FAST_RETRIES ? RECORDING_FAST_INTERVAL_MS : RECORDING_SLOW_INTERVAL_MS;
    }

    function attemptStartRecording() {
      // jitsiApiRef.current, not the closed-over `api` -- the first call (from
      // videoConferenceJoined, below) always has a fresh `api`, but a retry runs from
      // inside the watchdog's own setTimeout, which can land in the narrow window between
      // an auth-retry's api?.dispose() and its reassignment to the new instance. The
      // closed-over `api` still points at the disposed instance for that window;
      // jitsiApiRef.current is explicitly nulled out for the same window and just no-ops.
      jitsiApiRef.current?.executeCommand("startRecording", { mode: "file" });
      // startRecording has no success callback of its own — a deployment with no Jibri
      // pool (or one that's exhausted) either fires recordingStatusChanged with on:false +
      // a reason, or in some configurations fires nothing back at all (Jicofo simply can't
      // dispatch the request). Either way, wait a bounded window for the "on" confirmation;
      // if it hasn't arrived, a rejection here is a final answer for THIS specific request
      // (Jicofo doesn't quietly retry it against a newly-freed instance on its own), so
      // actually re-issuing the command — not just waiting longer — is what gives a brief
      // capacity blip a real chance to resolve before the teacher sees anything.
      if (recordingWatchdogRef.current) clearTimeout(recordingWatchdogRef.current);
      recordingWatchdogRef.current = setTimeout(() => {
        setRecording((current) => {
          if (!current) {
            if (recordingRetryCountRef.current < MAX_RECORDING_RETRIES) {
              recordingRetryCountRef.current += 1;
              attemptStartRecording();
            } else {
              setRecordingIssue(
                recordingErrorReasonRef.current
                  ? `Auto-recording failed to start (${recordingErrorReasonRef.current}). This class is not being recorded automatically — ` +
                      'use the manual "Recording" button on My Classes if you need one.'
                  : "Auto-recording didn't start (likely no recording capacity on the video server). " +
                      "This class is not being recorded automatically — use the manual \"Recording\" button on My Classes if you need one."
              );
            }
          }
          return current;
        });
      }, nextRecordingRetryDelayMs(recordingRetryCountRef.current));
    }

    // Talk-time & camera attentiveness: accumulated from Jitsi media signals,
    // flushed as engagement events when the participant leaves.
    const media = {
      selfId: "",
      talkMs: 0,
      talkSince: 0,
      camMs: 0,
      camSince: 0,
      // Durable "was the whiteboard actually captured" signal (see the screen-share nudge
      // banner below and EngagementEventType.ScreenShareSeconds) -- not scored, just recorded
      // so it's checkable after the fact without opening the video.
      screenShareMs: 0,
      screenShareSince: 0,
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
      if (media.screenShareSince) {
        media.screenShareMs += now - media.screenShareSince;
        media.screenShareSince = 0;
      }
      const talkSeconds = Math.round(media.talkMs / 1000);
      const camSeconds = Math.round(media.camMs / 1000);
      const screenShareSeconds = Math.round(media.screenShareMs / 1000);
      // effectiveSessionIdRef, not the sessionId prop this closure was created with — see its
      // own doc comment; this can still be running well after getJitsiJoin resolved a
      // different, current id for an edited class.
      const engagementSessionId = effectiveSessionIdRef.current;
      if (talkSeconds > 0) postEngagement(engagementSessionId, userNameRef.current, "TalkTimeSeconds", talkSeconds);
      if (camSeconds > 0) postEngagement(engagementSessionId, userNameRef.current, "CameraOnSeconds", camSeconds);
      if (screenShareSeconds > 0) postEngagement(engagementSessionId, userNameRef.current, "ScreenShareSeconds", screenShareSeconds);
      media.talkMs = 0;
      media.camMs = 0;
      media.screenShareMs = 0;
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
      // "Don't record demo and personal link, only record session and class" -- the
      // Personal Meeting Room never reaches the interactive branch below at all (it always
      // has joinOverride, never a real sessionId), so it's excluded from auto-recording by
      // construction. A Demo *does* have a real session/sessionId, so it needs its own
      // explicit check against the type the join response reports.
      let sessionIsDemo = false;
      if (joinOverride) {
        joinDomain = joinOverride.domain;
        joinToken = joinOverride.token ?? undefined;
      } else if (interactive) {
        try {
          const join = await getJitsiJoin(sessionId!);
          joinRoom = join.room;
          joinDomain = join.domain;
          joinToken = join.token ?? undefined;
          sessionIsDemo = join.isDemo;
          // See effectiveSessionIdRef's own doc comment: this class may have been edited
          // since whatever gave this component its `sessionId` prop was fetched — join.sessionId
          // is whatever it's actually become, and everything session-scoped from here on
          // (the ClassroomHub join below, engagement posts, complete-session, recording
          // registration) has to follow it, not the possibly-stale prop.
          if (join.sessionId && join.sessionId !== effectiveSessionIdRef.current) {
            effectiveSessionIdRef.current = join.sessionId;
            setEffectiveSessionId(join.sessionId);
          }
        } catch (err) {
          // A real ApiError means the request reached the backend and was explicitly
          // rejected (not signed in, not a participant, join window not open yet, class
          // already ended, ...) -- silently falling back to a token-less guest join here
          // used to hide that rejection entirely: the user would land in Jitsi's own
          // anonymous-guest flow (prompted for a name, stuck in the moderator lobby with
          // no one to admit them) with no indication why, making a legitimate, deterministic
          // rejection look like a flaky server. Only a genuine network/offline failure
          // (no ApiError, the request never got a response) still falls back to a
          // best-effort room-only join, matching demo-mode/offline behavior.
          if (err instanceof ApiError) {
            // Real teacher report: clicking Start Class repeatedly showed "the same screen"
            // every time with no explanation. Root cause was here -- the toast alone
            // auto-dismisses in a few seconds, and returning without setError() left the
            // Jitsi iframe never created, so the call area just stayed a blank, empty box
            // with no visible reason and no way to tell "broken" from "still loading." The
            // toast stays for the fleeting notification; setError puts the actual reason on
            // screen persistently, using the same error card every other init() failure
            // already falls back to.
            toast({ variant: "error", title: "Couldn't join the class", description: userMessage(err) });
            setError(userMessage(err));
            return;
          }
        }
      }

      // Best-effort, everyone except a recording observer (which has no camera/mic UI at
      // all): run before Jitsi's own iframe ever loads, so a real camera/mic problem
      // surfaces with a specific, actionable reason before the participant is stuck
      // guessing at an unresponsive toggle mid-class. Never blocks the join -- even a hard
      // failure here just informs, since Jitsi may still partially work (e.g. audio-only)
      // or the device grab inside the iframe succeeds anyway.
      if (!isRecordingObserver) {
        // Reported live for teachers, students AND parents alike: "voice/camera didn't
        // work — told them to log out and join again, and it worked the second (or
        // third) time." That pattern is the classic symptom of the first join racing
        // ahead of the browser's own permission decision (the OS dialog shown but not yet
        // answered, or answered just after this check already read the old "not decided
        // yet" state) -- by a later join, the browser already has the answer cached from
        // the first attempt, so it succeeds cleanly. This preflight+retry used to run for
        // the teacher only; widened to every real joiner (2026-09-16) since students and
        // parents hit the exact same race, just with no warm-up backing their side of the
        // join at all before this. One retry after a short pause turns that into
        // something the app recovers from on its own, instead of someone having to notice
        // and manually rejoin repeatedly. Only the FIRST attempt's NotAllowedError is
        // worth retrying this way -- a real block, missing device, or in-use device won't
        // resolve itself in 1.5s, so those still fail fast to the specific message below.
        let stream: MediaStream | null = null;
        let lastErrorName = "";
        // Only when the browser is genuinely about to ask (state "prompt"); Safari/Firefox
        // may not support querying "camera", in which case we just skip the pre-explanation.
        try {
          const perm = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (perm.state === "prompt" && !cancelled) setMediaDialog("asking");
        } catch {
          /* permissions API unsupported for camera — fine */
        }
        for (let attempt = 0; attempt < 2 && !stream; attempt++) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } catch (err) {
            lastErrorName = err instanceof DOMException ? err.name : "";
            if (attempt === 0 && lastErrorName === "NotAllowedError" && !cancelled) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          }
        }
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          setMediaDialog(null);
        } else {
          const name = lastErrorName;
          const denied = name === "NotAllowedError" || name === "PermissionDeniedError";
          // Anything but a denial (no device, device busy) is the banner's job, not the popup's
          setMediaDialog(denied ? "blocked" : null);
          if (denied) {
            /* handled by the popup */
          } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
            setPreflightMediaIssue("No camera or microphone was detected on this device — check it's connected and try again.");
          } else if (name === "NotReadableError" || name === "TrackStartError") {
            setPreflightMediaIssue(
              "Your camera or mic seems to be in use by another app (Zoom, another browser tab, ...) — close it and rejoin."
            );
          } else {
            setPreflightMediaIssue(
              "Couldn't access your camera/mic before joining — if the toggle in class doesn't respond, check your browser and OS camera/mic permissions."
            );
          }
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
          // Meet/Zoom-style entry: a joiner who lands on a waiting room is placed in the queue
          // straight away ("waiting for the host to let you in") instead of first having to find
          // and press Jitsi's own "Ask to Join" button, and the lobby's "Enter meeting password"
          // option (nothing here uses room passwords) is removed so a child or parent isn't
          // offered a step that can only fail.
          // The Jitsi server draws its logo over the top-left of the video, on top of participant tiles;
          // the header above already carries ours. A transparent 1px image in its place (kept for the
          // recording observer so recordings stay branded).
          ...(isRecordingObserver ? {} : { defaultLogoUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>" }),
          lobby: { autoKnock: true },
          // Meet/Zoom behaviour for the control bar: on a touch screen there is no hover to bring
          // it back, so Jitsi's default auto-hide leaves a child hunting for the mic/camera
          // buttons -- keep it pinned there; on desktop it still tucks away after a few idle seconds.
          toolbarConfig: {
            alwaysVisible: typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
            initialTimeout: 8000,
            timeout: 5000,
          },
          securityUi: { disableLobbyPassword: true },
          // Jitsi's own toasts are stacked white boxes in a dark UI, and several duplicate
          // something this app already does better: the camera/microphone permission errors
          // (the in-app "Allow camera and microphone" dialog and device banner above already
          // walk through the fix) and "You're now a moderator" (noise for whoever sees it).
          // Suppressing just these keeps join/lobby/raise-hand notifications intact.
          disabledNotifications: [
            "notify.moderator",
            "dialog.cameraPermissionDeniedError",
            "dialog.micPermissionDeniedError",
            "dialog.cameraNotFoundError",
            "dialog.micNotFoundError",
          ],
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
            ...(mode === "teacher" && !isRecordingObserver ? (["mute-everyone"] as const) : []),
            // "recording" specifically also needs `hasClassSession` (not just `interactive` --
            // a Personal Meeting Room now has the Interactive panel too, see isPersonalRoom's own
            // doc comment) -- reported live: a Personal Meeting Room recording (manually started
            // with this button, since auto-record is already scoped off it) "disappeared from the
            // portal... couldn't find it anywhere." Not a display bug -- it was never findable in
            // the first place. registerRecording (the only thing that ever creates a
            // SessionRecording row) requires a real sessionId to attach to, and the Personal
            // Meeting Room never has one (see recordingLinkAvailable's own `hasClassSession` check
            // below) -- so a recording made there is a real file on the video server with no
            // database row and no UI anywhere that could ever surface it. Removing the button
            // here is what "don't record demo and personal link" already asked for; this closes
            // the one remaining way to start one manually.
            ...(mode === "teacher" && !isRecordingObserver && hasClassSession ? (["recording"] as const) : []),
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
        setReconnecting(null);
        media.selfId = payload?.id ?? "";
        if (mode === "teacher") {
          setSelfParticipantId(payload?.id ?? null);
          // Seeds the roster this fix's "kick everyone on End Class" loop (see
          // completeAndLeave) reads from. participantJoined only fires for someone who joins
          // AFTER this listener is attached — if the teacher's own connection drops and
          // rejoins mid-class (this whole feedback thread is about exactly that kind of
          // flaky-connection resilience), everyone already in the room at that point would
          // otherwise never re-announce themselves, so a stale/reset participants list would
          // silently under-kick and leave them stuck exactly like the original bug.
          // getParticipantsInfo() is synchronous, not an event -- it returns whoever's in the
          // room right now, including anyone who joined before this reconnect.
          const existing = api?.getParticipantsInfo?.() ?? [];
          setParticipants(
            existing.map((p) => ({
              id: p.participantId,
              displayName: p.displayName?.trim() || "Student",
            }))
          );
        }
        media.camSince = Date.now(); // camera starts unmuted unless Jitsi says otherwise
        // A small class reads better as a grid of faces than one spotlighted speaker.
        api?.executeCommand("setTileView", true);
        // Waiting room on by default (admin-configurable, Settings → Integrations →
        // Jitsi Meet "defaultLobby") — a student joining before the teacher shouldn't land
        // straight into an unattended room. Only the teacher's own join actually enables the
        // room's lobby (toggleLobby is a moderator action); a student who arrives before the
        // teacher already can't get further than Jitsi's own prejoin/lobby screen regardless,
        // and re-toggling it here on the student's side would just flicker the same state.
        //
        // Deliberately NOT fired here, synchronously, on videoConferenceJoined: reported live —
        // everyone leaves the call, both rejoin, and even the *teacher* lands on Jitsi's own
        // "ask to join" / "waiting for a moderator" screen for her own room. Likely cause: this
        // deployment doesn't yet have secure-domain JWT room auth wired up server-side (see
        // docs/JITSI_ARCHITECTURE.md's "production hardening" item, and toggleWaitingRoom's own
        // note above) — moderator is granted by Jitsi/Prosody's own anonymous-domain "first to
        // (re)join an empty room" rule, not by our signed token's own moderator claim.
        // videoConferenceJoined fires the instant OUR client believes it's in the room, which
        // can race ahead of Prosody actually finishing that grant — toggling lobby on before it
        // lands risks the room ending up with lobby enabled but its own enabler not yet
        // recognized as the moderator who can bypass it. participantRoleChanged (below) is
        // Jitsi's own confirmation that the grant has landed; waiting for it costs nothing when
        // auth *is* configured server-side (it then fires effectively at once) and removes this
        // specific self-lockout race when it isn't. Doesn't fix the underlying case where
        // Prosody hands the role to whoever's connection actually lands first on a fresh empty
        // room regardless of app role — that needs the server-side JWT room auth this was
        // always meant to get eventually.
        // Removed 2026-09-18: teachers used to get our own on-brand background force-
        // applied as their starting camera background on every join (dynamicBrandingUrl,
        // just above, still lists it as an optional *choice* in Jitsi's own background
        // picker -- only the auto-apply-on-join default is gone). Everyone now starts on
        // "none" (their own real camera), same as students/children already did.
        //
        // Not just "skip setting one" — Jitsi remembers the last-picked virtual background
        // per browser (jitsi-meet.localStorage), so a teacher's device that got the branded
        // background force-applied before this removal still has it saved as their "last
        // choice" and would silently keep reapplying it on every future join even though
        // nothing here sets it anymore. Explicitly turning it off clears that remembered
        // choice too, actually landing on "none" rather than just not making it worse going
        // forward — same fix already applied to students/children below, now for everyone.
        api?.executeCommand("setVirtualBackground", false);
        // Prompt to share the screen right at join — skipped for the recording observer (it's
        // Jibri's own silent capture bot, nobody there to click anything) and for a call with no
        // backing ClassSession to ever record against (the Personal Meeting Room -- it now has
        // the Interactive panel too, see isPersonalRoom's own doc comment, but still nothing
        // recorded). Teacher-reported live: this fired every time on the personal link too,
        // demanding a screen share "to continue" with no way to skip it, even though the entire
        // reason it exists is to get the whiteboard/quiz overlay into the recording -- and the
        // Personal Meeting Room is never recorded at all, so there was never anything worth
        // sharing for.
        if (mode === "teacher" && !isRecordingObserver && hasClassSession && !shareScreenPromptShownRef.current) {
          shareScreenPromptShownRef.current = true;
          setShareScreenPromptOpen(true);
        }
        // Skipped for the recording observer -- it only ever renders because a recording is
        // already running (it's Jibri's own capture of this exact call), so firing this again
        // would double-start it against the same room. Also skipped if we already believe
        // recording is active: videoConferenceJoined fires again on every RECONNECT (a
        // network blip, not just the very first join), and the room's recording keeps
        // running across that blip since it's tied to the conference, not this one
        // participant's connection. Confirmed live: re-issuing startRecording here on
        // reconnect got a guaranteed "unexpected-request" rejection from Jicofo (recording
        // already in progress) — and with the retry loop below, that turned one harmless
        // reconnect into three doomed retries and a scary "recording failed" banner for a
        // class that was, the whole time, being recorded just fine.
        if (mode === "teacher" && autoRecordRef.current && !isRecordingObserver && hasClassSession && !sessionIsDemo) {
          setRecording((alreadyRecording) => {
            if (!alreadyRecording) {
              recordingErrorReasonRef.current = null;
              recordingRetryCountRef.current = 0;
              attemptStartRecording();
            }
            return alreadyRecording;
          });
        }
      });
      // Auto recording registration: when the deployment publishes the recording
      // link, file it against the session (drives the 15-day parent window).
      api.addListener("recordingLinkAvailable", (payload) => {
        // Skipped for the recording observer -- Jibri's own finalize-recording webhook
        // (FinalizeJibriRecordingAsync) is the single source of truth for registering this
        // recording; registering it again here too would create a duplicate SessionRecording
        // row for the same file.
        if (mode === "teacher" && hasClassSession && !isRecordingObserver && payload?.link) {
          // effectiveSessionIdRef, not the sessionId prop this closure was created with —
          // see its own doc comment.
          registerRecording(effectiveSessionIdRef.current!, payload.link).catch(() => undefined);
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
      // Jitsi's own confirmation that OUR grant of the moderator role has actually landed —
      // see the long comment on videoConferenceJoined above for why enabling the lobby waits
      // for this instead of firing the instant we believe we've joined.
      api.addListener("participantRoleChanged", (payload) => {
        if (payload?.id !== media.selfId || payload?.role !== "moderator") return;
        if (mode === "teacher" && defaultLobbyRef.current && !lobbyEnableAttemptedRef.current) {
          lobbyEnableAttemptedRef.current = true;
          api?.executeCommand("toggleLobby", true);
          setLobbyEnabled(true);
        }
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
      api.addListener("videoConferenceLeft", () => {
        flushMedia();
      });
      api.addListener("participantJoined", (payload) => {
        const id = payload?.id;
        if (!id) return;
        const displayName = payload.displayName?.trim() || "Student";
        setParticipants((prev) => [...prev.filter((p) => p.id !== id), { id, displayName }]);
      });
      api.addListener("participantLeft", (payload) => {
        setParticipants((prev) => prev.filter((p) => p.id !== payload?.id));
        // Same fix as screenSharingStatusChanged below, same root cause: Jitsi's own default
        // is to drop out of tile view into a spotlighted "stage" layout around whoever's
        // screen-sharing (or otherwise made prominent) — reported live as a departed
        // participant's video tile staying frozen on everyone else's screen, full-size, after
        // they'd already left (confirmed via the People list correctly showing them gone).
        // Nothing re-asserted tile view when the *spotlighted* participant left, so Jitsi kept
        // trying to render a stage around a track that no longer existed. Re-forcing tile view
        // on every departure — not just on screen-share start/stop — makes Jitsi recompute its
        // layout from the participants actually still in the room.
        //
        // Skipped entirely while something is deliberately pinned (locallyPinnedIdRef) --
        // see that ref's own doc comment. The departed participant no longer having a track
        // to spotlight around is Jitsi's problem to resolve on its own pinned tile, not a
        // reason to blow away someone else's still-valid pin.
        if (!locallyPinnedIdRef.current) {
          jitsiApiRef.current?.executeCommand("setTileView", true);
        }
      });
      // Jitsi's native pin is purely local to whichever browser clicked it — a teacher
      // pinning herself while screen-sharing used to show "Pinned" on her own screen only,
      // with every student still seeing her in the small tile, since nothing relayed that
      // choice anywhere else. Forwarding the teacher's own pin changes over the classroom
      // hub (setPinnedRef, wired once InteractivePanel's connection is ready) is what makes
      // a student's own view actually follow along — see InteractivePanel's onPinChanged.
      // A student pinning someone locally for their own view is deliberately left alone.
      api.addListener("pinnedEndpointChanged", (payload) => {
        locallyPinnedIdRef.current = payload?.id ?? null;
        if (mode !== "teacher") return;
        setPinnedParticipantId(payload?.id ?? null);
        setPinnedRef.current?.(payload?.id ?? null);
      });
      // Jitsi's own signal for a dropped media/XMPP connection mid-call — the video
      // tiles freeze silently otherwise, with nothing in our own chrome saying why.
      api.addListener("connectionInterrupted", () => setCallDegraded(true));
      api.addListener("connectionRestored", () => {
        setCallDegraded(false);
        // The screen-share track doesn't always survive a reconnect the way the main
        // call does — see shareMayHaveDroppedSince above. media.screenShareSince is
        // truthy only while a share was active going into the interruption.
        if (media.screenShareSince) setShareMayHaveDroppedSince(true);
      });
      api.addListener("screenSharingStatusChanged", (payload) => {
        const on = !!payload?.on;
        setScreenShareActive(on);
        if (on) {
          setShareScreenPromptOpen(false);
          setShareAttempted(false);
          setShowShareOsHint(false);
        }
        // Any deliberate stop/restart here (as opposed to the automatic flag set above)
        // means the teacher has acted on the warning already, one way or another.
        setShareMayHaveDroppedSince(false);
        const now = Date.now();
        if (on) {
          media.screenShareSince ||= now;
        } else if (media.screenShareSince) {
          media.screenShareMs += now - media.screenShareSince;
          media.screenShareSince = 0;
        }
        // Teacher feedback (grid 4→9, WBS Round 2 #25): Jitsi's own default is to drop out of
        // tile view into a spotlighted "stage" layout the instant anyone starts screen-sharing —
        // the shared content fills most of the screen and everyone else shrinks to a thin
        // filmstrip, which is exactly the "PPT takes over, I can't see my students" complaint.
        // Re-asserting tile view on every share start/stop keeps the shared screen as just one
        // more tile in the same grid (up to the 9 TILE_VIEW_MAX_COLUMNS=3 allows) instead of
        // letting Jitsi silently switch layouts underneath the teacher.
        //
        // Skipped while something is deliberately pinned (locallyPinnedIdRef — see its own
        // doc comment): teacher-reported live, this unconditional re-assert was exactly what
        // made "spotlight the shared screen for everyone" impossible — the moment sharing
        // started, this immediately shrank it back into the grid, undoing a pin in the same
        // breath it was set (or broadcast). A deliberate pin already means someone chose a
        // specific main view; screen-share starting isn't a reason to override that choice.
        if (!locallyPinnedIdRef.current) {
          jitsiApiRef.current?.executeCommand("setTileView", true);
        }
        // Reported live (2026-09-16): after the teacher stopped sharing, the shared screen
        // "wouldn't go away" — this single setTileView call can land before Jitsi's own
        // internal layout/track-teardown for the stopped share has actually settled, so the
        // command has nothing to act on yet. A second, delayed re-assert costs nothing when
        // the first one already worked (setTileView(true) is idempotent) and gives Jitsi a
        // moment to finish tearing down the stopped share's track before this reissues it.
        if (!on && !locallyPinnedIdRef.current) {
          setTimeout(() => {
            if (!locallyPinnedIdRef.current) jitsiApiRef.current?.executeCommand("setTileView", true);
          }, 800);
        }
      });
      // Without these, a video server/room misconfiguration (e.g. the Jitsi deployment's
      // focus component rejecting the room outright) left the whole screen looking
      // "normal" — just a static avatar with no call ever connecting, no explanation, and
      // the class silently never starting. This reuses the same full-screen error state
      // init() itself falls back to, since a failed conference makes the rest of the
      // screen (interactive panel included) meaningless without a working call underneath.
      api.addListener("conferenceFailed", (payload) => {
        // conference.authenticationRequired is the Jitsi-side name for a Prosody token
        // rejection ("not authorized user domain") -- confirmed, repeatedly, to be
        // transient on this deployment: the exact same room/token has failed and then
        // succeeded again minutes apart with nothing on the app side changing in between.
        // A momentary server-side hiccup shouldn't strand someone on a dead screen when
        // simply trying again (with a freshly re-authorized token, same as a manual
        // rejoin) stands a real chance of working -- so retry a bounded number of times
        // before surfacing the hard failure state.
        if (payload?.error === "conference.authenticationRequired" && !cancelled && authRetryCount < MAX_AUTH_RETRIES) {
          authRetryCount++;
          setReconnecting(
            authRetryCount === 1
              ? "Reconnecting to the video server…"
              : `Reconnecting to the video server… (attempt ${authRetryCount} of ${MAX_AUTH_RETRIES})`
          );
          api?.dispose();
          jitsiApiRef.current = null;
          setJitsiReady(false);
          setTimeout(() => {
            if (!cancelled) init().catch((err: Error) => setError(userMessage(err)));
          }, 2000 * authRetryCount);
          return;
        }
        setReconnecting(null);
        setError(
          `The video call couldn't connect (${payload?.error ?? "unknown error"}). ` +
            "Try rejoining — if this keeps happening, the video server may be down."
        );
      });
      api.addListener("connectionFailed", () => {
        if (!cancelled && connectionRetryCount < MAX_CONNECTION_RETRIES) {
          connectionRetryCount++;
          setReconnecting(
            connectionRetryCount === 1
              ? "Reconnecting to the video server…"
              : `Reconnecting to the video server… (attempt ${connectionRetryCount} of ${MAX_CONNECTION_RETRIES})`
          );
          api?.dispose();
          jitsiApiRef.current = null;
          setJitsiReady(false);
          setTimeout(() => {
            if (!cancelled) init().catch((err: Error) => setError(userMessage(err)));
          }, 2000 * connectionRetryCount);
          return;
        }
        setReconnecting(null);
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

    init().catch((err: Error) => setError(userMessage(err)));

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

  // See shareAttempted/showShareOsHint above: give a clicked-but-nothing-happened share
  // attempt a few seconds to actually resolve (screenSharingStatusChanged flips the dialog
  // closed) before assuming it silently failed and surfacing the OS-permission hint.
  useEffect(() => {
    if (!shareAttempted || !shareScreenPromptOpen) return;
    const timer = setTimeout(() => setShowShareOsHint(true), 6000);
    return () => clearTimeout(timer);
  }, [shareAttempted, shareScreenPromptOpen]);

  return (
    // h-dvh, not h-screen/100vh -- teacher-reported live (2026-09-17): "screen size overall
    // very small and when we zoom it, it automatically vanishes and minimizes on its own."
    // 100vh is the LAYOUT viewport, which mobile browsers don't shrink on pinch-zoom or
    // address-bar show/hide -- so a fixed-height h-screen flex column doesn't reflow with
    // the actual visible (visual) viewport, reading as the page randomly shrinking/jumping.
    // Same fix, same reasoning, already established elsewhere in this app (see AppShell's
    // own min-h-dvh comment) -- this screen had simply never been updated to match.
    <div
      className="flex h-dvh flex-col bg-brand-navyDark bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,252,0.10),transparent_60%)]"
      style={{ ["--classroom-header-h" as string]: `${headerHeight}px` }}
    >
      <header
        ref={headerRef}
        className="relative z-50 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-b from-brand-navyDark/95 to-brand-navyDark/75 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-md short:py-1.5 sm:px-5"
      >
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
              <p className={cn("truncate text-sm font-semibold tracking-tight text-white", mode === "teacher" && "hidden sm:block")}>{title ?? "Live class"}</p>
              {mode === "teacher" && <span className="hidden text-xs font-semibold text-white/80 min-[400px]:inline sm:hidden">Live</span>}
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
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
                  <span className="hidden lg:inline">{lobbyEnabled ? "Waiting Room: On" : "Waiting Room"}</span>
                  <span className="sr-only lg:hidden">{lobbyEnabled ? "Waiting room is on" : "Waiting room"}</span>
                </Button>
              )}
              {mode === "teacher" && (
                // "Focus Mode" -- upgraded from the old standalone "Spotlight me" button.
                // Teacher-reported live (2026-09-17) needed three separate things to make a
                // shared screen actually usable for a class -- spotlight it, clear the
                // Interactive panel for real screen space, and have the spotlight *stay* put
                // (the participantLeft/screenSharingStatusChanged fix above) -- with no single
                // affordance for "just make this the thing everyone sees right now." One
                // button now does the first two together (the third was a bug, now fixed at
                // the source, not something this button needs to work around).
                <Button
                  size="pill"
                  variant="secondary"
                  aria-pressed={focusMode}
                  disabled={!jitsiReady || !selfParticipantId}
                  className={headerToggleClass}
                  onClick={() => {
                    if (focusMode) {
                      jitsiApiRef.current?.executeCommand("pinParticipant", null);
                      setFocusMode(false);
                    } else {
                      jitsiApiRef.current?.executeCommand("pinParticipant", selfParticipantId);
                      setPanelOpen(false);
                      setFocusMode(true);
                    }
                  }}
                  title={
                    focusMode
                      ? "Exit focus mode"
                      : "Spotlight yourself (or whatever you're sharing) as the main view for the whole class, clear the panel and hide the floating leaderboard/roster cards for maximum, decluttered video space"
                  }
                >
                  {focusMode ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  <span className="hidden lg:inline">{focusMode ? "Exit Focus" : "Focus Mode"}</span>
                  <span className="sr-only lg:hidden">{focusMode ? "Exit focus mode" : "Focus mode"}</span>
                </Button>
              )}
              {interactive && (
                <Button size="pill" variant="secondary" aria-pressed={panelOpen} className={headerToggleClass} onClick={() => setPanelOpen((o) => !o)}>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Interactive</span>
                  <span className="sr-only lg:hidden">Interactive panel</span>
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
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Invite</span>
              <span className="sr-only sm:hidden">Invite</span>
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
          that escape hatch. Non-teachers (and rooms with no backing ClassSession, e.g. a
          personal meeting) have nothing to complete, so they get the plain single-action
          dialog. */}
      {mode === "teacher" && hasClassSession ? (
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
                  // This is a pause, not the terminal End Class path — the room is about
                  // to have no moderator in it at all. Leaving the lobby switched on in
                  // that state deadlocks it: nobody left inside can admit a knock, and
                  // this deployment doesn't yet have secure-domain JWT room auth wired up
                  // server-side (see the long comment on videoConferenceJoined above), so
                  // even the teacher's own reconnect isn't guaranteed to be recognized as
                  // moderator and let straight in — confirmed live, the returning teacher
                  // landed on their own room's "ask to join" screen. Switching the lobby
                  // off here, while still connected and still actually holding the
                  // moderator role, means whoever comes back gets straight in instead of
                  // stuck outside a lobby nobody can open; participantRoleChanged (above)
                  // switches it back on once a moderator is confirmed present again.
                  // The brief delay gives the command a moment to actually reach the
                  // video server before dispose() tears the connection down on unmount —
                  // executeCommand only posts the request; it doesn't wait for Jitsi to
                  // act on it.
                  if (jitsiApiRef.current && lobbyEnabled) {
                    jitsiApiRef.current.executeCommand("toggleLobby", false);
                    setTimeout(() => navigate(-1), 400);
                  } else {
                    navigate(-1);
                  }
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
      {/* Non-permission failures (no device / device busy) close the popup above and keep the banner below. */}
      <Dialog
        open={!isRecordingObserver && mediaDialog !== null}
        onOpenChange={(open) => {
          if (!open) setMediaDialog(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mediaDialog === "asking" ? "Allow camera and microphone" : "Camera and microphone are blocked"}
            </DialogTitle>
            <DialogDescription>
              {mediaDialog === "asking"
                ? "Your browser is asking for permission — click Allow so the class can see and hear you."
                : "The class can't see or hear you until you allow access for this site."}
            </DialogDescription>
          </DialogHeader>
          {mediaDialog === "blocked" && (
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Click the camera / lock icon at the left of the address bar.</li>
              <li>Set Camera and Microphone to <span className="font-semibold text-foreground">Allow</span>.</li>
              <li>Come back and press <span className="font-semibold text-foreground">Try again</span>.</li>
              <li className="text-xs">Still stuck? Check Windows Settings → Privacy → Camera / Microphone (or Mac System Settings → Privacy &amp; Security).</li>
            </ol>
          )}
          {mediaRetryFailed && (
            <p className="text-sm font-medium text-destructive">Still blocked — please allow access in the address bar first.</p>
          )}
          <DialogFooter className="flex-wrap">
            <Button variant="outline" onClick={() => setMediaDialog(null)}>
              Continue without
            </Button>
            {mediaDialog === "blocked" && <Button onClick={retryMediaAccess}>Try again</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!isRecordingObserver && jitsiReady && preflightMediaIssue && !deviceHintDismissed && (
        <div className="mx-3 mt-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
          <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5 text-brand-amber" />
          <p className="flex-1">{preflightMediaIssue}</p>
          <button
            type="button"
            onClick={() => setDeviceHintDismissed(true)}
            className="shrink-0 font-semibold underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
          >
            Dismiss
          </button>
        </div>
      )}
      {reloadNotice && (
        <div className="mx-3 mt-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
          <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5 text-brand-amber" />
          <p className="flex-1">{reloadNotice} Refresh when convenient to pick up the latest fixes — this won't interrupt your class until you do.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 font-semibold underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
          >
            Refresh now
          </button>
          <button
            type="button"
            onClick={() => setReloadNotice(null)}
            className="shrink-0 font-semibold underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
          >
            Dismiss
          </button>
        </div>
      )}
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
      {reconnecting && !error && (
        <div className="mx-3 mt-3 flex shrink-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <p className="flex-1">{reconnecting}</p>
        </div>
      )}
      {/* Jibri (the recording bot) only ever sees this room's own video/stage view -- it has
          no access to our whiteboard/quiz overlay, which lives behind a cross-origin iframe
          boundary no server-side fix can cross. Screen-sharing this same tab is the one
          reliable way to get it into the recording: Jitsi already treats a screen-share as
          normal recordable stage content, the same as it does for anyone else's shared screen.
          Shown once, right at join, to the real teacher only (never the recording observer,
          which has no one to click it, and never a student/parent). A real zero-click
          auto-share is impossible either way (getDisplayMedia requires a genuine user
          gesture, a browser security rule no app can bypass) -- see below for why it's a
          skippable nudge rather than a blocking requirement.
          Was deliberately a blocking modal (earlier teacher feedback), then a skippable one
          (later feedback: "repeatedly prompts... as if it were mandatory" read as a bug
          against joining at all). Reworked again 2026-09-17 into a dismissible BANNER, not a
          dialog, in direct response to that same teacher's live complaint about this exact
          class: "there were popups happening in between the class on screen... very
          distracting." A modal — even a skippable one, even shown only once — still steals
          focus and blocks the rest of the call UI the instant it appears; this now sits
          alongside the other inline nudge banners in this same list (recording-timing,
          annotate-fade, sound hint, ...), all one consistent "notice, not interruption"
          pattern, dismissed with a click instead of an OK-to-continue gate. */}
      {mode === "teacher" && !isRecordingObserver && interactive && shareScreenPromptOpen && (
        <div className="mx-3 mt-3 flex shrink-0 flex-col gap-2 rounded-xl border border-brand-violet/25 bg-brand-violet/10 px-4 py-3 text-xs text-brand-violet shadow-lg shadow-black/20 backdrop-blur-md sm:flex-row sm:items-start">
          <Sparkles className="h-4 w-4 shrink-0 translate-y-0.5" />
          <div className="flex-1 space-y-1.5">
            <p>
              <span className="font-semibold">Share your screen?</span> Sharing this tab (choose{" "}
              <span className="font-semibold">This Tab</span>) lets the recording capture your whiteboard and quiz, and gives
              students a clearer view. Not required — the class can carry on without it.
            </p>
            {/* Real parent complaint: a video played inside a shared PowerPoint/tab had no
                sound for students. Root cause is a hard browser rule, not anything fixable
                here -- Chrome only offers a "Share tab audio" checkbox for This Tab (and
                "Share system audio" for Entire Screen on Windows only); a shared Window never
                carries audio on any OS. Called out explicitly rather than assumed. */}
            <p className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px]">
              Playing a video with sound? Tick <span className="font-semibold">Share tab audio</span> in the picker that opens
              next, or students won't hear it.
            </p>
            {showShareOsHint && (
              <p className="rounded-lg bg-brand-amber/10 px-2.5 py-1.5 text-[11px] text-brand-amber">
                Nothing happening after you click Share? On a Mac, check System Settings → Privacy &amp; Security → Screen
                Recording and make sure your browser is allowed — that's a separate permission from camera/microphone and
                browsers often fail silently when it's off.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setShareAttempted(true);
                  jitsiApiRef.current?.executeCommand("toggleShareScreen");
                }}
                className="rounded-full bg-brand-violet px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#6a4de0]"
              >
                Share screen
              </button>
              <button
                type="button"
                onClick={() => setShareScreenPromptOpen(false)}
                className="font-semibold underline decoration-brand-violet/40 underline-offset-2 hover:decoration-brand-violet"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
      {mode === "teacher" && !isRecordingObserver && screenShareActive && shareMayHaveDroppedSince && (
        <div className="mx-3 mt-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-brand-amber/25 bg-brand-amber/10 px-4 py-3 text-xs text-brand-amber shadow-lg shadow-black/20 backdrop-blur-md">
          <WifiOff className="h-4 w-4 shrink-0 translate-y-0.5" />
          {/* Teacher-reported live, with a screenshot: the browser's own "Choose what to
              share" picker was stuck open, blocking the class. Root cause was this banner's
              own button -- its whole premise is "screenShareActive may say true when Jitsi's
              real state has already silently gone back to false," which makes
              toggleShareScreen a coin flip: if the real state actually was still "sharing,"
              it correctly stops it, but if the real state was already "not sharing" (the
              exact case this banner exists to warn about), toggling it *starts a brand-new
              share instead* -- reopening exactly that picker, on top of a call the teacher
              was trying to get out of. There's no reliable way from here to know which case
              it is, so the fix is to stop guessing: use Jitsi's own screen-share button in
              the call toolbar below instead, which reflects its actual internal state, not
              this possibly-stale one. */}
          <p className="flex-1">
            Your connection dropped briefly while you were sharing your screen — students may no longer be seeing it, even though it still shows as shared here. Use the screen-share button in your call controls below to stop and restart it, rather than this banner.
          </p>
          <button
            type="button"
            onClick={() => setShareMayHaveDroppedSince(false)}
            className="shrink-0 font-semibold underline decoration-brand-amber/50 underline-offset-2 hover:decoration-brand-amber"
          >
            Dismiss
          </button>
        </div>
      )}
      {mode === "teacher" && !isRecordingObserver && hasClassSession && recording && !screenShareActive && (
        <div className="mx-3 mt-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-brand-violet/25 bg-brand-violet/10 px-4 py-3 text-xs text-brand-violet shadow-lg shadow-black/20 backdrop-blur-md">
          <Sparkles className="h-4 w-4 shrink-0 translate-y-0.5" />
          <p className="flex-1">
            Share your screen (choose <span className="font-semibold">This Tab</span>) so the recording includes your whiteboard and quiz. Playing a video? Tick <span className="font-semibold">Share tab audio</span> in the picker or students won't hear it.
          </p>
          <button
            type="button"
            onClick={() => jitsiApiRef.current?.executeCommand("toggleShareScreen")}
            className="shrink-0 font-semibold underline decoration-brand-violet/50 underline-offset-2 hover:decoration-brand-violet"
          >
            Share screen
          </button>
        </div>
      )}
      {mode === "teacher" && !isRecordingObserver && recordingTimingHintShown && !recordingTimingHintDismissed && (
        <div className="mx-3 mt-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 shrink-0 translate-y-0.5 text-brand-amber" />
          <p className="flex-1">Recording is on. It'll show up on the portal a few minutes after the class ends — not during the class itself.</p>
          <button
            type="button"
            onClick={() => setRecordingTimingHintDismissed(true)}
            className="shrink-0 font-semibold underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
          >
            Dismiss
          </button>
        </div>
      )}
      {mode === "teacher" && !isRecordingObserver && annotateFadeHintShown && !annotateFadeHintDismissed && (
        <div className="mx-3 mt-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
          <Pencil className="h-4 w-4 shrink-0 translate-y-0.5 text-brand-amber" />
          <p className="flex-1">Marks you draw here fade after a couple seconds, like a laser pointer — they're for pointing things out live, not notes. For anything that should stay on screen, use the Board tab instead.</p>
          <button
            type="button"
            onClick={() => setAnnotateFadeHintDismissed(true)}
            className="shrink-0 font-semibold underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
          >
            Dismiss
          </button>
        </div>
      )}
      {mode === "student" && !isRecordingObserver && jitsiReady && !soundHintDismissed && (
        <div className="mx-3 mt-3 flex shrink-0 items-start short:hidden gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70 shadow-lg shadow-black/20 backdrop-blur-md">
          <Volume2 className="h-4 w-4 shrink-0 translate-y-0.5 text-brand-amber" />
          <p className="flex-1">
            <span className="sm:hidden">Can't hear? Tap the video once.</span>
            <span className="hidden sm:inline">Can't hear the teacher? Tap anywhere on the video once — some phones and tablets block sound until you do.</span>
          </p>
          <button
            type="button"
            onClick={() => setSoundHintDismissed(true)}
            className="shrink-0 font-semibold underline decoration-white/30 underline-offset-2 hover:decoration-white/70"
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
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 short:flex-row short:gap-2 short:p-2 lg:flex-row">
          {/* min-h-[300px]: a real floating desktop PiP was ruled out (the call runs in a
              cross-origin iframe with no way to read out individual participant video and
              float it above other windows — no safe workaround exists). This is the
              in-app fallback instead: on narrow/stacked layouts (below md), this card sits
              above the Interactive panel in document order and would otherwise get
              squeezed toward zero height by the panel's own content below it. Started at
              220px for the "can't see students while sharing" complaint; raised to 300px
              after a more severe one — "if we open whiteboard, we are unable to access the
              mute button" — since Jitsi's own toolbar (mic/camera mute, the actual controls,
              not just visibility) lives at the bottom of this same squeezed area and needs
              real room to render, not just enough to show a tile. Paired with the panel's
              own max-h shrinking from 45vh to 38vh below, so both sides actually fit
              together on a real phone screen instead of just shifting which one starves. */}
          {boardMaximized && floatHidden && (
            <button
              type="button"
              onClick={() => setFloatHidden(false)}
              title="Show the class video again"
              aria-label="Show the class video"
              className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-brand-navy/95 px-4 py-2.5 text-sm font-semibold text-white shadow-2xl shadow-black/50 ring-1 ring-white/20 backdrop-blur-xl transition-all hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Video className="h-4 w-4" /> Show video
            </button>
          )}
          <div
            className={cn(
              "relative min-h-[300px] min-w-0 flex-1 overflow-hidden rounded-2xl short:min-h-0 border border-white/10 bg-brand-navy shadow-2xl shadow-black/40 ring-1 ring-white/5",
              // Board full-screen covers the whole stage (fixed, z-40), hiding the call. Same
              // element, restyled to a floating tile above it (z-50) — the iframe is never
              // re-parented, so the call doesn't reconnect.
              boardMaximized &&
                cn(
                  "fixed bottom-4 right-4 z-50 min-h-0 flex-none ring-2 ring-primary/60 transition-[width,height] duration-200",
                  floatCompact ? "h-[110px] w-[170px] sm:h-[126px] sm:w-[200px]" : "h-[170px] w-[240px] sm:h-[200px] sm:w-[290px]",
                  // Cards/buttons that live inside the tile (celebrate, leaderboard, roster, hints)
                  // are laid out for the big view and would swamp a small tile.
                  "[&_[data-float-hide]]:hidden",
                  floatHidden && "pointer-events-none invisible"
                )
            )}
          >
            <div ref={containerRef} className="h-full w-full" />
            {boardMaximized && !floatHidden && (
              <div className="absolute inset-x-0 top-0 z-40 flex items-center justify-end gap-1 bg-gradient-to-b from-black/70 to-transparent p-1.5">
                <button
                  type="button"
                  onClick={() => setFloatCompact((c) => !c)}
                  title={floatCompact ? "Make the video bigger" : "Make the video smaller"}
                  aria-label={floatCompact ? "Make the video bigger" : "Make the video smaller"}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white/90 ring-1 ring-white/20 transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {floatCompact ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setFloatHidden(true)}
                  title="Hide the video (the class keeps running)"
                  aria-label="Hide the video"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white/90 ring-1 ring-white/20 transition-colors hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
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
            {mode === "teacher" && !boardMaximized && (
              // bottom-32, not bottom-20 — the Celebrate button below sits at bottom-20
              // right-3 too (same corner, same reasoning: clear of Jitsi's own toolbar and
              // its bottom-left lobby-knock notification). Both being teacher-only and both
              // able to show at once (this one whenever the class is live, Celebrate whenever
              // the Interactive panel is on), they were rendering directly on top of each
              // other at identical coordinates — confirmed from a live screenshot, the pill
              // sitting right over this circle. Stacked with a 48px gap (h-10 button + 8px)
              // instead, this one above since Celebrate is the more frequently-reached-for
              // control of the two.
              <button
                type="button"
                title={annotateOn ? "Stop marking on screen" : "Mark on screen — draw over the video or a shared screen. Marks fade after a couple seconds, like a laser pointer; for notes that should stay, use the Board tab instead."}
                aria-label={annotateOn ? "Stop marking on screen" : "Mark on screen"}
                aria-pressed={annotateOn}
                onClick={() => setAnnotateOn((o) => !o)}
                className={cn(
                  "absolute bottom-32 right-3 z-30 flex h-10 items-center justify-center gap-1.5 rounded-full px-3 shadow-lg ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  annotateOn ? "bg-red-500 text-white shadow-red-500/40" : "bg-brand-navy/90 text-white/80 shadow-black/30 backdrop-blur-xl"
                )}
              >
                <Pencil className="h-4 w-4 shrink-0" />
                {/* Icon-only was too easy to miss (teacher feedback: "I cannot see the annotate
                    option anywhere") — a plain floating circle with no label, away from the
                    main toolbar. A text label earns its width while it matters most: during an
                    actual screen share, which is also when the button has something to draw on. */}
                {screenShareActive && <span className="text-xs font-semibold">{annotateOn ? "Marking" : "Annotate"}</span>}
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
              <div data-float-hide className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex justify-center px-6">
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
              // own toolbar the same way the empty-room hint above does. right-3 (not left-3)
              // -- confirmed live via screenshot: Jitsi's own native "wants to join" lobby-knock
              // notification renders in this exact bottom-left region of its iframe, which we
              // can't reposition (cross-origin), so left-3 meant the two collided every time a
              // student knocked. The top-right corner is already claimed by the
              // leaderboard/Joined cards, so bottom-right is the one corner genuinely free of
              // both our own overlays and Jitsi's native ones.
              <button
                type="button"
                title="Send a celebration to the class"
                aria-label="Send a celebration to the class"
                onClick={() => (celebrateAllRef.current ?? celebrate)("Great job, everyone! 🎉")}
                data-float-hide
                className="group absolute bottom-20 right-3 z-20 flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-violet p-3 text-sm font-bold sm:px-4 sm:py-2.5 text-white shadow-lg shadow-brand-violet/40 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-brand-violet/50 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PartyPopper className="h-4 w-4 transition-transform group-hover:rotate-12" />
                <span className="hidden sm:inline">Celebrate</span>
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
            <div data-float-hide className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
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
                //
                // Teacher-reported live (2026-09-17): "the leaderboard again unnecessary on
                // right side hiding students name+faces" -- this condition was missing the
                // mode==="teacher" check its own neighboring comment (a few lines below, on
                // the paired Joined-roster card) already documents as the intent ("Both are
                // teacher-only"). Without it, any student/parent who closed their own panel
                // got the same floating card over their video grid, covering exactly the
                // faces/names a student view has no reason to hide.
                //
                // `&& !focusMode` -- see focusMode's own doc comment: Focus Mode closing the
                // panel is a deliberate "give me maximum, decluttered video space" request,
                // not a reason to pop these two cards up over that same corner.
                showLeaderboardCard={mode === "teacher" && (!interactive || !panelOpen) && !focusMode}
                stacked
              />
              {mode === "teacher" && (!interactive || !panelOpen) && !focusMode && (
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
          {interactive && panelOpen && (
            // Desktop-only (md:flex, hidden below it) -- below md the video and panel
            // stack vertically instead of sitting side by side, where a horizontal
            // resize handle has nothing meaningful to do. Drag to resize the panel;
            // double-click to reset to the default width -- same discoverable pattern
            // as a spreadsheet column border, not a hidden gesture. See panelWidth's own
            // doc comment above for why this exists (the old panel had one fixed 380px
            // width with no give at all).
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the interactive panel"
              title="Drag to resize the panel — double-click to reset"
              className={cn(
                "hidden shrink-0 cursor-col-resize items-center justify-center self-stretch rounded-full transition-colors lg:flex",
                resizingPanel ? "bg-brand-violet/50" : "bg-white/5 hover:bg-white/15"
              )}
              style={{ width: 10 }}
              onPointerDown={handlePanelResizeStart}
              onPointerMove={handlePanelResizeMove}
              onPointerUp={handlePanelResizeEnd}
              onPointerCancel={handlePanelResizeEnd}
              onDoubleClick={resetPanelWidth}
            >
              <GripVertical className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
            </div>
          )}
          {interactive && (
            // max-h-[38vh] (md:max-h-none): below md the body stacks video above this
            // panel instead of sitting side-by-side (flex-col → md:flex-row above), so
            // without its own height cap the panel's content (Board tab's toolbar +
            // canvas, quiz, roster) claims however much height it wants and pushes the
            // video stage off-screen — reported as "can't see the video while changing
            // slides," and more severely, "if we open whiteboard, we are unable to access
            // the mute button" (Jitsi's own toolbar lives in that same squeezed video
            // area). Narrowed from an earlier 45vh, paired with the video card's own
            // min-h growing from 220px to 300px above, so a real phone screen actually
            // fits both instead of one starving the other.
            //
            // md:w-[var(--panel-w)]: the fixed 380px width is now user-resizable (see
            // panelWidth's own doc comment) -- below md, "w-full" (no md: prefix) still
            // wins since the CSS var is only referenced inside the md: variant.
            <aside
              style={{ ["--panel-w" as string]: `${panelWidth}px` }}
              className={cn(
                "flex max-h-[38vh] min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-brand-navy shadow-2xl shadow-black/40 ring-1 ring-white/5 short:max-h-none short:w-[min(42vw,340px)] lg:max-h-none lg:w-[var(--panel-w)]",
                !panelOpen && "hidden"
              )}
            >
              <InteractivePanel
                sessionId={effectiveSessionId!}
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
                onBoardMaximizedChange={setBoardMaximized}
                onPinChanged={(participantId) => jitsiApiRef.current?.executeCommand("pinParticipant", participantId)}
                onReloadRequested={(message) => setReloadNotice(message)}
              />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
