import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck2, Clock, Eye, Flame, Layers, Loader2, MessageCircle, MessagesSquare, Monitor, Repeat, Sparkles, Target } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiData } from "@/api/hooks";
import { analyzeMarketingVisitor, getMarketingVisitorDetail, type ApiMarketingVisitorDetail, type ApiMarketingVisitorInsight } from "@/api/marketing";
import { userMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { clock, countryName, DEVICE_ICON, when } from "./visitorUtils";

const minutesBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
const BUYING = ["/pricing", "/get-started", "/demo"];
const titleOf = (path: string) => path.replace(/^\/(blog|solutions|customers)\//, "").replace(/-/g, " ");

/** What the pages say about this visitor, worked out in the browser from their journey. */
function signals(d: ApiMarketingVisitorDetail) {
  const paths = d.visits.flatMap((v) => v.pages.map((p) => p.path));
  const unique = [...new Set(paths)];
  const minutes = d.visits.reduce((sum, v) => sum + minutesBetween(v.startUtc, v.endUtc), 0);
  const spanDays = Math.round((new Date(d.lastSeenUtc).getTime() - new Date(d.firstSeenUtc).getTime()) / 86_400_000);
  const firstVisit = d.visits[d.visits.length - 1];
  return {
    buying: unique.filter((p) => BUYING.includes(p)),
    blog: unique.filter((p) => p.startsWith("/blog/")),
    solutions: unique.filter((p) => p.startsWith("/solutions/")),
    proof: unique.filter((p) => p.startsWith("/customers")),
    minutes,
    spanDays,
    firstSource: firstVisit ? `${firstVisit.source}${firstVisit.campaign ? ` · ${firstVisit.campaign}` : ""}` : "—",
    lastPage: d.visits[0]?.pages.at(-1)?.path ?? "—",
  };
}

const INTENT_STYLE: Record<ApiMarketingVisitorInsight["intent"], string> = {
  Hot: "bg-destructive/10 text-destructive",
  Warm: "bg-warning/15 text-warning",
  Cold: "bg-muted text-muted-foreground",
};

/** Marketing console → Journeys → one visitor: every visit (newest first), the pages in order, chats and demo requests. */
export default function MarketingVisitorDetail() {
  const { visitorId = "" } = useParams();
  const [insight, setInsight] = useState<ApiMarketingVisitorInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  async function readVisitor() {
    setInsightLoading(true);
    setInsightError(null);
    try {
      setInsight(await analyzeMarketingVisitor(visitorId));
    } catch (err) {
      setInsightError(userMessage(err, "Couldn't analyse this visitor right now."));
    } finally {
      setInsightLoading(false);
    }
  }
  const { data, loading, error, reload } = useApiData<ApiMarketingVisitorDetail | null>(
    () => getMarketingVisitorDetail(visitorId),
    null,
    null,
    { cacheKey: `marketing-visitor-${visitorId}`, ttlMs: 30_000 },
  );

  const back = <Button asChild variant="outline"><Link to="/marketing/journeys"><ArrowLeft className="h-4 w-4" /> All journeys</Link></Button>;

  if (loading && !data) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Website" title="Visitor journey" actions={back} />
        {error ? (
          <InlineAlert variant="warning">Could not load this visitor ({error}). <button type="button" className="underline" onClick={() => reload()}>Retry</button></InlineAlert>
        ) : (
          <EmptyState icon={Eye} title="Visitor not found" description="Their visits may be older than the data retention period." />
        )}
      </div>
    );
  }

  const visitCount = data.visits.length;
  const sig = signals(data);
  return (
    <div>
      <PageHeader
        eyebrow="Website · Visitor journey"
        title={`Visitor …${data.visitor}`}
        description={`${countryName(data.country)} · first seen ${when(data.firstSeenUtc)} · last seen ${when(data.lastSeenUtc)}. Anonymous: a random browser id, no IP address or name.`}
        actions={back}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Visits", value: visitCount, icon: Repeat },
          { label: "Page views", value: data.pageViews, icon: Eye },
          { label: "Different pages", value: data.distinctPages, icon: Layers },
          { label: "Chats · demo requests", value: `${data.chats.length} · ${data.demoRequests.length}`, icon: MessageCircle },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">{k.label}<k.icon className="h-4 w-4" /></div>
            <p className="mt-1 text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" />Interest signals</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Buying pages</dt>
              <dd>{sig.buying.length ? sig.buying.map((p) => <Badge key={p} variant="success" className="mr-1 font-mono font-normal">{p}</Badge>) : <span className="text-muted-foreground">None yet</span>}</dd>
              <dt className="text-muted-foreground">Blog read</dt>
              <dd className="capitalize">{sig.blog.length ? sig.blog.map(titleOf).join(" · ") : <span className="normal-case text-muted-foreground">None</span>}</dd>
              <dt className="text-muted-foreground">Features</dt>
              <dd className="capitalize">{sig.solutions.length ? sig.solutions.map(titleOf).join(" · ") : <span className="normal-case text-muted-foreground">None</span>}</dd>
              <dt className="text-muted-foreground">Customer stories</dt>
              <dd>{sig.proof.length ? `${sig.proof.length} page${sig.proof.length > 1 ? "s" : ""}` : <span className="text-muted-foreground">None</span>}</dd>
              <dt className="text-muted-foreground">First came from</dt>
              <dd>{sig.firstSource}</dd>
              <dt className="text-muted-foreground">Last page seen</dt>
              <dd className="font-mono text-xs">{sig.lastPage}</dd>
              <dt className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />Time on site</dt>
              <dd>{sig.minutes > 0 ? `about ${sig.minutes} min` : "under a minute"}{visitCount > 1 ? ` over ${sig.spanDays > 0 ? `${sig.spanDays} days` : "one day"}` : ""}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />AI read</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">What they care about, how ready they are, and what marketing should do next.</p>
            </div>
            <Button size="sm" onClick={() => void readVisitor()} disabled={insightLoading}>
              {insightLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {insight ? "Read again" : "Read this visitor"}
            </Button>
          </CardHeader>
          <CardContent>
            {insightError && <InlineAlert variant="warning" className="mb-3">{insightError}</InlineAlert>}
            {!insight && !insightLoading && !insightError && (
              <p className="text-sm text-muted-foreground">Uses only this visitor&apos;s anonymous pages, timings and chat questions — never names or contact details.</p>
            )}
            {insight && (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", INTENT_STYLE[insight.intent])}>
                    <Flame className="h-3.5 w-3.5" />{insight.intent}
                  </span>
                  <span className="text-muted-foreground">{insight.intentReason}</span>
                </div>
                <p>{insight.summary}</p>
                {insight.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">{insight.interests.map((t) => <Badge key={t} variant="outline" className="font-normal">{t}</Badge>)}</div>
                )}
                <div>
                  <p className="mb-1 font-semibold">Next marketing moves</p>
                  <ol className="list-decimal space-y-1 pl-5">{insight.nextActions.map((a, i) => <li key={i}>{a}</li>)}</ol>
                </div>
                {!insight.aiPowered && <p className="text-xs text-muted-foreground">AI is unavailable right now — this read comes from rules over the same signals.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(data.demoRequests.length > 0 || data.chats.length > 0) && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {data.demoRequests.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><CalendarCheck2 className="h-4 w-4 text-success" />Demo requests</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.demoRequests.map((r) => (
                  <Link key={r.id} to={`/marketing/demo-requests?lead=${r.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50">
                    <span><b>{r.fullName}</b> · {r.academyName}<span className="block text-xs text-muted-foreground">{when(r.createdAtUtc)}</span></span>
                    <Badge variant="outline">{r.status}</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          {data.chats.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><MessagesSquare className="h-4 w-4 text-primary" />Chats</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.chats.map((c) => (
                  <Link key={c.id} to={`/marketing/chats?open=${c.id}`} className="block rounded-lg border p-3 text-sm hover:bg-muted/50">
                    <span className="line-clamp-1 font-medium">“{c.firstMessage || "(no message)"}”</span>
                    <span className="text-xs text-muted-foreground">{c.messageCount} messages · {when(c.lastMessageAtUtc)}{c.bookedName ? ` · booked as ${c.bookedName}` : ""}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Visits, newest first</h2>
      <ol className="space-y-4">
        {data.visits.map((v, i) => {
          const DeviceIcon = DEVICE_ICON[v.device as keyof typeof DEVICE_ICON] ?? Monitor;
          const mins = minutesBetween(v.startUtc, v.endUtc);
          return (
            <li key={v.startUtc}>
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base">Visit {visitCount - i} · {when(v.startUtc)}</CardTitle>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <DeviceIcon className="h-4 w-4" aria-label={v.device} />
                    <span>{v.source}{v.campaign ? ` · ${v.campaign}` : ""}</span>
                    <span>· {v.pages.length} {v.pages.length === 1 ? "page" : "pages"}{mins > 0 ? ` · ${mins} min` : ""}</span>
                    {v.startedChat && <Badge variant="default">Chatted</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="relative space-y-2 border-l pl-4">
                    {v.pages.map((p, j) => (
                      <li key={j} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                        <span className="mr-3 inline-block w-16 text-xs text-muted-foreground">{clock(p.atUtc)}</span>
                        <a href={p.path} target="_blank" rel="noreferrer" className="break-all font-mono text-xs hover:underline">{p.path}</a>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
