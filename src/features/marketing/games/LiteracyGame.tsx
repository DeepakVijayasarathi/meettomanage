import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, Play, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type LiteracyGameMode = "alphabet" | "phonics" | "sounds";

interface Word {
  word: string;
  emoji: string;
}

interface Question {
  id: string;
  answer: string;
  symbol: string;
  emoji?: string;
  options: { value: string; label: string; emoji?: string }[];
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
// Whole words with straightforward initial letters. Speech is used for words,
// never presented as a way of producing isolated or "pure" phonemes.
const WORDS: Word[] = [
  { word: "sun", emoji: "☀️" }, { word: "map", emoji: "🗺️" },
  { word: "fish", emoji: "🐟" }, { word: "dog", emoji: "🐶" },
  { word: "cat", emoji: "🐱" }, { word: "ball", emoji: "⚽" },
  { word: "pig", emoji: "🐷" }, { word: "tent", emoji: "⛺" },
  { word: "rabbit", emoji: "🐰" }, { word: "hat", emoji: "🎩" },
  { word: "net", emoji: "🥅" }, { word: "leaf", emoji: "🍃" },
];
const TOTAL = 8;
const COPY = {
  alphabet: { title: "Letter match", intro: "Match a capital letter to its lowercase partner.", badge: "Big letters, little letters" },
  phonics: { title: "First-letter explorer", intro: "Look at each word and choose its first letter.", badge: "Look, say and choose" },
  sounds: { title: "Listen and find", intro: "Hear a whole word, then choose the matching picture and word.", badge: "Listen at your own pace" },
};

function shuffle<T,>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeQuestions(mode: LiteracyGameMode): Question[] {
  if (mode === "alphabet") {
    return shuffle(LETTERS).slice(0, TOTAL).map(letter => ({
      id: letter,
      answer: letter,
      symbol: letter.toUpperCase(),
      options: shuffle([letter, ...shuffle(LETTERS.filter(item => item !== letter)).slice(0, 3)])
        .map(value => ({ value, label: value })),
    }));
  }
  return shuffle(WORDS).slice(0, TOTAL).map(item => ({
    id: item.word,
    answer: mode === "phonics" ? item.word[0] : item.word,
    symbol: item.word,
    emoji: item.emoji,
    options: mode === "phonics"
      ? shuffle([item.word[0], ...shuffle(LETTERS.filter(letter => letter !== item.word[0])).slice(0, 3)])
        .map(value => ({ value, label: value }))
      : shuffle([item, ...shuffle(WORDS.filter(word => word.word !== item.word)).slice(0, 3)])
        .map(word => ({ value: word.word, label: word.word, emoji: word.emoji })),
  }));
}

function speechAvailable() {
  return typeof window !== "undefined"
    && typeof window.speechSynthesis?.speak === "function"
    && typeof window.SpeechSynthesisUtterance === "function";
}

/** The keyed session resets when changing game modes. Nothing is stored or sent. */
export function LiteracyGame({ mode }: { mode: LiteracyGameMode }) {
  return <GameSession key={mode} mode={mode} />;
}

function GameSession({ mode }: { mode: LiteracyGameMode }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hadWrongAttempt, setHadWrongAttempt] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [clueRequested, setClueRequested] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const question = questions?.[index];
  const finished = questions !== null && index === questions.length;
  const audioSupported = speechAvailable();
  const showClue = mode === "sounds" && (!audioSupported || audioFailed || clueRequested);
  const copy = COPY[mode];

  const stopSpeech = useCallback(() => {
    const utterance = utteranceRef.current;
    if (utterance) {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      utteranceRef.current = null;
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    }
  }, []);

  useEffect(() => {
    return stopSpeech;
  }, [index, stopSpeech]);

  useEffect(() => {
    if (questions) headingRef.current?.focus();
  }, [index, questions]);

  function resetQuestion() {
    setResolved(false);
    setSelected(null);
    setHadWrongAttempt(false);
    setFeedback("");
    setClueRequested(false);
    setAudioFailed(false);
    setSpeaking(false);
  }

  function start() {
    stopSpeech();
    // Randomness starts only after this explicit action, keeping initial HTML stable.
    setQuestions(makeQuestions(mode));
    setIndex(0);
    setScore(0);
    resetQuestion();
  }

  function answer(value: string) {
    if (!question || resolved) return;
    setSelected(value);
    if (value === question.answer) {
      setResolved(true);
      if (!hadWrongAttempt) setScore(current => current + 1);
      setFeedback(hadWrongAttempt ? "You found it! Practice helps us learn." : "You found it on your first try. Well done!");
    } else {
      setHadWrongAttempt(true);
      setFeedback("Good try. Take another look and choose again.");
    }
  }

  function next() {
    if (!resolved) return;
    stopSpeech();
    setIndex(current => current + 1);
    resetQuestion();
  }

  function listen() {
    if (!question) return;
    stopSpeech();
    if (!speechAvailable()) {
      setAudioFailed(true);
      return;
    }
    try {
      const speech = window.speechSynthesis;
      const utterance = new window.SpeechSynthesisUtterance(mode === "phonics" ? question.symbol : question.answer);
      const englishVoice = speech.getVoices().find(voice => /^en(?:-|_|$)/i.test(voice.lang));
      if (englishVoice) utterance.voice = englishVoice;
      utterance.lang = englishVoice?.lang ?? "en-GB";
      utterance.rate = 0.8;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => { setSpeaking(false); utteranceRef.current = null; };
      utterance.onerror = () => {
        setSpeaking(false);
        setAudioFailed(true);
        utteranceRef.current = null;
      };
      utteranceRef.current = utterance;
      setSpeaking(true);
      speech.speak(utterance);
    } catch {
      stopSpeech();
      setSpeaking(false);
      setAudioFailed(true);
    }
  }

  return (
    <section aria-label={`${copy.title} game`} className="overflow-hidden rounded-[28px] border border-[#F0D7C2] bg-white shadow-[0_18px_50px_-30px_rgba(154,52,18,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0DFD0] bg-[#FFF7EF] px-5 py-4 sm:px-7">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.07em] text-[#9A3412]"><Sparkles aria-hidden="true" className="h-4 w-4" />{copy.badge}</p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#7A6657]">8 questions · No timer</span>
      </div>

      {!questions ? (
        <div className="px-5 py-10 text-center sm:px-8 sm:py-14">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FFEDD9] text-[#C2410C]"><BookOpen aria-hidden="true" className="h-10 w-10" /></span>
          <h2 className="font-display mt-6 text-3xl font-extrabold tracking-tight text-[#29211B]">{copy.title}</h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-[#716154]">{copy.intro} Try as often as you like. There is no rush.</p>
          {mode === "sounds" && <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#716154]">Sound plays only when you press the listen button. You can use a written clue instead.</p>}
          <button type="button" onClick={start} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C2410C] px-7 py-3 text-base font-bold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]"><Play aria-hidden="true" className="h-4 w-4" />Start playing</button>
          <p className="mt-4 text-xs text-[#8B7766]">One first-try point per question. Mistakes are a chance to practise.</p>
        </div>
      ) : finished ? (
        <div className="px-5 py-10 text-center sm:px-8 sm:py-14">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF0CD] text-4xl" aria-hidden="true">🌟</span>
          <h2 ref={headingRef} tabIndex={-1} className="font-display mt-6 text-3xl font-extrabold tracking-tight text-[#29211B] focus:outline-none">You finished all 8 questions!</h2>
          <p className="mt-3 text-lg font-bold text-[#9A3412]">First-try score: {score} out of {TOTAL}</p>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-[#716154]">Every try is practice. Come back for a fresh set whenever you like.</p>
          <button type="button" onClick={start} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C2410C] px-7 py-3 text-base font-bold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]"><RotateCcw aria-hidden="true" className="h-4 w-4" />Play again</button>
        </div>
      ) : question ? (
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#7A6657]"><p>Question {index + 1} of {TOTAL}</p><p>First-try score: {score}</p></div>
          <div role="progressbar" aria-label="Questions completed" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={index + (resolved ? 1 : 0)} className="mt-3 h-2 overflow-hidden rounded-full bg-[#F5E8DE]"><div className="h-full rounded-full bg-[#EA580C] transition-[width] motion-reduce:transition-none" style={{ width: `${((index + (resolved ? 1 : 0)) / TOTAL) * 100}%` }} /></div>
          <h2 ref={headingRef} tabIndex={-1} className="font-display mt-7 text-center text-xl font-extrabold leading-snug text-[#29211B] focus:outline-none sm:text-2xl">
            {mode === "alphabet" ? `Which lowercase letter matches ${question.symbol}?` : mode === "phonics" ? `Which letter starts the word ${question.symbol}?` : "Which word did you hear?"}
          </h2>
          {mode !== "sounds" ? (
            <>
              <div aria-hidden="true" className="mx-auto my-6 flex min-h-28 w-fit min-w-28 flex-col items-center justify-center gap-3 rounded-3xl bg-[#FFF2E4] px-7 py-5 font-display text-6xl font-extrabold text-[#C2410C] sm:text-7xl">{mode === "phonics" && <span className="text-5xl sm:text-6xl">{question.emoji}</span>}{question.symbol}</div>
              {mode === "phonics" && <div className="mb-6 text-center">
                {audioSupported && <button type="button" onClick={listen} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#EDC9AA] bg-white px-5 py-2 text-sm font-bold text-[#9A3412] hover:bg-[#FFF2E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]"><Volume2 aria-hidden="true" className="h-4 w-4" />{speaking ? "Hear the word again" : "Hear the word"}</button>}
                {(!audioSupported || audioFailed) && <p role="status" className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#6C5747]">Audio is unavailable here. You can keep playing using the picture and written word.</p>}
              </div>}
            </>
          ) : (
            <div className="my-6 text-center">
              <button type="button" onClick={listen} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-[#EDC9AA] bg-[#FFF2E4] px-6 py-4 text-lg font-bold text-[#9A3412] hover:bg-[#FFE6CE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]"><Volume2 aria-hidden="true" className="h-6 w-6" />{speaking ? "Hear the word again" : "Hear the word"}</button>
              {!showClue && <button type="button" onClick={() => { stopSpeech(); setSpeaking(false); setClueRequested(true); }} className="mx-auto mt-3 block min-h-10 rounded-lg px-3 text-sm font-semibold text-[#9A3412] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C2410C]">Use a written clue instead</button>}
              {showClue && <div role="status" className="mx-auto mt-4 max-w-sm rounded-xl bg-[#FFF7EF] px-4 py-3 text-sm leading-relaxed text-[#6C5747]">{!audioSupported || audioFailed ? "Audio is unavailable here. You can keep playing with this written clue." : "Here is your written clue."}<span className="mt-2 block text-xl font-bold text-[#9A3412]">Find: {question.answer}</span></div>}
            </div>
          )}
          <div role="group" aria-label="Choose your answer" className="mx-auto grid max-w-lg grid-cols-2 gap-3">
            {question.options.map(option => {
              const correct = resolved && option.value === question.answer;
              const wrong = selected === option.value && !correct;
              return <button key={option.value} type="button" disabled={resolved} onClick={() => answer(option.value)} aria-pressed={selected === option.value} className={cn("relative flex min-h-20 items-center justify-center gap-3 rounded-2xl border-2 px-3 py-4 font-display text-3xl font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C] sm:min-h-24", option.emoji && "flex-col text-base sm:text-lg", correct ? "border-[#22804B] bg-[#F0FAF3] text-[#166534]" : wrong ? "border-[#D48343] bg-[#FFF4E7] text-[#9A3412]" : "border-[#EBDACD] bg-white text-[#45352A] enabled:hover:border-[#EA580C] enabled:hover:bg-[#FFF7EF]")}>{option.emoji && <span aria-hidden="true" className="text-4xl">{option.emoji}</span>}{option.label}{correct && <Check aria-hidden="true" className="absolute end-2 top-2 h-4 w-4" />}</button>;
            })}
          </div>
          <p aria-live="polite" aria-atomic="true" className="mx-auto mt-5 min-h-12 max-w-lg text-center text-sm font-semibold leading-relaxed text-[#78533A]">{feedback || "Choose an answer. You can try again if you need to."}</p>
          <div className="mt-3 flex justify-center"><button type="button" onClick={next} disabled={!resolved} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C2410C] px-7 py-3 text-base font-bold text-white transition-colors enabled:hover:bg-[#9A3412] disabled:cursor-not-allowed disabled:bg-[#E9D8CB] disabled:text-[#7C6655] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]">{index === TOTAL - 1 ? "See how you did" : "Next question"}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button></div>
        </div>
      ) : null}
    </section>
  );
}
