import { useState } from "react";
import { CalendarCheck2, Eye, MessageCircle, Table2, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/api/hooks";
import { getMarketingDashboard, type ApiMarketingDashboard, type ApiMarketingTotals, type ApiNamedCount } from "@/api/marketing";
import { cn, formatDate } from "@/lib/utils";

// Validated with the dataviz palette checker (light + dark surfaces): blue for visitors, a
// deeper orange than the brand CTA for page views so both lines clear the contrast floor.
const VISITORS_COLOR = "#1F6FE0";
const PAGE_VIEWS_COLOR = "#D9620B";

const RANGES = [7, 30, 90] as const;

const EMPTY: ApiMarketingDashboard = {
  days: 30,
  totals: { pageViews: 0, visitors: 0, chatsStarted: 0, demoRequests: 0, chatBookings: 0, conversionRate: 0 },
  previous: { pageViews: 0, visitors: 0, chatsStarted: 0, demoRequests: 0, chatBookings: 0, conversionRate: 0 },
  daily: [],
  topPages: [],
  topBlogPosts: [],
  sources: [],
  campaigns: [],
  devices: [],
  demoRequestsByStatus: [],
};

/** % change vs the previous period; undefined when there's nothing to compare against. */
function change(current: number, previous: number): { value: number; label: string } | undefined {
  if (previous === 0) return undefined;
  return { value: Math.round(((current - previous) / previous) * 100), label: "vs prev. period" };
}

const fmt = (n: number) => n.toLocaleString();

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

const DEVICE_LABEL: Record<string, string> = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet" };

export default function MarketingDashboard() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [showTable, setShowTable] = useState(false);
  const { data, loading, error } = useApiData(() => getMarketingDashboard(days), EMPTY, undefined, { cacheKey: `marketing-dashboard-${days}`, ttlMs: 60_000 });

  // cacheKey carries `days`, so switching the range refetches (useApiData re-runs on cacheKey).
  const t: ApiMarketingTotals = data.totals;
  const p: ApiMarketingTotals = data.previous;
  const daily = data.daily.map((d) => ({ ...d, label: formatDate(d.date) }));
  const hasTraffic = daily.some((d) => d.pageViews > 0);

  const kpis: { label: string; value: string; detail?: string; icon: LucideIcon; tone: "primary" | "success" | "warning" | "neutral"; trend?: { value: number; label: string } }[] = [
    { label: "Visitors", value: fmt(t.visitors), icon: Users, tone: "primary", trend: change(t.visitors, p.visitors) },
    { label: "Page views", value: fmt(t.pageViews), icon: Eye, tone: "neutral", trend: change(t.pageViews, p.pageViews) },
    { label: "Chats started", value: fmt(t.chatsStarted), icon: MessageCircle, tone: "primary", trend: change(t.chatsStarted, p.chatsStarted) },
    {
      label: "Demo requests",
      value: fmt(t.demoRequests),
      detail: t.chatBookings > 0 ? `${fmt(t.chatBookings)} via chat` : undefined,
      icon: CalendarCheck2,
      tone: "success",
      trend: change(t.demoRequests, p.demoRequests),
    },
    { label: "Visitor → demo", value: `${t.conversionRate}%`, detail: "per 100 visitors", icon: TrendingUp, tone: "warning" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Website"
        title="Analytics"
        description="Visitors, where they come from, and how many turn into demo requests — from the public marketing site only. Anonymous: no IP addresses or personal data are stored."
        actions={
          <div role="group" aria-label="Date range" className="inline-flex rounded-lg border border-border p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                aria-pressed={days === r}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  days === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r} days
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} detail={k.detail} icon={k.icon} tone={k.tone} trend={k.trend} loading={loading} error={error} />
        ))}
      </div>

      <ChartCard
        className="mt-6"
        title="Visitors & page views"
        description={`Per day, last ${days} days`}
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
          <div className="h-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pe-3 font-semibold">Date</th>
                  <th className="py-2 pe-3 text-right font-semibold">Visitors</th>
                  <th className="py-2 pe-3 text-right font-semibold">Page views</th>
                  <th className="py-2 text-right font-semibold">Demo requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...daily].reverse().map((d) => (
                  <tr key={d.date}>
                    <td className="py-1.5 pe-3">{d.label}</td>
                    <td className="py-1.5 pe-3 text-right tabular-nums">{fmt(d.visitors)}</td>
                    <td className="py-1.5 pe-3 text-right tabular-nums">{fmt(d.pageViews)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmt(d.demoRequests)}</td>
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <RankedList title="Where visitors come from" items={data.sources} loading={loading} emptyText="No visits yet." />
        <RankedList title="Top pages" items={data.topPages} loading={loading} emptyText="No page views yet." />
        <RankedList title="Top blog posts" items={data.topBlogPosts} loading={loading} emptyText="No blog reads yet." format={(path) => path.replace(/^\/blog\//, "")} />
        <RankedList title="Devices" items={data.devices} loading={loading} emptyText="No visits yet." format={(d) => DEVICE_LABEL[d] ?? d} />
        <RankedList title="Campaigns (utm_campaign)" items={data.campaigns} loading={loading} emptyText="No tagged campaign traffic. Add ?utm_source=…&utm_campaign=… to your ad links." />
        <RankedList title="Demo requests by status" items={data.demoRequestsByStatus} loading={loading} emptyText="No demo requests in this period." />
      </div>
    </div>
  );
}
