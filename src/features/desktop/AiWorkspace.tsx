import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, BarChart3, CalendarClock, Check, ClipboardList, Copy, Database, FileEdit, Loader2, MessageSquare, Plus, RefreshCw, Settings, ShieldAlert, Square, Table2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAccessToken } from "@/lib/api";
import { useSession } from "@/state/session";
import { cn } from "@/lib/utils";
import NotFound from "@/features/auth/NotFound";
import { getDesktop, RICH_LANGS, type AiAskPayload, type AiEvent, type ClaudeStatus, type RichLang } from "./desktopBridge";
import { BlockPending, RichBlock } from "./richBlocks";

type Msg = { id: number; kind: "user" | "bot"; text: string; at: number };
type Chat = { id: string; title: string; sessionId: string | null; messages: Msg[]; updatedAt: number };
type Model = AiAskPayload["model"];

// Meet to Manage brand: warm orange on cream, matching the marketing site. Scoped to this screen only by
// overriding the theme tokens, so every Button/badge/rich block inside picks the orange up automatically.
const BRAND: CSSProperties = { ["--primary" as string]: "21 90% 48%", ["--primary-foreground" as string]: "0 0% 100%", ["--ring" as string]: "25 95% 53%" };
// Logo orange (sampled from the Meet to Manage logo) marks actions and your own messages; no black is used.
const ACTION = "bg-[#F25C05] text-white hover:bg-[#E05200]";
const AVATAR = "/product/mito-avatar.webp";

const PROMPTS = ["Summarize today's student status", "Which fee invoices are overdue?", "List active batches and their teachers", "How many classes are scheduled this week?"];

const CREATE: { label: string; hint: string; icon: typeof Table2; prompt: string }[] = [
  { label: "Quiz", hint: "Interactive, auto-scored", icon: ClipboardList, prompt: "Create a 5-question quiz on short vowel sounds for Grade 1 students." },
  { label: "Class plan", hint: "Timeline with objectives", icon: CalendarClock, prompt: "Create a 45-minute class plan for teaching the letter sounds s, a, t, p to beginners." },
  { label: "Chart", hint: "From live academy data", icon: BarChart3, prompt: "Show a chart of the number of students in each active batch." },
  { label: "Table", hint: "Searchable, exportable", icon: Table2, prompt: "Show a table of all overdue fee invoices with parent, amount and due date." },
];

const MODELS: { id: Model; label: string; hint: string }[] = [
  { id: "", label: "Default", hint: "Whatever your Claude plan uses" },
  { id: "sonnet", label: "Balanced", hint: "Sonnet · good for most questions" },
  { id: "opus", label: "Most capable", hint: "Opus · best for complex analysis, uses more of your limit" },
  { id: "haiku", label: "Fastest", hint: "Haiku · quick answers" },
];

const SETTINGS_KEY = "m2m.aiWorkspace.settings";
const CHATS_KEY = "m2m.aiWorkspace.chats";
const MAX_CHATS = 30;

function loadChats(): Chat[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHATS_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ---- Minimal, safe Markdown (React nodes only, no innerHTML) ----
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-2 overflow-hidden rounded-xl border bg-muted/50">
      <div className="flex items-center justify-between border-b bg-muted px-3 py-1 text-[11px] text-muted-foreground">
        <span>{lang || "code"}</span>
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => {
            void navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

/** `live` = this message is still streaming, so an unclosed fence just means the rest hasn't arrived yet. */
function Markdown({ text, live }: { text: string; live: boolean }) {
  const nodes: ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      const closed = i < lines.length;
      i++;
      const lang = fence[1].toLowerCase();
      if ((RICH_LANGS as readonly string[]).includes(lang)) {
        // Only show the skeleton while streaming. Once the reply is final, render whatever arrived (a block
        // missing its closing fence still parses, otherwise the block shows a readable error).
        nodes.push(!closed && live ? <BlockPending key={key++} lang={lang} /> : <RichBlock key={key++} lang={lang as RichLang} raw={buf.join("\n")} />);
      } else nodes.push(<CodeBlock key={key++} code={buf.join("\n")} lang={fence[1]} />);
    } else if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      nodes.push(
        <div key={key++} className="my-2 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60"><tr>{head.map((h, c) => <th key={c} className="px-2.5 py-1.5 font-semibold">{inline(h)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri} className="border-t">{r.map((c, ci) => <td key={ci} className="px-2.5 py-1.5">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const Tag = ordered ? "ol" : "ul";
      nodes.push(<Tag key={key++} className={cn("my-1.5 space-y-0.5 pl-5", ordered ? "list-decimal" : "list-disc")}>{items.map((t, n) => <li key={n}>{inline(t)}</li>)}</Tag>);
    } else if (/^#{1,4}\s/.test(line)) {
      nodes.push(<p key={key++} className="mb-1 mt-3 font-semibold">{inline(line.replace(/^#{1,4}\s/, ""))}</p>);
      i++;
    } else if (!line.trim()) {
      i++;
    } else {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(```|\s*([-*]|\d+\.)\s|#{1,4}\s|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
      if (!buf.length) buf.push(lines[i++]);
      nodes.push(<p key={key++} className="my-1.5 leading-relaxed">{inline(buf.join(" "))}</p>);
    }
  }
  return <div className="text-sm leading-relaxed text-foreground">{nodes}</div>;
}

function MitoAvatar({ size = 32, className }: { size?: number; className?: string }) {
  return <img src={AVATAR} alt="" width={size} height={size} style={{ width: size, height: size }} className={cn("shrink-0 rounded-full bg-[#FFEBDD] object-cover", className)} />;
}

/** Desktop-app-only AI workspace: Mito, chatting through the Claude CLI with live Meet to Manage data via MCP. */
export default function AiWorkspace() {
  const desktop = getDesktop();
  const session = useSession();
  const [claude, setClaude] = useState<ClaudeStatus | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [toolRunning, setToolRunning] = useState(false); // drives the "Working…" line only; tool calls are not shown
  const [chats, setChats] = useState<Chat[]>(loadChats);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null); // mirrors activeId so effects never see a stale value

  const saved = useRef<{ allowEdits?: boolean; allowCreate?: boolean; model?: Model }>(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
      } catch {
        return {};
      }
    })(),
  );
  const demo = desktop?.demo === true; // read-only demo against a client's API: nothing may write
  const [allowEdits, setAllowEdits] = useState(!demo && saved.current.allowEdits === true);
  // Creation-only (quizzes and assignments, never update/delete), so it is remembered unlike full live writes.
  const [allowCreate, setAllowCreate] = useState(!demo && saved.current.allowCreate === true);
  const [model, setModel] = useState<Model>(saved.current.model ?? "");
  // Deliberately not remembered: live writes must be switched on again each time the workspace opens.
  const [allowLiveWrites, setAllowLiveWrites] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sessionId = useRef<string | null>(null);
  const streaming = useRef<number | null>(null); // id of the bot message receiving text deltas
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ allowEdits, allowCreate, model }));
    } catch {
      /* storage blocked: settings just won't persist */
    }
  }, [allowEdits, allowCreate, model]);

  // Hand the site's own sign-in to the app so live-data tools work without a second login.
  const user = session.userName;
  useEffect(() => {
    if (!desktop) return;
    void desktop.ai.setLiveToken(getAccessToken(), user);
    void desktop.claude.status().then(setClaude);
    return () => {
      void desktop.ai.setLiveToken(null);
    };
  }, [desktop, user]);

  useEffect(() => {
    if (!desktop) return;
    const add = (kind: Msg["kind"], text: string) => {
      const id = nextId.current++;
      setMessages((m) => [...m, { id, kind, text, at: Date.now() }]);
      return id;
    };
    return desktop.ai.onEvent((ev: AiEvent) => {
      if (ev.session_id) sessionId.current = ev.session_id;
      if (ev.type === "stream_event") {
        const d = ev.event?.delta;
        if (d?.type === "text_delta" && d.text) {
          const text = d.text;
          setToolRunning(false);
          if (streaming.current === null) streaming.current = add("bot", text);
          else {
            const id = streaming.current;
            setMessages((m) => m.map((x) => (x.id === id ? { ...x, text: x.text + text } : x)));
          }
        }
      } else if (ev.type === "assistant" && typeof ev.message === "object") {
        if ((ev.message.content ?? []).some((block) => block.type === "tool_use")) setToolRunning(true);
        streaming.current = null;
      } else if (ev.type === "result") {
        if (ev.is_error) add("bot", "Error: " + (ev.result ?? "unknown"));
        streaming.current = null;
      } else if (ev.type === "error") {
        add("bot", String(ev.message));
        setBusy(false);
      } else if (ev.type === "done") {
        if (ev.code) add("bot", `Claude exited with code ${ev.code}${ev.stderr ? "\n" + ev.stderr : ""}`);
        streaming.current = null;
        setToolRunning(false);
        setBusy(false);
      }
    });
  }, [desktop]);

  // Save the conversation once a reply has finished, so it can be reopened from "Recent chats".
  useEffect(() => {
    if (busy || messages.length === 0) return;
    const id = activeRef.current ?? crypto.randomUUID();
    if (activeRef.current !== id) {
      activeRef.current = id;
      setActiveId(id);
    }
    const first = messages.find((m) => m.kind === "user")?.text ?? "New chat";
    const chat: Chat = { id, title: first.length > 44 ? first.slice(0, 44) + "…" : first, sessionId: sessionId.current, messages: messages.slice(-200), updatedAt: Date.now() };
    setChats((prev) => {
      const next = [chat, ...prev.filter((c) => c.id !== id)].slice(0, MAX_CHATS);
      try {
        localStorage.setItem(CHATS_KEY, JSON.stringify(next));
      } catch {
        /* storage full or blocked: history just isn't kept */
      }
      return next;
    });
  }, [messages, busy]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);
  // Autosize the composer up to ~8 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [input]);

  if (!desktop) return <NotFound />;

  const notReady = !!claude && (!claude.cliFound || !claude.loggedIn);
  const lastKind = messages[messages.length - 1]?.kind;
  const working = busy && (lastKind !== "bot" || toolRunning);
  const firstName = ""; // userName is the account/academy name for admin logins, so it reads wrongly as a first name
  const modelLabel = MODELS.find((m) => m.id === model)?.label ?? "Default";

  function send(text = input) {
    const prompt = text.trim();
    if (!prompt || busy || !desktop) return;
    setMessages((m) => [...m, { id: nextId.current++, kind: "user", text: prompt, at: Date.now() }]);
    setInput("");
    streaming.current = null;
    setBusy(true);
    desktop.ai.ask({ prompt, sessionId: sessionId.current, allowEdits, allowLiveWrites, allowCreate, model });
  }

  function newChat() {
    if (busy) return;
    sessionId.current = null;
    streaming.current = null;
    setMessages([]);
    activeRef.current = null;
    setActiveId(null);
    inputRef.current?.focus();
  }

  function openChat(c: Chat) {
    if (busy) return;
    sessionId.current = c.sessionId;
    streaming.current = null;
    nextId.current = Math.max(0, ...c.messages.map((m) => m.id)) + 1;
    setMessages(c.messages);
    activeRef.current = c.id;
    setActiveId(c.id);
  }

  function deleteChat(id: string) {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try {
        localStorage.setItem(CHATS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    if (id === activeId) newChat();
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.kind === "user");
    if (!lastUser || busy) return;
    // Drop the reply being replaced and the question, then ask again in the same session.
    setMessages((m) => m.slice(0, m.lastIndexOf(lastUser)));
    send(lastUser.text);
  }

  function toggleWrites() {
    if (!allowLiveWrites && !window.confirm("Let Mito create, update and delete data on the LIVE system?")) return;
    setAllowLiveWrites((v) => !v);
  }

  const Mode = ({ on, onClick, icon: Icon, label, hint, danger }: { on: boolean; onClick: () => void; icon: typeof Database; label: string; hint: string; danger?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn("flex w-full items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors", on ? (danger ? "border-destructive/50 bg-destructive/10" : "border-primary/40 bg-primary/10") : "hover:bg-muted/60")}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", on ? (danger ? "text-destructive" : "text-primary") : "text-muted-foreground")} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[13px] font-medium">
          {label}
          <span className={cn("rounded-full px-1.5 text-[10px] font-semibold uppercase", on ? (danger ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground") : "bg-muted text-muted-foreground")}>{on ? "On" : "Off"}</span>
        </span>
        <span className="block text-[11px] leading-snug text-muted-foreground">{hint}</span>
      </span>
    </button>
  );

  const lastBotId = [...messages].reverse().find((m) => m.kind === "bot")?.id;
  const recent = chats.slice(0, 7);

  return (
    <div style={BRAND} className="mx-auto -mb-44 flex h-[calc(100dvh-5.5rem)] min-h-[420px] max-w-6xl gap-3 sm:-mb-28">
      {/* Left rail: fixed height, never scrolls */}
      <aside className="hidden w-60 shrink-0 flex-col overflow-hidden rounded-lg border bg-card lg:flex">
        <div className="flex items-center gap-2.5 border-b px-3 py-3">
          <MitoAvatar size={28} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-foreground">Mito</p>
            <p className="text-[11px] leading-tight text-muted-foreground">AI assistant</p>
          </div>
        </div>

        <div className="p-3">
          <button onClick={newChat} disabled={busy} className={cn("flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60", ACTION)}>
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>

        <div className="px-3 pb-2">
          <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Create</p>
          {CREATE.map((c) => (
            <button key={c.label} disabled={busy || notReady} onClick={() => send(c.prompt)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-muted disabled:opacity-50">
              <c.icon className="h-4 w-4 text-muted-foreground" /> {c.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-3">
          <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recent</p>
          {recent.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">No conversations yet.</p>
          ) : (
            <ul>
              {recent.map((c) => (
                <li key={c.id} className="group flex items-center">
                  <button onClick={() => openChat(c)} title={c.title} className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted", c.id === activeId && "bg-muted font-medium")}>
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button onClick={() => deleteChat(c.id)} aria-label={`Delete chat: ${c.title}`} className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t p-2">
          <button onClick={() => setSettingsOpen(true)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-muted">
            <Settings className="h-4 w-4 text-muted-foreground" /> Settings
          </button>
          <p className="truncate px-2 pt-1 text-[11px] text-muted-foreground">{claude?.loggedIn ? (claude.email ?? "Claude connected") : claude ? "Claude not connected" : "Connecting…"}</p>
        </div>
      </aside>

      {/* Chat */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Mito</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", claude?.loggedIn ? "bg-emerald-500" : "bg-amber-500")} />
              {claude?.loggedIn ? modelLabel : "Not connected"}
            </span>
            {demo && <span className="rounded bg-[#F25C05] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Demo · read-only · {desktop?.apiHost}</span>}
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <button onClick={newChat} disabled={busy} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="New chat"><Plus className="h-4 w-4" /></button>
            <button onClick={() => setSettingsOpen(true)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Settings"><Settings className="h-4 w-4" /></button>
          </div>
        </header>

        {notReady && (
          <div className="shrink-0 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {claude?.cliFound ? "You're not logged in to Claude." : "Claude CLI not found."}{" "}
            <Link to="/desktop/claude" className="font-medium underline">Open Claude Account</Link>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-4 text-center">
              <MitoAvatar size={44} />
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">How can I help{firstName ? ", " + firstName : ""}?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ask about your academy, or create quizzes, class plans, charts and tables.</p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2">
                {CREATE.map((c) => (
                  <button key={c.label} disabled={busy || notReady} onClick={() => send(c.prompt)} className="flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors hover:border-[#F25C05]/50 hover:bg-muted/50 disabled:opacity-50">
                    <c.icon className="h-4 w-4 shrink-0 text-[#F25C05]" />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{c.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.prompt}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {PROMPTS.slice(0, 3).map((p) => (
                  <button key={p} disabled={busy || notReady} onClick={() => send(p)} className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((m) =>
                m.kind === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-[#F25C05] px-3 py-2 text-sm text-white">{m.text}</div>
                  </div>
                ) : (
                  <div key={m.id} className="group flex gap-2.5">
                    <MitoAvatar size={24} className="mt-0.5" />
                    <div className="min-w-0 flex-1 break-words">
                      <Markdown text={m.text} live={busy && m.id === lastBotId} />
                      <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => void navigator.clipboard?.writeText(m.text)}>
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                        {m.id === lastBotId && !busy && (
                          <button className="flex items-center gap-1 hover:text-foreground" onClick={retry}>
                            <RefreshCw className="h-3 w-3" /> Try again
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
              {working && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <MitoAvatar size={24} />
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working…
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t p-3">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-lg border bg-background p-1.5 transition-shadow focus-within:border-[#F25C05]/60 focus-within:ring-2 focus-within:ring-[#F25C05]/20">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                disabled={notReady}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={notReady ? "Connect Claude to start" : "Message Mito…"}
                className="max-h-36 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              {busy ? (
                <button onClick={() => desktop.ai.stop()} aria-label="Stop" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-foreground hover:bg-muted">
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button disabled={!input.trim() || notReady} onClick={() => send()} aria-label="Send" className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-40", ACTION)}>
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {allowLiveWrites && <span className="rounded bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">Live writes on</span>}
                {allowCreate && !allowLiveWrites && <span className="rounded bg-muted px-1.5 text-[10px] font-semibold">Can create quizzes &amp; assignments</span>}
                {allowEdits && <span className="rounded bg-muted px-1.5 text-[10px] font-semibold">File edits on</span>}
              </span>
              <span>Enter to send · Shift+Enter for a new line · Live data is sent to Claude</span>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md" style={BRAND}>
          <DialogHeader>
            <DialogTitle>Mito settings</DialogTitle>
            <DialogDescription>What Mito is allowed to do. Changes apply from your next message.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Model</p>
            <div className="grid grid-cols-2 gap-2">
              {MODELS.map((o) => (
                <button key={o.id || "default"} onClick={() => setModel(o.id)} aria-pressed={model === o.id} className={cn("rounded-md border p-2 text-left transition-colors", model === o.id ? "border-primary bg-primary/10" : "hover:bg-muted/60")}>
                  <span className="block text-[13px] font-semibold">{o.label}</span>
                  <span className="block text-[10px] leading-snug text-muted-foreground">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
          {demo ? (
            <div className="rounded-md border border-[#F25C05]/40 bg-[#FFF4E8] p-3 text-sm text-[#7a2e00] dark:bg-primary/10 dark:text-foreground">
              <p className="font-semibold">Read-only demo</p>
              <p className="mt-1 text-xs">This session reads data from {desktop?.apiHost} only. Mito cannot create, change or delete anything, and every change is blocked by the app.</p>
            </div>
          ) : (
          <div className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Access</p>
            <Mode on icon={Database} label="Live data" hint="Read students, fees, batches and more from your academy." onClick={() => undefined} />
            <Mode on={allowCreate || allowLiveWrites} onClick={() => setAllowCreate((v) => !v)} icon={ClipboardList} label="Create quizzes & assignments" hint="Mito can save quiz questions and create assignments for you. It can't edit or delete anything. Remembered on this computer." />
            <Mode on={allowEdits} onClick={() => setAllowEdits((v) => !v)} icon={FileEdit} label="Edit project files" hint="Let Mito change source code in this project. Remembered on this computer." />
            <Mode on={allowLiveWrites} onClick={toggleWrites} icon={ShieldAlert} danger label="Change live data" hint="Create, update or delete real records. Use with care. Switches off every time you reopen the workspace." />
          </div>
          )}
          <div className="space-y-1 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p>Claude: {claude?.loggedIn ? `${claude.email ?? "connected"}${claude.subscriptionType ? ` (${claude.subscriptionType})` : ""}` : "not connected"}</p>
            <Link to="/desktop/claude" className="font-medium text-primary underline" onClick={() => setSettingsOpen(false)}>Claude account &amp; usage</Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
