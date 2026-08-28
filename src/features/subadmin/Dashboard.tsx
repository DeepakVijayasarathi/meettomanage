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
import { PersonalMeetingButton } from "@/components/PersonalMeetingButton";
import { KpiCard } from "@/components/KpiCard";
import { ScheduleConflictsPanel } from "@/components/ScheduleConflictsPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/state/session";
import { formatDate, formatPercent } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listBatches, toFrontendBatch } from "@/api/batches";
import { listSessions, toFrontendSession } from "@/api/sessions";
import { getDashboardSummary } from "@/api/reports";
import { listAuditLogs } from "@/api/audit";
import { PERMISSION_MODULES, type PermissionModuleName } from "@/api/permissions";
import { listMyAccessRequests, submitAccessRequest } from "@/api/accessRequests";
import { BATCHES } from "@/data/batches";
import { SESSIONS } from "@/data/sessions";
import { ADMIN_KPIS } from "@/data/kpis";
import {
  AUDIT_LOG,
  MODULE_META,
  FULL_ACCESS_MODULES,
  VIEW_ONLY_MODULES,
  NO_ACCESS_MODULES,
  type SubAdminModule,
  type AssignedModuleCard,
} from "./data";

const TODAY = "2026-07-09";
const ADMIN_CONTACT = "Ananya Rao";

const MODULE_LABEL_BY_VALUE: Partial<Record<PermissionModuleName, string>> = Object.fromEntries(
  PERMISSION_MODULES.map((m) => [m.value, m.label])
);

// requestedModules comes back as raw backend enum names ("BillingFinance"), not the display
// labels ("Billing & Finance") shown everywhere else on this card — same mapping the Admin's
// Access Requests panel already applies to the same field.
function moduleLabels(modules: PermissionModuleName[]): string {
  return modules.map((m) => MODULE_LABEL_BY_VALUE[m] ?? m).join(", ");
}

function timeAgo(iso: string, nowMs: number) {
  const diffMs = nowMs - new Date(iso).getTime();
  const hrs = Math.round(diffMs / 3_600_000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface ActivityRow {
  id: string;
  action: string;
  detail: string;
  module: string;
  timestamp: string;
}

export default function SubAdminDashboard() {
  const { toast } = useToast();
  const { userName, permissions } = useSession();
  const firstName = userName.split(" ")[0] ?? userName;
  const usingApi = apiEnabled();
  // The mock universe's clock is pinned; a real login measures against the real one.
  const nowMs = usingApi ? Date.now() : new Date(`${TODAY}T23:59:59`).getTime();
  const adminContact = usingApi ? "your Admin" : `${ADMIN_CONTACT} (Admin)`;

  const [requestOpen, setRequestOpen] = useState(false);
  // Demo mode has no backend to persist against, so it keeps the old local-only flag;
  // a real login tracks this from the server (see myRequests below) so it survives a reload.
  const [requestedDemo, setRequestedDemo] = useState(false);
  const { data: myRequests, reload: reloadMyRequests } = useApiData(() => listMyAccessRequests(), []);
  const pendingRequest = myRequests.find((r) => r.status === "Pending");
  // myRequests is most-recent-first, so the first non-pending entry is the latest decision.
  const lastReviewedRequest = myRequests.find((r) => r.status !== "Pending");
  const requestSent = usingApi ? Boolean(pendingRequest) : requestedDemo;

  const { data: apiBatches, loading: batchesLoading, error: batchesError } = useApiData(() => listBatches().then((items) => items.map(toFrontendBatch)), []);
  const { data: apiSessions, loading: sessionsLoading, error: sessionsError } = useApiData(() => listSessions().then((items) => items.map(toFrontendSession)), []);
  const { data: liveSummary, loading: summaryLoading, error: summaryError } = useApiData(
    () =>
      getDashboardSummary().then((s) => ({
        occupancy: s.batchOccupancyPercent,
        // Latest week with recorded attendance drives the KPI.
        attendance: [...(s.weeklyAttendanceTrend ?? [])].reverse().find((w) => w.attendance > 0)?.attendance ?? 0,
      })),
    { occupancy: ADMIN_KPIS.batchOccupancy, attendance: ADMIN_KPIS.attendanceRate },
    { occupancy: 0, attendance: 0 }
  );
  const liveOccupancy = liveSummary.occupancy;
  const kpiLoading = batchesLoading || sessionsLoading || summaryLoading;
  const kpiError = batchesError || sessionsError || summaryError;
  const { data: apiActivity } = useApiData<ActivityRow[]>(
    () =>
      listAuditLogs({ page: 1, pageSize: 5 }).then((page) =>
        page.items.map((entry) => ({
          id: entry.id,
          action: `${entry.action} — ${entry.entityName}`,
          detail: entry.actorName ?? "—",
          module: entry.entityName,
          timestamp: entry.createdAtUtc,
        }))
      ),
    []
  );

  const activeBatches = usingApi
    ? apiBatches.filter((b) => b.status === "active").length
    : BATCHES.filter((b) => b.status === "active").length;
  const todayIso = new Date(nowMs).toISOString().slice(0, 10);
  const sessionsToday = usingApi
    ? apiSessions.filter((s) => s.date === todayIso).length
    : SESSIONS.filter((s) => s.date === TODAY).length;
  const recentActivity: ActivityRow[] = usingApi ? apiActivity : AUDIT_LOG.slice(0, 5);
  const attendanceRate = usingApi ? liveSummary.attendance : ADMIN_KPIS.attendanceRate;

  // Real logins derive their module scope from the session's permission claims;
  // demo mode keeps the Neha persona's scripted grants.
  const scope = usingApi
    ? PERMISSION_MODULES.reduce(
        (acc, module) => {
          const has = (action: string) => permissions.includes(`${module.value}:${action}`);
          if (has("Create") || has("Edit") || has("Delete") || has("Approve")) acc.full.push(module.label);
          else if (has("View")) acc.view.push(module.label);
          else {
            acc.none.push(module.label);
            acc.noneValues.push(module.value);
          }
          return acc;
        },
        { full: [] as string[], view: [] as string[], none: [] as string[], noneValues: [] as PermissionModuleName[] }
      )
    : { full: [...FULL_ACCESS_MODULES], view: [...VIEW_ONLY_MODULES], none: [...NO_ACCESS_MODULES], noneValues: [] as PermissionModuleName[] };
  const totalModules = scope.full.length + scope.view.length + scope.none.length;

  const moduleCards: AssignedModuleCard[] = [
    {
      id: "batches",
      title: "Batches",
      icon: Layers,
      color: CHART_PALETTE[2],
      stat: `${activeBatches} active batches · ${formatPercent(liveOccupancy)} avg occupancy`,
      ctaLabel: "View batch report",
      to: "/subadmin/reports",
    },
    {
      id: "sessions",
      title: "Sessions & Attendance",
      icon: CalendarClock,
      color: CHART_PALETTE[3],
      stat: `${sessionsToday} sessions today · ${formatPercent(attendanceRate)} attendance this month`,
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
      stat:
        recentActivity.length > 0
          ? `Last action ${timeAgo(recentActivity[0].timestamp, nowMs)}`
          : "No actions logged yet",
      ctaLabel: "View my activity",
      to: "/subadmin/audit-log",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Relationship Manager · Restricted Console"
        title={`Welcome back, ${firstName}`}
        description="You're signed in with permission-based access — a delegated slice of the Admin console. Everything on this page reflects exactly what your Admin has granted you, nothing more."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PersonalMeetingButton />
            <Button asChild variant="outline">
              <Link to="/subadmin/permissions">
                <ShieldCheck className="h-4 w-4" />
                View my permissions
              </Link>
            </Button>
          </div>
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
                You have access to {scope.full.length} of {totalModules} modules with full working rights
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Full access:</span>{" "}
                {scope.full.join(", ") || "None"} &middot;{" "}
                <span className="font-medium text-foreground">View-only:</span>{" "}
                {scope.view.join(", ") || "None"} &middot;{" "}
                <span className="font-medium text-foreground">No access:</span>{" "}
                {scope.none.join(", ") || "None"}
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
        <KpiCard
          label="Active Batches"
          value={String(activeBatches)}
          icon={Layers}
          tone="primary"
          trend={usingApi ? undefined : { value: 2.1, label: "vs last month" }}
          loading={kpiLoading}
          error={kpiError}
        />
        <KpiCard label="Sessions Today" value={String(sessionsToday)} icon={Clock} tone="primary" loading={kpiLoading} error={kpiError} />
        <KpiCard
          label="Attendance Rate"
          value={formatPercent(attendanceRate)}
          icon={CheckCircle2}
          tone="success"
          trend={usingApi ? undefined : { value: 1.5, label: "vs last month" }}
          loading={kpiLoading}
          error={kpiError}
        />
        <KpiCard
          label="Batch Occupancy"
          value={formatPercent(liveOccupancy)}
          icon={LayoutGrid}
          tone="neutral"
          trend={usingApi ? undefined : { value: 2.9, label: "vs last month" }}
          loading={kpiLoading}
          error={kpiError}
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
              {recentActivity.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No activity recorded yet — actions you take will show up here as you go.
                </p>
              )}
              {recentActivity.map((entry, i) => {
                // API entity names won't always match the demo module set — fall back to a neutral icon.
                const MetaIcon = MODULE_META[entry.module as SubAdminModule]?.icon ?? History;
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${CHART_PALETTE[i % CHART_PALETTE.length]}1A`, color: CHART_PALETTE[i % CHART_PALETTE.length] }}
                    >
                      <MetaIcon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{entry.action}</p>
                      <p className="truncate text-xs text-muted-foreground">{entry.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{entry.module}</span>
                      <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(entry.timestamp, nowMs)}</p>
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
              <p className="text-sm font-semibold text-foreground">
                {scope.none.length > 0 ? "Need broader access?" : "Full module access"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {scope.none.length > 0
                  ? // Named from the same permission-derived scope.none the "Locked modules"
                    // line below already reads, rather than a fixed list — this used to name
                    // "Billing, payouts and enrollment revenue" unconditionally, even for an
                    // account actually granted every module (contradicting the accurate line
                    // right below it on the same card).
                    `${scope.none.join(", ")} ${scope.none.length === 1 ? "isn't" : "aren't"} part of your delegated scope. If your work needs ${scope.none.length === 1 ? "it" : "them"}, send a request to your Admin.`
                  : "Your account is granted every module — there's nothing left for your Admin to add."}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" />
              Locked modules: {scope.none.join(", ") || "None"}
            </div>
            <Button
              variant={requestSent ? "outline" : "default"}
              size="sm"
              className="mt-auto"
              disabled={requestSent || scope.none.length === 0}
              onClick={() => setRequestOpen(true)}
            >
              <Mail className="h-3.5 w-3.5" />
              {requestSent ? "Request sent" : "Request additional access"}
            </Button>
            {usingApi && pendingRequest && (
              <p className="text-[11px] text-muted-foreground">
                Sent to {adminContact} on {formatDate(pendingRequest.createdAtUtc.slice(0, 10), "long")}. Awaiting review.
              </p>
            )}
            {usingApi && !pendingRequest && lastReviewedRequest && (
              <p className="text-[11px] text-muted-foreground">
                Last request ({moduleLabels(lastReviewedRequest.requestedModules)}) was{" "}
                <strong>{lastReviewedRequest.status.toLowerCase()}</strong> on{" "}
                {formatDate((lastReviewedRequest.reviewedAtUtc ?? lastReviewedRequest.createdAtUtc).slice(0, 10), "long")}
                {lastReviewedRequest.reviewNote ? ` — "${lastReviewedRequest.reviewNote}"` : ""}
              </p>
            )}
            {!usingApi && requestedDemo && (
              <p className="text-[11px] text-muted-foreground">
                Sent to {adminContact} on {formatDate(new Date(nowMs).toISOString().slice(0, 10), "long")}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conflicts & attention — relocated here from the coordinator per client feedback. */}
      <div className="mt-6">
        <ScheduleConflictsPanel />
      </div>

      <ConfirmDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title="Request additional access?"
        description={
          usingApi
            ? `This notifies ${adminContact} that you're requesting access to: ${scope.none.join(", ")}.`
            : `This notifies ${adminContact} that you're requesting broader module permissions. This is a simulated action — no email is actually sent.`
        }
        confirmLabel="Send request"
        onConfirm={() => {
          if (!usingApi) {
            setRequestedDemo(true);
            toast({ variant: "success", title: "Request sent", description: `Sent to ${adminContact} (demo mode — not persisted).` });
            return;
          }
          return submitAccessRequest(scope.noneValues)
            .then(() => {
              reloadMyRequests();
              toast({ variant: "success", title: "Access request sent", description: `Sent to ${adminContact} for review.` });
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : "Could not send the request. Please try again.";
              toast({ variant: "error", title: "Couldn't send request", description: message });
              throw err;
            });
        }}
      />
    </div>
  );
}
