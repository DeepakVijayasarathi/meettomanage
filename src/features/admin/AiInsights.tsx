import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, BookOpenCheck, BriefcaseBusiness, CheckCircle2, Clipboard, Download, GraduationCap, IndianRupee, Mic, MicOff, RefreshCw, RotateCcw, Send, Sparkles, Trash2, TrendingDown, TrendingUp, Users, Volume2, VolumeX, WalletCards } from "lucide-react";
import { askBusinessCopilot, getBusinessAiBrief, type BusinessAiBrief, type BusinessCopilotMessage } from "@/api/chatbot";
import { useApiData } from "@/api/hooks";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

type Priority = "All" | "Action needed" | "Monitor" | "On track";
type CopilotMode = "Executive" | "Finance" | "Students" | "Classes" | "Growth";
type CopilotUiMessage = BusinessCopilotMessage & { generatedAtUtc?: string; aiPowered?: boolean };
// v3 intentionally starts clean: v2 may contain deterministic outage fallbacks that
// providers can mimic as prior assistant answers after service recovery.
const CHAT_STORAGE_KEY = "m2m.admin.business-copilot.v3";
const modes: { name: CopilotMode; icon: ReactNode; prompts: string[] }[] = [
  { name: "Executive", icon: <BriefcaseBusiness className="h-3.5 w-3.5" />, prompts: ["Give me today's top three owner actions", "What needs immediate attention?", "Create a concise daily operating brief"] },
  { name: "Finance", icon: <IndianRupee className="h-3.5 w-3.5" />, prompts: ["Analyze this month's cost, contribution, margin, and forecast", "Where can I reduce cost without hurting classes?", "Prioritize overdue recovery by financial impact", "What finance data is missing before I can trust profit?"] },
  { name: "Students", icon: <Users className="h-3.5 w-3.5" />, prompts: ["Which students need attention today?", "Compare attendance and engagement risks", "Draft a student follow-up priority list"] },
  { name: "Classes", icon: <GraduationCap className="h-3.5 w-3.5" />, prompts: ["Summarize recent class delivery", "Which classes need teacher follow-up?", "Identify missing notes and delivery risks"] },
  { name: "Growth", icon: <TrendingUp className="h-3.5 w-3.5" />, prompts: ["Where are the biggest growth opportunities?", "What operational issue may limit growth?", "Suggest three improvements from current data"] },
];
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

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="rounded bg-muted px-1 py-0.5 text-[0.9em] text-foreground">{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

function CopilotResponse({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");

  return <div className="space-y-2.5 leading-6 text-foreground/90">
    {lines.map((rawLine, index) => {
      const line = rawLine.trim();
      if (!line) return <div key={index} className="h-1" aria-hidden="true" />;

      const heading = line.match(/^#{1,3}\s+(.+)$/);
      if (heading) return <p key={index} className="pt-1 font-semibold text-foreground">{renderInlineMarkdown(heading[1])}</p>;

      const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
      if (numbered) return <div key={index} className="flex items-start gap-3 pt-1">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{numbered[1]}</span>
        <p className="min-w-0 font-medium text-foreground">{renderInlineMarkdown(numbered[2])}</p>
      </div>;

      const bullet = line.match(/^[-*•]\s+(.+)$/);
      if (bullet) return <div key={index} className={`flex items-start gap-2 ${/^\s/.test(rawLine) ? "ml-9" : "ml-1"}`}>
        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
        <p className="min-w-0">{renderInlineMarkdown(bullet[1])}</p>
      </div>;

      const emphasizedLine = line.match(/^\*\*(.+)\*\*$/);
      if (emphasizedLine) return <p key={index} className="pt-1 font-semibold text-foreground">{emphasizedLine[1]}</p>;

      return <p key={index}>{renderInlineMarkdown(line)}</p>;
    })}
  </div>;
}

export default function AiInsights() {
  const { data, loading, error, reload } = useApiData<BusinessAiBrief | null>(() => getBusinessAiBrief(), null);
  const [messages, setMessages] = useState<CopilotUiMessage[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) ?? "[]") as CopilotUiMessage[];
      return Array.isArray(saved) ? saved.filter((x) => (x.role === "user" || x.role === "assistant") && typeof x.content === "string").slice(-20) : [];
    } catch { return []; }
  });
  const [mode, setMode] = useState<CopilotMode>("Executive");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority>("All");
  const [classesFilter, setClassesFilter] = useState<"All" | "Missing notes">("All");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const askRef = useRef<(text: string, fromVoice?: boolean) => void>(() => undefined);
  const voiceSupported = typeof window !== "undefined" && Boolean(speechRecognitionCtor());
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const activeMode = modes.find((item) => item.name === mode)!;

  function stopSpeaking() { if (speechSupported) window.speechSynthesis.cancel(); setSpeaking(false); }
  function speakAnswer(content: string) {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content.replace(/https?:\/\/\S+/g, "").replace(/[*#_`]/g, "").trim());
    utterance.lang = voiceLanguage; utterance.rate = 0.96; utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }
  async function ask(text = question, fromVoice = false, historyOverride?: CopilotUiMessage[]) {
    const value = text.trim(); if (!value || asking) return;
    const history = historyOverride ?? messages;
    setMessages((current) => [...current, { role: "user", content: value }]);
    setQuestion(""); setAsking(true); setCopilotError(null);
    try {
      const result = await askBusinessCopilot(`[${mode} focus] ${value}`, history.map(({ role, content }) => ({ role, content })));
      setMessages((current) => [...current, { role: "assistant", content: result.answer, generatedAtUtc: result.generatedAtUtc, aiPowered: result.aiPowered }]);
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
    recognition.lang = voiceLanguage; recognition.interimResults = true; recognition.continuous = false;
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
  useEffect(() => { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20))); conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" }); }, [messages, asking]);
  useEffect(() => () => { recognitionRef.current?.abort(); if (speechSupported) window.speechSynthesis.cancel(); }, [speechSupported]);
  async function copyAnswer(content: string, index: number) { await navigator.clipboard.writeText(content); setCopiedIndex(index); window.setTimeout(() => setCopiedIndex(null), 1500); }
  function clearChat() { setMessages([]); localStorage.removeItem(CHAT_STORAGE_KEY); setCopilotError(null); stopSpeaking(); }
  function regenerate() {
    let lastUser = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "user") { lastUser = index; break; }
    }
    if (lastUser < 0 || asking) return;
    const history = messages.slice(0, lastUser);
    const text = messages[lastUser].content;
    setMessages(history);
    void ask(text, false, history);
  }
  function exportTranscript() {
    if (messages.length === 0) return;
    const content = [`# MeetToManage AI Business Copilot`, ``, `Mode: ${mode}`, `Exported: ${new Date().toLocaleString()}`, ``, ...messages.map((item) => `## ${item.role === "user" ? "Owner" : "Copilot"}\n\n${item.content}\n`)].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `ai-copilot-${new Date().toISOString().slice(0, 10)}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  const actionNeeded = data?.studentProgressInsights.filter((x) => x.priority === "Action needed").length ?? 0;
  const monitoring = data?.studentProgressInsights.filter((x) => x.priority === "Monitor").length ?? 0;
  const missingNotes = data?.recentClassSummaries.filter((x) => x.summary.startsWith("Class completed;")).length ?? 0;
  const students = data?.studentProgressInsights.filter((x) => priorityFilter === "All" || x.priority === priorityFilter) ?? [];
  const classes = data?.recentClassSummaries.filter((x) => classesFilter === "All" || x.summary.startsWith("Class completed;")) ?? [];

  return <div>
    <PageHeader eyebrow="Business Intelligence" title="AI Command Center" description="Live business answers, student risk signals, class summaries, and prioritized owner actions." actions={<Button variant="outline" onClick={reload} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh data</Button>} />
    {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}
    <Card className="mb-5 border-primary/30"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Business Copilot <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">Live data</span></CardTitle><div className="flex flex-wrap items-center gap-1"><Button variant={speakReplies ? "secondary" : "ghost"} size="sm" onClick={() => { setSpeakReplies((x) => !x); if (speakReplies) stopSpeaking(); }} disabled={!speechSupported}>{speakReplies ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />}{speakReplies ? "Voice on" : "Voice off"}</Button>{messages.length > 0 && <><Button variant="ghost" size="sm" onClick={regenerate} disabled={asking}><RotateCcw className="mr-2 h-4 w-4" />Regenerate</Button><Button variant="ghost" size="sm" onClick={exportTranscript}><Download className="mr-2 h-4 w-4" />Export</Button><Button variant="ghost" size="sm" onClick={clearChat}><Trash2 className="mr-2 h-4 w-4" />Clear</Button></>}</div></div></CardHeader><CardContent>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{modes.map((item) => <button key={item.name} type="button" onClick={() => setMode(item.name)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${mode === item.name ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary hover:text-primary"}`}>{item.icon}{item.name}</button>)}</div>
      <div ref={conversationRef} className="max-h-96 space-y-3 overflow-y-auto rounded-xl bg-muted/40 p-4">
        {messages.length === 0 && <div><p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{mode} mode.</span> Ask about costs, contribution, students, classes, collections, pending fees, or today&apos;s priorities.</p><div className="mt-3 flex flex-wrap gap-2">{activeMode.prompts.map((item) => <button key={item} type="button" onClick={() => void ask(item)} className="rounded-full border bg-background px-3 py-1.5 text-xs hover:border-primary hover:text-primary">{item}</button>)}</div></div>}
        {messages.map((message, index) => <div key={index} className={`group flex items-start gap-1 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "border bg-background"}`}>{message.role === "assistant" ? <CopilotResponse content={message.content} /> : <div className="whitespace-pre-wrap">{message.content}</div>}{message.role === "assistant" && <div className="mt-3 flex items-center gap-2 border-t pt-1.5 text-[10px] text-muted-foreground"><span className={`h-1.5 w-1.5 rounded-full ${message.aiPowered === false ? "bg-warning" : "bg-success"}`} />{message.aiPowered === false ? "Live-data fallback" : "AI analysis"}{message.generatedAtUtc && <span>· {formatDate(message.generatedAtUtc, "datetime")}</span>}</div>}</div>{message.role === "assistant" && <div className="mt-1 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100"><button type="button" onClick={() => speakAnswer(message.content)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label="Read answer aloud"><Volume2 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void copyAnswer(message.content, index)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label="Copy answer">{copiedIndex === index ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Clipboard className="h-3.5 w-3.5" />}</button></div>}</div>)}
        {asking && <div className="flex justify-start"><div className="rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">Reviewing live business data...</div></div>}
      </div>
      {copilotError && <InlineAlert variant="error" className="mt-3">{copilotError}</InlineAlert>}{voiceError && <InlineAlert variant="error" className="mt-3">{voiceError}</InlineAlert>}
      <div className="mt-3 flex gap-2"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void ask(); } }} placeholder={listening ? "Listening... speak your question" : "Ask a question about your business..."} className={`h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm ${listening ? "border-destructive ring-2 ring-destructive/20" : "border-input"}`} disabled={asking} /><Button variant={listening ? "destructive" : "outline"} size="icon" onClick={toggleListening} disabled={asking || !voiceSupported} className={listening ? "animate-pulse" : ""} aria-label={listening ? "Stop listening" : "Ask by voice"} title={voiceSupported ? "Ask by voice" : "Voice input requires Chrome, Edge, or Safari"}>{listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button><Button onClick={() => void ask()} disabled={asking || !question.trim()}><Send className="mr-2 h-4 w-4" />Ask</Button></div>
      <div className="mt-2 flex min-h-5 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><div className="flex items-center gap-2">{listening ? <><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />Listening - sends automatically when you finish.</> : speaking ? <><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Speaking the AI response. <button type="button" onClick={stopSpeaking} className="font-medium text-primary hover:underline">Stop</button></> : <span>Conversation is saved in this browser. Audio recordings are not stored.</span>}</div><select value={voiceLanguage} onChange={(e) => setVoiceLanguage(e.target.value)} className="h-7 rounded-md border bg-background px-2 text-[11px]" aria-label="Voice language"><option value="en-IN">English (India)</option><option value="hi-IN">Hindi</option><option value="ta-IN">Tamil</option></select></div>
    </CardContent></Card>
    {loading || !data ? <Loading /> : <><div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Action needed" value={actionNeeded} detail="student follow-ups" tone="text-destructive" /><Metric label="Monitor" value={monitoring} detail="progress signals" tone="text-warning-foreground" /><Metric label="Missing notes" value={missingNotes} detail="recent classes" /><Metric label="Classes reviewed" value={data.recentClassSummaries.length} detail="latest completions" tone="text-primary" /></div>
      {data.costSnapshot && <Card className="mb-5 overflow-hidden border-primary/25"><CardHeader className="border-b bg-muted/30"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><WalletCards className="h-4 w-4 text-primary" />Cost, contribution & forecast</CardTitle><p className="mt-1 text-xs text-muted-foreground">{data.costSnapshot.periodLabel} live financial view</p></div><button type="button" onClick={() => { setMode("Finance"); void ask("Analyze this month's cost, contribution, margin, forecast, and overdue exposure. Give me the three highest-impact owner actions."); }} className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary">Ask Copilot to analyze</button></div></CardHeader><CardContent className="p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><CostMetric label="Collected" value={formatCurrency(data.costSnapshot.collectedRevenue)} detail="successful payments this month" tone="text-success" /><CostMetric label="People cost" value={formatCurrency(data.costSnapshot.totalPeopleCost)} detail={`${formatCurrency(data.costSnapshot.teacherPayoutCost)} teacher · ${formatCurrency(data.costSnapshot.staffPayrollCost)} staff`} /><CostMetric label="Contribution" value={formatCurrency(data.costSnapshot.estimatedContribution)} detail="before untracked overhead" tone={data.costSnapshot.estimatedContribution < 0 ? "text-destructive" : "text-primary"} icon={data.costSnapshot.estimatedContribution < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />} /><CostMetric label="Month forecast" value={formatCurrency(data.costSnapshot.projectedMonthRevenue)} detail={`${formatCurrency(data.costSnapshot.projectedMonthContribution)} projected contribution`} tone="text-primary" icon={<TrendingUp className="h-3.5 w-3.5" />} /><CostMetric label="Contribution margin" value={data.costSnapshot.estimatedMarginPercent === null ? "Not available" : `${data.costSnapshot.estimatedMarginPercent}%`} detail="not net-profit margin" /><CostMetric label="Cost / enrollment" value={data.costSnapshot.costPerActiveEnrollment === null ? "Not available" : formatCurrency(data.costSnapshot.costPerActiveEnrollment)} detail={`${data.costSnapshot.activeEnrollmentCount} active enrollments`} /></div><p className="mt-2 text-[11px] text-muted-foreground">Forecast: {data.costSnapshot.forecastBasis}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className={`rounded-lg border p-3 ${data.costSnapshot.overdueRevenue > 0 ? "border-destructive/30 bg-destructive/5" : "bg-muted/30"}`}><p className="text-xs font-medium text-muted-foreground">Cash exposure</p><p className="mt-1 text-sm font-semibold">{formatCurrency(data.costSnapshot.outstandingRevenue)} outstanding · {formatCurrency(data.costSnapshot.overdueRevenue)} overdue</p><p className="mt-1 text-xs text-muted-foreground">{data.costSnapshot.overdueInvoiceCount} overdue invoices</p></div><div className={`rounded-lg border p-3 ${data.costSnapshot.configuredStaffCount < data.costSnapshot.eligibleStaffCount || !data.costSnapshot.hasRecordedPeopleCosts ? "border-warning/40 bg-warning/5" : "bg-muted/30"}`}><p className="text-xs font-medium text-muted-foreground">Data coverage</p><p className="mt-1 text-xs leading-relaxed">{data.costSnapshot.coverageNote}</p></div></div></CardContent></Card>}
      <Card className="border-primary/20 bg-primary/5"><CardContent className="p-5"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-4 w-4" />{data.aiPowered ? "AI owner briefing" : "Live-data fallback briefing"}</div><p className="leading-relaxed">{data.executiveSummary}</p><p className="mt-2 text-xs text-muted-foreground">Data refreshed {formatDate(data.generatedAtUtc, "datetime")}</p></CardContent></Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card><CardHeader><PanelTitle title="Student progress priorities" icon={<AlertTriangle className="h-4 w-4 text-warning" />}><select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority)} className="h-8 rounded-md border bg-background px-2 text-xs"><option>All</option><option>Action needed</option><option>Monitor</option><option>On track</option></select></PanelTitle></CardHeader><CardContent className="space-y-3">{students.map((item) => <div key={item.childId} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{item.childName}</p><PriorityBadge priority={item.priority} /></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.insight}</p><p className="mt-2 text-[11px] text-muted-foreground">Attendance: {item.attendancePercent === null ? "No data" : `${item.attendancePercent}%`} · Engagement signals: {item.engagementScore}</p></div>)}{students.length === 0 && <Empty text="No students in this priority." />}</CardContent></Card>
      <Card><CardHeader><PanelTitle title="Latest class summaries" icon={<BookOpenCheck className="h-4 w-4 text-primary" />}><select value={classesFilter} onChange={(e) => setClassesFilter(e.target.value as typeof classesFilter)} className="h-8 rounded-md border bg-background px-2 text-xs"><option>All</option><option>Missing notes</option></select></PanelTitle></CardHeader><CardContent className="space-y-3">{classes.map((item) => <div key={item.sessionId} className="rounded-lg border p-3"><p className="text-sm font-semibold">{item.className}</p><p className="text-[11px] text-muted-foreground">{item.teacherName} · {formatDate(item.completedAtUtc, "datetime")}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p></div>)}{classes.length === 0 && <Empty text="No classes match this filter." />}</CardContent></Card></div></>}
  </div>;
}
function Loading() { return <div className="space-y-4"><Skeleton className="h-28 w-full" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>; }
function Metric({ label, value, detail, tone = "" }: { label: string; value: number; detail: string; tone?: string }) { return <Card className="p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p><p className="text-xs text-muted-foreground">{detail}</p></Card>; }
function CostMetric({ label, value, detail, tone = "", icon }: { label: string; value: string; detail: string; tone?: string; icon?: ReactNode }) { return <div className="rounded-lg border bg-background p-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={`mt-1 flex items-center gap-1 text-xl font-bold ${tone}`}>{icon}{value}</p><p className="mt-1 text-[11px] leading-snug text-muted-foreground">{detail}</p></div>; }
function PanelTitle({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) { return <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>{children}</div>; }
function PriorityBadge({ priority }: { priority: "Action needed" | "Monitor" | "On track" }) { return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority === "Action needed" ? "bg-destructive/10 text-destructive" : priority === "Monitor" ? "bg-warning/15 text-warning-foreground" : "bg-success/10 text-success"}`}>{priority}</span>; }
function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>; }
