import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, BookOpenCheck, CheckCircle2, Clipboard, Mic, MicOff, RefreshCw, Send, Sparkles, Trash2, Volume2, VolumeX } from "lucide-react";
import { askBusinessCopilot, getBusinessAiBrief, type BusinessAiBrief, type BusinessCopilotMessage } from "@/api/chatbot";
import { useApiData } from "@/api/hooks";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

type Priority = "All" | "Action needed" | "Monitor" | "On track";
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
function speechRecognitionCtor() {
  const w = window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export default function AiInsights() {
  const { data, loading, error, reload } = useApiData<BusinessAiBrief | null>(() => getBusinessAiBrief(), null);
  const [messages, setMessages] = useState<BusinessCopilotMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority>("All");
  const [classesFilter, setClassesFilter] = useState<"All" | "Missing notes">("All");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const askRef = useRef<(text: string, fromVoice?: boolean) => void>(() => undefined);
  const voiceSupported = typeof window !== "undefined" && Boolean(speechRecognitionCtor());
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const suggestions = ["Which students need attention today?", "What should I follow up on financially?", "Summarize recent class delivery", "What are my top three actions right now?"];

  function stopSpeaking() { if (speechSupported) window.speechSynthesis.cancel(); setSpeaking(false); }
  function speakAnswer(content: string) {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content.replace(/https?:\/\/\S+/g, "").replace(/[*#_`]/g, "").trim());
    utterance.lang = "en-IN"; utterance.rate = 0.96; utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }
  async function ask(text = question, fromVoice = false) {
    const value = text.trim(); if (!value || asking) return;
    const history = messages;
    setMessages((current) => [...current, { role: "user", content: value }]);
    setQuestion(""); setAsking(true); setCopilotError(null);
    try {
      const result = await askBusinessCopilot(value, history);
      setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
      if (speakReplies || fromVoice) speakAnswer(result.answer);
    } catch (err) { setCopilotError(err instanceof Error ? err.message : "The copilot could not answer."); }
    finally { setAsking(false); }
  }
  askRef.current = (text, fromVoice = false) => { void ask(text, fromVoice); };

  function toggleListening() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const Recognition = speechRecognitionCtor();
    if (!Recognition) { setVoiceError("Voice input is not supported in this browser. Try Chrome, Edge, or Safari."); return; }
    stopSpeaking(); setVoiceError(null);
    const recognition = new Recognition();
    recognition.lang = "en-IN"; recognition.interimResults = true; recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = ""; let isFinal = false;
      for (let i = 0; i < event.results.length; i += 1) { transcript += event.results[i][0].transcript; isFinal ||= event.results[i].isFinal; }
      const value = transcript.trim(); setQuestion(value);
      if (isFinal && value) { recognition.stop(); setQuestion(""); askRef.current(value, true); }
    };
    recognition.onerror = (event) => {
      setListening(false);
      setVoiceError(event.error === "not-allowed" || event.error === "service-not-allowed" ? "Microphone access was blocked. Allow microphone permission and try again." : event.error === "no-speech" ? "I did not hear anything. Please try again." : "Voice input stopped unexpectedly. Please try again.");
    };
    recognition.onend = () => setListening(false); recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); } catch { setVoiceError("Voice input could not start. Please try again."); }
  }
  useEffect(() => () => { recognitionRef.current?.abort(); if (speechSupported) window.speechSynthesis.cancel(); }, [speechSupported]);
  async function copyAnswer(content: string, index: number) { await navigator.clipboard.writeText(content); setCopiedIndex(index); window.setTimeout(() => setCopiedIndex(null), 1500); }

  const actionNeeded = data?.studentProgressInsights.filter((x) => x.priority === "Action needed").length ?? 0;
  const monitoring = data?.studentProgressInsights.filter((x) => x.priority === "Monitor").length ?? 0;
  const missingNotes = data?.recentClassSummaries.filter((x) => x.summary.startsWith("Class completed;")).length ?? 0;
  const students = data?.studentProgressInsights.filter((x) => priorityFilter === "All" || x.priority === priorityFilter) ?? [];
  const classes = data?.recentClassSummaries.filter((x) => classesFilter === "All" || x.summary.startsWith("Class completed;")) ?? [];

  return <div>
    <PageHeader eyebrow="Business Intelligence" title="AI Command Center" description="Live business answers, student risk signals, class summaries, and prioritized owner actions." actions={<Button variant="outline" onClick={reload} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh data</Button>} />
    {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}
    <Card className="mb-5 border-primary/30"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Business Copilot</CardTitle><div className="flex items-center gap-1"><Button variant={speakReplies ? "secondary" : "ghost"} size="sm" onClick={() => { setSpeakReplies((x) => !x); if (speakReplies) stopSpeaking(); }} disabled={!speechSupported}>{speakReplies ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />}{speakReplies ? "Voice on" : "Voice off"}</Button>{messages.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setCopilotError(null); stopSpeaking(); }}><Trash2 className="mr-2 h-4 w-4" />Clear chat</Button>}</div></div></CardHeader><CardContent>
      <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl bg-muted/40 p-4">
        {messages.length === 0 && <div><p className="text-sm text-muted-foreground">Ask about students, attendance, classes, teachers, collections, pending fees, or today&apos;s priorities.</p><div className="mt-3 flex flex-wrap gap-2">{suggestions.map((item) => <button key={item} type="button" onClick={() => void ask(item)} className="rounded-full border bg-background px-3 py-1.5 text-xs hover:border-primary hover:text-primary">{item}</button>)}</div></div>}
        {messages.map((message, index) => <div key={index} className={`group flex items-start gap-1 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "border bg-background"}`}>{message.content}</div>{message.role === "assistant" && <div className="mt-1 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100"><button type="button" onClick={() => speakAnswer(message.content)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label="Read answer aloud"><Volume2 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void copyAnswer(message.content, index)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label="Copy answer">{copiedIndex === index ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Clipboard className="h-3.5 w-3.5" />}</button></div>}</div>)}
        {asking && <div className="flex justify-start"><div className="rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">Reviewing live business data...</div></div>}
      </div>
      {copilotError && <InlineAlert variant="error" className="mt-3">{copilotError}</InlineAlert>}{voiceError && <InlineAlert variant="error" className="mt-3">{voiceError}</InlineAlert>}
      <div className="mt-3 flex gap-2"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void ask(); } }} placeholder={listening ? "Listening... speak your question" : "Ask a question about your business..."} className={`h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm ${listening ? "border-destructive ring-2 ring-destructive/20" : "border-input"}`} disabled={asking} /><Button variant={listening ? "destructive" : "outline"} size="icon" onClick={toggleListening} disabled={asking || !voiceSupported} className={listening ? "animate-pulse" : ""} aria-label={listening ? "Stop listening" : "Ask by voice"} title={voiceSupported ? "Ask by voice" : "Voice input requires Chrome, Edge, or Safari"}>{listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button><Button onClick={() => void ask()} disabled={asking || !question.trim()}><Send className="mr-2 h-4 w-4" />Ask</Button></div>
      <div className="mt-2 flex min-h-5 items-center gap-2 text-xs text-muted-foreground">{listening ? <><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />Listening - sends automatically when you finish.</> : speaking ? <><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Speaking the AI response. <button type="button" onClick={stopSpeaking} className="font-medium text-primary hover:underline">Stop</button></> : <span>Voice input and playback happen in your browser; no audio recording is stored by this app.</span>}</div>
    </CardContent></Card>
    {loading || !data ? <Loading /> : <><div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Action needed" value={actionNeeded} detail="student follow-ups" tone="text-destructive" /><Metric label="Monitor" value={monitoring} detail="progress signals" tone="text-warning-foreground" /><Metric label="Missing notes" value={missingNotes} detail="recent classes" /><Metric label="Classes reviewed" value={data.recentClassSummaries.length} detail="latest completions" tone="text-primary" /></div>
      <Card className="border-primary/20 bg-primary/5"><CardContent className="p-5"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-4 w-4" />{data.aiPowered ? "AI owner briefing" : "Live-data fallback briefing"}</div><p className="leading-relaxed">{data.executiveSummary}</p><p className="mt-2 text-xs text-muted-foreground">Data refreshed {formatDate(data.generatedAtUtc, "datetime")}</p></CardContent></Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card><CardHeader><PanelTitle title="Student progress priorities" icon={<AlertTriangle className="h-4 w-4 text-warning" />}><select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority)} className="h-8 rounded-md border bg-background px-2 text-xs"><option>All</option><option>Action needed</option><option>Monitor</option><option>On track</option></select></PanelTitle></CardHeader><CardContent className="space-y-3">{students.map((item) => <div key={item.childId} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{item.childName}</p><PriorityBadge priority={item.priority} /></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.insight}</p><p className="mt-2 text-[11px] text-muted-foreground">Attendance: {item.attendancePercent === null ? "No data" : `${item.attendancePercent}%`} · Engagement signals: {item.engagementScore}</p></div>)}{students.length === 0 && <Empty text="No students in this priority." />}</CardContent></Card>
      <Card><CardHeader><PanelTitle title="Latest class summaries" icon={<BookOpenCheck className="h-4 w-4 text-primary" />}><select value={classesFilter} onChange={(e) => setClassesFilter(e.target.value as typeof classesFilter)} className="h-8 rounded-md border bg-background px-2 text-xs"><option>All</option><option>Missing notes</option></select></PanelTitle></CardHeader><CardContent className="space-y-3">{classes.map((item) => <div key={item.sessionId} className="rounded-lg border p-3"><p className="text-sm font-semibold">{item.className}</p><p className="text-[11px] text-muted-foreground">{item.teacherName} · {formatDate(item.completedAtUtc, "datetime")}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p></div>)}{classes.length === 0 && <Empty text="No classes match this filter." />}</CardContent></Card></div></>}
  </div>;
}
function Loading() { return <div className="space-y-4"><Skeleton className="h-28 w-full" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>; }
function Metric({ label, value, detail, tone = "" }: { label: string; value: number; detail: string; tone?: string }) { return <Card className="p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p><p className="text-xs text-muted-foreground">{detail}</p></Card>; }
function PanelTitle({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) { return <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>{children}</div>; }
function PriorityBadge({ priority }: { priority: "Action needed" | "Monitor" | "On track" }) { return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority === "Action needed" ? "bg-destructive/10 text-destructive" : priority === "Monitor" ? "bg-warning/15 text-warning-foreground" : "bg-success/10 text-success"}`}>{priority}</span>; }
function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>; }
