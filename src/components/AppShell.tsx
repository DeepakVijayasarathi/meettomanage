import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { FloatingNotes } from "@/components/FloatingNotes";
import { PageTransition } from "@/components/PageTransition";
import { NAV_BY_ROLE, type NavSection } from "@/lib/nav";
import { ROLE_META } from "@/lib/roles";
import { useSession } from "@/state/session";
import { hexToHslTriple, pickAccentForegroundHsl } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { getMyMenu, toNavSections } from "@/api/menus";
import { listSuspensions } from "@/api/billing";
import type { Role } from "@/types";

interface AppShellProps {
  role: Role;
  children: ReactNode;
}

const COLLAPSE_KEY = "trn.sidebarCollapsed";

// Coordinator/Admission/Management aren't separate backend roles — they're display
// portals a Sub Admin's assigned preset (RoleDefinition.DefaultRoute) routes to. The
// account's real, login-issued role is always "subadmin". See the role-sync effect below.
const SUBADMIN_PRESET_PORTALS: Role[] = ["coordinator", "admission", "management"];

export function AppShell({ role, children }: AppShellProps) {
  const { setRole } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  const meta = ROLE_META[role];

  // DB-maintained, role-permission-filtered sidebar: /api/menus/mine returns the
  // signed-in user's portal items minus any their assigned role can't view. The
  // static NAV_BY_ROLE stays as the demo-mode / loading / error fallback.
  //
  // MenuItem rows are static (no live count column), so a nav badge like Fee
  // Suspension's "accounts needing attention" number — a static "2" in the demo
  // mock — has to be patched on after the fact. Fetched alongside the menu itself
  // (not a separate effect keyed off apiSections) so patching it can never retrigger
  // its own effect and loop.
  const [apiSections, setApiSections] = useState<NavSection[] | null>(null);
  useEffect(() => {
    setApiSections(null);
    if (!apiEnabled()) return;
    let cancelled = false;
    Promise.all([getMyMenu(), role === "admin" ? listSuspensions("Active") : Promise.resolve(null)])
      .then(([items, activeSuspensions]) => {
        if (cancelled || items.length === 0) return;
        const sections = toNavSections(items);
        if (activeSuspensions && activeSuspensions.length > 0) {
          for (const section of sections) {
            for (const item of section.items) {
              if (item.to === "/admin/fee-suspension") item.badge = String(activeSuspensions.length);
            }
          }
        }
        setApiSections(sections);
      })
      .catch(() => {
        /* keep static nav */
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    // The Student View reuses AppShell purely for its themed "preview" shell —
    // there is no separate Student login, the signed-in account is always a
    // Parent. Syncing role here would overwrite the real session role and break
    // anything gated on it (e.g. the parent's-children fetch in SessionProvider).
    //
    // Same reasoning for the three Sub Admin preset portals: Login already wrote the
    // correct, real "subadmin" role from the backend before ever navigating here, and
    // RequireAuth separately admits a subadmin into e.g. /coordinator via homePath's
    // portal, not session.role. Overwriting it to "coordinator"/"admission"/"management"
    // here used to permanently strand these accounts — their own genuinely subadmin-
    // scoped screens (My Permissions, Integrations, Audit Log) gate on role="subadmin"
    // and nothing ever wrote that value back for the rest of the session.
    if (role === "student" || SUBADMIN_PRESET_PORTALS.includes(role)) return;
    setRole(role);
  }, [role, setRole]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const accentStyle: CSSProperties = {
    "--primary": hexToHslTriple(meta.hex),
    "--ring": hexToHslTriple(meta.hex),
    // Not every role's accent color reaches 4.5:1 against hardcoded white button text
    // (teacher's orange was 2.51:1) — pick whichever of white/dark-navy actually works.
    "--primary-foreground": pickAccentForegroundHsl(meta.hex),
  } as CSSProperties;

  return (
    <div className="flex min-h-dvh bg-background" style={accentStyle}>
      {/* Visually hidden until focused — first tab stop on every page, so a keyboard user
          doesn't have to tab through the entire sidebar (10-20+ links) on every navigation
          just to reach the page content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <Sidebar
        sections={apiSections ?? NAV_BY_ROLE[role]}
        roleLabel={meta.label}
        roleHex={meta.hex}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} title={meta.label} />
        {/* Reserves clearance below the last row of content so the fixed FloatingNotes button
            never sits on top of — and steals clicks from — bottom-right page chrome like
            DataTable's pagination controls. FloatingNotes' own footprint is bottom-20 + 48px
            tall = 128px on mobile, bottom-6 + 48px = 72px from sm: up; padding here sits well
            past both (176px / 112px) rather than the tightest value that clears the math —
            mobile browsers resize the *visual* viewport as their address bar shows/hides, and
            min-h-dvh below (not min-h-screen/100vh) tracks that on the shell itself, but this
            padding keeps deliberate slack on top of that for the same reason. */}
        {/* tabIndex={-1}: without it the browser scrolls the skip link's target into view
            but doesn't move keyboard focus there (falls back to <body>) — confirmed by
            actually pressing Tab then Enter on the skip link and checking
            document.activeElement. -1 keeps it out of the normal tab order (only reachable
            via the skip link itself) while still being a valid focus target. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="app-content-glow min-w-0 flex-1 overflow-x-hidden px-4 pb-44 pt-6 sm:px-6 sm:pb-28 lg:px-8 focus:outline-none"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <FloatingNotes role={role} />
    </div>
  );
}
