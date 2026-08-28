import * as React from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Existing values to suggest — the field still accepts anything typed that isn't in this list. */
  options: string[];
  placeholder?: string;
  /** Shown in the popup when nothing in `options` matches what's typed. */
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A styled combination of Input + Select: type freely (any value is accepted, matching
 * a native `<input list>` datalist), but pick from a dropdown that looks like the rest
 * of the app's SelectContent/SelectItem instead of the browser's own unstylable
 * datalist popup. Built for fields backed by an open, user-extensible set of values
 * (e.g. admin-defined course categories) where a fixed Select would be wrong.
 */
export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  { id, value, onValueChange, options, placeholder, emptyText = "No matches — press Enter to add it as a new one", disabled, className },
  ref
) {
  const [open, setOpen] = React.useState(false);
  // The text box's own draft — kept separate from `value` so a still-typing keystroke
  // that doesn't (yet) match anything doesn't get clobbered by a parent re-render.
  const [query, setQuery] = React.useState(value);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  const trimmed = query.trim();
  const filtered = React.useMemo(() => {
    if (!trimmed) return options;
    const q = trimmed.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, trimmed]);
  const exactMatch = options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  function commit(next: string) {
    setQuery(next);
    onValueChange(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <input
            ref={ref}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={disabled}
            value={query}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              // Free text is a valid value the moment it's typed — the popup below is a
              // set of shortcuts, not a gate the value has to pass through.
              onValueChange(next);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
              } else if (e.key === "Enter") {
                e.preventDefault();
                commit(query);
              }
            }}
            className="flex h-10 w-full items-center rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        // Steals focus by default like every other Radix popup — here that would yank
        // the caret out of the text box the user is actively typing in.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto rounded-lg p-1"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => commit(opt)}
              className="relative flex w-full min-w-0 cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-accent focus:bg-accent"
            >
              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {opt.toLowerCase() === trimmed.toLowerCase() && <Check className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{opt}</span>
            </button>
          ))
        )}
        {trimmed.length > 0 && !exactMatch && (
          <button
            type="button"
            onClick={() => commit(trimmed)}
            className="mt-1 flex w-full items-center gap-1.5 rounded-md border-t border-border px-2 py-1.5 text-left text-sm font-medium text-primary outline-none hover:bg-accent focus:bg-accent"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Add "{trimmed}"</span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
});
