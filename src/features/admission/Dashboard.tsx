import { Link } from "react-router-dom";
import {
  CalendarClock,
  ClipboardList,
  IndianRupee,
  PhoneCall,
  TrendingUp,
  ArrowRight,
  Users2,
  Video,
} from "lucide-react";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { SessionStatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHART_PALETTE } from "@/lib/roles";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { SESSIONS } from "@/data/sessions";
import { LEADS, getConversionFunnel, getConversionRate, getRevenueThisMonth } from "./data";

const TODAY = "2026-07-09";
const WEEK_START = "2026-07-06";
const WEEK_END = "2026-07-12";

const FUNNEL_COLORS: Record<string, string> = {
  "Demo Scheduled": CHART_PALETTE[4],
  "Demo Completed": CHART_PALETTE[2],
  "Follow-up": CHART_PALETTE[6],
  Enrolled: "hsl(var(--success))",
  "Not Interested": "hsl(var(--destructive))",
};

export default function AdmissionDashboard() {
  const demoSessions = SESSIONS.filter((s) => s.type === "demo");
  const demosThisWeek = demoSessions.filter((s) => s.date >= WEEK_START && s.date <= WEEK_END).length;
  const conversionRate = getConversionRate();
  const pendingFollowUps = LEADS.filter((l) => l.conversionStage === "Follow-up").length;
  const revenueThisMonth = getRevenueThisMonth();
  const funnel = getConversionFunnel();

  const upcomingDemos = demoSessions
    .filter((s) => s.date >= TODAY)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        eyebrow="Admission Team"
        title="Good to see you, Priya"
        description="Your demo-to-enrollment pipeline at a glance — scheduling, feedback, follow-ups and conversions."
        actions={
          <Button asChild>
            <Link to="/admission/demo-scheduling">
              <CalendarClock className="h-4 w-4" />
              Schedule a demo
            </Link>
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Demos This Week"
          value={formatNumber(demosThisWeek)}
          icon={CalendarClock}
          tone="primary"
          trend={{ value: 18, label: "vs last week" }}
        />
        <KpiCard
          label="Demo → Enrollment Conversion"
          value={formatPercent(conversionRate)}
          icon={TrendingUp}
          tone="success"
          trend={{ value: 4.5, label: "vs last month" }}
        />
        <KpiCard
          label="Pending Follow-ups"
          value={formatNumber(pendingFollowUps)}
          icon={PhoneCall}
          tone="destructive"
          trend={{ value: -12, label: "vs last week" }}
        />
        <KpiCard
          label="Revenue From Conversions"
          value={formatCurrency(revenueThisMonth)}
          icon={IndianRupee}
          tone="warning"
          trend={{ value: 9.2, label: "this month" }}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard
          title="Conversion Funnel"
          description="Demo Scheduled → Completed → Follow-up → Enrolled / Not Interested"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 32, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} fontSize={12} width={112} />
              <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
                {funnel.map((f) => (
                  <Cell key={f.stage} fill={FUNNEL_COLORS[f.stage]} />
                ))}
                <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-semibold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users2 className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Pipeline Snapshot</h3>
              <p className="text-sm text-muted-foreground">{LEADS.length} active leads</p>
            </div>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {(["Demo Scheduled", "Demo Completed", "Follow-up", "Enrolled", "Not Interested"] as const).map((stage) => {
              const count = LEADS.filter((l) => l.conversionStage === stage).length;
              return (
                <div key={stage} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[stage] }} />
                    <span className="text-sm text-foreground">{stage}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">{count}</span>
                </div>
              );
            })}
          </div>
          <Button variant="soft" size="sm" className="mt-4 w-full" asChild>
            <Link to="/admission/conversion">
              Open Kanban board <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Today & upcoming demos */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${CHART_PALETTE[4]}1A`, color: CHART_PALETTE[4] }}>
              <ClipboardList className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Today &amp; Upcoming Demos</h3>
              <p className="text-sm text-muted-foreground">{formatDate(TODAY, "long")} onward</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admission/demo-scheduling">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {upcomingDemos.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No demos scheduled" description="Schedule a demo class to see it appear here." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {upcomingDemos.map((s, i) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                    style={{ backgroundColor: `${CHART_PALETTE[i % CHART_PALETTE.length]}1A`, color: CHART_PALETTE[i % CHART_PALETTE.length] }}
                  >
                    {formatDate(s.date, "short").slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.date === TODAY ? "Today" : formatDate(s.date, "long")} · {s.startTime} · {s.teacherName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.date === TODAY && <Badge variant="warning">Today</Badge>}
                  <SessionStatusBadge status={s.status} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Join / view session">
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
