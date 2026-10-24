import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  AtSign, BellRing, Building2, ChevronDown, Eye, EyeOff, Gauge, Layers, ListTree, Loader2, LogOut, Receipt, Settings2, ShieldCheck, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { clearPlatformSession, platformRequest, PLATFORM_EMAIL_KEY, PLATFORM_SESSION_EVENT, PLATFORM_TOKEN_KEY } from "@/api/platform";

const SessionContext = createContext<{ token: string; email: string } | null>(null);
export function usePlatformAdmin() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Tenant administration requires a platform session.");
  return session;
}

type NavItem = { to: string; label: string; icon: LucideIcon; hint: string };
const groups: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspaces",
    items: [
      { to: "/platform/tenants", label: "Tenant management", icon: Building2, hint: "Create and manage client workspaces" },
      { to: "/platform/menus", label: "Menu management", icon: ListTree, hint: "Shape each client's navigation" },
      { to: "/platform/configuration", label: "Tenant configuration", icon: Settings2, hint: "Branding, integrations and settings" },
      { to: "/platform/email-mappings", label: "Simple SSO", icon: AtSign, hint: "One sign-in page for every client" },
      { to: "/platform/operations", label: "Tenant operations", icon: Gauge, hint: "Health, usage, onboarding and recovery" },
    ],
  },
  {
    title: "Billing",
    items: [
      { to: "/platform/plans", label: "Plans", icon: Layers, hint: "Prices, limits and features" },
      { to: "/platform/subscriptions", label: "Subscriptions & invoices", icon: Receipt, hint: "Trials, renewals and payments" },
      { to: "/platform/revenue", label: "Revenue", icon: TrendingUp, hint: "MRR, churn and collections" },
      { to: "/platform/reminders", label: "Auto-reminders", icon: BellRing, hint: "Billing e-mails and delivery log" },
    ],
  },
];
const allItems = groups.flatMap(g => g.items);

/** Keeps the console on its light "Atelier" theme (index.css) for as long as it is mounted. */
function useConsoleTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("console-light");
    // The console's typeface is fetched only when a Tenant Admin page opens; no other page downloads or uses it.
    if (!document.getElementById("console-font")) {
      const link = document.createElement("link");
      link.id = "console-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(link);
    }
    return () => root.classList.remove("console-light");
  }, []);
}

function BrandMark({ size = "h-10 w-10" }: { size?: string }) {
  return <span className={`flex ${size} items-center justify-center rounded-xl border border-border bg-card shadow-sm`}><img src="/logo-icon.png" alt="" className="h-[70%] w-[70%] object-contain" /></span>;
}

const field = "w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15";

export default function PlatformShell({ children }: { children: ReactNode }) {
  useConsoleTheme();
  const [token, setToken] = useState(() => sessionStorage.getItem(PLATFORM_TOKEN_KEY) ?? "");
  const [email, setEmail] = useState(() => sessionStorage.getItem(PLATFORM_EMAIL_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    const update = () => { setToken(sessionStorage.getItem(PLATFORM_TOKEN_KEY) ?? ""); setEmail(sessionStorage.getItem(PLATFORM_EMAIL_KEY) ?? ""); };
    window.addEventListener(PLATFORM_SESSION_EVENT, update);
    return () => window.removeEventListener(PLATFORM_SESSION_EVENT, update);
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await platformRequest<{ accessToken: string }>("/login", "", "POST", { email, password });
      sessionStorage.setItem(PLATFORM_TOKEN_KEY, result.accessToken);
      sessionStorage.setItem(PLATFORM_EMAIL_KEY, email);
      setToken(result.accessToken); setPassword("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  if (!token) return <div className="min-h-screen bg-background text-foreground">
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-secondary/60 p-14 lg:flex">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-[hsl(var(--console-brass)/0.10)] blur-3xl" />
        <div className="relative flex items-center gap-3"><BrandMark /><div><p className="console-heading text-lg font-semibold leading-tight">Meet to Manage</p><p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Platform administration</p></div></div>
        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Tenant Admin workspace</span>
          <h1 className="console-heading mt-7 text-5xl font-semibold leading-[1.08]">One calm place to run every client.</h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">Create workspaces, shape their branding and menus, set plans and keep billing on track, all from a single, secure console.</p>
        </div>
        <ul className="relative grid max-w-md gap-4">
          {allItems.slice(0, 4).map(item => <li key={item.to} className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><item.icon className="h-4 w-4" /></span><span><span className="block text-sm font-semibold">{item.label}</span><span className="block text-sm text-muted-foreground">{item.hint}</span></span></li>)}
        </ul>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <form onSubmit={login} className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-[0_20px_60px_-30px_rgba(31,58,95,0.35)]">
          <div className="space-y-3">
            <BrandMark size="h-12 w-12" />
            <div><h2 className="console-heading text-2xl font-semibold">Platform administrator sign in</h2><p className="mt-1.5 text-sm text-muted-foreground">Use your Tenant Admin credentials to continue. This is separate from any client login.</p></div>
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="space-y-2"><label htmlFor="platform-email" className="text-sm font-medium">Email</label>
            <input id="platform-email" type="email" required autoComplete="username" placeholder="you@company.com" className={field} value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><label htmlFor="platform-password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input id="platform-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" placeholder="Enter your password" className={`${field} pr-12`} value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide the typed characters" : "Reveal the typed characters"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div></div>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : "Sign in"}</button>
          <p className="text-center text-xs text-muted-foreground">Looking for your own workspace? <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">Client login</Link></p>
        </form>
      </section>
    </div>
  </div>;

  const initials = (email.split("@")[0] || "TA").slice(0, 2).toUpperCase();
  return <SessionContext.Provider value={{ token, email }}>
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/platform/tenants" className="flex items-center gap-3">
            <BrandMark size="h-9 w-9" />
            <span><span className="console-heading block text-[17px] font-semibold leading-tight">Meet to Manage</span><span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Platform administration</span></span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="Tenant Admin profile menu" className="flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initials}</span>
                <span className="hidden text-left sm:block"><span className="block text-sm font-semibold leading-tight">Tenant Admin</span><span className="block max-w-[190px] truncate text-xs text-muted-foreground">{email}</span></span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Tenant Admin profile</DropdownMenuLabel><DropdownMenuSeparator />
              {allItems.map(item => <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)}><item.icon className="h-4 w-4" />{item.label}</DropdownMenuItem>)}
              <DropdownMenuSeparator /><DropdownMenuItem onClick={clearPlatformSession}><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Administration" className="space-y-6">
            {groups.map(group => <div key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{group.title}</p>
              <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5 lg:overflow-visible">
                {group.items.map(item => <li key={item.to} className="shrink-0">
                  <NavLink to={item.to} className={({ isActive }) => `group relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-primary/[0.07] text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                    {({ isActive }) => <>
                      {isActive && <span className="absolute inset-y-2 left-0 hidden w-[3px] rounded-full bg-[hsl(var(--console-brass))] lg:block" />}
                      <item.icon className={`h-[17px] w-[17px] ${isActive ? "text-primary" : ""}`} />{item.label}
                    </>}
                  </NavLink>
                </li>)}
              </ul>
            </div>)}
          </nav>
          <p className="mt-8 hidden border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground lg:block">Changes apply to the client you select. Each client keeps its own workspace and configuration.</p>
        </aside>
        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  </SessionContext.Provider>;
}
