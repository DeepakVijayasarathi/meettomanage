import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, CalendarCheck2, CheckCircle2, ChevronLeft, ChevronRight, Eye, Info, Loader2, MessageCircle, MousePointerClick, Sparkles, Table2, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/api/hooks";
import { getMarketingDashboard, getMarketingInsights, getMarketingReportSettings, listMarketingCampaignBudgets, saveMarketingCampaignBudget, saveMarketingReportSettings, type ApiMarketingCampaignBudget, type ApiMarketingDashboard, type ApiMarketingInsights, type ApiMarketingReportSetting, type ApiMarketingTotals, type ApiNamedCount, type MarketingDateRange } from "@/api/marketing";
import { userMessage } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

// Validated with the dataviz palette checker (light + dark surfaces): blue for visitors, a
// deeper orange than the brand CTA for page views so both lines clear the contrast floor.
const VISITORS_COLOR = "#1F6FE0";
const PAGE_VIEWS_COLOR = "#D9620B";

const RANGES = [1, 7, 30, 90] as const;
const rangeLabel = (r: number) => (r === 1 ? "Today" : `${r} days`);
/** A local calendar day as "YYYY-MM-DD" (the date inputs' format). */
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const EMPTY: ApiMarketingDashboard = {
  days: 30,
  startDate: "",
  endDate: "",
  totals: { pageViews: 0, visitors: 0, chatsStarted: 0, demoRequests: 0, formStartedVisitors: 0, formVisibleVisitors: 0, formSubmitAttemptedVisitors: 0, formSubmitFailedVisitors: 0, formSubmittedVisitors: 0, formValidationFailedVisitors: 0, formAbandonedVisitors: 0, whatsAppVisitors: 0, chatBookings: 0, conversionRate: 0, pagesPerVisitor: 0, chatStartRate: 0, demoPipelineConversionRate: 0 },
  previous: { pageViews: 0, visitors: 0, chatsStarted: 0, demoRequests: 0, formStartedVisitors: 0, formVisibleVisitors: 0, formSubmitAttemptedVisitors: 0, formSubmitFailedVisitors: 0, formSubmittedVisitors: 0, formValidationFailedVisitors: 0, formAbandonedVisitors: 0, whatsAppVisitors: 0, chatBookings: 0, conversionRate: 0, pagesPerVisitor: 0, chatStartRate: 0, demoPipelineConversionRate: 0 },
  conversionDetail: { visitors: 0, highIntentPageVisitors: 0, pricingVisitors: 0, demoPageVisitors: 0, formStartedVisitors: 0, formVisibleVisitors: 0, submitAttemptedVisitors: 0, validationFailedVisitors: 0, abandonedVisitors: 0, apiFailedVisitors: 0, savedFormLeadVisitors: 0, chatBookedVisitors: 0, whatsAppVisitors: 0, totalSavedLeadVisitors: 0 },
  daily: [],
  topPages: [],
  topBlogPosts: [],
  sources: [],
  campaigns: [],
  mediums: [],
  countries: [],
  devices: [],
  demoRequestsByStatus: [],
  sourceQuality: [], campaignPerformance: [], landingPagePerformance: [],
};

/** % change vs the previous period; undefined when there's nothing to compare against. */
function change(current: number, previous: number): { value: number; label: string } | undefined {
  if (previous === 0) return undefined;
  return { value: Math.round(((current - previous) / previous) * 100), label: "vs prev. period" };
}

const fmt = (n: number) => n.toLocaleString();
const localDate = (date: string) => date ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`)) : "";
const regionNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(undefined, { type: "region" }) : null;

/** Horizontal ranked bars — one hue, value as text beside each bar, full name on hover. */
function RankedList({ title, items, emptyText, loading, format }: { title: string; items: ApiNamedCount[]; emptyText: string; loading: boolean; format?: (name: string) => string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="grid gap-2.5">
            {items.map((item) => {
              const label = format ? format(item.name) : item.name;
              return (
                <li key={item.name} title={`${label}: ${fmt(item.count)}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                  <span className="truncate text-sm text-foreground">{label}</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(item.count)}</span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full" style={{ width: `${(item.count / max) * 100}%`, background: VISITORS_COLOR }} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceList({ title, items }: { title: string; items: ApiMarketingDashboard["sourceQuality"] }) {
  return <Card><CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent>
    {items.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No attributed leads in this period.</p> :
      <div className="overflow-auto" tabIndex={0} aria-label={`${title} data`}><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Channel</th><th className="pb-2 text-right">Visitors</th><th className="pb-2 text-right">Leads</th><th className="pb-2 text-right">Lead rate</th><th className="pb-2 text-right">Won</th><th className="pb-2 text-right">Sales rate</th></tr></thead><tbody className="divide-y divide-border">{items.map(x => <tr key={x.name}><td className="max-w-40 truncate py-2" title={x.name}>{x.name}</td><td className="text-right">{x.visitors}</td><td className="text-right">{x.leads}</td><td className="text-right font-medium">{x.leadConversionRate}%</td><td className="text-right">{x.converted}</td><td className="text-right font-medium">{x.conversionRate}%</td></tr>)}</tbody></table></div>}
  </CardContent></Card>;
}

const DEVICE_LABEL: Record<string, string> = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet" };

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  // Custom from–to range; null = the preset buttons are in charge.
  const [custom, setCustom] = useState<MarketingDateRange | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const today = ymd(new Date());
  const [draft, setDraft] = useState<MarketingDateRange>(() => { const d = new Date(); d.setDate(d.getDate() - 6); return { from: ymd(d), to: ymd(new Date()) }; });
  const [showTable, setShowTable] = useState(true);
  const [insights, setInsights] = useState<ApiMarketingInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const rangeKey = custom ? `${custom.from}_${custom.to}` : String(days);
  const { data, loading, error } = useApiData(() => getMarketingDashboard(days, custom), EMPTY, undefined, { cacheKey: `marketing-dashboard-${rangeKey}`, ttlMs: 60_000 });
  const campaignState = useApiData<ApiMarketingCampaignBudget[]>(listMarketingCampaignBudgets, [], undefined, { cacheKey: "marketing-campaign-budgets", ttlMs: 30_000 });
  const reportState = useApiData<ApiMarketingReportSetting>(getMarketingReportSettings, { enabled: false, frequency: "Weekly", recipientEmail: "", retentionDays: 400, lastSentAtUtc: null }, undefined, { cacheKey: "marketing-report-settings", ttlMs: 30_000 });
  const [reportForm, setReportForm] = useState(reportState.data);
  const [campaignForm, setCampaignForm] = useState({ campaign: "", spend: "", wonRevenue: "", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) });
  const [operationsBusy, setOperationsBusy] = useState(false);
  useEffect(() => setReportForm(reportState.data), [reportState.data]);

  // cacheKey carries `days`, so switching the range refetches (useApiData re-runs on cacheKey).
  const t: ApiMarketingTotals = data.totals;
  const p: ApiMarketingTotals = data.previous;
  const daily = data.daily.map((d) => ({ ...d, label: formatDate(d.date) }));
  const selectedIndex = Math.max(0, selectedDate ? daily.findIndex(d => d.date === selectedDate) : daily.length - 1);
  const selectedDay = daily[selectedIndex];
  const previousDay = selectedIndex > 0 ? daily[selectedIndex - 1] : undefined;
  const hasTraffic = daily.some((d) => d.pageViews > 0);
  const exactRange = data.startDate && data.endDate
    ? (data.startDate === data.endDate ? localDate(data.startDate) : `${localDate(data.startDate)} – ${localDate(data.endDate)}`)
    : custom ? `${localDate(custom.from)} – ${localDate(custom.to)}` : days === 1 ? "Today" : `Last ${days} days`;
  const periodLabel = custom ? "selected period's" : days === 1 ? "today's" : `${days}-day`;

  function pickRange(r: (typeof RANGES)[number] | null, range: MarketingDateRange | null = null) {
    if (r !== null) setDays(r);
    setCustom(range);
    setSelectedDate(null); setInsights(null); setInsightsError(null);
  }
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";

  async function analyze() {
    setInsightsLoading(true);
    setInsightsError(null);
    try { setInsights(await getMarketingInsights(days, custom)); }
    catch (err) { setInsightsError(userMessage(err, "Could not generate the analysis.")); }
    finally { setInsightsLoading(false); }
  }

  async function addCampaign() {
    if (!campaignForm.campaign.trim() || !campaignForm.spend) return;
    setOperationsBusy(true);
    try { await saveMarketingCampaignBudget({ id: "00000000-0000-0000-0000-000000000000", campaign: campaignForm.campaign, spend: Number(campaignForm.spend), wonRevenue: campaignForm.wonRevenue ? Number(campaignForm.wonRevenue) : null, currency: "INR", startDate: campaignForm.startDate, endDate: campaignForm.endDate }); await campaignState.reload(); setCampaignForm(f => ({ ...f, campaign: "", spend: "", wonRevenue: "" })); }
    finally { setOperationsBusy(false); }
  }

  async function saveAutomation() { setOperationsBusy(true); try { await saveMarketingReportSettings(reportForm); await reportState.reload(); } finally { setOperationsBusy(false); } }

  const kpis: { label: string; value: string; detail?: string; icon: LucideIcon; tone: "primary" | "success" | "warning" | "neutral"; trend?: { value: number; label: string } }[] = [
    { label: "Visitors", value: fmt(t.visitors), icon: Users, tone: "primary", trend: change(t.visitors, p.visitors) },
    { label: "Page views", value: fmt(t.pageViews), icon: Eye, tone: "neutral", trend: change(t.pageViews, p.pageViews) },
    { label: "Saved chats", value: fmt(t.chatsStarted), detail: "open conversation history", icon: MessageCircle, tone: "primary", trend: change(t.chatsStarted, p.chatsStarted) },
    {
      label: "Demo requests",
      value: fmt(t.demoRequests),
      detail: t.chatBookings > 0 ? `${fmt(t.chatBookings)} via chat` : undefined,
      icon: CalendarCheck2,
      tone: "success",
      trend: change(t.demoRequests, p.demoRequests),
    },
    { label: "Visitor → demo", value: `${t.conversionRate ?? 0}%`, detail: "per 100 visitors", icon: TrendingUp, tone: "warning" },
    { label: "Pages / visitor", value: (t.pagesPerVisitor ?? 0).toFixed(1), detail: "content depth", icon: BarChart3, tone: "neutral" },
    { label: "Saved chat rate", value: `${t.chatStartRate ?? 0}%`, detail: "visitors with a saved chat", icon: MousePointerClick, tone: "primary" },
    { label: "Demo → converted", value: `${t.demoPipelineConversionRate ?? 0}%`, detail: "sales pipeline", icon: TrendingUp, tone: "success" },
  ];
  const supportingKpis = kpis.filter(k => ["Page views", "Saved chats", "Pages / visitor", "Saved chat rate"].includes(k.label));
  const demoTrend = change(t.demoRequests, p.demoRequests);
  const formStarts = t.formStartedVisitors ?? 0;
  const formVisible = t.formVisibleVisitors ?? 0;
  const formAttempts = t.formSubmitAttemptedVisitors ?? 0;
  const formFailures = t.formSubmitFailedVisitors ?? 0;
  const formSubmits = t.formSubmittedVisitors ?? 0;
  const trackingHealth = formFailures > 0
    ? { tone: "warning", label: "Submission failures detected", message: `${fmt(formFailures)} visitor${formFailures === 1 ? "" : "s"} passed validation but the request failed. Check the API and server logs before changing the page.`, icon: AlertTriangle }
    : formSubmits > t.demoRequests
    ? { tone: "warning", label: "Needs verification", message: `${fmt(formSubmits)} visitor${formSubmits === 1 ? "" : "s"} submitted the form, but only ${fmt(t.demoRequests)} saved demo request${t.demoRequests === 1 ? "" : "s"} exist. Run one end-to-end test and inspect the API response.`, icon: AlertTriangle }
    : t.demoRequests > 0
      ? { tone: "success", label: "Conversion tracking active", message: "Saved demo requests confirm that the conversion path is recording successfully.", icon: CheckCircle2 }
      : formStarts > 0
        ? { tone: "warning", label: "Form activity detected", message: `${fmt(formStarts)} visitor${formStarts === 1 ? "" : "s"} started the form, but no saved demo request was recorded. Review validation failures and abandonments before changing the page.`, icon: AlertTriangle }
        : formVisible > 0
          ? { tone: "info", label: "Form seen but not started", message: `${fmt(formVisible)} visitor${formVisible === 1 ? "" : "s"} scrolled past the demo form but none interacted. Review the form's placement and copy to increase engagement.`, icon: Info }
          : { tone: "neutral", label: "No form activity", message: "Page tracking is active, but nobody saw or started the demo form in this period. Zero requests alone does not indicate a tracking failure.", icon: Info };
  const TrackingIcon = trackingHealth.icon;
  const conversion = data.conversionDetail ?? EMPTY.conversionDetail;
  const conversionStages = [
    { label: "Website visitors", value: conversion.visitors, detail: "unique people reached" },
    { label: "High-intent page", value: conversion.highIntentPageVisitors, detail: "pricing, get started or demo" },
    { label: "Form seen", value: conversion.formVisibleVisitors, detail: "scrolled the demo form into view" },
    { label: "Form started", value: conversion.formStartedVisitors, detail: "interacted with the demo form" },
    { label: "Submit attempted", value: conversion.submitAttemptedVisitors, detail: "passed browser validation" },
    { label: "Form lead saved", value: conversion.savedFormLeadVisitors, detail: "confirmed in the CRM" },
  ].map((stage, index, stages) => {
    const previous = index === 0 ? stage.value : stages[index - 1].value;
    return { ...stage, rate: index === 0 ? 100 : previous === 0 ? 0 : Math.round(stage.value * 1000 / previous) / 10, drop: index === 0 ? 0 : Math.max(0, previous - stage.value) };
  });
  const biggestLeak = conversionStages.slice(1).filter(stage => conversionStages[conversionStages.indexOf(stage) - 1]?.value > 0)
    .sort((a, b) => a.rate - b.rate)[0];

  return (
    <div>
      <PageHeader
        eyebrow="Website"
        title="Growth command center"
        description={`Acquisition, engagement and sales performance for ${exactRange}. Anonymous traffic measurement; no IP addresses are stored.`}
      />

      <section className="relative mb-6 overflow-hidden rounded-3xl bg-[#0B132B] px-5 py-6 text-white shadow-[0_24px_60px_-32px_rgba(11,19,43,0.8)] sm:px-7 sm:py-7">
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F05A0A]/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300"><span className="h-2 w-2 rounded-full bg-[#F05A0A] shadow-[0_0_0_5px_rgba(240,90,10,0.16)]" />Live growth pulse</div><h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">Turn website attention into qualified academy conversations.</h2><p className="mt-2 text-sm text-slate-300">{exactRange} · {timeZone}</p></div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
            <div role="group" aria-label="Date range" className="inline-flex flex-wrap self-start rounded-xl border border-white/15 bg-white/5 p-1 backdrop-blur lg:self-end">
            {RANGES.map((r) => {
              const active = !custom && !customOpen && days === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setCustomOpen(false); pickRange(r); }}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-sm font-semibold transition-all",
                    active ? "bg-[#C2410C] text-white shadow-lg" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {rangeLabel(r)}
                </button>
              );
            })}
              <button
                type="button"
                onClick={() => setCustomOpen((o) => !o)}
                aria-pressed={!!custom || customOpen}
                aria-expanded={customOpen}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-semibold transition-all",
                  custom || customOpen ? "bg-[#C2410C] text-white shadow-lg" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                Custom
              </button>
            </div>
            {customOpen && (
              <form
                className="flex flex-wrap items-end gap-2 rounded-xl border border-white/15 bg-white/5 p-2 backdrop-blur"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.from || !draft.to) return;
                  const [from, to] = draft.from <= draft.to ? [draft.from, draft.to] : [draft.to, draft.from];
                  pickRange(null, { from, to });
                }}
              >
                <label className="flex flex-col text-xs text-slate-300">From
                  <input type="date" required max={today} value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} className="mt-1 h-9 rounded-md border border-white/20 bg-white/10 px-2 text-sm text-white [color-scheme:dark]" />
                </label>
                <label className="flex flex-col text-xs text-slate-300">To
                  <input type="date" required max={today} value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} className="mt-1 h-9 rounded-md border border-white/20 bg-white/10 px-2 text-sm text-white [color-scheme:dark]" />
                </label>
                <button type="submit" className="h-9 rounded-md bg-[#F05A0A] px-3 text-sm font-semibold text-white hover:bg-[#d94f08]">Apply</button>
              </form>
            )}
            </div>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Unique visitors", fmt(t.visitors), "people reached"],
              ["Demo requests", fmt(t.demoRequests), demoTrend ? `${demoTrend.value >= 0 ? "+" : ""}${demoTrend.value}% vs prior` : "new opportunities"],
              ["Visitor → demo", `${t.conversionRate ?? 0}%`, "acquisition conversion"],
              ["Demo → won", `${t.demoPipelineConversionRate ?? 0}%`, "pipeline conversion"],
            ].map(([label, value, detail]) => <div key={label} role={label === "Demo requests" ? "button" : undefined} tabIndex={label === "Demo requests" ? 0 : undefined} onClick={label === "Demo requests" ? () => navigate("/marketing/demo-requests") : undefined} onKeyDown={label === "Demo requests" ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/marketing/demo-requests"); } } : undefined} className={cn("bg-[#0B132B]/80 p-5 backdrop-blur", label === "Demo requests" && "cursor-pointer transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-300")}><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>)}
          </div>
        </div>
      </section>

      <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Engagement</p><h2 className="mt-1 text-xl font-bold">How visitors interact</h2></div><p className="hidden text-sm text-muted-foreground sm:block">Supporting signals behind conversion</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {supportingKpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} detail={k.detail} icon={k.icon} tone={k.tone} trend={k.trend} loading={loading} error={error} onClick={k.label === "Saved chats" ? () => navigate("/marketing/chats") : undefined} />
        ))}
      </div>

      <Card className={cn("mt-6 shadow-sm", trackingHealth.tone === "warning" && "border-amber-300/70 bg-amber-50/40 dark:bg-amber-950/10", trackingHealth.tone === "success" && "border-emerald-300/70 bg-emerald-50/40 dark:bg-emerald-950/10")}>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn("mt-0.5 rounded-full bg-muted p-2", trackingHealth.tone === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", trackingHealth.tone === "success" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300")}><TrackingIcon className="h-4 w-4" aria-hidden="true" /></span>
            <div><p className="font-semibold">Tracking health · {trackingHealth.label}</p><p className="mt-1 text-sm text-muted-foreground">{trackingHealth.message}</p></div>
          </div>
          <dl className="grid shrink-0 grid-cols-2 gap-2 text-center text-sm sm:grid-cols-6">
            {[["Form seen", formVisible], ["Form starts", formStarts], ["Attempts", formAttempts], ["API failures", formFailures], ["Saved demos", t.demoRequests], ["WhatsApp opens", t.whatsAppVisitors ?? 0]].map(([label, value]) => <div key={String(label)} className="min-w-20 rounded-lg border bg-background/80 px-3 py-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-bold tabular-nums">{fmt(Number(value))}</dd></div>)}
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Visitor → demo analysis</p><CardTitle className="mt-1 text-xl">Where prospective customers stop</CardTitle><p className="mt-1 text-sm text-muted-foreground">Unique visitors in {exactRange}; rates compare each stage with the stage immediately before it.</p></div>
            <div className="rounded-xl border bg-background px-4 py-2 text-end"><p className="text-xs text-muted-foreground">Overall visitor → saved lead</p><p className="text-2xl font-bold tabular-nums">{conversion.visitors === 0 ? "0%" : `${((conversion.totalSavedLeadVisitors ?? 0) * 100 / conversion.visitors).toFixed(1)}%`}</p></div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-3 lg:grid-cols-5">
            {conversionStages.map((stage, index) => (
              <div key={stage.label} className="relative rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>{index > 0 && <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", stage.rate >= 50 ? "bg-emerald-100 text-emerald-700" : stage.rate >= 20 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{stage.rate}%</span>}</div>
                <p className="mt-3 text-2xl font-bold tabular-nums">{fmt(stage.value)}</p><p className="mt-1 font-semibold">{stage.label}</p><p className="mt-1 text-xs text-muted-foreground">{stage.detail}</p>
                {index > 0 && <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">{fmt(stage.drop)} dropped before this stage</p>}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${conversion.visitors === 0 ? 0 : Math.min(100, stage.value * 100 / conversion.visitors)}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-semibold">Detailed signals</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                {[["Pricing viewers", conversion.pricingVisitors], ["Demo-page viewers", conversion.demoPageVisitors], ["Form visible", conversion.formVisibleVisitors], ["Validation failures", conversion.validationFailedVisitors], ["Abandoned forms", conversion.abandonedVisitors], ["API failures", conversion.apiFailedVisitors], ["WhatsApp opens", conversion.whatsAppVisitors], ["Chat bookings", conversion.chatBookedVisitors], ["All saved leads", conversion.totalSavedLeadVisitors]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 text-lg font-bold tabular-nums">{fmt(Number(value))}</dd></div>)}
              </dl>
            </div>
            <div className={cn("rounded-xl border p-4", biggestLeak && biggestLeak.rate < 30 ? "border-amber-300 bg-amber-50/60 dark:bg-amber-950/10" : "bg-emerald-50/50 dark:bg-emerald-950/10")}>
              <p className="font-semibold">Recommended focus</p>
              {biggestLeak ? <><p className="mt-2 text-sm">The largest proportional leak is before <strong>{biggestLeak.label}</strong>: only {biggestLeak.rate}% continued and {fmt(biggestLeak.drop)} stopped.</p><p className="mt-2 text-xs text-muted-foreground">Review the message, required effort and technical health at that exact transition before adding more traffic.</p></> : <p className="mt-2 text-sm text-muted-foreground">More visitor activity is needed before a reliable funnel leak can be identified.</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card shadow-sm">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div><CardTitle className="flex items-center gap-2 text-base"><Sparkles aria-hidden="true" className="h-4 w-4 text-primary" />Next moves</CardTitle><p className="mt-1 text-sm text-muted-foreground">Hetzner AI analyzes the selected period using only the aggregate figures shown here.</p></div>
          <Button size="sm" onClick={() => void analyze()} disabled={loading || insightsLoading}>
            {insightsLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}{insights ? "Refresh analysis" : "Analyze period"}
          </Button>
        </CardHeader>
        <CardContent>
          {insightsError && <p role="alert" className="text-sm text-destructive">{insightsError}</p>}
          {!insights && !insightsError && <p className="text-sm text-muted-foreground">Generate a concise diagnosis and prioritized actions from the {periodLabel} data.</p>}
          {insights && <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{insights.summary}</p><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{insights.aiPowered ? "Hetzner AI" : "Measured-data fallback"}</span></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><h3 className="mb-2 font-semibold">What the data says</h3><ul className="list-disc space-y-1.5 ps-5 text-muted-foreground">{insights.observations.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><h3 className="mb-2 font-semibold">Prioritized next actions</h3><ol className="list-decimal space-y-1.5 ps-5 text-muted-foreground">{insights.nextActions.map((item) => <li key={item}>{item}</li>)}</ol></div>
            </div>
          </div>}
        </CardContent>
      </Card>

      <div className="mb-3 mt-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Trend</p><h2 className="mt-1 text-xl font-bold">Performance over time</h2></div>
      <ChartCard
        className="shadow-sm"
        title="Visitors & page views"
        description={`Per local calendar day · ${exactRange} · ${timeZone}`}
        height={300}
        loading={loading}
        error={error}
        empty={!loading && !error && !hasTraffic && !showTable}
        emptyMessage="No visits recorded yet. Data appears as people browse the website."
        action={
          <Button variant="outline" size="sm" onClick={() => setShowTable((s) => !s)} aria-pressed={showTable}>
            <Table2 className="h-4 w-4" /> {showTable ? "Show chart" : "Show table"}
          </Button>
        }
      >
        {showTable ? (
          <div className="h-full overflow-auto" tabIndex={0} aria-label="Daily visitors and conversion data">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pe-3 font-semibold">Date</th>
                  <th className="py-2 pe-3 text-right font-semibold">Visitors</th>
                  <th className="py-2 pe-3 text-right font-semibold">Page views</th>
                  <th className="py-2 pe-3 text-right font-semibold">Pages / visitor</th>
                  <th className="py-2 pe-3 text-right font-semibold">Chats</th>
                  <th className="py-2 text-right font-semibold">Demo requests</th>
                  <th className="py-2 text-right font-semibold">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...daily].reverse().map((d) => (
                  <tr key={d.date} className={cn("cursor-pointer hover:bg-muted/50", selectedDay?.date === d.date && "bg-primary/5")} onClick={() => setSelectedDate(d.date)} aria-selected={selectedDay?.date === d.date}>
                    <td className="py-1.5 pe-3"><button type="button" className="font-medium text-primary hover:underline" onClick={() => setSelectedDate(d.date)}>{d.label}</button></td>
                    <td className="py-1.5 pe-3 text-right tabular-nums">{fmt(d.visitors)}</td>
                    <td className="py-1.5 pe-3 text-right tabular-nums">{fmt(d.pageViews)}</td>
                    <td className="py-1.5 pe-3 text-right tabular-nums">{(d.pagesPerVisitor ?? 0).toFixed(1)}</td>
                    <td className="py-1.5 pe-3 text-right tabular-nums">{fmt(d.chatsStarted)}</td>
                    <td className="py-1.5 pe-3 text-right tabular-nums">{fmt(d.demoRequests)}</td>
                    <td className="py-1.5 text-right tabular-nums">{(d.conversionRate ?? 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} minTickGap={24} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 12 }}
                labelStyle={{ fontWeight: 600, color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "hsl(var(--foreground))" }} />
              <Line type="monotone" dataKey="visitors" name="Visitors" stroke={VISITORS_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }} />
              <Line type="monotone" dataKey="pageViews" name="Page views" stroke={PAGE_VIEWS_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {selectedDay && <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div><CardTitle className="text-base">Daily detail · {selectedDay.label}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Compared with {previousDay?.label ?? "the previous available day"}. Today’s figures may still be incomplete.</p></div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" aria-label="Previous day" disabled={selectedIndex <= 0} onClick={() => setSelectedDate(daily[selectedIndex - 1]?.date ?? null)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" aria-label="Next day" disabled={selectedIndex >= daily.length - 1} onClick={() => setSelectedDate(daily[selectedIndex + 1]?.date ?? null)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["Visitors", selectedDay.visitors, previousDay?.visitors], ["Page views", selectedDay.pageViews, previousDay?.pageViews],
            ["Pages / visitor", selectedDay.pagesPerVisitor, previousDay?.pagesPerVisitor], ["Chats started", selectedDay.chatsStarted, previousDay?.chatsStarted],
            ["Demo requests", selectedDay.demoRequests, previousDay?.demoRequests], ["Visitor → demo", selectedDay.conversionRate, previousDay?.conversionRate],
          ].map(([label, value, previous]) => {
            const numberValue = Number(value); const previousValue = previous === undefined ? undefined : Number(previous);
            const delta = previousValue === undefined ? null : numberValue - previousValue;
            const percentage = label === "Visitor → demo";
            const decimal = label === "Pages / visitor" || percentage;
            return <div key={String(label)} className="rounded-xl border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{decimal ? numberValue.toFixed(1) : fmt(numberValue)}{percentage ? "%" : ""}</p>{delta !== null && <p className={cn("mt-1 text-xs", delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>{delta > 0 ? "+" : ""}{delta.toFixed(decimal ? 1 : 0)}{percentage ? " pts" : ""} vs prior day</p>}</div>;
          })}
        </CardContent>
      </Card>}

      <div className="mb-3 mt-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Operations</p><h2 className="mt-1 text-xl font-bold">ROI and automation</h2></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Campaign ROI</CardTitle><p className="text-sm text-muted-foreground">Add spend and won revenue using the exact utm_campaign value.</p></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-5"><input aria-label="Campaign" placeholder="Campaign" value={campaignForm.campaign} onChange={e => setCampaignForm({ ...campaignForm, campaign: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm" /><input aria-label="Spend" type="number" min="0" placeholder="Spend ₹" value={campaignForm.spend} onChange={e => setCampaignForm({ ...campaignForm, spend: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm" /><input aria-label="Won revenue" type="number" min="0" placeholder="Won ₹" value={campaignForm.wonRevenue} onChange={e => setCampaignForm({ ...campaignForm, wonRevenue: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm" /><input aria-label="Start date" type="date" value={campaignForm.startDate} onChange={e => setCampaignForm({ ...campaignForm, startDate: e.target.value })} className="h-10 rounded-md border bg-background px-2 text-sm" /><Button disabled={operationsBusy} onClick={() => void addCampaign()}>Add</Button></div>
          <div className="overflow-auto" tabIndex={0} aria-label="Campaign return on investment data"><table className="w-full text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-2 text-left">Campaign</th><th className="pb-2 text-right">Spend</th><th className="pb-2 text-right">Leads</th><th className="pb-2 text-right">CPA</th><th className="pb-2 text-right">ROAS</th></tr></thead><tbody className="divide-y">{campaignState.data.map(c => <tr key={c.id}><td className="py-2">{c.campaign}</td><td className="text-right">₹{c.spend.toLocaleString()}</td><td className="text-right">{c.leads}</td><td className="text-right">{c.costPerAcquisition == null ? "—" : `₹${c.costPerAcquisition.toLocaleString()}`}</td><td className="text-right font-semibold">{c.returnOnAdSpend == null ? "—" : `${c.returnOnAdSpend}×`}</td></tr>)}</tbody></table></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Reports, reminders and retention</CardTitle><p className="text-sm text-muted-foreground">Email performance summaries at 08:00 IST and remind the team about overdue follow-ups.</p></CardHeader><CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={reportForm.enabled} onChange={e => setReportForm({ ...reportForm, enabled: e.target.checked })} /> Enable scheduled report</label>
          <div className="grid gap-3 sm:grid-cols-3"><select aria-label="Report frequency" value={reportForm.frequency} onChange={e => setReportForm({ ...reportForm, frequency: e.target.value as "Daily" | "Weekly" })} className="h-10 rounded-md border bg-background px-3 text-sm"><option>Daily</option><option>Weekly</option></select><input aria-label="Report email" type="email" placeholder="marketing@example.com" value={reportForm.recipientEmail} onChange={e => setReportForm({ ...reportForm, recipientEmail: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm" /><input aria-label="Retention days" type="number" min="30" max="730" value={reportForm.retentionDays} onChange={e => setReportForm({ ...reportForm, retentionDays: Number(e.target.value) })} className="h-10 rounded-md border bg-background px-3 text-sm" /></div>
          <Button disabled={operationsBusy || !reportForm.recipientEmail} onClick={() => void saveAutomation()}>Save automation</Button>
        </CardContent></Card>
      </div>

      <div className="mb-3 mt-8"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Breakdown</p><h2 className="mt-1 text-xl font-bold">What drives growth</h2></div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <PerformanceList title="Source quality" items={data.sourceQuality} />
        <PerformanceList title="Campaign conversion" items={data.campaignPerformance} />
        <PerformanceList title="Landing-page conversion" items={data.landingPagePerformance} />
        <RankedList title="Where visitors come from" items={data.sources} loading={loading} emptyText="No visits yet." />
        <RankedList title="Top pages" items={data.topPages} loading={loading} emptyText="No page views yet." />
        <RankedList title="Top blog posts" items={data.topBlogPosts} loading={loading} emptyText="No blog reads yet." format={(path) => path.replace(/^\/blog\//, "")} />
        <RankedList title="Devices" items={data.devices} loading={loading} emptyText="No visits yet." format={(d) => DEVICE_LABEL[d] ?? d} />
        <RankedList title="Campaigns (utm_campaign)" items={data.campaigns} loading={loading} emptyText="No tagged campaign traffic. Add ?utm_source=…&utm_campaign=… to your ad links." />
        <RankedList title="Traffic medium (utm_medium)" items={data.mediums} loading={loading} emptyText="No tagged medium yet. Use values such as cpc, email or social." />
        <RankedList title="Audience country / region" items={data.countries} loading={loading} emptyText="Country appears for new visits when the browser locale includes a region." format={(code) => `${regionNames?.of(code) ?? code} (${code})`} />
        <RankedList title="Demo requests by status" items={data.demoRequestsByStatus} loading={loading} emptyText="No demo requests in this period." />
      </div>
    </div>
  );
}
