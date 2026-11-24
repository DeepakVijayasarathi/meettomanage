import { Component, type ErrorInfo, type CSSProperties, type ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, LogOut, Menu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { MarketingLogo } from "@/features/marketing/MarketingLogo";
import { NAV_BY_ROLE } from "@/lib/nav";
import { ROLE_META } from "@/lib/roles";
import { accentForDarkMode, hexToHslTriple } from "@/lib/utils";
import { useSession } from "@/state/session";

/** Error boundary for marketing console routes — shows the actual error message so we can debug crashes. */
class MarketingConsoleErrorBoundary extends Component<{ children: ReactNode }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[MarketingConsole error boundary]", error, info.componentStack); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
            <h2 className="mb-2 text-lg font-semibold">Marketing Console Error</h2>
            <p className="mb-3 text-sm text-muted-foreground">{this.state.error.message}</p>
            <pre className="mb-4 overflow-auto rounded-lg bg-destructive/10 p-3 text-left text-xs text-destructive/80">{this.state.error.stack}</pre>
            <p className="text-xs text-muted-foreground">URL: {window.location.href}</p>
            <Button onClick={() => window.location.reload()} className="mt-3"><RefreshCw className="mr-2 h-4 w-4" />Reload page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Layout for the marketing console (/marketing). Deliberately not AppShell: that shell carries
 * academy features (DB-driven menus, notes, the doubt chatbot, timezone checks) whose APIs a
 * Marketing account is refused, and this console has nothing to do with running the academy.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  const { userName, logout } = useSession();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const meta = ROLE_META.marketing;

  const accentStyle = {
    "--primary": hexToHslTriple(meta.hex),
    "--ring": hexToHslTriple(meta.hex),
    "--primary-foreground": "0 0% 100%",
    "--primary-on-dark": hexToHslTriple(accentForDarkMode(meta.hex)),
  } as CSSProperties;

  return (
    <div className="portal-accent flex min-h-dvh bg-background" style={accentStyle}>
      <Helmet>
        <title>Marketing Console — Meet to Manage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Sidebar
        renderLogo={isCollapsed => (
          <MarketingLogo
            className={isCollapsed ? "h-9 w-9 object-contain" : "h-10 w-auto max-w-[9rem] object-contain"}
            showName={!isCollapsed}
            fallbackClassName="text-sidebar-foreground"
          />
        )}
        sections={NAV_BY_ROLE.marketing}
        roleLabel={meta.label}
        roleHex={meta.hex}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{meta.label}</p>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">{userName}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logout();
              navigate("/marketing/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </header>
        <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <MarketingConsoleErrorBoundary>{children}</MarketingConsoleErrorBoundary>
        </main>
      </div>
    </div>
  );
}
