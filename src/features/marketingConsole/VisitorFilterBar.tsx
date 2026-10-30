import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiNamedCount, MarketingDateRange } from "@/api/marketing";
import { cn } from "@/lib/utils";
import { countryName, RANGES, ymd, type RangeDays, type useVisitorFilters } from "./visitorUtils";

type Filters = ReturnType<typeof useVisitorFilters>;

export function VisitorFilterBar({ filters, countries, period, onChange }: { filters: Filters; countries: ApiNamedCount[]; period?: string; onChange?: () => void }) {
  const { days, setDays, custom, setCustom, country, setCountry, setPage } = filters;
  const [customOpen, setCustomOpen] = useState(false);
  const today = ymd(new Date());
  const [draft, setDraft] = useState<MarketingDateRange>(() => { const d = new Date(); d.setDate(d.getDate() - 6); return { from: ymd(d), to: ymd(new Date()) }; });

  function pick(r: RangeDays | null, range: MarketingDateRange | null = null) {
    if (r !== null) setDays(r);
    setCustom(range);
    setPage(1);
    onChange?.();
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Date range" className="inline-flex flex-wrap rounded-lg border bg-card p-1">
          {RANGES.map((r) => {
            const active = !custom && !customOpen && days === r;
            return (
              <button key={r} type="button" aria-pressed={active} onClick={() => { setCustomOpen(false); pick(r); }}
                className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                {r === 1 ? "Today" : `${r} days`}
              </button>
            );
          })}
          <button type="button" aria-pressed={!!custom || customOpen} aria-expanded={customOpen} onClick={() => setCustomOpen((o) => !o)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", custom || customOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
            Custom
          </button>
        </div>
        {period && <span className="text-sm text-muted-foreground">{period}</span>}
      </div>
      {customOpen && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => {
          e.preventDefault();
          const [from, to] = draft.from <= draft.to ? [draft.from, draft.to] : [draft.to, draft.from];
          pick(null, { from, to });
        }}>
          <label className="flex flex-col text-xs text-muted-foreground">From<Input type="date" required max={today} value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} className="mt-1 h-9 w-auto" /></label>
          <label className="flex flex-col text-xs text-muted-foreground">To<Input type="date" required max={today} value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} className="mt-1 h-9 w-auto" /></label>
          <Button type="submit" size="sm">Apply</Button>
        </form>
      )}
      {countries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Country">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</span>
          <button type="button" aria-pressed={!country} onClick={() => { setCountry(null); setPage(1); onChange?.(); }}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", !country ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
            All
          </button>
          {countries.map((c) => (
            <button key={c.name} type="button" aria-pressed={country === c.name} onClick={() => { setCountry(c.name); setPage(1); onChange?.(); }}
              className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", country === c.name ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
              {countryName(c.name)} · {c.count}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
