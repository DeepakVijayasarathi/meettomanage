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
          <button onClick={onClose} className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-white/10 lg:hidden">
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
                <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/40">{section.title}</p>
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
                          ? "bg-sidebar-accent text-white shadow-soft"
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
