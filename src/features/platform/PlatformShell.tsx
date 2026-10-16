import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Building2, ChevronDown, ChevronRight, LayoutDashboard, ListTree, LogOut, Settings2, ShieldCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { clearPlatformSession, platformRequest, PLATFORM_EMAIL_KEY, PLATFORM_SESSION_EVENT, PLATFORM_TOKEN_KEY } from "@/api/platform";

const SessionContext = createContext<{ token: string; email: string } | null>(null);
export function usePlatformAdmin() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Tenant administration requires a platform session.");
  return session;
}

const navigation = [
  { to: "/platform/tenants", label: "Tenant management", icon: Building2 },
  { to: "/platform/menus", label: "Menu management", icon: ListTree },
  { to: "/platform/configuration", label: "Tenant configuration", icon: Settings2 },
];

export default function PlatformShell({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(PLATFORM_TOKEN_KEY) ?? "");
  const [email, setEmail] = useState(() => sessionStorage.getItem(PLATFORM_EMAIL_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const title = navigation.find(item => location.pathname.startsWith(item.to))?.label ?? "Tenant administration";
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
  return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-background dark:text-foreground">
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b bg-background px-5 sm:px-8">
      <Link to="/platform/tenants" className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-primary"><ShieldCheck className="h-6 w-6" /></span><span><span className="block text-lg font-semibold tracking-tight">Meet to Manage</span><span className="block text-xs text-muted-foreground">Tenant administration</span></span></Link>
      {token ? <DropdownMenu><DropdownMenuTrigger asChild><button aria-label="Tenant Admin profile menu" className="flex items-center gap-3 rounded-xl border px-3 py-2 hover:bg-muted"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700">TA</span><span className="hidden text-left sm:block"><span className="block text-sm font-semibold">Tenant Admin</span><span className="block max-w-48 truncate text-xs text-muted-foreground">{email || "Platform administrator"}</span></span><ChevronDown className="h-4 w-4" /></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel>Tenant Admin profile</DropdownMenuLabel><DropdownMenuSeparator />
          {navigation.map(item => <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)}><item.icon className="h-4 w-4" />{item.label}</DropdownMenuItem>)}
          <DropdownMenuSeparator /><DropdownMenuItem onClick={clearPlatformSession}><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu> : <Link to="/login" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Client login</Link>}
    </header>
    {!token ? <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
      <div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">Tenant Admin workspace</span><h1 className="mt-5 text-4xl font-semibold tracking-tight">One place to manage every tenant.</h1><p className="mt-4 leading-relaxed text-muted-foreground">Create client workspaces, organize their menus, and configure each tenant from a dedicated administration console.</p><div className="mt-7 space-y-4">{navigation.map(item => <div key={item.to} className="flex items-center gap-3 text-sm"><item.icon className="h-5 w-5 text-blue-600" />{item.label}</div>)}</div></div>
      <form onSubmit={login} className="space-y-5 rounded-2xl border bg-background p-7 shadow-sm"><div><h2 className="text-xl font-semibold">Platform administrator sign in</h2><p className="mt-1 text-sm text-muted-foreground">Use your Tenant Admin credentials to continue.</p></div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <label className="block space-y-2 text-sm font-medium"><span>Email</span><input type="email" required autoComplete="username" className="w-full rounded-lg border bg-background px-3 py-2.5" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block space-y-2 text-sm font-medium"><span>Password</span><input type="password" required autoComplete="current-password" className="w-full rounded-lg border bg-background px-3 py-2.5" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button disabled={busy} className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-primary">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div> : <SessionContext.Provider value={{ token, email }}><div className="mx-auto grid max-w-[1600px] gap-6 p-4 sm:p-6 lg:grid-cols-[235px_minmax(0,1fr)]">
      <aside className="self-start rounded-2xl border bg-background p-3 lg:sticky lg:top-24"><div className="flex items-center gap-2 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><LayoutDashboard className="h-4 w-4" />Administration</div><nav className="flex flex-wrap gap-1 lg:block lg:space-y-1">{navigation.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${isActive ? "bg-slate-950 text-white dark:bg-primary" : "text-muted-foreground hover:bg-muted"}`}><item.icon className="h-4 w-4" />{item.label}</NavLink>)}</nav><p className="m-3 hidden border-t pt-4 text-xs leading-relaxed text-muted-foreground lg:block">Changes apply to the tenant you select. Each client keeps its own workspace and configuration.</p></aside>
      <main className="min-w-0 space-y-6"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Tenant Admin<ChevronRight className="h-3.5 w-3.5" />{title}</div>{children}</main>
    </div></SessionContext.Provider>}
  </div>;
}
