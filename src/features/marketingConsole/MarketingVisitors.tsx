import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck2, CircleAlert, Footprints, FormInput, Loader2, MessageCircle, Repeat, Send, Sparkles, Users, Wrench } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiData } from "@/api/hooks";
import { Badge } from "@/components/ui/badge";
import {
  getMarketingSiteBehaviour,
  getMarketingVisitorJourneys,
  suggestSiteImprovements,
  type ApiMarketingSiteBehaviour,
  type ApiMarketingSiteImprovements,
  type ApiNamedCount,
} from "@/api/marketing";
import { userMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EMPTY_JOURNEYS, useVisitorFilters } from "./visitorUtils";
import { VisitorFilterBar } from "./VisitorFilterBar";

const pct = (n: number, of: number) => (of === 0 ? "0%" : `${Math.round((n * 100) / of)}%`);
const EMPTY_BEHAVIOUR: ApiMarketingSiteBehaviour = {
  days: 7, startDate: "", endDate: "", visitors: 0, visits: 0, singlePageVisits: 0, returningVisitors: 0, chatVisitors: 0, bookedVisitors: 0,
  formStartedVisitors: 0, formValidationFailedVisitors: 0, formAbandonedVisitors: 0, formSubmittedVisitors: 0, whatsAppVisitors: 0,
  exitIntentShownVisitors: 0, exitIntentSubmittedVisitors: 0, experiments: [],
  signInClickedVisitors: 0, demoLoginVisitors: 0, demoLogins: [], signInFrom: [],
  funnel: [], pages: [], devices: [], sources: [],
};
const IMPACT_STYLE = { High: "bg-destructive/10 text-destructive", Medium: "bg-warning/15 text-warning", Low: "bg-muted text-muted-foreground" } as const;
const duration = (s: number | null) => (s == null ? "—" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`);

/** Marketing console → Visitors: the patterns — where people land and leave, common paths, when they arrive. */
export default function MarketingVisitors() {
  const filters = useVisitorFilters(7);
  const { data, error, reload } = useApiData(
    () => getMarketingVisitorJourneys(filters.days, filters.custom, 1, filters.country),
    EMPTY_JOURNEYS,
    EMPTY_JOURNEYS,
    { cacheKey: `marketing-visitors-${filters.key}`, ttlMs: 30_000 },
  );

  const behaviour = useApiData(
    () => getMarketingSiteBehaviour(filters.days, filters.custom, filters.country),
    EMPTY_BEHAVIOUR,
    EMPTY_BEHAVIOUR,
    { cacheKey: `marketing-behaviour-${filters.key}`, ttlMs: 30_000 },
  );
  const b = behaviour.data;
  const [tips, setTips] = useState<ApiMarketingSiteImprovements | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState<string | null>(null);
  // A new range or country means old advice no longer matches the numbers on screen.
  useEffect(() => { setTips(null); setTipsError(null); }, [filters.key]);

  async function improve() {
    setTipsLoading(true);
    setTipsError(null);
    try {
      setTips(await suggestSiteImprovements(filters.days, filters.custom, filters.country));
    } catch (err) {
      setTipsError(userMessage(err, "Couldn't analyse the site right now."));
    } finally {
      setTipsLoading(false);
    }
  }

  const funnelTop = Math.max(1, b.funnel[0]?.visitors ?? 0);
  const maxHour = Math.max(1, ...data.visitsByHour.map((h) => h.count));
  const busiestHour = data.visitsByHour.reduce<ApiNamedCount | null>((best, h) => (h.count > (best?.count ?? 0) ? h : best), null);
  const period = data.startDate && data.endDate ? (data.startDate === data.endDate ? data.startDate : `${data.startDate} – ${data.endDate}`) : "";

  return (
    <div>
      <PageHeader
        eyebrow="Website"
        title="Visitors"
        description="The patterns: where visitors land and leave, the paths most people take, and when they arrive. No IP addresses or names are stored."
        actions={<Button asChild variant="outline"><Link to="/marketing/journeys">Every visitor's journey <ArrowRight className="h-4 w-4" /></Link></Button>}
      />

      <VisitorFilterBar filters={filters} countries={data.countries} period={period} />

      <InlineAlert variant="info" className="mb-4">
        Country is now taken from the visitor's time zone. Visits up to 30 Oct 2026 used the browser language instead, so many Indian visitors
        using English (US) show as United States — and an automated crawl added about 36 one-page “US” visitors on 30 Oct (8–9 AM IST).
      </InlineAlert>

      {error && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load visitors ({error}).{" "}
          <button type="button" className="underline" onClick={() => reload()}>Retry</button>
        </InlineAlert>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Visitors", value: String(data.totalVisitors), icon: Users },
          { label: "Left after 1 page", value: pct(data.singlePageVisitors, data.totalVisitors), icon: Footprints },
          { label: "Came back another day", value: String(data.returningVisitors), icon: Repeat },
          { label: "Started a chat", value: String(data.chatVisitors), icon: MessageCircle },
          { label: "Booked a demo", value: String(data.bookedVisitors), icon: CalendarCheck2 },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">{k.label}<k.icon className="h-4 w-4" /></div>
            <p className="mt-1 text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Demo form conversion</CardTitle>
          <p className="text-xs text-muted-foreground">First-party events from Get Started. New tracking begins from this release, so older periods show zero.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Started form", value: b.formStartedVisitors, icon: FormInput },
              { label: "Validation issue", value: b.formValidationFailedVisitors, icon: CircleAlert },
              { label: "Abandoned", value: b.formAbandonedVisitors, icon: Footprints },
              { label: "Submitted", value: b.formSubmittedVisitors, icon: Send },
              { label: "WhatsApp clicked", value: b.whatsAppVisitors, icon: MessageCircle },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">{item.label}<item.icon className="h-4 w-4" /></div>
                <p className="mt-1 text-xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <p className="rounded-lg bg-muted/30 px-3 py-2"><b>Form completion:</b> {pct(b.formSubmittedVisitors, b.formStartedVisitors)}</p>
            <p className="rounded-lg bg-muted/30 px-3 py-2"><b>Form abandonment:</b> {pct(b.formAbandonedVisitors, b.formStartedVisitors)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pricing exit popup and A/B tests</CardTitle>
          <p className="text-xs text-muted-foreground">
            The popup opens when a /pricing visitor heads for the exit. Get Started copy test: a = original, b = outcome-led. Preview either with ?variant=a or ?variant=b.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <p className="rounded-lg bg-muted/30 px-3 py-2"><b>Popup shown:</b> {b.exitIntentShownVisitors ?? 0}</p>
            <p className="rounded-lg bg-muted/30 px-3 py-2"><b>Leads captured:</b> {b.exitIntentSubmittedVisitors ?? 0}</p>
            <p className="rounded-lg bg-muted/30 px-3 py-2"><b>Capture rate:</b> {pct(b.exitIntentSubmittedVisitors ?? 0, b.exitIntentShownVisitors ?? 0)}</p>
          </div>
          {(b.experiments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No A/B test traffic in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="py-1.5 pr-3 font-medium">Test</th><th className="pr-3 font-medium">Variant</th><th className="pr-3 text-right font-medium">Saw it</th><th className="pr-3 text-right font-medium">Started form</th><th className="pr-3 text-right font-medium">Submitted</th><th className="text-right font-medium">Submit rate</th></tr>
                </thead>
                <tbody>
                  {b.experiments.map((x) => (
                    <tr key={`${x.experiment}:${x.variant}`} className="border-t">
                      <td className="py-1.5 pr-3 font-mono text-xs">{x.experiment}</td>
                      <td className="pr-3 font-semibold">{x.variant.toUpperCase()}</td>
                      <td className="pr-3 text-right">{x.visitors}</td>
                      <td className="pr-3 text-right">{x.formStarted}</td>
                      <td className="pr-3 text-right">{x.formSubmitted}</td>
                      <td className="text-right font-semibold">{x.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {b.experiments.some((x) => x.visitors < 100) && (
                <p className="mt-2 text-xs text-muted-foreground">Too early to pick a winner: wait until each variant has at least 100 visitors and the gap holds for a week or more.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sign in and demo logins</CardTitle>
          <p className="text-xs text-muted-foreground">Visitors who clicked "Sign in" in the website menu, and which demo accounts they tried on the login page.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <p className="rounded-lg bg-muted/30 px-3 py-2"><b>Clicked Sign in:</b> {b.signInClickedVisitors ?? 0}</p>
            <p className="rounded-lg bg-muted/30 px-3 py-2"><b>Tried a demo login:</b> {b.demoLoginVisitors ?? 0}</p>
            <p className="rounded-lg bg-muted/30 px-3 py-2"><b>Demo logins per Sign in click:</b> {pct(b.demoLoginVisitors ?? 0, b.signInClickedVisitors ?? 0)}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Demo role tried", rows: b.demoLogins ?? [], empty: "No demo logins in this period.", mono: false },
              { title: "Sign in clicked from", rows: b.signInFrom ?? [], empty: "No Sign in clicks in this period.", mono: true },
            ].map((list) => (
              <div key={list.title}>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{list.title}</p>
                {list.rows.length === 0 ? <p className="text-sm text-muted-foreground">{list.empty}</p> : (
                  <ul className="space-y-1 text-sm">
                    {list.rows.map((r) => (
                      <li key={r.name} className="flex justify-between gap-3 border-b py-1 last:border-0">
                        <span className={cn("capitalize", list.mono && "font-mono text-xs normal-case")}>{r.name}</span>
                        <span className="font-semibold">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4 border-primary/30">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4 text-primary" />What to improve</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">AI reads the funnel, exit rates and time on page below, then ranks fixes by their likely effect on demo bookings.</p>
          </div>
          <Button size="sm" onClick={() => void improve()} disabled={tipsLoading || b.visitors === 0}>
            {tipsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {tips ? "Analyse again" : "Analyse"}
          </Button>
        </CardHeader>
        <CardContent>
          {tipsError && <InlineAlert variant="warning" className="mb-3">{tipsError}</InlineAlert>}
          {!tips && !tipsLoading && !tipsError && (
            <p className="text-sm text-muted-foreground">Click <b>Analyse</b> to see how visitors behave in this period and the specific changes most likely to bring more demo requests.</p>
          )}
          {tipsLoading && <p className="text-sm text-muted-foreground">Reading the numbers… this takes about 10–20 seconds.</p>}
          {tips && (
            <div className="space-y-4 text-sm">
              <p>{tips.summary}</p>
              {tips.behaviour.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold">How visitors behave</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">{tips.behaviour.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              )}
              <div>
                <p className="mb-2 font-semibold">Fix first</p>
                <ol className="space-y-2">
                  {tips.improvements.map((t, i) => (
                    <li key={i} className="rounded-lg border p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">{i + 1}.</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", IMPACT_STYLE[t.impact])}>{t.impact} impact</span>
                        {t.page && <Badge variant="outline" className="font-mono font-normal">{t.page}</Badge>}
                      </div>
                      <p className="text-muted-foreground">{t.problem}</p>
                      <p className="mt-1"><b>Fix:</b> {t.fix}</p>
                    </li>
                  ))}
                </ol>
              </div>
              {!tips.aiPowered && <p className="text-xs text-muted-foreground">AI is unavailable right now — these come from rule-based checks on the same numbers.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Funnel to a demo</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {b.funnel.length === 0 ? <p className="text-sm text-muted-foreground">No visits in this period.</p> : b.funnel.map((step, i) => {
              const prev = i > 0 ? b.funnel[i - 1].visitors : null;
              return (
                <div key={step.name}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{step.name}</span>
                    <span className="font-semibold">{step.visitors}{prev ? <span className="ml-1 text-xs font-normal text-muted-foreground">({pct(step.visitors, prev)} of previous)</span> : null}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(step.visitors / funnelTop) * 100}%` }} /></div>
                </div>
              );
            })}
            {b.funnel.length > 0 && <p className="pt-1 text-xs text-muted-foreground">Steps are independent: a visitor can open Get Started without seeing pricing first.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Page performance</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {b.pages.length === 0 ? <p className="text-sm text-muted-foreground">No visits in this period.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">Page</th><th className="pb-2 text-right font-medium">Visitors</th><th className="pb-2 text-right font-medium" title="Average time before the next page">Avg time</th><th className="pb-2 text-right font-medium" title="Share of views that ended the visit">Exit rate</th></tr></thead>
                <tbody>
                  {b.pages.slice(0, 12).map((p) => (
                    <tr key={p.path} className="border-t">
                      <td className="max-w-[14rem] truncate py-1.5 font-mono text-xs" title={p.path}>{p.path}</td>
                      <td className="py-1.5 text-right">{p.visitors}</td>
                      <td className="py-1.5 text-right">{duration(p.avgSeconds)}</td>
                      <td className={cn("py-1.5 text-right font-medium", p.views >= 5 && p.exitRate >= 70 ? "text-destructive" : "")}>{p.exitRate.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CountList title="Where they land (first page)" rows={data.entryPages} />
        <CountList title="Where they leave (last page)" rows={data.exitPages} />
        <CountList title="Most common paths (2+ pages)" rows={data.topJourneys} empty="No multi-page visits in this period." />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">When they arrive{busiestHour ? ` · busiest ${busiestHour.name}:00` : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-28 items-end gap-[3px]" aria-label="Visitors by hour of arrival, your local time">
              {data.visitsByHour.map((h) => (
                <div key={h.name} className="flex flex-1 flex-col items-center justify-end" title={`${h.name}:00 — ${h.count} visitors`}>
                  <div className="w-full rounded-t bg-primary/80" style={{ height: `${(h.count / maxHour) * 100}%`, minHeight: h.count ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CountList({ title, rows, empty = "No visits in this period." }: { title: string; rows: ApiNamedCount[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : rows.map((r) => (
          <div key={r.name}>
            <div className="flex justify-between gap-3 text-sm"><span className="truncate font-mono text-xs">{r.name}</span><span className="font-semibold">{r.count}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} /></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
