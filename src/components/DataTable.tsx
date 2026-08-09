import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  accessor?: (row: T) => string | number;
  sortable?: boolean;
  className?: string;
  headClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchFn?: (row: T, query: string) => boolean;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchPlaceholder = "Search…",
  searchFn,
  toolbar,
  onRowClick,
  pageSize = 8,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query) return data;
    if (searchFn) return data.filter((row) => searchFn(row, query));
    return data.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  }, [data, query, searchFn]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.accessor) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.accessor!(a);
      const bv = col.accessor!(b);
      if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Search} title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {/* Mobile: a horizontally-scrolling table is unusable on a phone (every column but
              the first two ends up hidden off-screen with no affordance to reach it) — below
              sm, each row becomes a card instead. Column defs are reused as-is (header + render),
              so every DataTable consumer gets this for free with no per-screen change. */}
          <div className="flex flex-col gap-3 sm:hidden">
            {pageRows.map((row) => {
              const [primary, ...rest] = columns;
              // An actions column conventionally has no header text (e.g. header: "") —
              // give it its own row at the bottom instead of a blank ": value" label.
              const detailCols = rest.filter((c) => c.header);
              const actionCols = rest.filter((c) => !c.header);
              return (
                <div
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "rounded-xl border border-border bg-card p-4",
                    onRowClick && "cursor-pointer active:bg-muted/40"
                  )}
                >
                  {primary && <div className={cn("text-sm", primary.className)}>{primary.render(row)}</div>}
                  {detailCols.length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3">
                      {detailCols.map((col) => (
                        <div key={col.key} className="min-w-0">
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{col.header}</dt>
                          <dd className={cn("mt-0.5 text-sm", col.className)}>{col.render(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {actionCols.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3" onClick={(e) => e.stopPropagation()}>
                      {actionCols.map((col) => (
                        <div key={col.key}>{col.render(row)}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead key={col.key} className={col.headClassName}>
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {col.header}
                          {sort?.key === col.key ? (
                            sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {sorted.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(clampedPage - 1) * pageSize + 1}–{Math.min(clampedPage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={clampedPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-1 text-xs font-medium">
              Page {clampedPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={clampedPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
