import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  EyeOff,
  History,
  Layers,
  LayoutGrid,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useSession } from "@/state/session";
import { formatDate, formatPercent } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { BATCHES } from "@/data/batches";
import { SESSIONS } from "@/data/sessions";
import { ADMIN_KPIS } from "@/data/kpis";
import {
  AUDIT_LOG,
  MODULE_META,
  FULL_ACCESS_MODULES,
  VIEW_ONLY_MODULES,
  NO_ACCESS_MODULES,
  type AssignedModuleCard,
} from "./data";

const TODAY = "2026-07-09";
const ADMIN_CONTACT = "Ananya Rao";

function timeAgo(iso: string) {
  const diffMs = new Date(`${TODAY}T23:59:59`).getTime() - new Date(iso).getTime();
  const hrs = Math.round(diffMs / 3_600_000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function SubAdminDashboard() {
  const { userName } = useSession();
  const firstName = userName.split(" ")[0] ?? userName;

  const [requestOpen, setRequestOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  const activeBatches = BATCHES.filter((b) => b.status === "active").length;
  const sessionsToday = SESSIONS.filter((s) => s.date === TODAY).length;
  const recentActivity = AUDIT_LOG.slice(0, 5);

  const totalModules = FULL_ACCESS_MODULES.length + VIEW_ONLY_MODULES.length + NO_ACCESS_MODULES.length;

  const moduleCards: AssignedModuleCard[] = [
    {
      id: "batches",
      title: "Batches",
      icon: Layers,
      color: CHART_PALETTE[2],
      stat: `${activeBatches} active batches · ${formatPercent(ADMIN_KPIS.batchOccupancy)} avg occupancy`,
      ctaLabel: "View batch report",
      to: "/subadmin/reports",
    },
    {
      id: "sessions",
      title: "Sessions & Attendance",
      icon: CalendarClock,
      color: CHART_PALETTE[3],
      stat: `${sessionsToday} sessions today · ${formatPercent(ADMIN_KPIS.attendanceRate)} attendance this month`,
      ctaLabel: "View attendance report",
      to: "/subadmin/reports",
    },
    {
      id: "reports",
      title: "Assigned Reports",
      icon: BarChart3,
      color: CHART_PALETTE[5],
      stat: "2 report types available in your scope",
      ctaLabel: "Open reports",
      to: "/subadmin/reports",
    },
    {
      id: "audit",
      title: "Audit Log",
      icon: History,
      color: CHART_PALETTE[6],
      stat: `${AUDIT_LOG.length} actions logged · last ${timeAgo(AUDIT_LOG[0].timestamp)}`,
      ctaLabel: "View my activity",
      to: "/subadmin/audit-log",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Sub Admin Portal · Restricted Console"
        title={`Welcome back, ${firstName}`}
        description="You're signed in with permission-based access — a delegated slice of the Admin console. Everything on this page reflects exactly what your Admin has granted you, nothing more."
        actions={
          <Button asChild variant="outline">
            <Link to="/subadmin/permissions">
              <ShieldCheck className="h-4 w-4" />
              View my permissions
            </Link>
          </Button>
        }
      />

      {/* Scope banner */}
      <Card className="mb-6 border-primary/25 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                You have access to {FULL_ACCESS_MODULES.length} of {totalModules} modules with full working rights
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Full access:</span>{" "}
                {FULL_ACCESS_MODULES.join(", ")} &middot;{" "}
                <span className="font-medium text-foreground">View-only:</span>{" "}
                {VIEW_ONLY_MODULES.join(", ")} &middot;{" "}
                <span className="font-medium text-foreground">No access:</span>{" "}
                {NO_ACCESS_MODULES.join(", ")}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="soft" className="shrink-0">
            <Link to="/subadmin/permissions">
              View full permission matrix <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* KPI row — only modules Neha plausibly has access to. No billing/payout metrics. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Batches" value={String(activeBatches)} icon={Layers} tone="primary" trend={{ value: 2.1, label: "vs last month" }} />
        <KpiCard label="Sessions Today" value={String(sessionsToday)} icon={Clock} tone="warning" />
        <KpiCard
          label="Attendance Rate"
          value={formatPercent(ADMIN_KPIS.attendanceRate)}
          icon={CheckCircle2}
          tone="success"
          trend={{ value: 1.5, label: "vs last month" }}
        />
        <KpiCard
          label="Batch Occupancy"
          value={formatPercent(ADMIN_KPIS.batchOccupancy)}
          icon={LayoutGrid}
          tone="neutral"
          trend={{ value: 2.9, label: "vs last month" }}
        />
      </div>

      {/* My assigned modules */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-foreground">My assigned modules</h2>
        <p className="mt-1 text-sm text-muted-foreground">Quick links into the areas you're delegated to work in.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {moduleCards.map((card) => (
            <Link key={card.id} to={card.to} className="group block">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${card.color}1A`, color: card.color }}
                  >
                    <card.icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.stat}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                    {card.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity + access request */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <History className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Recent activity</p>
                  <p className="text-xs text-muted-foreground">Actions you've taken, most recent first</p>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/subadmin/audit-log">
                  View full log <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {recentActivity.map((entry, i) => {
                const meta = MODULE_META[entry.module];
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${CHART_PALETTE[i % CHART_PALETTE.length]}1A`, color: CHART_PALETTE[i % CHART_PALETTE.length] }}
                    >
                      <meta.icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{entry.action}</p>
                      <p className="truncate text-xs text-muted-foreground">{entry.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{entry.module}</span>
                      <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(entry.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="flex h-full flex-col gap-3 p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Need broader access?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Billing, payouts and enrollment revenue aren't part of your delegated scope. If your work needs them, send a request to your Admin.
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" />
              Locked modules: {NO_ACCESS_MODULES.join(", ") || "None"}
            </div>
            <Button
              variant={requested ? "outline" : "default"}
              size="sm"
              className="mt-auto"
              disabled={requested}
              onClick={() => setRequestOpen(true)}
            >
              <Mail className="h-3.5 w-3.5" />
              {requested ? "Request sent" : "Request additional access"}
            </Button>
            {requested && (
              <p className="text-[11px] text-muted-foreground">
                Sent to {ADMIN_CONTACT} (Admin) on {formatDate(TODAY, "long")}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title="Request additional access?"
        description={`This notifies ${ADMIN_CONTACT} (Admin) that you're requesting broader module permissions. This is a simulated action for this demo — no email is actually sent.`}
        confirmLabel="Send request"
        onConfirm={() => setRequested(true)}
      />
    </div>
  );
}
