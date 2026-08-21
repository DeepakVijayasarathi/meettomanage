import { useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, Hand, Loader2, PencilRuler, Sparkles, Star, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { ClassroomHubClient, type ClassroomHubState, type HubParticipant } from "@/lib/classroomHub";
import { postEngagement } from "@/api/engagement";
import { getLeaderboard, postAward } from "@/api/gamification";
import Whiteboard, { type BoardOp } from "./Whiteboard";
import QuizOverlay from "./QuizOverlay";
import type { LeaderboardEntry } from "./classroomData";

type PanelTab = "board" | "quiz" | "stars" | "people";

interface InteractivePanelProps {
  sessionId: string;
  mode: "teacher" | "student";
  displayName: string;
  /** Bubble a celebration up so it overlays the video, not just the panel. */
  onCelebrate: (message?: string) => void;
  /** Live leaderboard for the celebration overlay. */
  onLeaderboard: (entries: LeaderboardEntry[]) => void;
  /** Hands the host a class-wide celebrate sender (hub broadcast, local fallback). */
  onReady?: (celebrateAll: (message?: string) => void) => void;
}

/**
 * Real-time interactive layer beside the Jitsi call: shared whiteboard, live
 * quiz with a class leaderboard, roster with hand-raise, and teacher-granted
 * board access — all synced through the classroom SignalR hub. If the hub is
 * unreachable everything still renders locally (the call itself is unaffected).
 */
export default function InteractivePanel({ sessionId, mode, displayName, onCelebrate, onLeaderboard, onReady }: InteractivePanelProps) {
  const [tab, setTab] = useState<PanelTab>("board");
  const [hubState, setHubState] = useState<ClassroomHubState>("disconnected");
  const [hubDetail, setHubDetail] = useState<string | null>(null);
  const [roster, setRoster] = useState<HubParticipant[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quizActive, setQuizActive] = useState(false);
  const [syncedIndex, setSyncedIndex] = useState<number | null>(null);
  // Real per-option answer counts for the current question, built from the hub's own
  // QuizAnswer broadcasts — replaces a formula that fabricated plausible-looking numbers.
  const [quizTally, setQuizTally] = useState<Record<number, number[]>>({});
  // Students draw only when the teacher grants access; teachers always can.
  const [boardAllowed, setBoardAllowed] = useState(false);
  const [grantedIds, setGrantedIds] = useState<Set<string>>(new Set());

  const hubRef = useRef<ClassroomHubClient | null>(null);
  const boardHandlers = useRef(new Set<(op: BoardOp) => void>());

  useEffect(() => {
    const client = new ClassroomHubClient(sessionId);
    hubRef.current = client;
    let disposed = false;

    client
      .connect(displayName, {
        roster: (participants) => setRoster(participants),
        board: (opJson) => {
          try {
            const op = JSON.parse(opJson) as BoardOp;
            boardHandlers.current.forEach((handler) => handler(op));
          } catch {
            /* malformed op from a stale client — ignore */
          }
        },
        quizStarted: (questionIndex) => {
          setSyncedIndex(questionIndex);
          setQuizActive(true);
          // Fresh tally for this question, even on a relaunch of the same index.
          setQuizTally((prev) => ({ ...prev, [questionIndex]: [] }));
        },
        quizEnded: () => setQuizActive(false),
        quizAnswer: (_name, questionIndex, selectedIndex) => {
          setQuizTally((prev) => {
            const counts = [...(prev[questionIndex] ?? [])];
            counts[selectedIndex] = (counts[selectedIndex] ?? 0) + 1;
            return { ...prev, [questionIndex]: counts };
          });
        },
        leaderboard: (entries) => {
          const mapped: LeaderboardEntry[] = entries.map((entry, i) => ({
            id: entry.name,
            name: entry.name,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
            stars: entry.stars,
          }));
          setLeaderboard(mapped);
          onLeaderboard(mapped);
        },
        celebrate: (message) => onCelebrate(message ?? undefined),
        boardAccess: (allowed) => setBoardAllowed(allowed),
      }, (state, detail) => {
        if (!disposed) {
          setHubState(state);
          setHubDetail(detail ?? null);
        }
      })
      .then((ok) => {
        if (disposed) return;
        setHubState(ok ? "connected" : "disconnected");
        // Broadcast when connected (the hub echoes back to the sender); local-only otherwise.
        onReady?.((message) => {
          if (client.connected) client.celebrate(message);
          else onCelebrate(message);
        });
      });

    return () => {
      disposed = true;
      hubRef.current = null;
      client.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Seed the leaderboard from persisted awards (covers rejoin/reconnect); the hub
  // stream overwrites it as new answers come in.
  useEffect(() => {
    let cancelled = false;
    getLeaderboard(sessionId)
      .then((entries) => {
        if (cancelled || entries.length === 0) return;
        setLeaderboard((current) => {
          if (current.length > 0) return current; // hub already delivered fresher state
          const mapped: LeaderboardEntry[] = entries.map((entry, i) => ({
            id: entry.participantName,
            name: entry.participantName,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
            stars: entry.stars,
          }));
          onLeaderboard(mapped);
          return mapped;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const subscribeBoardOps = useCallback((handler: (op: BoardOp) => void) => {
    boardHandlers.current.add(handler);
    return () => {
      boardHandlers.current.delete(handler);
    };
  }, []);

  const broadcastBoardOp = useCallback((op: BoardOp) => {
    hubRef.current?.sendBoard(JSON.stringify(op));
  }, []);

  function launchQuiz() {
    setQuizActive(true);
    setSyncedIndex(0);
    hubRef.current?.startQuiz(0);
  }

  function endQuiz() {
    setQuizActive(false);
    hubRef.current?.endQuiz();
  }

  function toggleBoardAccess(participant: HubParticipant) {
    const next = !grantedIds.has(participant.connectionId);
    setGrantedIds((prev) => {
      const set = new Set(prev);
      if (next) set.add(participant.connectionId);
      else set.delete(participant.connectionId);
      return set;
    });
    hubRef.current?.setBoardAccess(participant.connectionId, next);
  }

  const canDraw = mode === "teacher" || boardAllowed;

  return (
    <div className="flex h-full min-h-0 flex-col bg-brand-navy">
      <Tabs value={tab} onValueChange={(v) => setTab(v as PanelTab)} className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-white/10 p-2">
          <TabsList className="w-full bg-white/5">
            <TabsTrigger value="board" className="flex-1 gap-1 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none">
              <PencilRuler className="h-3.5 w-3.5" /> Board
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex-1 gap-1 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none">
              <Sparkles className="h-3.5 w-3.5" /> Quiz
            </TabsTrigger>
            <TabsTrigger value="stars" className="flex-1 gap-1 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none">
              <Trophy className="h-3.5 w-3.5" /> Stars
            </TabsTrigger>
            <TabsTrigger value="people" className="flex-1 gap-1 text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none">
              <Users className="h-3.5 w-3.5" /> People
              {roster.length > 0 && (
                <span className="ml-0.5 rounded-full bg-white/15 px-1.5 py-px text-[10px] font-bold leading-tight">{roster.length}</span>
              )}
            </TabsTrigger>
          </TabsList>
          {/* Same chip language as JitsiLive's own "Rec"/"Reconnecting" header badges,
              so a degraded-hub state reads as this product's status treatment, not a
              generic warning banner. The class call itself is unaffected either way. */}
          {hubState === "reconnecting" && (
            <div className="mt-1.5 flex items-center gap-1.5 px-1">
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-amber/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-amber">
                <Loader2 className="h-3 w-3 animate-spin" /> Reconnecting
              </span>
              <p className="text-[10px] text-white/40">Board and quiz updates may not reach everyone yet.</p>
            </div>
          )}
          {hubState === "disconnected" && (
            <div className="mt-1.5 flex items-center gap-1.5 px-1">
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                <CloudOff className="h-3 w-3" /> Working locally
              </span>
              <p className="text-[10px] text-white/40">
                {hubDetail ?? "Live sync is unavailable — the class call is unaffected."}
              </p>
            </div>
          )}
        </div>

        {/* Dark, same as every other tab — the whiteboard's own light "paper" canvas
            provides the one intentional light surface inside this panel, framed by
            Whiteboard.tsx itself, instead of the whole tab flashing white around it. */}
        <TabsContent value="board" className="mt-0 min-h-0 flex-1 overflow-hidden bg-brand-navy">
          <Whiteboard
            canDraw={canDraw}
            onBoardOp={broadcastBoardOp}
            subscribeBoardOps={subscribeBoardOps}
            onInteraction={() => postEngagement(sessionId, displayName, "WhiteboardInteraction")}
            onActivityComplete={() => {
              onCelebrate();
              postEngagement(sessionId, displayName, "ActivityCompleted");
              // Whiteboard mini-games only fire this once every item is correctly placed —
              // "completed" already means "correct," same as the quiz's right-answer path.
              // Durable record first (StudentAward + server-side milestone check), then bump
              // everyone's live leaderboard view immediately.
              postAward(sessionId, displayName, "Star");
              hubRef.current?.awardStar();
            }}
          />
        </TabsContent>

        <TabsContent value="quiz" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full flex-col">
            {mode === "teacher" && (
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-2.5">
                <p className="text-xs font-semibold text-white/70">{quizActive ? "Quiz is live for the class" : "No quiz running"}</p>
                {quizActive ? (
                  <Button size="sm" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={endQuiz}>
                    End quiz
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1 !bg-brand-violet hover:!bg-[#6a4de0]" onClick={launchQuiz}>
                    <Sparkles className="h-3.5 w-3.5" /> Launch quiz
                  </Button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1">
              <QuizOverlay
                active={quizActive}
                mode={mode}
                syncedIndex={mode === "student" ? syncedIndex : undefined}
                liveTally={syncedIndex != null ? quizTally[syncedIndex] : undefined}
                onLaunchQuestion={(index) => hubRef.current?.startQuiz(index)}
                onAnswered={(questionIndex, selectedIndex, correct) => {
                  hubRef.current?.answerQuiz(questionIndex, selectedIndex, correct);
                  postEngagement(sessionId, displayName, "QuizAttempt");
                  // Durable record: stars persist beyond the class (milestones auto-granted server-side)
                  if (correct) postAward(sessionId, displayName, "Star");
                }}
                onCorrectAnswer={() => {
                  postEngagement(sessionId, displayName, "QuizCorrect");
                  onCelebrate();
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stars" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
          {leaderboard.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/40">
                <Trophy className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-white/70">No stars yet</p>
              <p className="max-w-[220px] text-xs text-white/40">Correct quiz answers earn stars — the class leaderboard fills up live.</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((entry, i) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                  style={{ backgroundColor: i < 3 ? `${entry.color}1F` : "rgba(255,255,255,0.05)" }}
                >
                  <span className="w-5 text-center text-xs font-bold text-white/50">{i + 1}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: entry.color }}>
                    {entry.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold text-white">{entry.name}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-brand-amber">
                    <Star className="h-3.5 w-3.5 fill-brand-amber" /> {entry.stars}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
          {roster.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/40">
                <Users className="h-5 w-5" />
              </span>
              <p className="max-w-[220px] text-xs text-white/40">No one is connected to the interactive layer yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {roster.map((participant) => (
                <li key={participant.connectionId} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                      participant.role === "teacher" ? "bg-brand-violet" : "bg-white/15"
                    )}
                  >
                    {participant.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{participant.name}</p>
                    <p className="text-[10px] uppercase tracking-wide text-white/40">{participant.role}</p>
                  </div>
                  {participant.handRaised && <Hand className="h-4 w-4 text-amber-300" />}
                  {mode === "teacher" && participant.role === "student" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-7 px-2 text-[11px]",
                        grantedIds.has(participant.connectionId)
                          ? "text-brand-green hover:bg-white/10"
                          : "text-white/50 hover:bg-white/10 hover:text-white"
                      )}
                      onClick={() => toggleBoardAccess(participant)}
                    >
                      <PencilRuler className="mr-1 h-3 w-3" />
                      {grantedIds.has(participant.connectionId) ? "Board on" : "Allow board"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
