import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

      <ScrollArea className="flex-1 px-3 pt-3">
        {/* role="log" + aria-live: new messages append while focus is usually elsewhere
            (video stage, toolbar) — without this a screen-reader user only discovers
            them by manually re-opening the chat tab. "polite" so it doesn't interrupt
            whatever's currently being read; existing messages aren't re-announced since
            only newly-added <li> nodes count as an "addition". */}
        <ul className="space-y-3 pb-2" role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((m) => (
            <li key={m.id} className={cn("flex flex-col gap-0.5", m.isSelf && "items-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm animate-fade-in",
                  m.isSelf ? "bg-brand-green text-white" : "bg-white/10 text-white"
                )}
              >
                {!m.isSelf && <p className="mb-0.5 text-[11px] font-semibold text-white/60">{m.author}</p>}
                <p className="leading-snug">{m.text}</p>
              </div>
              <span className="px-1 text-[10px] text-white/35">{m.time}</span>
            </li>
          ))}
          <div ref={bottomRef} />
        </ul>
      </ScrollArea>

      <div className="shrink-0 space-y-2 border-t border-white/10 p-2.5">
        <div className="flex gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => react(emoji)}
              className="rounded-lg px-2 py-1 text-base transition-transform hover:scale-125 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Send reaction"
              aria-label={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder={mode === "teacher" ? "Message the class…" : "Say something…"}
            className="h-9 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/40 focus-visible:ring-white/30"
          />
          <Button size="icon" className="h-9 w-9 shrink-0 !bg-brand-green hover:!bg-brand-greenDark" onClick={send} disabled={!draft.trim()} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
