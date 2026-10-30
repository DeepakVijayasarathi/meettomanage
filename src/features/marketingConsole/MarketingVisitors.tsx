import { useState } from "react";
import { CalendarCheck2, ChevronDown, ChevronLeft, ChevronRight, Footprints, Loader2, MessageCircle, Monitor, Repeat, Smartphone, Tablet, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApiData } from "@/api/hooks";
import { getMarketingVisitorJourneys, type ApiMarketingVisitorJourneys, type ApiNamedCount, type MarketingDateRange } from "@/api/marketing";
import { cn } from "@/lib/utils";

const RANGES = [1, 7, 30, 90] as const;
const EMPTY: ApiMarketingVisitorJourneys = {
  days: 30, startDate: "", endDate: "", totalVisitors: 0, singlePageVisitors: 0, returningVisitors: 0, chatVisitors: 0, bookedVisitors: 0,
  countries: [], entryPages: [], exitPages: [], topJourneys: [], visitsByHour: [], visitors: [], page: 1, pageSize: 25,
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const when = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
const time = (iso: string) => new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(iso));
const pct = (n: number, of: number) => (of === 0 ? "0%" : `${Math.round((n * 100) / of)}%`);

let regionNames: Intl.DisplayNames | null = null;
function countryName(code: string | null): string {
  if (!code || code === "?") return "Unknown";
  try {
    regionNames ??= new Intl.DisplayNames(undefined, { type: "region" });
    return `${regionNames.of(code) ?? code} (${code})`;
  } catch {
    return code;
  }
}

const DEVICE_ICON = { mobile: Smartphone, tablet: Tablet, desktop: Monitor } as const;

/** Marketing console → Visitors: what each anonymous visitor looked at, in order, and the common paths. */
export default function MarketingVisitors() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const [custom, setCustom] = useState<MarketingDateRange | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const today = ymd(new Date());
  const [draft, setDraft] = useState<MarketingDateRange>(() => { const d = new Date(); d.setDate(d.getDate() - 6); return { from: ymd(d), to: ymd(new Date()) }; });
  const [country, setCountry] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const rangeKey = custom ? `${custom.from}_${custom.to}` : String(days);
  const { data, loading, error, reload } = useApiData(
    () => getMarketingVisitorJourneys(days, custom, page, country),
    EMPTY,
    EMPTY,
    { cacheKey: `marketing-visitors-${rangeKey}-${country ?? "all"}-${page}`, ttlMs: 30_000 },
  );

  function pick(r: (typeof RANGES)[number] | null, range: MarketingDateRange | null = null) {
    if (r !== null) setDays(r);
    setCustom(range);
    setPage(1);
    setOpen(null);
  }

  const pages = Math.max(1, Math.ceil(data.totalVisitors / data.pageSize));
  const maxHour = Math.max(1, ...data.visitsByHour.map((h) => h.count));
  const busiestHour = data.visitsByHour.reduce<ApiNamedCount | null>((best, h) => (h.count > (best?.count ?? 0) ? h : best), null);
  const period = data.startDate && data.endDate ? (data.startDate === data.endDate ? data.startDate : `${data.startDate} – ${data.endDate}`) : "";

  return (
    <div>
      <PageHeader
        eyebrow="Website"
        title="Visitors"
        description="Where each anonymous visitor came from and what they looked at, in order — plus the paths most people take. No IP addresses or names are stored."
      />

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Date range" className="inline-flex flex-wrap rounded-lg border bg-card p-1">
            {RANGES.map((r) => {
              const active = !custom && !customOpen && days === r;
              return (
                <button key={r} type="button" aria-pressed={active} onClick={() => { setCustomOpen(false); pick(r); }}
                  className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  {r === 1 ? "Today" : `${r} days`}
                </button>
              );
            })}
            <button type="button" aria-pressed={!!custom || customOpen} aria-expanded={customOpen} onClick={() => setCustomOpen((o) => !o)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", custom || customOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              Custom
            </button>
          </div>
          {period && <span className="text-sm text-muted-foreground">{period}</span>}
        </div>
        {customOpen && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => {
            e.preventDefault();
            const [from, to] = draft.from <= draft.to ? [draft.from, draft.to] : [draft.to, draft.from];
            pick(null, { from, to });
          }}>
            <label className="flex flex-col text-xs text-muted-foreground">From<Input type="date" required max={today} value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} className="mt-1 h-9 w-auto" /></label>
            <label className="flex flex-col text-xs text-muted-foreground">To<Input type="date" required max={today} value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} className="mt-1 h-9 w-auto" /></label>
            <Button type="submit" size="sm">Apply</Button>
          </form>
        )}
        {data.countries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Country">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</span>
            <button type="button" aria-pressed={!country} onClick={() => { setCountry(null); setPage(1); }}
              className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", !country ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
              All
            </button>
            {data.countries.map((c) => (
              <button key={c.name} type="button" aria-pressed={country === c.name} onClick={() => { setCountry(c.name); setPage(1); }}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", country === c.name ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                {countryName(c.name)} · {c.count}
              </button>
            ))}
          </div>
        )}
      </div>

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

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
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
                <div key={h.name} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${h.name}:00 — ${h.count} visitors`}>
                  <div className="w-full rounded-t bg-primary/80" style={{ height: `${(h.count / maxHour) * 100}%`, minHeight: h.count ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-2 text-lg font-semibold">Each visitor</h2>
      {loading && data.visitors.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : data.visitors.length === 0 && !error ? (
        <EmptyState icon={Users} title="No visitors in this period" description="Try a wider date range." />
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {data.visitors.map((v) => {
            const key = `${v.visitor}-${v.firstSeenUtc}`;
            const expanded = open === key;
            const DeviceIcon = DEVICE_ICON[v.device as keyof typeof DEVICE_ICON] ?? Monitor;
            return (
              <div key={key}>
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : key)}
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-muted/50 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 items-center gap-2 sm:w-56">
                    <DeviceIcon className="h-4 w-4 text-muted-foreground" aria-label={v.device} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{countryName(v.country)}</p>
                      <p className="text-xs text-muted-foreground">{v.source}{v.campaign ? ` · ${v.campaign}` : ""} · {when(v.firstSeenUtc)}</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-xs">
                    {v.pages.slice(0, 5).map((p, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-muted-foreground">→</span>}
                        <span className="max-w-[16rem] truncate rounded bg-muted px-1.5 py-0.5 font-mono">{p.path}</span>
                      </span>
                    ))}
                    {v.pages.length > 5 && <span className="text-muted-foreground">+{v.pages.length - 5} more</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {v.bookedDemo && <Badge variant="success">Booked</Badge>}
                    {v.startedChat && <Badge variant="default">Chatted</Badge>}
                    {v.returnVisits > 0 && <Badge variant="outline">Returned ×{v.returnVisits}</Badge>}
                    <span className="text-xs text-muted-foreground">{v.pageViews} {v.pageViews === 1 ? "page" : "pages"}</span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                  </div>
                </button>
                {expanded && (
                  <ol className="space-y-1 border-t bg-muted/30 px-4 py-3 text-sm">
                    {v.pages.map((p, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-20 shrink-0 text-xs text-muted-foreground">{time(p.atUtc)}</span>
                        <span className="break-all font-mono text-xs">{p.path}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data.totalVisitors > data.pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.totalVisitors} visitors</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            <span>Page {page} / {pages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
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
