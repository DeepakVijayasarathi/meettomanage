import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  /**
   * Opt-in row selection for bulk actions — off by default, so every existing
   * DataTable consumer is unaffected unless it passes these. The selection set is
   * owned by the caller (keyed by rowKey) so each screen decides what "bulk action"
   * means for its own data; DataTable only renders the checkboxes and the toolbar slot.
   */
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** Rendered in the toolbar row whenever at least one row is selected. */
  bulkActions?: ReactNode;
  /**
   * Opt-in server-driven pagination. When passed, `data` is one already-fetched page:
   * DataTable stops slicing it and the footer's page buttons call `onPageChange` instead
   * of moving a local index. Everything else stays as-is, so tables that hold their whole
   * list in memory are untouched.
   *
   * Search and sort still run client-side, over the page in hand — a table too large to
   * hold in the browser is exactly the one that can't sort rows it hasn't loaded, and
   * pretending otherwise would be worse than scoping it visibly to the current page.
   */
  serverPagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
  };
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
  selectable,
  selectedKeys,
  onSelectionChange,
  bulkActions,
  serverPagination,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const selection = selectedKeys ?? new Set<string>();

  function toggleRow(key: string, checked: boolean) {
    const next = new Set(selection);
    if (checked) next.add(key);
    else next.delete(key);
    onSelectionChange?.(next);
  }

  function toggleAllOnPage(rows: T[], checked: boolean) {
    const next = new Set(selection);
    for (const row of rows) {
      const key = rowKey(row);
      if (checked) next.add(key);
      else next.delete(key);
    }
    onSelectionChange?.(next);
  }

  // Trimmed before matching: a name pasted from an email or a spreadsheet almost always
  // carries a leading/trailing space, and an untrimmed substring match turned that into a
  // flat "No results" for a row that is plainly on screen.
  const trimmedQuery = query.trim();

  const filtered = useMemo(() => {
    if (!trimmedQuery) return data;
    if (searchFn) return data.filter((row) => searchFn(row, trimmedQuery));
    return data.filter((row) => JSON.stringify(row).toLowerCase().includes(trimmedQuery.toLowerCase()));
  }, [data, trimmedQuery, searchFn]);

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

  const effectivePageSize = serverPagination?.pageSize ?? pageSize;
  const totalItems = serverPagination?.totalCount ?? sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  // In server mode the page number is owned by the caller and `sorted` already is that
  // page, so there is nothing left to slice locally.
  const clampedPage = serverPagination ? serverPagination.page : Math.min(page, totalPages);
  const pageRows = serverPagination ? sorted : sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
  const goToPage = serverPagination ? serverPagination.onPageChange : setPage;
  const firstRowIndex = (clampedPage - 1) * effectivePageSize + 1;
  // How many rows this server page holds when nothing has narrowed it — the full page
  // size, or whatever is left over on the last one.
  const serverPageFill = serverPagination
    ? Math.min(effectivePageSize, Math.max(0, totalItems - (clampedPage - 1) * effectivePageSize))
    : 0;
  // A server page can be narrowed either by this table's search box or by a filter the
  // caller already applied to `data` (a toolbar Select, say). Either way the visible rows
  // stop being the contiguous "26–50" slice the range implies — and at zero rows the range
  // inverts outright ("Showing 26–25 of 50"). Count what's on screen instead.
  const narrowedPage = !!serverPagination && sorted.length !== serverPageFill;

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
        {(toolbar || (selectable && selection.size > 0)) && (
          <div className="flex flex-wrap items-center gap-2">
            {selectable && selection.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-accent px-3 py-1.5">
                <span className="text-xs font-semibold text-accent-foreground">{selection.size} selected</span>
                {bulkActions}
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onSelectionChange?.(new Set())}>
                  Clear
                </Button>
              </div>
            ) : (
              toolbar
            )}
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        // A search that simply matched nothing shouldn't reuse the page's "no data
        // exists at all" copy (e.g. "No demos scheduled yet") — that reads as if the
        // list is genuinely empty rather than just filtered, which is misleading once
        // real rows exist. Only fall back to the caller's empty copy when there's no
        // active query, i.e. the table really has no data.
        <EmptyState
          icon={Search}
          title={trimmedQuery ? `No results for "${trimmedQuery}"` : emptyTitle}
          description={trimmedQuery ? "Try a different search term, or clear the search to see everything." : emptyDescription}
        />
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
                  <div className="flex items-start gap-2">
                    {selectable && (
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label="Select row"
                          checked={selection.has(rowKey(row))}
                          onCheckedChange={(checked) => toggleRow(rowKey(row), checked === true)}
                        />
                      </div>
                    )}
                    {primary && <div className={cn("min-w-0 flex-1 text-sm", primary.className)}>{primary.render(row)}</div>}
                  </div>
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
                  {selectable && (
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Select all rows on this page"
                        checked={pageRows.length > 0 && pageRows.every((row) => selection.has(rowKey(row)))}
                        onCheckedChange={(checked) => toggleAllOnPage(pageRows, checked === true)}
                      />
                    </TableHead>
                  )}
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
                    {selectable && (
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select row`}
                          checked={selection.has(rowKey(row))}
                          onCheckedChange={(checked) => toggleRow(rowKey(row), checked === true)}
                        />
                      </TableCell>
                    )}
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

      {/* In server mode the footer stays up even when the loaded page filters down to
          nothing — otherwise a search that matches no row on page 3 would strand the
          user there with no way back. */}
      {(sorted.length > 0 || (serverPagination && totalItems > 0)) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {narrowedPage
              ? `Showing ${sorted.length} matching on this page`
              : `Showing ${firstRowIndex}–${firstRowIndex + pageRows.length - 1} of ${totalItems}`}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={clampedPage <= 1}
              // Steps from clampedPage, not the raw `page`: an external filter (a toolbar
              // Select, not the search box) can shrink the list while `page` still points
              // past the new last page, and decrementing that stale number landed back on
              // the same clamped page — Previous looked broken until you clicked it twice.
              onClick={() => goToPage(clampedPage - 1)}
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
              onClick={() => goToPage(clampedPage + 1)}
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
