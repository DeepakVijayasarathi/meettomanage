import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Download, Loader2, LogIn, LogOut, Radar, RefreshCw, Search, ShieldAlert, type LucideIcon, UserPlus, Users, Video, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate, toCsv as toCsvEscaped, setVisibleInterval } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  getClassSessionLogDashboard,
  listClassSessionLogs,
  getClassSessionTimeline,
  type ApiClassSessionEventLog,
  type ClassSessionEventType,
  type ClassSessionLogDashboard,
} from "@/api/classSessionLogs";
import type { ApiClassSession } from "@/api/sessions";

const REFRESH_INTERVAL_MS = 25_000;
const PAGE_SIZE = 25;
const EXPORT_SIZE = 200;

const EMPTY_DASHBOARD: ClassSessionLogDashboard = {
  liveClasses: [],
  nextClasses: [],
  unexpectedEventsToday: 0,
  noShowsThisWeek: 0,
  statusCounts: {},
};

const EVENT_META: Record<ClassSessionEventType, { label: string; icon: LucideIcon }> = {
  TeacherStarted: { label: "Teacher started class", icon: Video },
  TeacherJoined: { label: "Teacher rejoined", icon: LogIn },
  StudentJoined: { label: "Student joined", icon: LogIn },
  StudentRejoined: { label: "Student rejoined", icon: LogIn },
  DemoParticipantJoined: { label: "Demo participant joined", icon: UserPlus },
  TeacherLeftClass: { label: "Teacher ended/left", icon: LogOut },
  StudentLeft: { label: "Student left", icon: LogOut },
  TeacherDisconnected: { label: "Teacher disconnected", icon: WifiOff },
  StudentDisconnected: { label: "Student disconnected", icon: WifiOff },
  ClassEnded: { label: "Class ended", icon: CheckCircle2 },
  TeacherNoShow: { label: "Teacher no-show", icon: AlertTriangle },
  StudentNoShow: { label: "Student no-show", icon: AlertTriangle },
  JoinDenied: { label: "Join denied", icon: ShieldAlert },
};

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_META).map(([value, meta]) => ({ value, label: meta.label }));

const RANGE_OPTIONS = [
  { value: "1h", label: "Last 1 hour" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function rangeToFromUtc(range: string): string | undefined {
  const now = Date.now();
  if (range === "1h") return new Date(now - 60 * 60 * 1000).toISOString();
  if (range === "24h") return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (range === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (range === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  return undefined;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return `${formatDate(d, "short")}, ${formatDate(d, "time")}`;
}

/** "in 12 min" / "in 3h" / "now" for the next scheduled class's countdown. */
function formatCountdown(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "starting now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  return `in ${Math.floor(hours / 24)}d`;
}

function SessionMiniCard({ session, emphasizeCountdown }: { session: ApiClassSession; emphasizeCountdown?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{session.batchName ?? (session.type === "Demo" ? "Demo class" : "Class session")}</p>
          {session.type === "Demo" && <Badge variant="muted" className="text-[10px]">Demo</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{session.teacherName}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {emphasizeCountdown ? formatCountdown(session.scheduledStartAtUtc) : formatTimestamp(session.scheduledStartAtUtc)}
      </span>
    </div>
  );
}

function EventTimelineDialog({ sessionId, onClose }: { sessionId: string | null; onClose: () => void }) {
  const [events, setEvents] = useState<ApiClassSessionEventLog[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setEvents(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getClassSessionTimeline(sessionId)
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <Dialog open={sessionId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Class timeline</DialogTitle>
          <DialogDescription>Every logged event for this class, in order.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && events?.length === 0 && <p className="text-sm text-muted-foreground">No events logged for this class yet.</p>}
          {!loading &&
            events?.map((e) => {
              const meta = EVENT_META[e.eventType];
              const Icon = meta.icon;
              return (
                <div key={e.id} className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
                  <span
                    className={
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full " +
                      (e.isExpected ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">{meta.label}</p>
                      {!e.isExpected && (
                        <Badge variant="destructive" className="text-[10px]">
                          Unexpected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.participantName ?? "—"} · {formatTimestamp(e.occurredAtUtc)}
                    </p>
                    {e.detail && <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>}
                  </div>
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const COLUMNS: DataTableColumn<ApiClassSessionEventLog>[] = [
  {
    key: "occurredAtUtc",
    header: "Timestamp",
    render: (r) => <span className="whitespace-nowrap text-foreground">{formatTimestamp(r.occurredAtUtc)}</span>,
    accessor: (r) => r.occurredAtUtc,
    sortable: true,
  },
  {
    key: "class",
    header: "Class",
    render: (r) => (
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{r.batchName ?? (r.sessionType === "Demo" ? "Demo class" : "Class session")}</span>
          {r.sessionType === "Demo" && <Badge variant="muted" className="text-[10px]">Demo</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{r.teacherName}</p>
      </div>
    ),
  },
  {
    key: "event",
    header: "Event",
    render: (r) => {
      const meta = EVENT_META[r.eventType];
      const Icon = meta.icon;
      return (
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {meta.label}
        </span>
      );
    },
  },
  {
    key: "participant",
    header: "Participant",
    render: (r) => (
      <div>
        <p className="text-sm text-foreground">{r.participantName ?? "—"}</p>
        {r.participantType && <p className="text-xs text-muted-foreground">{r.participantType}</p>}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (r) =>
      r.isExpected ? (
        <Badge variant="success" className="text-[10px]">Expected</Badge>
      ) : (
        <Badge variant="destructive" className="text-[10px]">Unexpected</Badge>
      ),
  },
  {
    key: "detail",
    header: "Detail",
    render: (r) => <span className="line-clamp-2 text-xs text-muted-foreground">{r.detail ?? "—"}</span>,
  },
];

function toCsv(rows: ApiClassSessionEventLog[]) {
  return toCsvEscaped(
    ["Timestamp", "Class", "Teacher", "Event", "Participant", "Status", "Detail"],
    rows.map((r) => [
      r.occurredAtUtc,
      r.batchName ?? (r.sessionType === "Demo" ? "Demo class" : "Class session"),
      r.teacherName,
      EVENT_META[r.eventType].label,
      r.participantName ?? "",
      r.isExpected ? "Expected" : "Unexpected",
      r.detail ?? "",
    ])
  );
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminClassSessionLogs() {
  const usingApi = apiEnabled();
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState<string>("7d");
  // What the box shows vs. what is applied: the query only changes after a short pause in typing.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    reload: reloadDashboard,
  } = useApiData(() => getClassSessionLogDashboard(search), EMPTY_DASHBOARD, EMPTY_DASHBOARD);

  const {
    data: logPage,
    loading: logsLoading,
    error: logsError,
    reload: reloadLogs,
  } = useApiData(
    () =>
      listClassSessionLogs({
        fromUtc: rangeToFromUtc(rangeFilter),
        eventType: eventTypeFilter === "all" ? undefined : (eventTypeFilter as ClassSessionEventType),
        expectedOnly: statusFilter === "all" ? undefined : statusFilter === "expected",
        search,
        page,
        pageSize: PAGE_SIZE,
      }),
    { items: [] as ApiClassSessionEventLog[], totalCount: 0, page: 1, pageSize: PAGE_SIZE },
    { items: [] as ApiClassSessionEventLog[], totalCount: 0, page: 1, pageSize: PAGE_SIZE }
  );

  function refreshAll() {
    reloadDashboard();
    reloadLogs();
  }

  // Fallback poll, same idiom as Server Monitoring's non-live-push path — no SignalR here,
  // so this is the only thing that keeps "live now" / "next up" from going stale.
  useEffect(() => {
    if (!usingApi) return;
    const interval = setVisibleInterval(refreshAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingApi]);

  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = setTimeout(() => {
      setSearch(next);
      setPage(1);
      refreshAll();
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function goToPage(next: number) {
    setPage(next);
    reloadLogs();
  }

  function applyFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
    reloadLogs();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const p = await listClassSessionLogs({
        fromUtc: rangeToFromUtc(rangeFilter),
        eventType: eventTypeFilter === "all" ? undefined : (eventTypeFilter as ClassSessionEventType),
        expectedOnly: statusFilter === "all" ? undefined : statusFilter === "expected",
        search,
        page: 1,
        pageSize: EXPORT_SIZE,
      });
      download(`class-session-logs-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(p.items));
    } finally {
      setExporting(false);
    }
  }

  const nextClass = dashboard.nextClasses[0];

  return (
    <div>
      <PageHeader
        eyebrow="Meetings · Activity Trail"
        title="Class Session Logs"
        description="Live/next class status and the full teacher & student join, leave, end and no-show trail — demo and live classes alike, expected and unexpected scenarios both."
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={dashboardLoading || logsLoading}>
            <RefreshCw className={(dashboardLoading || logsLoading) ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Refresh
          </Button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by batch or teacher…"
          aria-label="Search by batch or teacher"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Live Classes"
          value={String(dashboard.liveClasses.length)}
          detail={dashboard.liveClasses.length > 0 ? "in progress now" : undefined}
          icon={Video}
          tone="primary"
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Next Class"
          value={nextClass ? formatCountdown(nextClass.scheduledStartAtUtc) : "—"}
          detail={nextClass?.batchName ?? nextClass?.teacherName}
          icon={Clock}
          tone="neutral"
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="Unexpected Events Today"
          value={String(dashboard.unexpectedEventsToday)}
          icon={AlertTriangle}
          tone={dashboard.unexpectedEventsToday > 0 ? "destructive" : "success"}
          loading={dashboardLoading}
          error={dashboardError}
        />
        <KpiCard
          label="No-Shows This Week"
          value={String(dashboard.noShowsThisWeek)}
          icon={Users}
          tone={dashboard.noShowsThisWeek > 0 ? "warning" : "success"}
          loading={dashboardLoading}
          error={dashboardError}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-1.5">
            <Radar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Live now</h3>
          </div>
          {dashboard.liveClasses.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No class is live"
              description={search ? "No live class matches this batch or teacher." : "Nothing is running right now."}
            />
          ) : (
            <div className="space-y-2">
              {dashboard.liveClasses.map((s) => (
                <SessionMiniCard key={s.id} session={s} />
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Next up</h3>
          </div>
          {dashboard.nextClasses.length === 0 ? (
            <EmptyState icon={Clock} title="Nothing scheduled next" description="No upcoming classes found." />
          ) : (
            <div className="space-y-2">
              {dashboard.nextClasses.slice(0, 5).map((s) => (
                <SessionMiniCard key={s.id} session={s} emphasizeCountdown />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <DataTable
          data={logPage.items}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          searchPlaceholder="Search this page's events…"
          searchFn={(row, query) =>
            `${row.participantName ?? ""} ${row.teacherName} ${row.batchName ?? ""} ${row.detail ?? ""}`.toLowerCase().includes(query.toLowerCase())
          }
          onRowClick={(row) => setOpenSessionId(row.classSessionId)}
          error={usingApi ? logsError : null}
          onRetry={reloadLogs}
          emptyTitle="No events in this range"
          emptyDescription="Try a wider date range or clear the filters."
          serverPagination={{ page, pageSize: PAGE_SIZE, totalCount: logPage.totalCount, onPageChange: goToPage }}
          toolbar={
            <FilterBar
              filters={[
                {
                  key: "range",
                  label: "Range",
                  value: rangeFilter,
                  onChange: (v) => applyFilter(setRangeFilter, v),
                  className: "w-40",
                  options: RANGE_OPTIONS,
                },
                {
                  key: "eventType",
                  label: "Event",
                  value: eventTypeFilter,
                  onChange: (v) => applyFilter(setEventTypeFilter, v),
                  className: "w-52",
                  placeholder: "All events",
                  options: [{ value: "all", label: "All events" }, ...EVENT_TYPE_OPTIONS],
                },
                {
                  key: "status",
                  label: "Status",
                  value: statusFilter,
                  onChange: (v) => applyFilter(setStatusFilter, v),
                  className: "w-56",
                  options: [
                    { value: "all", label: "Expected & unexpected" },
                    { value: "expected", label: "Expected only" },
                    { value: "unexpected", label: "Unexpected only" },
                  ],
                },
              ]}
            >
              <Button variant="outline" size="sm" disabled={exporting} onClick={handleExport}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            </FilterBar>
          }
        />
      </div>

      <EventTimelineDialog sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />
    </div>
  );
}
