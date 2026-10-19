import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Building2, ChevronDown, ChevronRight, Crown, Eye, EyeOff, LayoutDashboard, ListTree, Loader2, LogOut, Settings2, ShieldCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { clearPlatformSession, platformRequest, PLATFORM_EMAIL_KEY, PLATFORM_SESSION_EVENT, PLATFORM_TOKEN_KEY } from "@/api/platform";

const SessionContext = createContext<{ token: string; email: string } | null>(null);
export function usePlatformAdmin() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Tenant administration requires a platform session.");
  return session;
}

const navigation = [
  { to: "/platform/tenants", label: "Tenant management", icon: Building2, hint: "Create and manage client workspaces" },
  { to: "/platform/menus", label: "Menu management", icon: ListTree, hint: "Shape each client's navigation" },
  { to: "/platform/configuration", label: "Tenant configuration", icon: Settings2, hint: "Branding, integrations and settings" },
];

/** Brand navy (hue 214, the app's primary) with sky tints, used by the whole operator console. */
const NAVY = "bg-[hsl(214_52%_20%)]";
const BRAND_MARK = "bg-gradient-to-br from-sky-200 via-sky-300 to-sky-500 text-[hsl(214_52%_20%)]";

function BrandMark({ size = "h-10 w-10" }: { size?: string }) {
  return <span className={`flex ${size} items-center justify-center rounded-xl shadow-lg shadow-black/30 ${BRAND_MARK}`}><Crown className="h-5 w-5" /></span>;
}

export default function PlatformShell({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(PLATFORM_TOKEN_KEY) ?? "");
  const [email, setEmail] = useState(() => sessionStorage.getItem(PLATFORM_EMAIL_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const title = location.pathname.startsWith("/platform/email-mappings")
    ? "Login mappings"
    : navigation.find(item => location.pathname.startsWith(item.to))?.label ?? "Tenant administration";
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
  const field = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5 dark:text-white";
  return <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-background dark:text-foreground">
    <header className={`sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/10 ${NAVY} bg-gradient-to-r from-[hsl(214_52%_20%)] via-[hsl(214_52%_28%)] to-[hsl(214_52%_20%)] px-5 text-white shadow-lg shadow-slate-900/20 sm:px-8`}>
      <Link to="/platform/tenants" className="flex items-center gap-3">
        <BrandMark />
        <span><span className="block font-serif text-lg font-semibold leading-tight tracking-wide">Meet to Manage</span><span className="block text-[10px] font-medium uppercase tracking-[0.25em] text-sky-300">Tenant administration</span></span>
      </Link>
      {token ? <DropdownMenu><DropdownMenuTrigger asChild>
        <button aria-label="Tenant Admin profile menu" className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${BRAND_MARK}`}>TA</span>
          <span className="hidden text-left sm:block"><span className="block text-sm font-semibold leading-tight">Tenant Admin</span><span className="block max-w-[180px] truncate text-xs text-white/60">{email}</span></span>
          <ChevronDown className="h-4 w-4 text-white/60" />
        </button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel>Tenant Admin profile</DropdownMenuLabel><DropdownMenuSeparator />
          {navigation.map(item => <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)}><item.icon className="h-4 w-4" />{item.label}</DropdownMenuItem>)}
          <DropdownMenuSeparator /><DropdownMenuItem onClick={clearPlatformSession}><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu>
        : <Link to="/login" className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">Client login</Link>}
    </header>

    {!token ? <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.1fr_1fr]">
      <section className={`relative hidden overflow-hidden ${NAVY} p-14 text-white lg:flex lg:flex-col lg:justify-between`}>
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-sky-200"><ShieldCheck className="h-3.5 w-3.5" />Tenant Admin workspace</span>
          <h1 className="mt-8 font-serif text-5xl font-semibold leading-[1.1] tracking-tight">One place to manage<span className="block text-sky-300">every tenant.</span></h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/70">Create client workspaces, shape their menus, and configure each tenant from a single, secure administration console.</p>
        </div>
        <ul className="relative space-y-5">
          {navigation.map(item => <li key={item.to} className="flex items-start gap-4"><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-sky-300"><item.icon className="h-5 w-5" /></span><span><span className="block text-sm font-semibold">{item.label}</span><span className="block text-sm text-white/60">{item.hint}</span></span></li>)}
        </ul>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <form onSubmit={login} className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-card">
          <div className="space-y-3">
            <BrandMark size="h-12 w-12" />
            <div><h2 className="font-serif text-2xl font-semibold tracking-tight">Platform administrator sign in</h2><p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Use your Tenant Admin credentials to continue. This is separate from any client login.</p></div>
          </div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="space-y-2"><label htmlFor="platform-email" className="text-sm font-medium">Email</label>
            <input id="platform-email" type="email" required autoComplete="username" placeholder="you@company.com" className={field} value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><label htmlFor="platform-password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input id="platform-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" placeholder="Enter your password" className={`${field} pr-12`} value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide the typed characters" : "Reveal the typed characters"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div></div>
          <button disabled={busy} className={`flex w-full items-center justify-center gap-2 rounded-xl ${NAVY} px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[hsl(214_52%_20%)]/30 ring-1 ring-white/15 transition hover:bg-[hsl(214_52%_28%)] disabled:opacity-60`}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : "Sign in"}</button>
          <p className="text-center text-xs text-slate-500">Looking for your own workspace? <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline dark:text-sky-300">Client login</Link></p>
        </form>
      </section>
    </div>
    : <SessionContext.Provider value={{ token, email }}><div className="mx-auto grid max-w-[1600px] gap-6 p-4 sm:p-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-card lg:sticky lg:top-24">
        <div className="flex items-center gap-2 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"><LayoutDashboard className="h-4 w-4 text-primary" />Administration</div>
        <nav className="flex flex-wrap gap-1 lg:block lg:space-y-1">{navigation.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 rounded-xl border-l-4 px-3 py-3 text-sm font-medium transition ${isActive ? `border-sky-300 ${NAVY} text-white shadow-md` : "border-transparent text-slate-600 hover:bg-slate-100 dark:text-muted-foreground dark:hover:bg-white/5"}`}><item.icon className="h-4 w-4" />{item.label}</NavLink>)}</nav>
        <p className="m-3 hidden border-t pt-4 text-xs leading-relaxed text-slate-500 lg:block">Changes apply to the tenant you select. Each client keeps its own workspace and configuration.</p>
      </aside>
      <main className="min-w-0 space-y-6"><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Tenant Admin<ChevronRight className="h-3.5 w-3.5" /><span className="font-medium text-slate-700 dark:text-foreground">{title}</span></div>{children}</main>
    </div></SessionContext.Provider>}
  </div>;
}
