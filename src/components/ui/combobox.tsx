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
  // Which row Up/Down has moved to — -1 means none (matches the ARIA APG combobox
  // pattern: arrow keys move a virtual "active descendant" without leaving the input,
  // Enter commits whatever's active). Index space is `filtered` plus one extra slot for
  // the "Add ..." row when it's showing, so it's reachable by keyboard too, not just click.
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const listboxId = React.useId();
  // PopoverAnchor is a bare positioning wrapper, not a PopoverTrigger — Radix's own
  // "ignore the interaction that opened me" handling only exists on Trigger, so opening
  // via onFocus below raced its own dismiss logic. Confirmed live with two separate
  // causes, both from the same root issue: (1) DismissableLayer's onPointerDownOutside
  // firing on the very mousedown that focuses the input, before content has even mounted;
  // (2) onOpenAutoFocus below is deliberately prevented (so opening the popup doesn't yank
  // the caret out of the input the user is typing in) — but that leaves focus sitting on
  // the input, which is DOM-outside PopoverContent, so DismissableLayer's onFocusOutside
  // *also* independently closes it. Either one alone reopens the original bug, so both are
  // guarded below: ignore any outside-interaction whose target is inside the anchor.
  const anchorRef = React.useRef<HTMLDivElement>(null);

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
  const showAddRow = trimmed.length > 0 && !exactMatch;
  const rowCount = filtered.length + (showAddRow ? 1 : 0);

  // The active index can outlive the list it indexed into (e.g. a keystroke shrinks
  // `filtered` while a later row was active) — clamp on every render rather than trying
  // to catch every place the list changes.
  React.useEffect(() => {
    if (activeIndex >= rowCount) setActiveIndex(rowCount - 1);
  }, [activeIndex, rowCount]);

  function commit(next: string) {
    setQuery(next);
    onValueChange(next);
    setOpen(false);
    setActiveIndex(-1);
  }

  function commitActive() {
    if (activeIndex >= 0 && activeIndex < filtered.length) {
      commit(filtered[activeIndex]);
    } else if (showAddRow && activeIndex === filtered.length) {
      commit(trimmed);
    } else {
      commit(query);
    }
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className={cn("relative", className)}>
          <input
            ref={ref}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
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
              setActiveIndex(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setActiveIndex(-1);
              } else if (e.key === "ArrowDown") {
                if (rowCount === 0) return;
                e.preventDefault();
                setOpen(true);
                setActiveIndex((i) => (i + 1) % rowCount);
              } else if (e.key === "ArrowUp") {
                if (rowCount === 0) return;
                e.preventDefault();
                setOpen(true);
                setActiveIndex((i) => (i <= 0 ? rowCount - 1 : i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                commitActive();
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
        // See the anchorRef comment above: the interaction that focuses/opens this popup
        // must not also register as the interaction that closes it — covers both the
        // opening mousedown and focus simply remaining on the (deliberately unfocused-into)
        // input.
        onPointerDownOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
        onFocusOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
        className="w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto rounded-lg p-1"
      >
        {/* id/role wiring matches the input's aria-controls/aria-activedescendant above —
            arrow keys move `activeIndex` without moving DOM focus off the text box, so a
            screen reader announces the active row via aria-activedescendant instead of a
            real focus change. */}
        <div id={listboxId} role="listbox">
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">{emptyText}</p>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={opt}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                type="button"
                onClick={() => commit(opt)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "relative flex w-full min-w-0 cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-accent focus:bg-accent",
                  i === activeIndex && "bg-accent"
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {opt.toLowerCase() === trimmed.toLowerCase() && <Check className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{opt}</span>
              </button>
            ))
          )}
          {showAddRow && (
            <button
              id={`${listboxId}-opt-${filtered.length}`}
              role="option"
              aria-selected={activeIndex === filtered.length}
              type="button"
              onClick={() => commit(trimmed)}
              onMouseEnter={() => setActiveIndex(filtered.length)}
              className={cn(
                "mt-1 flex w-full items-center gap-1.5 rounded-md border-t border-border px-2 py-1.5 text-left text-sm font-medium text-primary outline-none hover:bg-accent focus:bg-accent",
                activeIndex === filtered.length && "bg-accent"
              )}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Add "{trimmed}"</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
