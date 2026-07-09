import { useMemo, useState } from "react";
import { Download, History } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { AUDIT_LOG, MODULES, MODULE_META, type AuditEntry, type SubAdminModule } from "./data";

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return `${formatDate(d, "short")}, ${formatDate(d, "time")}`;
}

function toCsv(rows: AuditEntry[]) {
  const header = ["Timestamp", "Action", "Module", "Detail"];
  const lines = [
    header.join(","),
    ...rows.map((r) => [r.timestamp, r.action, r.module, r.detail].map((v) => `"${v.replace(/"/g, '""')}"`).join(",")),
  ];
  return lines.join("\n");
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
      const meta = MODULE_META[r.module];
      return (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
        >
          <meta.icon className="h-3 w-3" />
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

export default function SubAdminAuditLog() {
  const [moduleFilter, setModuleFilter] = useState<SubAdminModule | "all">("all");

  const filtered = useMemo(
    () => (moduleFilter === "all" ? AUDIT_LOG : AUDIT_LOG.filter((e) => e.module === moduleFilter)),
    [moduleFilter]
  );

  const modulesTouched = useMemo(() => new Set(AUDIT_LOG.map((e) => e.module)).size, []);
  const mostRecent = AUDIT_LOG[0];

  return (
    <div>
      <PageHeader
        eyebrow="Delegated Work · Accountability"
        title="Audit Log"
        description="A complete, unfiltered record of the actions you've taken in this portal — timestamped and grouped by module, for transparency with your Admin."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Actions Logged" value={String(AUDIT_LOG.length)} icon={History} tone="primary" />
        <KpiCard label="Modules Touched" value={String(modulesTouched)} icon={History} tone="success" />
        <KpiCard label="Most Recent Action" value={formatTimestamp(mostRecent.timestamp)} icon={History} tone="neutral" />
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
          emptyTitle="No actions in this module"
          emptyDescription="Try a different module filter or clear your search."
          toolbar={
            <>
              <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v as SubAdminModule | "all")}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {MODULES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => download(`neha-kulkarni-audit-log-2026-07-09.csv`, toCsv(filtered))}>
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </>
          }
        />
      </div>
    </div>
  );
}
