import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterBarOption {
  value: string;
  label: string;
}

export interface FilterBarFilter {
  key: string;
  /** Shown as the active-filter chip's prefix, e.g. "Status: Completed" — not shown in the dropdown itself (SelectValue covers that). */
  label: string;
  value: string;
  options: FilterBarOption[];
  onChange: (value: string) => void;
  /** The value that means "no filter applied" — defaults to "all". Doesn't render a chip. */
  allValue?: string;
  placeholder?: string;
  className?: string;
}

interface FilterBarProps {
  filters: FilterBarFilter[];
  /** Extra toolbar content that isn't a filter select — an Export button, a "New" button, etc. */
  children?: ReactNode;
  className?: string;
}

/**
 * Standardizes the single/multi Select-dropdown toolbar pattern already used across
 * DataTable's `toolbar` slot (Sessions, Payments, Leads, AuditLog, MyClasses, …) and adds
 * the one thing none of those had: a visible "which filters are active" chip row with a
 * one-click way to clear them, so a user who filtered a table three screens ago and
 * navigated back isn't left staring at a shorter list with no visible reason why.
 */
export function FilterBar({ filters, children, className }: FilterBarProps) {
  const active = filters.filter((f) => f.value !== (f.allValue ?? "all"));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
            <SelectTrigger className={filter.className ?? "w-44"} aria-label={filter.label}>
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {children}
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map((filter) => {
            const optionLabel = filter.options.find((o) => o.value === filter.value)?.label ?? filter.value;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => filter.onChange(filter.allValue ?? "all")}
                className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/70"
              >
                {filter.label}: {optionLabel}
                <X className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Remove {filter.label} filter</span>
              </button>
            );
          })}
          {active.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => active.forEach((f) => f.onChange(f.allValue ?? "all"))}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
