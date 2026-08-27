import { useMemo, useState } from "react";
import { Download, History } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { FilterBar } from "@/components/FilterBar";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { formatDate, toCsv as toCsvEscaped } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listAuditLogs, type ApiAuditLog } from "@/api/audit";
import { AUDIT_LOG, MODULES, MODULE_META, type AuditEntry, type SubAdminModule } from "./data";

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return `${formatDate(d, "short")}, ${formatDate(d, "time")}`;
}

// r.detail is built from actor display names, which are self-editable — delegates to
// lib/utils's toCsv so a leading =/+/-/@ can't reach Excel as a live formula.
function toCsv(rows: AuditEntry[]) {
  return toCsvEscaped(
    ["Timestamp", "Action", "Module", "Detail"],
    rows.map((r) => [r.timestamp, r.action, r.module, r.detail])
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

const COLUMNS: DataTableColumn<AuditEntry>[] = [
  {
    key: "timestamp",
    header: "Timestamp",
    render: (r) => <span className="whitespace-nowrap text-foreground">{formatTimestamp(r.timestamp)}</span>,
    accessor: (r) => r.timestamp,
    sortable: true,
  },
  {
    key: "action",
    header: "Action",
    render: (r) => <span className="font-medium text-foreground">{r.action}</span>,
    accessor: (r) => r.action,
    sortable: true,
  },
  {
    key: "module",
    header: "Module",
    render: (r) => {
      // API entity names won't always match the demo module set — fall back to a neutral chip.
      const meta = MODULE_META[r.module];
      const Icon = meta?.icon ?? History;
      const color = meta?.color ?? "hsl(var(--muted-foreground))";
      return (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          <Icon className="h-3 w-3" />
          {r.module}
        </span>
      );
    },
    accessor: (r) => r.module,
    sortable: true,
  },
  {
    key: "detail",
    header: "Detail",
    render: (r) => <span className="text-muted-foreground">{r.detail}</span>,
  },
];

/** Rows per server page. The audit trail only ever grows, so it is paged at the source. */
const PAGE_SIZE = 25;

/** Rows a single CSV export pulls — one request, same ceiling the screen used to load eagerly. */
const EXPORT_SIZE = 200;

function toEntry(entry: ApiAuditLog): AuditEntry {
  return {
    id: entry.id,
    module: entry.entityName as SubAdminModule,
    action: entry.action,
    detail: entry.actorName ? `${entry.actorName}${entry.entityId ? ` · ${entry.entityId}` : ""}` : entry.entityId ?? "—",
    timestamp: entry.createdAtUtc,
  };
}

export default function SubAdminAuditLog() {
  const usingApi = apiEnabled();
  const [moduleFilter, setModuleFilter] = useState<SubAdminModule | "all">("all");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Real trail from the audit API; the scripted persona log is demo-only.
  //
  // Paged against the server rather than pulled in one big slab: the trail grows with
  // every action anyone takes and never shrinks, so the old "fetch 200 and paginate in
  // the browser" shape both capped how far back the screen could reach (entry 201 was
  // simply unreachable) and would have kept growing the payload if that cap were lifted.
  const { data: apiPage, loading: loadLoading, error: loadError, reload } = useApiData(
    () => listAuditLogs({ page, pageSize: PAGE_SIZE }).then((p) => ({ rows: p.items.map(toEntry), totalCount: p.totalCount })),
    { rows: [] as AuditEntry[], totalCount: 0 },
    { rows: [] as AuditEntry[], totalCount: 0 }
  );

  // useApiData only refetches when its version bumps, so the page change and the refetch
  // have to be requested together; React batches both into the one render.
  function goToPage(next: number) {
    setPage(next);
    reload();
  }

  const entries = usingApi ? apiPage.rows : AUDIT_LOG;
  const totalCount = usingApi ? apiPage.totalCount : AUDIT_LOG.length;

  const filtered = useMemo(
    () => (moduleFilter === "all" ? entries : entries.filter((e) => e.module === moduleFilter)),
    [entries, moduleFilter]
  );

  const modulesTouched = useMemo(() => new Set(entries.map((e) => e.module)).size, [entries]);
  const mostRecent = entries[0];
  // In API mode these two summarise the loaded page, not the whole trail — a distinct-module
  // count and a "latest" can't be derived from rows the browser doesn't have.
  const pageScope = usingApi ? " (This Page)" : "";

  async function handleExport() {
    const filename = usingApi
      ? `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      : `neha-kulkarni-audit-log-2026-07-09.csv`;
    if (!usingApi) {
      download(filename, toCsv(filtered));
      return;
    }
    // Export reaches past the visible page deliberately — a 25-row CSV of an audit trail
    // is not what "Export CSV" means to the person clicking it.
    setExporting(true);
    try {
      const p = await listAuditLogs({ page: 1, pageSize: EXPORT_SIZE });
      const rows = p.items.map(toEntry);
      download(filename, toCsv(moduleFilter === "all" ? rows : rows.filter((e) => e.module === moduleFilter)));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Delegated Work · Accountability"
        title="Audit Log"
        description="A complete, unfiltered record of the actions you've taken in this portal — timestamped and grouped by module, for transparency with your Admin."
      />

      {usingApi && loadError && (
        // A failed load leaves every figure below at zero and the table on "No actions in
        // this module" — which reads as "you have done nothing", the opposite of what an
        // accountability record should ever imply. Say the trail could not be read.
        <InlineAlert variant="warning" className="mb-4">
          Could not load the audit trail ({loadError}) — this is not an empty log.{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </InlineAlert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Actions Logged" value={String(totalCount)} icon={History} tone="primary" loading={loadLoading} />
        <KpiCard label={`Modules Touched${pageScope}`} value={String(modulesTouched)} icon={History} tone="success" loading={loadLoading} />
        <KpiCard
          label={`Most Recent Action${pageScope}`}
          value={mostRecent ? formatTimestamp(mostRecent.timestamp) : "—"}
          icon={History}
          tone="neutral"
          loading={loadLoading}
        />
      </div>

      <div className="mt-6">
        <DataTable
          data={filtered}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          searchPlaceholder="Search actions or details…"
          searchFn={(row, query) =>
            `${row.action} ${row.detail} ${row.module}`.toLowerCase().includes(query.toLowerCase())
          }
          pageSize={8}
          // API mode pages against the server so the whole trail stays reachable; demo mode
          // holds its scripted log in memory, where DataTable's own paging is the right tool.
          serverPagination={
            usingApi ? { page, pageSize: PAGE_SIZE, totalCount, onPageChange: goToPage } : undefined
          }
          emptyTitle="No actions in this module"
          emptyDescription="Try a different module filter or clear your search."
          toolbar={
            <FilterBar
              filters={[
                {
                  key: "module",
                  label: "Module",
                  value: moduleFilter,
                  onChange: (v) => setModuleFilter(v as SubAdminModule | "all"),
                  className: "w-44",
                  placeholder: "All modules",
                  options: [{ value: "all", label: "All modules" }, ...MODULES.map((m) => ({ value: m, label: m }))],
                },
              ]}
            >
              <Button variant="outline" size="sm" disabled={exporting} onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            </FilterBar>
          }
        />
      </div>
    </div>
  );
}
