import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiEnabled } from "@/lib/api";
import { getPublicSettings } from "@/api/settings";
import {
  askChatbot,
  listActiveFaqs,
  listMyChatHistory,
  submitChatFeedback,
  type ApiChatFaq,
  type ApiChatMessage,
} from "@/api/chatbot";
import { MOCK_CHAT_FAQS } from "@/data/chatbot";
import { findBestFaqMatch, findSmallTalkReply } from "@/lib/chatbotMatch";
import { useFixedButtonCollision } from "@/hooks/useFixedButtonCollision";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

/** Must match the key the admin Settings & Branding → Widgets tab saves. */
const WIDGET_SETTING_KEY = "widgets.doubtChatbot.enabledPortals";

const OPEN_KEY = "trn.chatbotWidget.open";
/** Demo mode (no API) has no signed-in user, so history just lives in this browser. */
const DEMO_HISTORY_KEY = "trn.chatbot.demo";
const PANEL_WIDTH = 320;
const MAX_SUGGESTIONS = 4;

interface Turn {
  id: string;
  sender: "User" | "Bot";
  text: string;
  /** Only set on a Bot turn that answered from a matched FAQ — an escalated turn has nothing to rate. */
  matched?: boolean;
  /** The question this Bot turn answered — needed to escalate it if rated unhelpful. */
  question?: string;
  /** undefined = not ratable; null = ratable, not yet rated; true/false = rated. */
  feedback?: boolean | null;
}

/** Reconstructs matched/question/feedback for a loaded history so ratings survive a reopen. */
function toTurns(history: ApiChatMessage[]): Turn[] {
  return history.map((message, i) => {
    const matched = message.sender === "Bot" && message.matchedFaqId !== null;
    return {
      id: message.id,
      sender: message.sender,
      text: message.text,
      matched: matched || undefined,
      question: matched ? history[i - 1]?.text : undefined,
      feedback: matched ? message.wasHelpful : undefined,
    };
  });
}

function loadDemoHistory(): Turn[] {
  try {
    const raw = localStorage.getItem(DEMO_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Turn[]) : [];
  } catch {
    return [];
  }
}

function saveDemoHistory(turns: Turn[]) {
  localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(turns));
}

const WELCOME_TURN: Turn = {
  id: "welcome",
  sender: "Bot",
  text: "Hi! Ask me a doubt — fees, schedule, login, homework, recordings... If I don't know the answer, I'll pass it straight to a teacher.",
};

/**
 * "Ask a Doubt" floating chatbot, mounted once in AppShell alongside FloatingNotes so every
 * portal (including Student) gets an always-available way to ask a question. Stacked directly
 * above the notes widget's button, same corner, so both are reachable without hunting two
 * different corners of the screen. Visibility is admin-configured per portal (Settings &
 * Branding → Widgets), same mechanism as Floating Notes.
 */
export function DoubtChatbot({ role }: { role: Role }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(() => localStorage.getItem(OPEN_KEY) === "1");
  const [turns, setTurns] = useState<Turn[]>([WELCOME_TURN]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [faqs, setFaqs] = useState<ApiChatFaq[]>(MOCK_CHAT_FAQS);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const coversContent = useFixedButtonCollision(buttonRef, [enabled, open]);

  // Widget visibility is a public setting (readable by any signed-in role without a
  // permission check), same pattern as FloatingNotes.
  useEffect(() => {
    if (!apiEnabled()) {
      setEnabled(true);
      return;
    }
    let cancelled = false;
    getPublicSettings()
      .then((settings) => {
        if (cancelled) return;
        const row = settings.find((s) => s.key === WIDGET_SETTING_KEY);
        if (!row?.value) {
          setEnabled(true);
          return;
        }
        try {
          const enabledPortals = JSON.parse(row.value) as string[];
          setEnabled(enabledPortals.includes(role));
        } catch {
          setEnabled(true);
        }
      })
      .catch(() => {
        if (!cancelled) setEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (apiEnabled()) {
      listActiveFaqs()
        .then(setFaqs)
        .catch(() => {
          /* fall back to the mock list already in state */
        });
    }
  }, []);

  useEffect(() => {
    if (!open || loaded) return;
    if (apiEnabled()) {
      listMyChatHistory()
        .then((history) => setTurns(history.length > 0 ? toTurns(history) : [WELCOME_TURN]))
        .catch(() => setTurns([WELCOME_TURN]))
        .finally(() => setLoaded(true));
    } else {
      const demo = loadDemoHistory();
      setTurns(demo.length > 0 ? demo : [WELCOME_TURN]);
      setLoaded(true);
    }
  }, [open, loaded]);

  useEffect(() => {
    localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function send(overrideText?: string) {
    const question = (overrideText ?? draft).trim();
    if (!question || sending) return;
    setDraft("");
    setSending(true);

    const userTurn: Turn = { id: crypto.randomUUID(), sender: "User", text: question };
    setTurns((prev) => [...prev, userTurn]);

    if (apiEnabled()) {
      try {
        const response = await askChatbot(question);
        // Ratable only when it's a real FAQ answer — `matched` alone also covers a
        // smalltalk reply (e.g. "hi"), which has nothing to rate or escalate on "not helpful".
        const ratable = response.botMessage.matchedFaqId !== null;
        setTurns((prev) => [
          ...prev,
          {
            id: response.botMessage.id,
            sender: "Bot",
            text: response.botMessage.text,
            matched: ratable || undefined,
            question: ratable ? question : undefined,
            feedback: ratable ? null : undefined,
          },
        ]);
      } catch {
        setTurns((prev) => [
          ...prev,
          { id: crypto.randomUUID(), sender: "Bot", text: "Something went wrong reaching the chatbot — try again in a moment." },
        ]);
      } finally {
        setSending(false);
      }
      return;
    }

    // Demo mode: smalltalk first, then match locally against the mock FAQ list — no
    // escalation to persist since there's no backend.
    const smallTalkReply = findSmallTalkReply(question);
    const match = smallTalkReply ? null : findBestFaqMatch(question, faqs);
    const botTurn: Turn = {
      id: crypto.randomUUID(),
      sender: "Bot",
      text: smallTalkReply ?? match?.answer ?? "I don't have an answer for that yet — in the real app this gets forwarded to a teacher.",
      matched: (!!match || !!smallTalkReply) || undefined,
      question: match ? question : undefined,
      feedback: match ? null : undefined,
    };
    const next = [...turns, userTurn, botTurn];
    setTurns(next);
    saveDemoHistory(next);
    setSending(false);
  }

  async function rate(turn: Turn, helpful: boolean) {
    if (!apiEnabled()) {
      // Built entirely inside the updater (not off the `turns` closure) so it reflects
      // whatever's actually current, then persisted from that same, definitely-fresh value.
      setTurns((prev) => {
        const rated = prev.map((t) => (t.id === turn.id ? { ...t, feedback: helpful } : t));
        const next: Turn[] = helpful
          ? rated
          : [
              ...rated,
              {
                id: crypto.randomUUID(),
                sender: "Bot",
                text: "Thanks — in the real app this gets forwarded to a teacher for a better answer.",
              },
            ];
        saveDemoHistory(next);
        return next;
      });
      return;
    }

    // Optimistic — a rating is low-stakes, and staying responsive matters more than
    // rolling back on a rare failed request.
    setTurns((prev) => prev.map((t) => (t.id === turn.id ? { ...t, feedback: helpful } : t)));

    try {
      await submitChatFeedback(turn.id, helpful, turn.question ?? turn.text);
      if (!helpful) {
        setTurns((prev) => [
          ...prev,
          { id: crypto.randomUUID(), sender: "Bot", text: "Thanks for letting me know — I've forwarded this to a teacher for a better answer." },
        ]);
      }
    } catch {
      // Rating failed silently — not worth interrupting the conversation over.
    }
  }

  const showSuggestions = turns.length === 1 && turns[0].id === "welcome" && faqs.length > 0;

  if (enabled !== true) return null;

  return (
    <>
      {/* Stacked directly above FloatingNotes' button in the same corner (not beside it) —
          same right offset, bottom pushed up by that button's height plus a gap: 80px
          (bottom-20) + 48px button + 12px gap ≈ 140px on mobile, 24px (bottom-6) + 48 + 12
          ≈ 84px on larger screens. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-[140px] right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-all hover:scale-105 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:bottom-[84px] sm:right-6",
          coversContent && !open && "opacity-30"
        )}
        aria-label={open ? "Close Ask a Doubt" : "Ask a doubt"}
      >
        <MessageCircleQuestion className="h-5 w-5" />
      </button>

      {open && (
        <Card
          className="fixed bottom-[204px] right-4 z-50 flex flex-col overflow-hidden shadow-xl sm:bottom-[148px] sm:right-6"
          style={{ width: PANEL_WIDTH }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <MessageCircleQuestion className="h-3.5 w-3.5 text-muted-foreground" /> Ask a Doubt
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex max-h-80 flex-col gap-2 overflow-y-auto p-3">
            {turns.map((turn) => (
              <div key={turn.id} className={cn("flex flex-col gap-1", turn.sender === "Bot" ? "items-start" : "items-end")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed",
                    turn.sender === "Bot" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                  )}
                >
                  {turn.text}
                </div>
                {turn.feedback === null && (
                  <div className="flex items-center gap-2 px-0.5 text-[10px] text-muted-foreground">
                    <span>Helpful?</span>
                    <button type="button" onClick={() => void rate(turn, true)} aria-label="Mark as helpful" className="hover:text-success">
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => void rate(turn, false)} aria-label="Mark as not helpful" className="hover:text-destructive">
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {turn.feedback === true && <span className="px-0.5 text-[10px] text-success">Marked helpful</span>}
              </div>
            ))}

            {showSuggestions && (
              <div className="mt-1 flex flex-col gap-1.5">
                <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Common questions</p>
                <div className="flex flex-wrap gap-1.5">
                  {faqs.slice(0, MAX_SUGGESTIONS).map((faq) => (
                    <button
                      key={faq.id}
                      type="button"
                      onClick={() => void send(faq.question)}
                      className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-[11px] text-foreground hover:border-primary hover:text-primary"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 border-t border-border p-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Type your doubt…"
              className="h-8 text-xs"
              disabled={sending}
            />
            <Button size="sm" className="h-8 w-8 shrink-0 p-0" onClick={() => void send()} disabled={sending || !draft.trim()} aria-label="Send">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
