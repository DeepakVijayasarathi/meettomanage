import { useState } from "react";
import { Flag, Gauge, MessageSquare, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useApiData } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { getMitoInsights, listMitoFlags, resolveMitoFlag, type MitoFlag, type MitoInsights as Insights } from "@/api/mitoReview";

const EMPTY: Insights = { windowDays: 30, dailyLimit: 40, totalRequests: 0, activeStudents: 0, studentsAtLimitToday: 0, openFlags: 0, byDay: [], byMode: {}, topStudents: [] };
const MODE_LABEL: Record<string, string> = { doubt: "Ask a doubt", plan: "Today's plan", review: "Review a mistake", quiz: "Practice quiz", general: "Open chat" };

/**
 * How students use the Mito companion, and answers families flagged as wrong. Admin sees the whole academy;
 * teachers see their own students (the backend applies the scope).
 */
export default function MitoInsights({ scope }: { scope: "teacher" | "staff" }) {
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const insights = useApiData(() => getMitoInsights(days), EMPTY, undefined, { cacheKey: `mito-insights-${days}` });
  const [showOpen, setShowOpen] = useState(true);
  const flags = useApiData(() => listMitoFlags(showOpen), [], undefined, { cacheKey: `mito-flags-${showOpen}` });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const data = insights.data;
  const max = Math.max(1, ...data.byDay.map((d) => d.requests));
  const modeTotal = Math.max(1, Object.values(data.byMode).reduce((a, b) => a + b, 0));

  const resolve = async (flag: MitoFlag) => {
    try {
      await resolveMitoFlag(flag.id, notes[flag.id] ?? "");
      toast({ variant: "success", title: "Marked as reviewed" });
      flags.reload();
      insights.reload();
    } catch (e) {
      toast({ variant: "error", title: "Couldn't save", description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="AI companion"
        title={scope === "teacher" ? "Mito Review" : "Mito Insights"}
        description={scope === "teacher" ? "How your students use Mito, and answers their families flagged for you to check." : "How students use Mito across the academy. Counts only — chats aren't stored."}
        actions={
          <div className="inline-flex rounded-lg border p-0.5">
            {[7, 30, 90].map((d) => <Button key={d} size="sm" variant={days === d ? "secondary" : "ghost"} onClick={() => setDays(d)}>{d} days</Button>)}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Questions asked" value={String(data.totalRequests)} detail={`last ${data.windowDays} days`} icon={MessageSquare} tone="primary" loading={insights.loading} />
        <KpiCard label="Students using Mito" value={String(data.activeStudents)} icon={Users} tone="success" loading={insights.loading} />
        <KpiCard label="At today's limit" value={String(data.studentsAtLimitToday)} detail={data.dailyLimit ? `limit ${data.dailyLimit} a day` : "no daily limit"} icon={Gauge} tone={data.studentsAtLimitToday ? "warning" : "neutral"} loading={insights.loading} />
        <KpiCard label="Flagged answers" value={String(data.openFlags)} detail="waiting for review" icon={Flag} tone={data.openFlags ? "destructive" : "neutral"} loading={insights.loading} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Questions per day</CardTitle></CardHeader>
          <CardContent>
            {data.totalRequests === 0 ? <p className="text-sm text-muted-foreground">No Mito activity in this period yet.</p> : (
              <div className="flex h-40 items-end gap-[2px]" role="img" aria-label={`Questions per day over ${data.windowDays} days, peak ${max}`}>
                {data.byDay.map((d) => (
                  <div key={d.date} className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(2, (d.requests / max) * 100)}%` }} title={`${formatDate(d.date)}: ${d.requests} questions from ${d.students} students`} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">What students ask for</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {Object.entries(data.byMode).sort((a, b) => b[1] - a[1]).map(([mode, count]) => (
              <div key={mode}>
                <div className="mb-1 flex justify-between text-sm"><span>{MODE_LABEL[mode] ?? mode}</span><span className="text-muted-foreground">{count}</span></div>
                <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(count / modeTotal) * 100}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Most active students</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {data.topStudents.length === 0 ? <p className="text-sm text-muted-foreground">Nobody yet.</p> : data.topStudents.map((s) => (
              <div key={s.childId} className="flex items-center justify-between py-2 text-sm">
                <span>{s.name}</span><span className="text-muted-foreground">{s.requests} · {formatDate(s.lastUsed)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Flagged answers</CardTitle>
            <div className="inline-flex rounded-lg border p-0.5">
              <Button size="sm" variant={showOpen ? "secondary" : "ghost"} onClick={() => setShowOpen(true)}>To review</Button>
              <Button size="sm" variant={!showOpen ? "secondary" : "ghost"} onClick={() => setShowOpen(false)}>Reviewed</Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {apiEnabled() && flags.error && <p className="text-sm text-destructive">{flags.error}</p>}
            {flags.data.length === 0 && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4" />{showOpen ? "Nothing flagged. Families can flag an answer from the Mito screen in the app." : "No reviewed answers yet."}</p>}
            {flags.data.map((f) => (
              <div key={f.id} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{f.childName}</span>
                  <Badge variant="outline">{MODE_LABEL[f.mode] ?? f.mode}</Badge>
                  <span>{formatDate(f.createdAtUtc, "datetime")}</span>
                </div>
                <p className="text-sm"><span className="font-medium">Asked:</span> {f.question}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground"><span className="font-medium text-foreground">Mito said:</span> {f.answer}</p>
                {f.reason && <p className="mt-1 text-sm text-destructive">Family’s note: {f.reason}</p>}
                {f.resolvedAtUtc ? (
                  <p className="mt-2 text-sm"><span className="font-medium">Teacher’s note:</span> {f.resolution ?? "Reviewed"}</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Textarea rows={2} maxLength={2000} placeholder="Correct the answer or add a note for the family (optional)" value={notes[f.id] ?? ""} onChange={(e) => setNotes({ ...notes, [f.id]: e.target.value })} />
                    <Button size="sm" onClick={() => void resolve(f)}>Mark reviewed</Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
