import { useEffect, useRef, useState } from "react";
import { Bot, CalendarDays, HelpCircle, RefreshCw, Send, Sparkles, Square, TrendingUp, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/api/hooks";
import { askMito, getMitoProgress, getMitoToday, type MitoChatTurn, type MitoMode, type MitoProgressResponse, type MitoTodayResponse } from "@/api/mito";
import { apiEnabled, userMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSession } from "@/state/session";

const MODES: { mode: MitoMode; label: string; prompt: string; icon: typeof HelpCircle }[] = [
  { mode: "doubt", label: "Ask a doubt", prompt: "Help me understand a topic. Ask which topic I need help with.", icon: HelpCircle },
  { mode: "plan", label: "Today's plan", prompt: "Create my study plan for today from my real schedule.", icon: CalendarDays },
  { mode: "review", label: "Review a mistake", prompt: "Help me review a mistake. Ask me what question I got wrong.", icon: RefreshCw },
];

export default function Mito() {
  const { children, activeChildId } = useSession();
  const child = children.find((x) => x.id === activeChildId) ?? children[0];
  const [mode, setMode] = useState<MitoMode>("general");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<MitoChatTurn[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const { data: today } = useApiData<MitoTodayResponse | null>(() => getMitoToday(child!.id), null, null);
  const { data: progress } = useApiData<MitoProgressResponse | null>(() => getMitoProgress(child!.id), null, null);

  useEffect(() => {
    if (!child) return;
    setMessages([{ role: "assistant", text: `Hi ${child.name.split(" ")[0]}! I'm Mito. Ask me a learning question or let's plan your day.` }]);
  }, [child?.id]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, sending]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  async function submit(textValue = input, requestMode = mode) {
    const text = textValue.trim();
    if (!child || !text || sending || !apiEnabled()) return;
    const next = [...messages, { role: "user", text } satisfies MitoChatTurn];
    setMessages(next); setInput(""); setSuggestions([]); setError(null); setSending(true);
    try {
      const result = await askMito(child.id, next.slice(-20), requestMode);
      setMessages((current) => [...current, { role: "assistant", text: result.reply }]);
      setSuggestions(result.suggestedPrompts ?? []);
      speak(result.reply);
    } catch (err) {
      setError(userMessage(err, "Mito couldn't answer just now. Please try again."));
    } finally { setSending(false); }
  }

  function chooseMode(nextMode: MitoMode, prompt: string) { setMode(nextMode); void submit(prompt, nextMode); }
  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  if (!child) return <div><PageHeader eyebrow="Student experience" title="Meet Mito" description="Add or select a student before opening Mito." /></div>;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl flex-col">
      <PageHeader eyebrow="AI learning companion" title="Meet Mito" description={`Personal learning support for ${child.name}.`} />
      <Card className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <MitoFace />
            <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">Your AI learning companion</p><p className="text-xs text-muted-foreground">Grounded in authorized classes and progress</p></div>
            <Button size="icon" variant="ghost" onClick={() => window.speechSynthesis?.cancel()} aria-label="Stop Mito speaking"><Square className="h-4 w-4" /></Button>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {MODES.map((item) => <Button key={item.mode} size="sm" variant={mode === item.mode ? "default" : "outline"} disabled={sending} className="shrink-0" onClick={() => chooseMode(item.mode, item.prompt)}><item.icon className="h-3.5 w-3.5" />{item.label}</Button>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ContextStat icon={CalendarDays} label={today ? `${today.items.length} classes today` : "Loading today..."} />
            <ContextStat icon={TrendingUp} label={progress ? `${progress.classesCompleted} completed` : "Loading progress..."} />
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4 sm:p-6" aria-live="polite">
          {messages.map((message, index) => <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}><div className={cn("max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%]", message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card text-foreground shadow-sm")}><p className="whitespace-pre-wrap">{message.text}</p>{message.role === "assistant" && <button type="button" className="mt-2 text-muted-foreground hover:text-primary" onClick={() => speak(message.text)} aria-label="Read reply aloud"><Volume2 className="h-4 w-4" /></button>}</div></div>)}
          {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Bot className="h-4 w-4 animate-pulse" />Mito is thinking...</div>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {suggestions.length > 0 && !sending && <div className="flex flex-wrap gap-2">{suggestions.map((text) => <Button key={text} size="sm" variant="outline" onClick={() => void submit(text)}>{text}</Button>)}</div>}
          {!apiEnabled() && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">Connect the web app to the API to chat with Mito.</p>}
          <div ref={endRef} />
        </div>

        <form className="flex gap-2 border-t border-border bg-card p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label htmlFor="mito-message" className="sr-only">Message Mito</label>
          <textarea id="mito-message" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} maxLength={2000} rows={1} disabled={sending || !apiEnabled()} placeholder="Ask Mito a question..." className="min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={!input.trim() || sending || !apiEnabled()} aria-label="Send message"><Send className="h-4 w-4" /></Button>
        </form>
      </Card>
    </div>
  );
}

function MitoFace() { return <div className="relative flex h-12 w-14 shrink-0 items-center justify-center gap-3 rounded-2xl border-2 border-primary bg-primary/10"><span className="h-2.5 w-2 rounded-full bg-primary" /><span className="h-2.5 w-2 rounded-full bg-primary" /><span className="absolute bottom-1.5 h-2 w-5 rounded-b-full border-b-2 border-primary" /><Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-primary" /></div>; }
function ContextStat({ icon: Icon, label }: { icon: typeof CalendarDays; label: string }) { return <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-2 text-xs font-medium text-foreground"><Icon className="h-3.5 w-3.5 text-primary" />{label}</div>; }
