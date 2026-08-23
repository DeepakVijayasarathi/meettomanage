import { useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, Hand, Loader2, PencilRuler, Sparkles, Star, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { ClassroomHubClient, type ClassroomHubState, type HubParticipant } from "@/lib/classroomHub";
import { postEngagement } from "@/api/engagement";
import { getLeaderboard, postAward } from "@/api/gamification";
import { getQuizQuestionsForSession } from "@/api/quizQuestions";
import Whiteboard, { type BoardOp } from "./Whiteboard";
import QuizOverlay from "./QuizOverlay";
import type { LeaderboardEntry, QuizQuestion } from "./classroomData";

type PanelTab = "board" | "quiz" | "stars" | "people";

interface InteractivePanelProps {
  sessionId: string;
  mode: "teacher" | "student";
  displayName: string;
  /** Bubble a celebration up so it overlays the video, not just the panel. */
  onCelebrate: (message?: string) => void;
  /** Live leaderboard for the celebration overlay. */
  onLeaderboard: (entries: LeaderboardEntry[]) => void;
  /** Hands the host a class-wide celebrate sender (hub broadcast, local fallback), and a
   *  raise-hand sender the host can forward its own hand-raise UI (e.g. Jitsi's native
   *  toolbar button) into — this panel owns the hub connection, so it's the only place
   *  that can actually send "RaiseHand" and reach the rest of the class. */
  onReady?: (senders: { celebrateAll: (message?: string) => void; raiseHand: (raised: boolean) => void }) => void;
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
  // This class's resolved quiz bank (this course's own questions, falling back to its
  // department's shared ones) — replaces what used to be one hardcoded set every class
  // shared regardless of subject. Empty until it loads, or if nothing's configured yet.
  const [questionBank, setQuestionBank] = useState<QuizQuestion[]>([]);
  // Real per-option answer counts for the current question, built from the hub's own
  // QuizAnswer broadcasts — replaces a formula that fabricated plausible-looking numbers.
  const [quizTally, setQuizTally] = useState<Record<number, number[]>>({});
  // Students draw only when the teacher grants access; teachers always can.
  const [boardAllowed, setBoardAllowed] = useState(false);
  const [grantedIds, setGrantedIds] = useState<Set<string>>(new Set());
  // Brief "Given!" confirmation on the button just clicked — giving a star is otherwise
  // fire-and-forget (postAward never throws; the hub send is a no-op while disconnected),
  // so without this the teacher has no feedback at all that the click did anything.
  const [justAwardedId, setJustAwardedId] = useState<string | null>(null);

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
        onReady?.({
          celebrateAll: (message) => {
            if (client.connected) client.celebrate(message);
            else onCelebrate(message);
          },
          // No local fallback here (unlike celebrateAll) — a raised hand only means
          // anything once it's reached the roster the rest of the class actually sees.
          raiseHand: (raised) => {
            if (client.connected) client.raiseHand(raised);
          },
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

  // Resolved once per class: this course's own quiz questions, falling back to its
  // department's shared set (or empty if nothing's configured — QuizOverlay shows an
  // honest "no questions yet" state rather than crashing on an empty bank).
  useEffect(() => {
    let cancelled = false;
    getQuizQuestionsForSession(sessionId)
      .then((questions) => {
        if (cancelled) return;
        setQuestionBank(
          questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            options: q.options.map((o) => o.text),
            correctIndex: q.options.findIndex((o) => o.isCorrect),
          }))
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
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
    // send() itself silently no-ops while the hub is down (see ClassroomHubClient), so
    // without this check the button flips to "Board on" even though the grant never
    // reached the student — the "Working locally"/"Reconnecting" chip above the roster
    // already tells the teacher why nothing happened, so no separate error needed here.
    if (!hubRef.current?.connected) return;
    const next = !grantedIds.has(participant.connectionId);
    setGrantedIds((prev) => {
      const set = new Set(prev);
      if (next) set.add(participant.connectionId);
      else set.delete(participant.connectionId);
      return set;
    });
    hubRef.current.setBoardAccess(participant.connectionId, next);
  }

  /**
   * Manual, ad-hoc star for a named student — the counterpart to the automatic
   * quiz-correct-answer / whiteboard-mini-game-completion paths, for rewarding
   * participation that doesn't happen to run through either of those (answered well
   * verbally, helped a classmate, etc.). Same durable-record-then-live-bump order as
   * every other award in this panel: postAward persists it (and auto-grants a
   * milestone server-side if it crosses a threshold) independent of whether the hub
   * is even connected; awardStarTo only refreshes what the class sees live right now.
   */
  function giveStar(participant: HubParticipant) {
    postAward(sessionId, participant.name, "Star");
    hubRef.current?.awardStarTo(participant.name);
    setJustAwardedId(participant.connectionId);
    setTimeout(() => setJustAwardedId((current) => (current === participant.connectionId ? null : current)), 1500);
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
          {/* role="status" on both: sync degrading (or recovering) mid-class is exactly the
              kind of thing a screen-reader user won't notice on their own since it can
              appear while focus is anywhere else — the roster, the whiteboard, the quiz. */}
          {hubState === "reconnecting" && (
            <div className="mt-1.5 flex items-center gap-1.5 px-1" role="status">
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-amber/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-amber">
                <Loader2 className="h-3 w-3 animate-spin" /> Reconnecting
              </span>
              <p className="text-[10px] text-white/40">Board and quiz updates may not reach everyone yet.</p>
            </div>
          )}
          {hubState === "disconnected" && (
            <div className="mt-1.5 flex items-center gap-1.5 px-1" role="status">
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
                  <Button
                    size="sm"
                    className="gap-1 !bg-brand-violet hover:!bg-[#6a4de0]"
                    onClick={launchQuiz}
                    disabled={questionBank.length === 0}
                    title={questionBank.length === 0 ? "Add questions for this course in Admin → Quiz Bank first" : undefined}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Launch quiz
                  </Button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1">
              <QuizOverlay
                active={quizActive}
                mode={mode}
                questions={questionBank}
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
                  {participant.handRaised && (
                    <span role="img" aria-label={`${participant.name} has their hand raised`} title="Hand raised">
                      <Hand className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    </span>
                  )}
                  {mode === "teacher" && participant.role === "student" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={justAwardedId === participant.connectionId}
                      className={cn(
                        "h-7 px-2 text-[11px]",
                        justAwardedId === participant.connectionId
                          ? "text-brand-amber"
                          : "text-white/50 hover:bg-white/10 hover:text-white"
                      )}
                      onClick={() => giveStar(participant)}
                      title={`Give ${participant.name} a star`}
                    >
                      <Star className={cn("mr-1 h-3 w-3", justAwardedId === participant.connectionId && "fill-brand-amber")} />
                      {justAwardedId === participant.connectionId ? "Given!" : "Give star"}
                    </Button>
                  )}
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
