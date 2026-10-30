import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck2, Footprints, MessageCircle, Repeat, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiData } from "@/api/hooks";
import { getMarketingVisitorJourneys, type ApiNamedCount } from "@/api/marketing";
import { EMPTY_JOURNEYS, useVisitorFilters } from "./visitorUtils";
import { VisitorFilterBar } from "./VisitorFilterBar";

const pct = (n: number, of: number) => (of === 0 ? "0%" : `${Math.round((n * 100) / of)}%`);

/** Marketing console → Visitors: the patterns — where people land and leave, common paths, when they arrive. */
export default function MarketingVisitors() {
  const filters = useVisitorFilters(7);
  const { data, error, reload } = useApiData(
    () => getMarketingVisitorJourneys(filters.days, filters.custom, 1, filters.country),
    EMPTY_JOURNEYS,
    EMPTY_JOURNEYS,
    { cacheKey: `marketing-visitors-${filters.key}`, ttlMs: 30_000 },
  );

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
