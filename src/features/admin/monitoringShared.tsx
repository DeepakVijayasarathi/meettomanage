/** Shared display helpers/components between the Server Monitoring list (Monitoring.tsx) and its per-server drill-down (ServerDetail.tsx). */
import { AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, type Cpu } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CapacityForecast, TimeSeriesPoint } from "@/types";

/** Guards every numeric field the API might not send yet on a backend that's a step behind this frontend's deploy. */
export function num(value: number | undefined | null): number {
  return typeof value === "number" ? value : 0;
}

export function formatUptime(seconds: number): string {
  if (seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatAgeShort(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

/** Strips the "docker-jitsi-meet-" compose prefix and any replica suffix ("-1", "_2") so a badge reads "jibri" instead of "docker-jitsi-meet-jibri-1"; the raw name stays available via the badge's title attribute. */
export function serviceDisplayName(name: string): string {
  const withoutIndex = name.replace(/[-_]\d+$/, "");
  const withoutPrefix = withoutIndex.replace(/^docker[-_]jitsi[-_]meet[-_]/i, "");
  return withoutPrefix || withoutIndex || name;
}

/** Green under 60%, amber to 85%, red beyond — same read for every resource gauge on the page. */
export function usageTone(percent: number): "success" | "warning" | "destructive" {
  if (percent >= 85) return "destructive";
  if (percent >= 60) return "warning";
  return "success";
}

export const TONE_BAR_CLASS: Record<ReturnType<typeof usageTone>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

/** Same tone language as KpiCard's icon chips — a stat tile is a mini KPI, not a different widget. */
export const STAT_TILE_TONE: Record<"neutral" | "success" | "warning" | "destructive", { chip: string; tile: string; value: string }> = {
  neutral: { chip: "bg-muted text-muted-foreground", tile: "border-border", value: "text-foreground" },
  success: { chip: "bg-success/15 text-success", tile: "border-success/20 bg-success/[0.03]", value: "text-success" },
  warning: { chip: "bg-warning/20 text-warning-foreground", tile: "border-warning/25 bg-warning/[0.05]", value: "text-warning-foreground" },
  destructive: { chip: "bg-destructive/10 text-destructive", tile: "border-destructive/20 bg-destructive/[0.03]", value: "text-destructive" },
};

export function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "success" | "warning" | "destructive";
}) {
  const t = STAT_TILE_TONE[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3.5", t.tile)}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", t.chip)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        {/* line-clamp-2, not truncate: a numeric value cut off mid-string ("0.0% / 0....") hides
            the actual reading, which defeats the point of a stat tile. Wrap instead. */}
        <p className="line-clamp-2 text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 break-words text-base font-bold tracking-tight", t.value)}>{value}</p>
        {detail && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

export function ResourceGauge({ icon: Icon, label, percent, detail }: { icon: typeof Cpu; label: string; percent: number; detail: string }) {
  const tone = usageTone(percent);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-semibold text-foreground">{Math.round(percent)}%</span>
      </div>
      <Progress value={Math.min(100, percent)} indicatorClassName={TONE_BAR_CLASS[tone]} />
      <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

export function formatSparklineTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Compact last-hour trend, not a full ChartCard — this sits inside an already-dense server
 * card, so axes/grid are dropped entirely (values are 0-100%, self-evident from the fill
 * height) while keeping the one thing a trend line earns its space with: a real hover
 * tooltip, not a static sparkline image.
 */
export function TrendSparkline({ gradientId, data, label, color }: { gradientId: string; data: TimeSeriesPoint[]; label: string; color: string }) {
  if (data.length < 2) {
    return (
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label} · last hour</p>
        <div className="flex h-[70px] items-center justify-center rounded-lg bg-muted/30 text-[11px] text-muted-foreground">Not enough data yet</div>
      </div>
    );
  }

  const latest = data[data.length - 1].value;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label} · last hour</p>
        <p className="text-xs font-semibold text-foreground">{Math.round(latest)}%</p>
      </div>
      <div className="h-[70px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timestamp" hide />
            <YAxis domain={[0, 100]} hide />
            <RTooltip
              formatter={(value: number) => [`${value.toFixed(1)}%`, label]}
              labelFormatter={(value: string) => formatSparklineTime(value)}
              contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12, padding: "6px 10px" }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Prometheus's own deriv() over the last 6h, not a guess — "stable/growing" is the normal,
 * good state for most servers, so this only escalates in tone once a real fill date exists.
 */
export function CapacityForecastLine({ forecast, className }: { forecast: CapacityForecast | null; className?: string }) {
  if (!forecast) return null;

  if (!forecast.isFilling || forecast.daysUntilFull === null) {
    return (
      <p className={cn("flex items-center gap-1.5 text-[11px] text-muted-foreground", className)}>
        <TrendingUp className="h-3 w-3 text-success" />
        Disk usage stable — not trending toward full.
      </p>
    );
  }

  const days = forecast.daysUntilFull;
  const tone = days <= 7 ? "text-destructive" : days <= 30 ? "text-warning-foreground" : "text-muted-foreground";

  return (
    <p className={cn("flex items-center gap-1.5 text-[11px] font-medium", tone, className)}>
      <TrendingDown className="h-3 w-3" />
      At current growth ({Math.abs(forecast.trendGbPerDay).toFixed(2)} GB/day), disk full in ~{Math.round(days)} day{Math.round(days) === 1 ? "" : "s"}.
    </p>
  );
}
