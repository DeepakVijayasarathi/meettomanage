import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { NAV_BY_ROLE } from "@/lib/nav";
import { ROLE_META } from "@/lib/roles";
import { useSession } from "@/state/session";
import { hexToHslTriple } from "@/lib/utils";
import type { Role } from "@/types";

interface AppShellProps {
  role: Role;
  children: ReactNode;
}

const COLLAPSE_KEY = "trn.sidebarCollapsed";

export function AppShell({ role, children }: AppShellProps) {
  const { setRole } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  const meta = ROLE_META[role];

  useEffect(() => {
    setRole(role);
  }, [role, setRole]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const accentStyle: CSSProperties = {
    "--primary": hexToHslTriple(meta.hex),
    "--ring": hexToHslTriple(meta.hex),
  } as CSSProperties;

  return (
    <div className="flex min-h-screen bg-background" style={accentStyle}>
      <Sidebar
        sections={NAV_BY_ROLE[role]}
        roleLabel={meta.label}
        roleHex={meta.hex}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} title={meta.label} />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
