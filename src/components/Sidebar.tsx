import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { Logo } from "@/components/Logo";
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

export function Sidebar({ sections, roleLabel, roleHex, mobileOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // onClose is an inline arrow from AppShell (new identity every render), so it's read
  // through a ref — keeping it in the effect's deps would re-run the effect on every
  // render and keep yanking focus back to the close button while the drawer is open.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // The mobile drawer is a modal overlay, but it's a plain <aside> rather than a Radix
  // Dialog, so it had none of the modal behaviour: Escape did nothing, and focus stayed
  // on the hamburger behind the overlay — tabbing walked the covered page underneath and
  // never reached a single nav link. Handle it here instead of converting the whole
  // sidebar to a Dialog, which would also change the always-on desktop rail.
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

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[76px]" : "lg:w-72"
        )}
      >
        <div className={cn("flex items-center px-5 py-5", collapsed ? "justify-center" : "justify-between")}>
          <Logo variant="light" showWordmark={!collapsed} />
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!collapsed && (
          <div className="mx-4 mb-1 flex items-center gap-2 rounded-lg border border-sidebar-border bg-white/5 px-3 py-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: roleHex }} />
            <span className="truncate text-xs font-semibold text-sidebar-foreground/80">{roleLabel}</span>
          </div>
        )}

        <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-6">
          {sections.map((section, idx) => (
            <div key={idx} className="mb-4">
              {section.title && !collapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/60">{section.title}</p>
              )}
              <div className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center rounded-lg text-sm font-medium transition-colors",
                        collapsed ? "h-11 w-11 shrink-0 justify-center" : "justify-between gap-2.5 px-3 py-2",
                        isActive
                          ? // text-primary-foreground (not a hardcoded text-white) — AppShell already
                            // computes this per-role via pickAccentForegroundHsl so light-accent roles
                            // (teacher's orange, subadmin/coordinator's teal, parent's green) get readable
                            // dark text here instead of white text that fails WCAG AA against their hex.
                            "bg-sidebar-accent text-primary-foreground shadow-soft"
                          : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
                      )
                    }
                    style={({ isActive }) => (isActive ? { backgroundColor: roleHex } : undefined)}
                  >
                    <span className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </span>
                    {item.badge && !collapsed && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/15 px-1 text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                    {item.badge && collapsed && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-pink" />
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
            "mb-3 hidden items-center gap-2 rounded-lg text-xs font-semibold text-sidebar-foreground/60 transition-colors hover:bg-white/5 hover:text-sidebar-foreground lg:flex",
            collapsed ? "mx-auto h-11 w-11 justify-center" : "mx-3 justify-start px-3 py-2"
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
          {!collapsed && "Collapse"}
        </button>
      </aside>
    </>
  );
}
