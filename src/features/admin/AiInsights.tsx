import { useState } from "react";
import { AlertTriangle, BookOpenCheck, RefreshCw, Send, Sparkles } from "lucide-react";
import { askBusinessCopilot, getBusinessAiBrief, type BusinessAiBrief, type BusinessCopilotMessage } from "@/api/chatbot";
import { useApiData } from "@/api/hooks";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export default function AiInsights() {
  const { data, loading, error, reload } = useApiData<BusinessAiBrief | null>(() => getBusinessAiBrief(), null);
  const [messages, setMessages] = useState<BusinessCopilotMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const suggestions = ["Which students need attention today?", "What should I follow up on financially?", "Summarize recent class delivery", "What are my top three actions right now?"];
  async function ask(text = question) {
    const value = text.trim(); if (!value || asking) return;
    const history = messages; setMessages((m) => [...m, { role: "user", content: value }]); setQuestion(""); setAsking(true); setCopilotError(null);
    try { const result = await askBusinessCopilot(value, history); setMessages((m) => [...m, { role: "assistant", content: result.answer }]); }
    catch (err) { setCopilotError(err instanceof Error ? err.message : "The copilot could not answer."); }
    finally { setAsking(false); }
  }
  return <div>
    <PageHeader eyebrow="Business Intelligence" title="AI Insights" description="Real-time student risk signals, class delivery summaries, and practical actions for the business owner." actions={<Button variant="outline" onClick={reload} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>} />
    {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}
    <Card className="mb-5 border-primary/30"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Ask your Business Copilot</CardTitle></CardHeader><CardContent>
      <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl bg-muted/40 p-4">
        {messages.length === 0 && <div><p className="text-sm text-muted-foreground">Ask about students, attendance, classes, teachers, collections, pending fees, or today&apos;s priorities.</p><div className="mt-3 flex flex-wrap gap-2">{suggestions.map((item) => <button key={item} type="button" onClick={() => void ask(item)} className="rounded-full border bg-background px-3 py-1.5 text-xs hover:border-primary hover:text-primary">{item}</button>)}</div></div>}
        {messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "border bg-background"}`}>{message.content}</div></div>)}
        {asking && <div className="flex justify-start"><div className="rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">Reviewing live business data…</div></div>}
      </div>
      {copilotError && <InlineAlert variant="error" className="mt-3">{copilotError}</InlineAlert>}
      <div className="mt-3 flex gap-2"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void ask(); } }} placeholder="Ask a question about your business…" className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" disabled={asking} /><Button onClick={() => void ask()} disabled={asking || !question.trim()}><Send className="mr-2 h-4 w-4" />Ask</Button></div>
    </CardContent></Card>
    {loading || !data ? <div className="space-y-4"><Skeleton className="h-28 w-full" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div> : <>
      <Card className="border-primary/20 bg-primary/5"><CardContent className="p-5"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-4 w-4" />{data.aiPowered ? "AI owner briefing" : "Live owner briefing"}</div><p className="leading-relaxed">{data.executiveSummary}</p><p className="mt-2 text-xs text-muted-foreground">Generated {formatDate(data.generatedAtUtc, "datetime")}</p></CardContent></Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-warning" />Student progress priorities</CardTitle></CardHeader><CardContent className="space-y-3">{data.studentProgressInsights.map((item) => <div key={item.childId} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{item.childName}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.priority === "Action needed" ? "bg-destructive/10 text-destructive" : item.priority === "Monitor" ? "bg-warning/15 text-warning-foreground" : "bg-success/10 text-success"}`}>{item.priority}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.insight}</p><p className="mt-2 text-[11px] text-muted-foreground">Attendance: {item.attendancePercent === null ? "No data" : `${item.attendancePercent}%`} · Engagement signals: {item.engagementScore}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="h-4 w-4 text-primary" />Latest class summaries</CardTitle></CardHeader><CardContent className="space-y-3">{data.recentClassSummaries.map((item) => <div key={item.sessionId} className="rounded-lg border p-3"><p className="text-sm font-semibold">{item.className}</p><p className="text-[11px] text-muted-foreground">{item.teacherName} · {formatDate(item.completedAtUtc, "datetime")}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p></div>)}</CardContent></Card>
      </div>
    </>}
  </div>;
}
