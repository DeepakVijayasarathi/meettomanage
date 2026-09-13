import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  IndianRupee,
  Layers,
  Radar,
  Receipt,
  Settings,
  Users,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePortalBase } from "@/lib/portalBase";
import { useSession } from "@/state/session";
import { useApiData } from "@/api/hooks";
import { getDashboardSummary, type ApiDashboardSummary } from "@/api/reports";
import { getClassSessionLogDashboard, type ClassSessionLogDashboard } from "@/api/classSessionLogs";

const ZERO_SUMMARY: ApiDashboardSummary = {
  totalStudents: 0,
  activeStudents: 0,
  revenueCollected: 0,
  revenuePending: 0,
  totalEnrollments: 0,
  activeBatches: 0,
  dormantBatches: 0,
  conversionRatePercent: 0,
  refundRatePercent: 0,
  renewalRatePercent: 0,
  batchOccupancyPercent: 0,
  teacherUtilizationSessionsPerTeacher: 0,
  revenueByDepartment: [],
  revenueByCourse: [],
  revenueTrend: [],
  enrollmentFunnel: [],
  weeklyAttendanceTrend: [],
  batchOccupancyByCourse: [],
  conversionRateTrend: [],
};

const EMPTY_LOG_DASHBOARD: ClassSessionLogDashboard = {
  liveClasses: [],
  nextClasses: [],
  unexpectedEventsToday: 0,
  noShowsThisWeek: 0,
  statusCounts: {},
};

const QUICK_LINKS = [
  { label: "Users", to: "/users", icon: Users, description: "Manage every account and role assignment." },
  { label: "Batches", to: "/batches", icon: Layers, description: "Active batches, occupancy and schedules." },
  { label: "Billing & Finance", to: "/billing", icon: Receipt, description: "Invoices, payments and refunds." },
  { label: "Reports & Analytics", to: "/reports", icon: BarChart3, description: "Revenue, enrollment and performance." },
  { label: "Class Session Logs", to: "/class-logs", icon: Radar, description: "Live/next classes and the full meeting activity trail." },
  { label: "Settings & Branding", to: "/settings", icon: Settings, description: "Org, integrations and notification settings." },
];

/** "in 12 min" / "in 3h" for the next scheduled class's countdown. */
function formatCountdown(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "starting now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  return `in ${Math.floor(hours / 24)}d`;
}

export default function ItAdminDashboard() {
  const { userName } = useSession();
  const firstName = userName.split(" ")[0] ?? userName;
  const base = usePortalBase();

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useApiData(getDashboardSummary, ZERO_SUMMARY, ZERO_SUMMARY);

  const {
    data: logDashboard,
    loading: logDashboardLoading,
    error: logDashboardError,
  } = useApiData(getClassSessionLogDashboard, EMPTY_LOG_DASHBOARD, EMPTY_LOG_DASHBOARD);

  const nextClass = logDashboard.nextClasses[0];

  return (
    <div>
      <PageHeader
        eyebrow="IT Admin Portal · Overall Dashboard"
        title={`Welcome back, ${firstName}`}
        description="A single, org-wide view across academics, finance and live-meeting activity — the same operating picture Admin has, scoped to whatever your role has been granted."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active Batches"
          value={String(summary.activeBatches)}
          icon={Layers}
          tone="primary"
          loading={summaryLoading}
          error={summaryError}
        />
        <KpiCard
          label="Total Students"
          value={String(summary.totalStudents)}
          detail={`${summary.activeStudents} active`}
          icon={Users}
          tone="neutral"
          loading={summaryLoading}
          error={summaryError}
        />
        <KpiCard
          label="Live Classes Now"
          value={String(logDashboard.liveClasses.length)}
          icon={Video}
          tone={logDashboard.liveClasses.length > 0 ? "success" : "neutral"}
          loading={logDashboardLoading}
          error={logDashboardError}
        />
        <KpiCard
          label="Unexpected Events Today"
          value={String(logDashboard.unexpectedEventsToday)}
          icon={AlertTriangle}
          tone={logDashboard.unexpectedEventsToday > 0 ? "destructive" : "success"}
          loading={logDashboardLoading}
          error={logDashboardError}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue Collected"
          value={formatCurrency(summary.revenueCollected)}
          detail={`${formatCurrency(summary.revenuePending)} pending`}
          icon={IndianRupee}
          tone="success"
          loading={summaryLoading}
          error={summaryError}
        />
        <KpiCard
          label="Batch Occupancy"
          value={`${Math.round(summary.batchOccupancyPercent)}%`}
          icon={Layers}
          tone="neutral"
          loading={summaryLoading}
          error={summaryError}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${Math.round(summary.conversionRatePercent)}%`}
          icon={BarChart3}
          tone="neutral"
          loading={summaryLoading}
          error={summaryError}
        />
        <KpiCard
          label="No-Shows This Week"
          value={String(logDashboard.noShowsThisWeek)}
          icon={AlertTriangle}
          tone={logDashboard.noShowsThisWeek > 0 ? "warning" : "success"}
          loading={logDashboardLoading}
          error={logDashboardError}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live now</CardTitle>
            <CardDescription>Classes currently in progress, platform-wide.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {logDashboard.liveClasses.length === 0 ? (
              <EmptyState icon={Video} title="No class is live" description="Nothing is currently in progress." />
            ) : (
              <div className="space-y-2">
                {logDashboard.liveClasses.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {s.batchName ?? (s.type === "Demo" ? "Demo class" : "Class session")}
                        </p>
                        {s.type === "Demo" && (
                          <Badge variant="muted" className="text-[10px]">
                            Demo
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{s.teacherName}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {formatDate(s.scheduledStartAtUtc, "time")}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link
              to={`${base}/class-logs`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View full activity trail <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next up</CardTitle>
            <CardDescription>{nextClass ? formatCountdown(nextClass.scheduledStartAtUtc) : "Nothing scheduled next"}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {!nextClass ? (
              <EmptyState icon={ArrowRight} title="No upcoming class" description="Nothing found in the schedule." />
            ) : (
              <div>
                <p className="text-sm font-semibold text-foreground">{nextClass.batchName ?? "Class session"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{nextClass.teacherName}</p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  {formatDate(nextClass.scheduledStartAtUtc, "short")}, {formatDate(nextClass.scheduledStartAtUtc, "time")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-base font-semibold text-foreground">Quick links</h2>
        <p className="text-sm text-muted-foreground">Jump straight into the areas your role gives you access to.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={`${base}${link.to}`}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-soft"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <link.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{link.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
