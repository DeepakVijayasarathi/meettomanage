import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck2, CircleAlert, Footprints, FormInput, Loader2, ListChecks, MessageCircle, Repeat, Send, Sparkles, Wrench, AlertTriangle, CheckCircle2, Activity, Globe2, MousePointerClick, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  formStartedVisitors: 0, formVisibleVisitors: 0, formSubmitAttemptedVisitors: 0, formSubmitFailedVisitors: 0, formValidationFailedVisitors: 0, formAbandonedVisitors: 0, formSubmittedVisitors: 0, whatsAppVisitors: 0,
  exitIntentShownVisitors: 0, exitIntentSubmittedVisitors: 0, experiments: [],
  signInClickedVisitors: 0, demoLoginVisitors: 0, demoLogins: [], signInFrom: [],
  funnel: [], pages: [], devices: [], sources: [],
};
const IMPACT_STYLE = { High: "bg-destructive/10 text-destructive", Medium: "bg-warning/15 text-warning", Low: "bg-muted text-muted-foreground" } as const;
const duration = (s: number | null) => (s == null ? "—" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`);
const CHART_COLORS = ["#7C3AED", "#EC4899", "#F97316", "#0EA5E9", "#10B981", "#F59E0B"];

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
  const busiestHour = data.visitsByHour.reduce<ApiNamedCount | null>((best, h) => (h.count > (best?.count ?? 0) ? h : best), null);
  const period = data.startDate && data.endDate ? (data.startDate === data.endDate ? data.startDate : `${data.startDate} – ${data.endDate}`) : "";
  const engagedVisitors = Math.max(0, data.totalVisitors - data.singlePageVisitors);
  const engagementData = [
    { name: "Engaged", value: engagedVisitors },
    { name: "One page", value: data.singlePageVisitors },
  ].filter((item) => item.value > 0);
  const sourceData = b.sources.slice(0, 6).map((item) => ({ name: item.name, value: item.count }));
  const deviceData = b.devices.slice(0, 6).map((item) => ({ name: item.name, value: item.count }));

  // Quick rule-based checks — free, immediate, no AI call needed.
  const quickChecks = (() => {
    const checks: { title: string; text: string; severity: "positive" | "warning" | "action" }[] = [];
    const formStarted = b.formStartedVisitors ?? 0;
    const formSubmitted = b.formSubmittedVisitors ?? 0;
    const formAbandoned = b.formAbandonedVisitors ?? 0;
    const formValidation = b.formValidationFailedVisitors ?? 0;

    if (formStarted > 0 && formSubmitted > 0 && formAbandoned > formSubmitted) {
      checks.push({ title: "High form abandonment", text: `${formAbandoned} visitors abandoned the form but only ${formSubmitted} submitted. Try splitting it into shorter steps (name + email first, then extra fields later).`, severity: "action" });
    }
    if (formValidation > 0 && formSubmitted > 0 && formValidation > formSubmitted) {
      checks.push({ title: "Too many validation failures", text: `${formValidation} visitors hit a validation error — more than those who completed the form. Add inline hints on the form fields so errors are caught before submit.`, severity: "action" });
    }
    if (formStarted === 0 && b.formVisibleVisitors > 0) {
      checks.push({ title: "Form seen but not started", text: `${b.formVisibleVisitors} visitors scrolled past the form but none touched it. Move the form higher on the page, or add a stronger headline and CTA above the input fields.`, severity: "action" });
    }
    if (data.singlePageVisitors > 0 && data.totalVisitors > 0) {
      const singlePct = Math.round(data.singlePageVisitors * 100 / data.totalVisitors);
      if (singlePct > 60) {
        checks.push({ title: "Many visitors leave after one page", text: `${singlePct}% leave without visiting anything else. Add internal links to pricing, demo, and key solution pages in your hero and top navigation.`, severity: "warning" });
      }
    }
    if (formSubmitted > 0 && b.whatsAppVisitors > formSubmitted * 2) {
      checks.push({ title: "WhatsApp is outsolving the form", text: `${b.whatsAppVisitors} visitors chose WhatsApp over the demo form. Consider promoting WhatsApp as a "quick question" alternative alongside the form.`, severity: "warning" });
    }
    if (checks.length === 0 && b.visitors > 0) {
      checks.push({ title: "All systems looking good", text: "No critical issues detected yet. Keep monitoring as visitor volume grows.", severity: "positive" });
    }
    return checks;
  })();

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

      <section className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 p-5 text-white shadow-xl shadow-violet-950/10 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-200"><TrendingUp className="h-4 w-4" /> Audience overview</div>
            <div className="flex items-end gap-3"><p className="text-5xl font-black tracking-tight sm:text-6xl">{data.totalVisitors}</p><p className="pb-1.5 text-sm text-violet-200">visitors{period ? ` · ${period}` : ""}</p></div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{data.totalVisitors > 0 ? `${pct(engagedVisitors, data.totalVisitors)} viewed more than one page. ${data.returningVisitors} returned on another day.` : "Visitor activity will appear here as soon as the website records traffic."}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {[
              { label: "Engaged", value: engagedVisitors, icon: Activity, tone: "bg-violet-400/15" },
              { label: "Returned", value: data.returningVisitors, icon: Repeat, tone: "bg-cyan-400/15" },
              { label: "Started chat", value: data.chatVisitors, icon: MessageCircle, tone: "bg-pink-400/15" },
              { label: "Booked demo", value: data.bookedVisitors, icon: CalendarCheck2, tone: "bg-orange-400/15" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs text-slate-300">{item.label}<span className={cn("rounded-lg p-1.5", item.tone)}><item.icon className="h-4 w-4" /></span></div>
                <p className="mt-1 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <DonutCard title="Engagement quality" subtitle="Visitors who explored beyond their first page" data={engagementData} total={data.totalVisitors} icon={Activity} />
        <DonutCard title="Traffic sources" subtitle="How visitors discovered the website" data={sourceData} total={b.visitors} icon={Globe2} />
        <DonutCard title="Devices" subtitle="Devices used to browse the website" data={deviceData} total={b.visitors} icon={MousePointerClick} />
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Demo form conversion</CardTitle>
          <p className="text-xs text-muted-foreground">First-party events from Get Started. New tracking begins from this release, so older periods show zero.</p>
        </CardHeader>
        <CardContent>
          {b.visitors > 0 && b.visitors < 20 && <InlineAlert variant="info" className="mb-3">Only {b.visitors} visitors are available. Results will show measurement guidance, not speculative page fixes. At least 20 visitors are required before behavioural comparisons begin.</InlineAlert>}
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
          <p className="text-xs text-muted-foreground">Visitors who clicked "Sign in" in the website menu, and which demo accounts they tried on the live demo page.</p>
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

      <Card className="mb-4">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4 text-primary" />Quick checks</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Rule-based suggestions from the data shown above — free, immediate, no AI call needed.</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {quickChecks.map((check, i) => (
              <div key={i} className={cn(
                "rounded-lg border p-3",
                check.severity === "positive" && "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20",
                check.severity === "warning" && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
                check.severity === "action" && "border-destructive/30 bg-destructive/5",
              )}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {check.severity === "positive" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                   check.severity === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-600" /> :
                   <Wrench className="h-4 w-4 text-destructive" />}
                  {check.title}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{check.text}</p>
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
          {b.visitors < 20 && !tips && !tipsLoading && !tipsError && (
            <div className="rounded-lg border border-info/30 bg-info/5 p-4">
              <p className="text-sm font-medium">Not enough data yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You have {b.visitors} visitor{b.visitors === 1 ? "" : "s"} this period. The analysis engine needs at least 20 unique visitors before it can surface reliable recommendations. Once you hit that threshold, click <b>Analyse</b> to see the top fixes ranked by expected impact.
              </p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                <p><b>What to watch for:</b></p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Form seen: {b.formVisibleVisitors} visitors scrolled the form into view</li>
                  <li>Form started: {b.formStartedVisitors} visitors interacted with the form</li>
                  <li>Submitted: {b.formSubmittedVisitors} visitors submitted</li>
                  <li>Validation failures: {b.formValidationFailedVisitors} visitors hit a validation error</li>
                  <li>Abandoned: {b.formAbandonedVisitors} visitors left without submitting</li>
                  <li>WhatsApp clicks: {b.whatsAppVisitors} visitors chose to chat instead</li>
                </ul>
              </div>
            </div>
          )}
          {!tips && !tipsLoading && !tipsError && b.visitors >= 20 && (
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
                <p className="mb-2 font-semibold">{b.visitors < 20 ? "Next measurement steps" : "Fix first"}</p>
                <ol className="space-y-2">
                  {tips.improvements.map((t, i) => (
                    <li key={i} className="rounded-lg border p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">Priority {i + 1}</span>
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
              return (
                <div key={step.name}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{step.name}</span>
                    <span className="font-semibold">{step.visitors}{i > 0 ? <span className="ml-1 text-xs font-normal text-muted-foreground">({pct(step.visitors, funnelTop)} of visitors)</span> : null}</span>
                  </div>
                  <div
                    className="mt-1 h-2 rounded-full bg-muted"
                    role="progressbar"
                    aria-label={step.name}
                    aria-valuemin={0}
                    aria-valuemax={funnelTop}
                    aria-valuenow={step.visitors}
                  ><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (step.visitors / funnelTop) * 100)}%` }} /></div>
                </div>
              );
            })}
            {b.funnel.length > 0 && <p className="pt-1 text-xs text-muted-foreground">Percentages use all site visitors. Steps are independent, so a visitor can open Get Started without seeing pricing first.</p>}
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
                      <td className={cn("py-1.5 text-right font-medium", p.views >= 5 && p.exitRate >= 70 ? "text-destructive" : "")}>{(p.exitRate ?? 0).toFixed(0)}%</td>
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
            {data.visitsByHour.some((hour) => hour.count > 0) ? (
              <div className="h-44" aria-label="Visitors by hour of arrival, your local time">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.visitsByHour} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                    <defs><linearGradient id="visitorHourFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#EC4899" /></linearGradient></defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" interval={3} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(hour) => `${hour}:00`} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.45 }} formatter={(value) => [`${value} visitors`, "Arrivals"]} labelFormatter={(hour) => `${hour}:00`} />
                    <Bar dataKey="count" fill="url(#visitorHourFill)" radius={[6, 6, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="flex h-44 items-center justify-center text-sm text-muted-foreground">No arrival activity in this period.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type DonutDatum = { name: string; value: number };

function DonutCard({ title, subtitle, data, total, icon: Icon }: { title: string; subtitle: string; data: DonutDatum[]; total: number; icon: typeof Activity }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle className="text-base">{title}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div>
          <span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {data.length > 0 ? (
          <div className="grid grid-cols-[9rem_1fr] items-center gap-2">
            <div className="relative h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={65} paddingAngle={3} stroke="none">
                    {data.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} visitors`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold">{total}</span><span className="text-[10px] text-muted-foreground">visitors</span></div>
            </div>
            <div className="min-w-0 space-y-2">
              {data.slice(0, 6).map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground" title={item.name}>{item.name}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="flex h-36 items-center justify-center text-sm text-muted-foreground">No data in this period.</p>}
      </CardContent>
    </Card>
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
