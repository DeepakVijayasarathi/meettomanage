import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles, Timer, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QUIZ_BANK } from "./classroomData";

interface QuizOverlayProps {
  /** Whether the teacher currently has a question live for the class. */
  active: boolean;
  mode: "teacher" | "student";
  onCorrectAnswer: () => void;
}

const QUESTION_SECONDS = 15;

export default function QuizOverlay({ active, mode, onCorrectAnswer }: QuizOverlayProps) {
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<"countdown" | "revealed">("countdown");
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const scoredRef = useRef(false);

  const question = QUIZ_BANK[qIndex % QUIZ_BANK.length];

  const optionCounts = useMemo(
    () => question.options.map((_, i) => (((qIndex + 1) * 7 + i * 13) % 6) + 1),
    [qIndex, question]
  );
  const displayCounts = optionCounts.map((c, i) => (selected === i ? c + 1 : c));
  const maxCount = Math.max(...displayCounts, 1);

  useEffect(() => {
    if (!active) return;
    setPhase("countdown");
    setTimeLeft(QUESTION_SECONDS);
    setSelected(null);
    scoredRef.current = false;
  }, [active, qIndex]);

  useEffect(() => {
    if (!active || phase !== "countdown") return;
    if (timeLeft <= 0) {
      setPhase("revealed");
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [active, phase, timeLeft]);

  useEffect(() => {
    if (phase !== "revealed" || scoredRef.current) return;
    scoredRef.current = true;
    if (selected === null) return;
    const isCorrect = selected === question.correctIndex;
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    if (isCorrect) onCorrectAnswer();
  }, [phase, selected, question, onCorrectAnswer]);

  function selectOption(idx: number) {
    if (phase !== "countdown" || selected !== null) return;
    setSelected(idx);
  }

  function nextQuestion() {
    setQIndex((i) => i + 1);
  }

  if (!active) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/40">
          <Sparkles className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-white/70">No quiz running</p>
        <p className="max-w-[220px] text-xs text-white/40">
          {mode === "teacher" ? "Launch a live quiz from the toolbar — it'll appear here for the class." : "Your teacher hasn't started a quiz yet. Hang tight!"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2 border-b border-white/10 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full bg-brand-violet/20 px-2.5 py-1 text-[11px] font-bold text-brand-violet">
            <Sparkles className="h-3 w-3" /> Live Quiz
          </span>
          {phase === "countdown" && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                timeLeft <= 5 ? "bg-destructive/20 text-red-300" : "bg-white/10 text-white/80"
              )}
            >
              <Timer className="h-3.5 w-3.5" /> {timeLeft}s
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-white/50">
          Question {(qIndex % QUIZ_BANK.length) + 1} of {QUIZ_BANK.length}
        </p>
        <p className="text-sm font-semibold leading-snug text-white">{question.prompt}</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isSelected = selected === i;
          const showResult = phase === "revealed";
          return (
            <button
              key={opt}
              onClick={() => selectOption(i)}
              disabled={phase !== "countdown" || selected !== null}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all",
                !showResult && isSelected && "border-brand-violet bg-brand-violet/15 text-white",
                !showResult && !isSelected && "border-white/10 text-white/80 hover:border-white/25 hover:bg-white/5",
                showResult && isCorrect && "border-brand-green bg-brand-green/15 text-white",
                showResult && !isCorrect && isSelected && "border-destructive bg-destructive/15 text-white",
                showResult && !isCorrect && !isSelected && "border-white/10 text-white/40"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </span>
              {showResult && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green" />}
              {showResult && !isCorrect && isSelected && <XCircle className="h-4 w-4 shrink-0 text-red-300" />}
              {!showResult && (
                <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-white/40"
                    style={{ width: `${(optionCounts[i] / Math.max(...optionCounts, 1)) * 100}%` }}
                  />
                </span>
              )}
            </button>
          );
        })}

        {phase === "revealed" && (
          <div className="space-y-2 rounded-xl bg-white/5 p-3">
            <p className="text-[11px] font-semibold text-white/50">Live response tally</p>
            {question.options.map((opt, i) => {
              const count = displayCounts[i];
              return (
                <div key={opt} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 truncate font-medium text-white/70">{opt}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className={cn("block h-full rounded-full", i === question.correctIndex ? "bg-brand-green" : "bg-white/30")}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </span>
                  <span className="w-5 text-right text-white/40">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-white/10 p-3">
        <p className="text-xs font-semibold text-white/70">
          {mode === "teacher" ? "Class score" : "Your score"}: {score.correct}/{score.total}
        </p>
        <div className="flex gap-2">
          {mode === "teacher" && phase === "countdown" && (
            <Button size="sm" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setPhase("revealed")}>
              Reveal now
            </Button>
          )}
          {mode === "teacher" && phase === "revealed" && (
            <Button size="sm" className="gap-1 !bg-brand-violet hover:!bg-[#6a4de0]" onClick={nextQuestion}>
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
