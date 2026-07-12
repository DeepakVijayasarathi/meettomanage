import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiEnabled } from "@/lib/api";
import JitsiLive from "./JitsiLive";
import { HelpCircle, LogOut, MessageSquare, PanelRightClose, PanelRightOpen, Sparkles, Users } from "lucide-react";
import { SESSIONS } from "@/data/sessions";
import type { ChatMessage, Participant } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildInitialMessages, buildParticipants, LEADERBOARD_SEED } from "./classroomData";
import VideoStage from "./VideoStage";
import Whiteboard from "./Whiteboard";
import ParticipantsPanel from "./ParticipantsPanel";
import ChatPanel from "./ChatPanel";
import Toolbar from "./Toolbar";
import QuizOverlay from "./QuizOverlay";
import GamificationOverlay from "./GamificationOverlay";
import { postEngagement } from "@/api/engagement";

type StageView = "video" | "whiteboard";
type RightTab = "participants" | "chat" | "quiz";

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
  const { sessionId } = useParams();

  // Real sessions launched from an API-backed dashboard carry their Jitsi room
  // via route state; the interactive mock stays for demo mode and design work.
  const launch = location.state as { room?: string; title?: string } | null;
  if (apiEnabled() && launch?.room) {
    return <JitsiLive room={launch.room} title={launch.title} mode={mode} sessionId={sessionId} />;
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
  const [rightOpen, setRightOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("participants");

  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [waitingGuests, setWaitingGuests] = useState<WaitingGuest[]>([
    { id: "w-1", name: "Aarav's Parent" },
    { id: "w-2", name: "Guest Observer" },
  ]);

  const [boardAccess, setBoardAccess] = useState<Record<string, boolean>>({});
  const [quizOpen, setQuizOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | undefined>(undefined);
  const [chatPreset, setChatPreset] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

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
      { id: `m-${Date.now()}`, author: "You", text, time: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }), isSelf: true },
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

  const canDrawBoard = mode === "teacher" || Boolean(selfId && boardAccess[selfId]);
  const selfName = self?.name ?? (mode === "teacher" ? "Teacher" : "Student");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, selfName]);

  if (!session) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <p className="text-lg font-semibold">Session not found</p>
        <Button onClick={() => navigate(mode === "teacher" ? "/teacher" : "/parent")}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-foreground">
      {/* Minimal header — this screen renders outside the portal AppShell */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#0D1024] via-[#161B33] to-[#0D1024] px-4 py-2.5 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{session.title}</p>
            <p className="truncate text-[11px] text-white/60">
              {session.teacherName} · {participants.length} joined
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {recording && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> REC
            </span>
          )}
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-white/85">
            {formatElapsed(elapsed)}
          </span>
          {mode === "student" && (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                setRightOpen(true);
                setRightTab("chat");
                setChatPreset("I have a doubt: ");
              }}
            >
              <HelpCircle className="h-3.5 w-3.5" /> Ask a doubt
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
            title={rightOpen ? "Collapse panel" : "Expand panel"}
            onClick={() => setRightOpen((o) => !o)}
          >
            {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={() => navigate(mode === "teacher" ? "/teacher" : "/parent")}
          >
            <LogOut className="h-3.5 w-3.5" /> Exit
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Stage */}
        <div className="relative flex-1 bg-slate-950">
          {stageView === "video" ? (
            <VideoStage participants={participants} boardAccess={boardAccess} />
          ) : (
            <Whiteboard
              canDraw={canDrawBoard}
              onActivityComplete={() => {
                celebrate();
                postEngagement(sessionId, selfName, "ActivityCompleted");
              }}
              onInteraction={() => postEngagement(sessionId, selfName, "WhiteboardInteraction")}
            />
          )}

          {mode === "teacher" && (
            <button
              title="Birthday celebration"
              onClick={() => {
                const student = participants.find((p) => p.role === "student");
                celebrate(`Happy Birthday${student ? `, ${student.name.split(" ")[0]}` : ""}! 🎂`);
              }}
              className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#12162B]/95 text-lg backdrop-blur transition-transform hover:scale-110"
            >
              🎂
            </button>
          )}

          <GamificationOverlay
            celebrating={celebrating}
            onCelebrationEnd={() => {
              setCelebrating(false);
              setCelebrationMessage(undefined);
            }}
            leaderboard={LEADERBOARD_SEED}
            message={celebrationMessage}
          />

          <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
            <Toolbar
              mode={mode}
              micOn={self?.micOn ?? true}
              camOn={self?.camOn ?? true}
              screenSharing={screenSharing}
              stageView={stageView}
              handRaised={self?.handRaised ?? false}
              recording={recording}
              waitingCount={waitingGuests.length}
              waitingRoomOpen={rightOpen && rightTab === "participants"}
              onToggleMic={() => updateParticipant(selfId, { micOn: !(self?.micOn ?? true) })}
              onToggleCam={() => updateParticipant(selfId, { camOn: !(self?.camOn ?? true) })}
              onToggleScreenShare={() => setScreenSharing((s) => !s)}
              onToggleStage={() => setStageView((v) => (v === "video" ? "whiteboard" : "video"))}
              onToggleHand={() => {
                const raising = !(self?.handRaised ?? false);
                updateParticipant(selfId, { handRaised: raising });
                if (raising) postEngagement(sessionId, selfName, "HandRaise");
              }}
              onMuteAll={handleMuteAll}
              onToggleWaitingRoom={() => {
                setRightOpen(true);
                setRightTab("participants");
              }}
              onToggleRecording={() => setRecording((r) => !r)}
              onLaunchQuiz={() => {
                setQuizOpen(true);
                setRightOpen(true);
                setRightTab("quiz");
              }}
              onCelebrate={() => celebrate()}
              onLeave={() => navigate(mode === "teacher" ? "/teacher" : "/parent")}
            />
          </div>
        </div>

        {/* Right panel — docked, dark, never a popup: Jitsi keeps chat/participants/polls as tabs in one side panel */}
        {rightOpen && (
          <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/10 bg-[#12162B]">
            <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as RightTab)} className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-white/10 p-2">
                <TabsList className="w-full bg-white/5">
                  <TabsTrigger value="participants" className="flex-1 gap-1.5 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none">
                    <Users className="h-3.5 w-3.5" /> People
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex-1 gap-1.5 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none">
                    <MessageSquare className="h-3.5 w-3.5" /> Chat
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="flex-1 gap-1.5 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none">
                    <Sparkles className="h-3.5 w-3.5" /> Quiz
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="participants" className="mt-0 min-h-0 flex-1 overflow-hidden">
                <ParticipantsPanel
                  mode={mode}
                  participants={participants}
                  boardAccess={boardAccess}
                  waitingGuests={waitingGuests}
                  onAdmitGuest={admitGuest}
                  onDenyGuest={denyGuest}
                  onToggleMic={toggleParticipantMic}
                  onToggleCam={toggleParticipantCam}
                  onToggleBoardAccess={toggleBoardAccess}
                />
              </TabsContent>
              <TabsContent value="chat" className="mt-0 min-h-0 flex-1 overflow-hidden">
                <ChatPanel
                  mode={mode}
                  messages={messages}
                  onSend={handleSendMessage}
                  presetText={chatPreset}
                  onConsumePreset={() => setChatPreset(null)}
                />
              </TabsContent>
              <TabsContent value="quiz" className="mt-0 min-h-0 flex-1 overflow-hidden">
                <QuizOverlay
                  active={quizOpen}
                  mode={mode}
                  onCorrectAnswer={() => {
                    celebrate();
                    postEngagement(sessionId, selfName, "QuizCorrect");
                  }}
                />
              </TabsContent>
            </Tabs>
          </aside>
        )}
      </div>
    </div>
  );
}
