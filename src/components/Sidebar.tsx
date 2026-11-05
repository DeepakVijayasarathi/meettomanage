import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/commandPalette";
import type { NavSection } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sections: NavSection[];
  roleLabel: string;
  roleHex: string;
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Quiet, light navigation rail: monochrome icons, compact rows, and the portal's role colour only on the
 * active item, so the page content stays the focus.
 */
export function Sidebar({ sections, roleLabel, roleHex, mobileOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // onClose is an inline arrow from AppShell (new identity every render), so it's read
  // through a ref — keeping it in the effect's deps would re-run the effect on every
  // render and keep yanking focus back to the close button while the drawer is open.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // The mobile drawer is a modal overlay but a plain <aside>, so Escape and focus are handled here.
  useEffect(() => {
    if (!mobileOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [mobileOpen]);

  const openSearch = () => {
    onClose();
    window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
  };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[68px]" : "lg:w-64"
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-sidebar-border px-4", collapsed ? "justify-center" : "justify-between")}>
          <span className="dark:hidden"><Logo variant="dark" showWordmark={!collapsed} /></span>
          <span className="hidden dark:inline-flex"><Logo variant="light" showWordmark={!collapsed} /></span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={cn("flex flex-col gap-2 px-3 pt-3", collapsed && "items-center")}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                style={{ backgroundColor: roleHex }}
                aria-hidden
              >
                {roleLabel.charAt(0)}
              </span>
              <span className="truncate text-[13px] font-semibold text-foreground">{roleLabel}</span>
            </div>
          )}
          <button
            onClick={openSearch}
            title={collapsed ? "Search (Ctrl K)" : undefined}
            aria-label="Search pages and actions"
            className={cn(
              "flex items-center gap-2 rounded-lg border border-sidebar-border bg-background text-[13px] text-muted-foreground transition-colors hover:border-input hover:text-foreground",
              collapsed ? "h-9 w-9 justify-center" : "h-9 px-2.5"
            )}
          >
            <Search className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search…</span>
                <kbd className="rounded border border-sidebar-border bg-muted px-1.5 font-sans text-[10px] font-medium">{isMac ? "⌘K" : "Ctrl K"}</kbd>
              </>
            )}
          </button>
        </div>

        <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-6" aria-label="Main">
          {sections.map((section, idx) => (
            <div key={idx} className="mb-4">
              {section.title && !collapsed && (
                <p className="mb-1 px-2 text-[11px] font-medium text-muted-foreground/80">{section.title}</p>
              )}
              {section.title && collapsed && idx > 0 && <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />}
              <div className={cn("flex flex-col gap-px", collapsed && "items-center")}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    data-tour={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    title={collapsed ? (item.badge ? `${item.label} (${item.badge})` : item.label) : undefined}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center rounded-md text-[13px] font-medium transition-colors",
                        collapsed ? "h-9 w-9 shrink-0 justify-center" : "h-8 justify-between gap-2 px-2",
                        isActive
                          ? "bg-sidebar-accent text-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !collapsed && (
                          <span className="absolute -left-3 top-1.5 h-5 w-[3px] rounded-r-full" style={{ backgroundColor: roleHex }} aria-hidden />
                        )}
                        <span className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
                          <item.icon
                            className={cn("h-4 w-4 shrink-0", !isActive && "text-muted-foreground group-hover:text-foreground")}
                            style={isActive ? { color: roleHex } : undefined}
                          />
                          {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                        </span>
                        {item.badge && !collapsed && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                            {item.badge}
                          </span>
                        )}
                        {item.badge && collapsed && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-pink" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "mb-3 hidden items-center gap-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:flex",
            collapsed ? "mx-auto h-9 w-9 justify-center" : "mx-3 justify-start px-2 py-2"
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
          {!collapsed && "Collapse"}
        </button>
      </aside>
    </>
  );
}
