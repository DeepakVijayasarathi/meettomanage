import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Send, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiEnabled } from "@/lib/api";
import { getPublicSettings } from "@/api/settings";
import { askChatbot, listActiveFaqs, listMyChatHistory, type ApiChatFaq, type ApiChatMessage } from "@/api/chatbot";
import { MOCK_CHAT_FAQS } from "@/data/chatbot";
import { findBestFaqMatch } from "@/lib/chatbotMatch";
import { useFixedButtonCollision } from "@/hooks/useFixedButtonCollision";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

/** Must match the key the admin Settings & Branding → Widgets tab saves. */
const WIDGET_SETTING_KEY = "widgets.doubtChatbot.enabledPortals";

const OPEN_KEY = "trn.chatbotWidget.open";
/** Demo mode (no API) has no signed-in user, so history just lives in this browser. */
const DEMO_HISTORY_KEY = "trn.chatbot.demo";
const PANEL_WIDTH = 320;

interface Turn {
  id: string;
  sender: "User" | "Bot";
  text: string;
}

function toTurn(message: ApiChatMessage): Turn {
  return { id: message.id, sender: message.sender, text: message.text };
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
 * portal (including Student) gets an always-available way to ask a question. Bottom-left so
 * it never collides with the notes widget's bottom-right button. Visibility is admin-configured
 * per portal (Settings & Branding → Widgets), same mechanism as Floating Notes.
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
        .then((history) => setTurns(history.length > 0 ? history.map(toTurn) : [WELCOME_TURN]))
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

  async function send() {
    const question = draft.trim();
    if (!question || sending) return;
    setDraft("");
    setSending(true);

    const userTurn: Turn = { id: crypto.randomUUID(), sender: "User", text: question };
    setTurns((prev) => [...prev, userTurn]);

    if (apiEnabled()) {
      try {
        const response = await askChatbot(question);
        setTurns((prev) => [...prev, toTurn(response.botMessage)]);
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

    // Demo mode: match locally against the mock FAQ list, no escalation to persist.
    const match = findBestFaqMatch(question, faqs);
    const botTurn: Turn = {
      id: crypto.randomUUID(),
      sender: "Bot",
      text: match?.answer ?? "I don't have an answer for that yet — in the real app this gets forwarded to a teacher.",
    };
    const next = [...turns, userTurn, botTurn];
    setTurns(next);
    saveDemoHistory(next);
    setSending(false);
  }

  if (enabled !== true) return null;

  return (
    <>
      {/* bottom-left, mirroring FloatingNotes' bottom-right button so the two widgets never
          overlap; bottom-20/right-4 → bottom-6/left-6 on larger screens matches its spacing. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-20 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:opacity-100 sm:bottom-6 sm:left-6",
          coversContent && !open && "opacity-30"
        )}
        aria-label={open ? "Close Ask a Doubt" : "Ask a doubt"}
      >
        <MessageCircleQuestion className="h-5 w-5" />
      </button>

      {open && (
        <Card
          className="fixed bottom-36 left-4 z-50 flex flex-col overflow-hidden shadow-xl sm:bottom-[88px] sm:left-6"
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
              <div
                key={turn.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed",
                  turn.sender === "Bot" ? "self-start bg-muted text-foreground" : "self-end bg-primary text-primary-foreground"
                )}
              >
                {turn.text}
              </div>
            ))}
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
