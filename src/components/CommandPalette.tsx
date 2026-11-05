import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, CornerDownLeft, LogOut, Moon, Search, Sun } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { START_TOUR_EVENT } from "@/components/AppTour";
import type { NavSection } from "@/lib/nav";
import { useTheme } from "@/lib/theme";
import { useSession } from "@/state/session";
import { cn } from "@/lib/utils";
import { matchScore, OPEN_COMMAND_PALETTE_EVENT } from "@/lib/commandPalette";

interface Command {
  id: string;
  label: string;
  group: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
}

/** Ctrl/⌘ K: jump to any page in the portal or run a quick action, keyboard only. */
export function CommandPalette({ sections }: { sections: NavSection[] }) {
  const navigate = useNavigate();
  const { logout } = useSession();
  const { isDark, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const pages = sections.flatMap((section) =>
      section.items.map((item) => ({
        id: `page:${item.to}`,
        label: item.label,
        group: "Pages",
        hint: section.title ?? undefined,
        icon: item.icon,
        run: () => navigate(item.to),
      }))
    );
    const actions: Command[] = [
      { id: "action:theme", label: isDark ? "Switch to light mode" : "Switch to dark mode", group: "Actions", icon: isDark ? Sun : Moon, run: () => setTheme(isDark ? "light" : "dark") },
      { id: "action:tour", label: "Start product tour", group: "Actions", icon: Compass, run: () => window.dispatchEvent(new Event(START_TOUR_EVENT)) },
      { id: "action:logout", label: "Log out", group: "Actions", icon: LogOut, run: () => { logout(); navigate("/login"); } },
    ];
    return [...pages, ...actions];
  }, [sections, isDark, setTheme, navigate, logout]);

  const results = useMemo(() => {
    if (!query.trim()) return commands;
    const scored = commands
      .map((c) => ({ c, score: Math.max(matchScore(c.label, query), matchScore(c.hint ?? "", query) * 0.5) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    // Loose letter matches are a fallback: shown only when nothing matches more directly.
    const strong = scored.filter((x) => x.score >= 50);
    return (strong.length ? strong : scored).map((x) => x.c);
  }, [commands, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    setOpen(false);
    command.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    }
  };

  let lastGroup = "";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Search pages and actions</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions…"
            aria-label="Search pages and actions"
            role="combobox"
            aria-expanded
            aria-controls="command-results"
            aria-activedescendant={results[active] ? `command-${results[active].id}` : undefined}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">Esc</kbd>
        </div>
        <div ref={listRef} id="command-results" role="listbox" className="max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches “{query}”.</p>}
          {results.map((command, index) => {
            const header = command.group !== lastGroup ? command.group : null;
            lastGroup = command.group;
            const Icon = command.icon;
            return (
              <div key={command.id}>
                {header && <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">{header}</p>}
                <div
                  id={`command-${command.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(command)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm",
                    index === active ? "bg-accent text-foreground" : "text-foreground/80"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{command.label}</span>
                  {command.hint && <span className="truncate text-xs text-muted-foreground">{command.hint}</span>}
                  {index === active && (command.group === "Pages" ? <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /> : <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <span><kbd className="font-sans">↑↓</kbd> to move</span>
          <span><kbd className="font-sans">Enter</kbd> to open</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
