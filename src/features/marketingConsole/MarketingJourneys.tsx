import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronRight as Open, Loader2, Monitor, Route } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/api/hooks";
import { getMarketingVisitorJourneys } from "@/api/marketing";
import { countryName, DEVICE_ICON, EMPTY_JOURNEYS, useVisitorFilters, when } from "./visitorUtils";
import { VisitorFilterBar } from "./VisitorFilterBar";

/** Marketing console → Journeys: every visitor, with the pages they saw in order. Click one for their own page. */
export default function MarketingJourneys() {
  const filters = useVisitorFilters(7);
  const { data, loading, error, reload } = useApiData(
    () => getMarketingVisitorJourneys(filters.days, filters.custom, filters.page, filters.country),
    EMPTY_JOURNEYS,
    EMPTY_JOURNEYS,
    { cacheKey: `marketing-journeys-${filters.key}`, ttlMs: 30_000 },
  );
  const pages = Math.max(1, Math.ceil(data.totalVisitors / data.pageSize));
  const period = data.startDate && data.endDate ? (data.startDate === data.endDate ? data.startDate : `${data.startDate} – ${data.endDate}`) : "";

  return (
    <div>
      <PageHeader
        eyebrow="Website"
        title="Visitor journeys"
        description="Every visitor, newest first, with the pages they looked at in order. Click a visitor to see all their visits, chats and demo requests."
      />

      <VisitorFilterBar filters={filters} countries={data.countries} period={period} />

      {error && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load journeys ({error}).{" "}
          <button type="button" className="underline" onClick={() => reload()}>Retry</button>
        </InlineAlert>
      )}

      {loading && data.visitors.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : data.visitors.length === 0 && !error ? (
        <EmptyState icon={Route} title="No visitors in this period" description="Try a wider date range." />
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {data.visitors.map((v) => {
            const DeviceIcon = DEVICE_ICON[v.device as keyof typeof DEVICE_ICON] ?? Monitor;
            return (
              <Link key={v.visitorId} to={`/marketing/journeys/${encodeURIComponent(v.visitorId)}`}
                className="flex w-full flex-col gap-2 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:flex-row sm:items-center">
                <div className="flex shrink-0 items-center gap-2 sm:w-60">
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
                  <Open className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {data.totalVisitors > data.pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.totalVisitors} visitors</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={filters.page <= 1} onClick={() => filters.setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            <span>Page {filters.page} / {pages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={filters.page >= pages} onClick={() => filters.setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
