import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

interface ChatPanelProps {
  mode: "teacher" | "student";
  messages: ChatMessage[];
  onSend: (text: string) => void;
  presetText?: string | null;
  onConsumePreset?: () => void;
}

const QUICK_REACTIONS = ["👍", "🎉", "🙋", "❓"];

let floatId = 0;

export default function ChatPanel({ mode, messages, onSend, presetText, onConsumePreset }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [floats, setFloats] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (presetText) {
      setDraft(presetText);
      inputRef.current?.focus();
      onConsumePreset?.();
    }
  }, [presetText, onConsumePreset]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  function react(emoji: string) {
    onSend(emoji);
    const id = floatId++;
    const left = 15 + Math.random() * 70;
    setFloats((f) => [...f, { id, emoji, left }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
  }

  return (
    <div className="relative flex h-full flex-col">
      <style>{`
        @keyframes classroom-float-up {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 1; transform: translateY(-6px) scale(1.15); }
          100% { transform: translateY(-90px) scale(1); opacity: 0; }
        }
        .classroom-float { animation: classroom-float-up 1.1s ease-out forwards; }
      `}</style>

      <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 h-24 overflow-hidden">
        {floats.map((f) => (
          <span key={f.id} className="classroom-float absolute bottom-0 text-2xl" style={{ left: `${f.left}%` }}>
            {f.emoji}
          </span>
        ))}
      </div>

      <p className="mx-4 mb-2 shrink-0 rounded-xl bg-white/[0.06] px-3 py-2.5 text-center text-xs text-white/60">
        Messages are visible to everyone in the class and are deleted when the class ends.
      </p>
      <ScrollArea className="flex-1 px-4">
        {/* role="log" + aria-live: new messages append while focus is usually elsewhere
            (video stage, toolbar) — without this a screen-reader user only discovers
            them by manually re-opening the chat tab. "polite" so it doesn't interrupt
            whatever's currently being read; existing messages aren't re-announced since
            only newly-added <li> nodes count as an "addition". */}
        <ul className="space-y-4 py-2" role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((m) => (
            <li key={m.id} className="animate-fade-in">
              <p className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-white">{m.isSelf ? "You" : m.author}</span>
                <span className="text-xs text-white/50">{m.time}</span>
              </p>
              <p className={cn("mt-0.5 break-words text-sm leading-relaxed text-white/85", /^\p{Extended_Pictographic}+$/u.test(m.text) && "text-2xl")}>
                {m.text}
              </p>
            </li>
          ))}
          <div ref={bottomRef} />
        </ul>
      </ScrollArea>

      <div className="shrink-0 space-y-2 px-4 pb-4 pt-2">
        <div className="flex gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => react(emoji)}
              className="rounded-full px-2.5 py-1 text-lg transition-transform hover:scale-110 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              title="Send reaction"
              aria-label={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-call-raised py-1 pl-4 pr-1 focus-within:ring-2 focus-within:ring-brand-orange">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder={mode === "teacher" ? "Send a message to the class" : "Send a message"}
            aria-label="Message"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
          />
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-orange hover:bg-white/10 disabled:text-white/30 disabled:hover:bg-transparent"
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
