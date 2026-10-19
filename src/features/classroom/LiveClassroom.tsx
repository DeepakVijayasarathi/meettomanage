import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import JitsiLive, { GUID_RE } from "./JitsiLive";
import { X } from "lucide-react";
import { SESSIONS } from "@/data/sessions";
import type { ChatMessage, Participant } from "@/types";
import { Button } from "@/components/ui/button";
import { buildInitialMessages, buildParticipants, DEMO_ACTIVITY_BANK, LEADERBOARD_SEED, QUIZ_BANK } from "./classroomData";
import VideoStage from "./VideoStage";
import Whiteboard from "./Whiteboard";
import ParticipantsPanel from "./ParticipantsPanel";
import ChatPanel from "./ChatPanel";
import Toolbar, { type SidePanel } from "./Toolbar";
import LeaderboardPanel from "./LeaderboardPanel";
import QuizOverlay from "./QuizOverlay";
import GamificationOverlay from "./GamificationOverlay";
import { postEngagement } from "@/api/engagement";
import { primeAudioUnlock } from "@/lib/sounds";
import { isLikelyInAppBrowser } from "@/lib/jitsi";
import { useToast } from "@/hooks/use-toast";

type StageView = "video" | "whiteboard";

interface WaitingGuest {
  id: string;
  name: string;
}

function formatElapsed(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function LiveClassroom({ mode }: { mode: "teacher" | "student" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { activeChildId, children } = useSession();
  const { toast } = useToast();

  // A parent joins the classroom on their child's behalf — the Jitsi participant
  // name (and engagement attribution) should read as the student, not the parent
  // account. Teachers keep their own account name.
  const studentDisplayName =
    mode === "student" ? children.find((c) => c.id === activeChildId)?.name : undefined;

  // Repeated live report: a parent granted the browser's own camera/mic permission and it
  // still didn't work, unlike Zoom/Meet. See isLikelyInAppBrowser's own doc comment — an
  // in-app "mini browser" (WhatsApp, Instagram, ...) is a well-known, undetectable-any-
  // other-way dead end for getUserMedia that no code here can fix, only warn about.
  // Dismissible, not a hard block: the heuristic can false-positive, and forcing someone
  // out of a class they can actually join fine would be worse than the warning itself.
  const [inAppWarningDismissed, setInAppWarningDismissed] = useState(false);
  if (isLikelyInAppBrowser() && !inAppWarningDismissed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Open this link in your browser</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This looks like it opened inside an app's built-in browser (WhatsApp, Instagram, or similar) — those commonly block camera and microphone access for video calls, even when permission looks granted. For a reliable class, tap the menu in the corner of this screen and choose "Open in Browser" (or copy this link and paste it into Safari/Chrome directly).
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                toast({ variant: "success", title: "Link copied", description: "Paste it into your browser's address bar." });
              } catch {
                toast({ variant: "error", title: "Couldn't copy", description: "Long-press the address bar above to copy this link manually." });
              }
            }}
          >
            Copy this link
          </Button>
          <Button onClick={() => setInAppWarningDismissed(true)}>Continue anyway</Button>
        </div>
      </div>
    );
  }

  // Real sessions launched from an API-backed dashboard carry their Jitsi room via route
  // state; the interactive mock stays for demo mode and design work.
  const launch = location.state as { room?: string; title?: string } | null;
  if (apiEnabled()) {
    // A teacher opening their emailed Demo join link (or any other deep link straight to
    // this URL — bookmarked, forwarded, reopened in a fresh tab) never carries this route
    // state; it only exists when navigation happened via startClass's own in-app
    // navigate(..., { state }) call. That used to hard-block here even though nothing else
    // is actually missing: JitsiLive re-resolves the real room/domain/token itself, fresh,
    // from `sessionId` alone (see its own getJitsiJoin call) — `room` is only ever a
    // same-tick fallback for while that lookup is in flight. So a valid session id is
    // enough on its own; `room` can start blank and gets overwritten the instant the
    // lookup resolves.
    if (launch?.room || (sessionId && GUID_RE.test(sessionId))) {
      return (
        <JitsiLive
          room={launch?.room ?? ""}
          title={launch?.title}
          mode={mode}
          sessionId={sessionId}
          displayName={studentDisplayName}
        />
      );
    }
    // No launch context and no usable session id (e.g. a pasted URL with nothing real
    // behind it): never fall back to the mock classroom with fabricated participants —
    // send the user back to start the class properly.
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">This class link can't be opened directly</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Join your live class from the schedule so we can connect you to the right room.
        </p>
        <Button onClick={() => navigate(mode === "teacher" ? "/teacher" : "/parent", { replace: true })}>
          Go to my dashboard
        </Button>
      </div>
    );
  }

  return <MockLiveClassroom mode={mode} />;
}

function MockLiveClassroom({ mode }: { mode: "teacher" | "student" }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const session = useMemo(() => SESSIONS.find((s) => s.id === sessionId) ?? SESSIONS[0], [sessionId]);

  const [participants, setParticipants] = useState<Participant[]>(() =>
    session ? buildParticipants(session) : []
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    session ? buildInitialMessages(session, participants.filter((p) => p.role === "student")) : []
  );

  const [elapsed, setElapsed] = useState(0);
  const [stageView, setStageView] = useState<StageView>("video");
  // Meet opens with the room full-width; panels slide in only when asked for.
  const [panel, setPanel] = useState<SidePanel | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [waitingGuests, setWaitingGuests] = useState<WaitingGuest[]>([
    { id: "w-1", name: "Aarav's Parent" },
    { id: "w-2", name: "Guest Observer" },
  ]);
  const [knockDismissed, setKnockDismissed] = useState(false);

  const [boardAccess, setBoardAccess] = useState<Record<string, boolean>>({});
  const [quizOpen, setQuizOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | undefined>(undefined);
  const [chatPreset, setChatPreset] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => primeAudioUnlock(), []);

  const selfId = useMemo(() => {
    const role = mode === "teacher" ? "teacher" : "student";
    return participants.find((p) => p.role === role)?.id;
  }, [participants, mode]);

  const self = participants.find((p) => p.id === selfId);

  const updateParticipant = useCallback((id: string | undefined, patch: Partial<Participant>) => {
    if (!id) return;
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const toggleParticipantMic = useCallback(
    (id: string) => setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, micOn: !p.micOn } : p))),
    []
  );
  const toggleParticipantCam = useCallback(
    (id: string) => setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, camOn: !p.camOn } : p))),
    []
  );
  const toggleBoardAccess = useCallback(
    (id: string) => setBoardAccess((prev) => ({ ...prev, [id]: !prev[id] })),
    []
  );

  function handleSendMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, author: "You", text, time: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }), isSelf: true },
    ]);
  }

  function handleMuteAll() {
    setParticipants((prev) => prev.map((p) => (p.role === "student" ? { ...p, micOn: false } : p)));
  }

  function admitGuest(id: string) {
    const guest = waitingGuests.find((g) => g.id === id);
    if (!guest) return;
    setWaitingGuests((prev) => prev.filter((g) => g.id !== id));
    setParticipants((prev) => [
      ...prev,
      { id: `admitted-${id}`, name: guest.name, role: "student", micOn: false, camOn: false, handRaised: false, avatarColor: "#8B5CF6" },
    ]);
  }

  function denyGuest(id: string) {
    setWaitingGuests((prev) => prev.filter((g) => g.id !== id));
  }

  function togglePanel(next: SidePanel) {
    setPanel((current) => (current === next ? null : next));
  }

  const canDrawBoard = mode === "teacher" || Boolean(selfId && boardAccess[selfId]);
  const selfName = self?.name ?? (mode === "teacher" ? "Teacher" : "Student");
  const leave = () => navigate(mode === "teacher" ? "/teacher" : "/parent");

  function celebrate(message?: string) {
    setCelebrationMessage(message);
    setCelebrating(true);
  }

  // Attention signal: a ping whenever the participant returns focus to the class tab
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        postEngagement(sessionId, selfName, "AttentionPing");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [sessionId, selfName]);

  if (!session) {
    return (
      <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4 bg-call-bg text-call-ink">
        <p className="text-lg font-semibold">Session not found</p>
        <Button onClick={() => navigate(mode === "teacher" ? "/teacher" : "/parent")}>Go back</Button>
      </div>
    );
  }

  const panelTitle: Record<SidePanel, string> = {
    participants: "People",
    chat: "In-class messages",
    quiz: "Live quiz",
    leaderboard: "Leaderboard",
  };
  const showKnock = mode === "teacher" && waitingGuests.length > 0 && panel !== "participants" && !knockDismissed;

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-call-bg text-call-ink">
      <div className="relative flex min-h-0 flex-1">
        {/* Stage */}
        <main className="relative min-h-0 min-w-0 flex-1">
          {stageView === "video" ? (
            <VideoStage
              participants={participants}
              boardAccess={boardAccess}
              selfId={selfId}
              pinnedId={pinnedId}
              onTogglePin={(id) => setPinnedId((cur) => (cur === id ? null : id))}
            />
          ) : (
            <div className="h-full p-2">
              <div className="h-full overflow-hidden rounded-xl">
                <Whiteboard
                  canDraw={canDrawBoard}
                  mode={mode}
                  activities={DEMO_ACTIVITY_BANK}
                  onActivityComplete={() => {
                    celebrate();
                    postEngagement(sessionId, selfName, "ActivityCompleted");
                  }}
                  onInteraction={() => postEngagement(sessionId, selfName, "WhiteboardInteraction")}
                />
              </div>
            </div>
          )}

          {screenSharing && (
            <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-brand-orange-deep py-1.5 pl-4 pr-1.5 text-sm font-medium text-white shadow-lg">
              You're presenting to everyone
              <button onClick={() => setScreenSharing(false)} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-orange-deep hover:bg-call-ink/90">
                Stop presenting
              </button>
            </div>
          )}

          {/* Celebration confetti/banner only — the leaderboard lives in its own side panel here. */}
          <GamificationOverlay
            celebrating={celebrating}
            onCelebrationEnd={() => {
              setCelebrating(false);
              setCelebrationMessage(undefined);
            }}
            leaderboard={LEADERBOARD_SEED}
            message={celebrationMessage}
            showLeaderboardCard={false}
          />

          {/* Meet-style "Someone wants to join" prompt */}
          {showKnock && (
            <div role="alert" className="absolute bottom-3 left-3 z-30 w-[min(360px,calc(100%-1.5rem))] rounded-2xl bg-call-surface p-4 shadow-2xl shadow-black/10">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-call-muted text-sm font-medium">
                  {waitingGuests.length}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {waitingGuests.length === 1 ? `${waitingGuests[0].name} wants to join` : `${waitingGuests.length} people want to join`}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-call-ink/60">{waitingGuests.map((g) => g.name).join(", ")}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <button onClick={() => setKnockDismissed(true)} className="rounded-full px-4 py-2 text-sm font-medium text-call-ink/80 hover:bg-call-ink/10">
                  Dismiss
                </button>
                <button onClick={() => setPanel("participants")} className="rounded-full px-4 py-2 text-sm font-medium text-brand-orange-ink hover:bg-brand-orange/10">
                  View all
                </button>
                {waitingGuests.length === 1 && (
                  <button onClick={() => admitGuest(waitingGuests[0].id)} className="rounded-full bg-brand-orange-deep px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-to">
                    Admit
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Side panel — floating rounded card on desktop (Meet), full-screen sheet on phones. */}
        {panel && (
          <aside
            aria-label={panelTitle[panel]}
            className="fixed inset-0 z-40 flex flex-col bg-call-bg md:relative md:inset-auto md:z-auto md:my-2 md:mr-2 md:w-[360px] md:shrink-0 md:rounded-2xl md:bg-call-surface"
          >
            <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4 md:pl-6">
              <h2 className="text-lg font-normal">{panelTitle[panel]}</h2>
              <button
                onClick={() => setPanel(null)}
                aria-label="Close panel"
                className="flex h-10 w-10 items-center justify-center rounded-full text-call-ink/80 hover:bg-call-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {panel === "participants" && (
                <ParticipantsPanel
                  mode={mode}
                  participants={participants}
                  selfId={selfId}
                  boardAccess={boardAccess}
                  waitingGuests={waitingGuests}
                  onAdmitGuest={admitGuest}
                  onDenyGuest={denyGuest}
                  onAdmitAll={() => waitingGuests.forEach((g) => admitGuest(g.id))}
                  onMuteAll={handleMuteAll}
                  onToggleMic={toggleParticipantMic}
                  onToggleCam={toggleParticipantCam}
                  onToggleBoardAccess={toggleBoardAccess}
                  onPin={(id) => {
                    setStageView("video");
                    setPinnedId(id);
                  }}
                />
              )}
              {panel === "chat" && (
                <ChatPanel
                  mode={mode}
                  messages={messages}
                  onSend={handleSendMessage}
                  presetText={chatPreset}
                  onConsumePreset={() => setChatPreset(null)}
                />
              )}
              {panel === "quiz" && (
                <div className="flex h-full flex-col">
                  {mode === "teacher" && (
                    <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3 md:px-6">
                      <p className="text-sm text-call-ink/60">{quizOpen ? "Quiz is live for the class" : "Ask the class a timed question"}</p>
                      {quizOpen ? (
                        <button onClick={() => setQuizOpen(false)} className="rounded-full px-4 py-2 text-sm font-medium text-brand-orange-ink hover:bg-brand-orange/10">
                          End quiz
                        </button>
                      ) : (
                        <button onClick={() => setQuizOpen(true)} className="rounded-full bg-brand-orange-deep px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-to">
                          Start quiz
                        </button>
                      )}
                    </div>
                  )}
                  <div className="min-h-0 flex-1">
                    <QuizOverlay
                      active={quizOpen}
                      mode={mode}
                      questions={QUIZ_BANK}
                      onCorrectAnswer={() => {
                        celebrate();
                        postEngagement(sessionId, selfName, "QuizCorrect");
                      }}
                    />
                  </div>
                </div>
              )}
              {panel === "leaderboard" && <LeaderboardPanel leaderboard={LEADERBOARD_SEED} />}
            </div>
          </aside>
        )}
      </div>

      <Toolbar
        mode={mode}
        title={session.title}
        elapsed={formatElapsed(elapsed)}
        micOn={self?.micOn ?? true}
        camOn={self?.camOn ?? true}
        screenSharing={screenSharing}
        stageView={stageView}
        handRaised={self?.handRaised ?? false}
        recording={recording}
        panel={panel}
        participantCount={participants.length}
        waitingCount={waitingGuests.length}
        onToggleMic={() => updateParticipant(selfId, { micOn: !(self?.micOn ?? true) })}
        onToggleCam={() => updateParticipant(selfId, { camOn: !(self?.camOn ?? true) })}
        onToggleScreenShare={() => setScreenSharing((s) => !s)}
        onToggleStage={() => setStageView((v) => (v === "video" ? "whiteboard" : "video"))}
        onToggleHand={() => {
          const raising = !(self?.handRaised ?? false);
          updateParticipant(selfId, { handRaised: raising });
          if (raising) postEngagement(sessionId, selfName, "HandRaise");
        }}
        onToggleRecording={() => setRecording((r) => !r)}
        onCelebrate={() => celebrate()}
        onBirthday={() => {
          const student = participants.find((p) => p.role === "student");
          celebrate(`Happy Birthday${student ? `, ${student.name.split(" ")[0]}` : ""}! 🎂`);
        }}
        onMuteAll={handleMuteAll}
        onAskDoubt={() => {
          setPanel("chat");
          setChatPreset("I have a doubt: ");
        }}
        onTogglePanel={togglePanel}
        onLeave={leave}
      />
    </div>
  );
}
