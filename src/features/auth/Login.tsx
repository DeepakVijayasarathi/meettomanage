import { useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate, Navigate, Link } from "react-router-dom";
import { ArrowRight, Clock, Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ROLE_META } from "@/lib/roles";
import { useSession } from "@/state/session";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { apiEnabled, getAccessToken, setAccessToken, userMessage } from "@/lib/api";
import { getRemember, setRemember } from "@/lib/authStorage";
import { login } from "@/api/auth";
import { toFrontendRole } from "@/api/types";
import { cn, safeInternalPath } from "@/lib/utils";
import { isTenantPortal, takeDiscoveredEmail } from "@/lib/tenantDiscovery";
import { setSessionTenant } from "@/lib/tenantPath";
import { trackMarketingEvent } from "@/lib/analytics";
import type { Role } from "@/types";


// The role picker above the form: it fills in that role's demo account, so a visitor can try the platform in one click.
const ROLE_TABS: { role: Role; label: string }[] = [
  { role: "admin", label: "Admin" },
  { role: "teacher", label: "Teacher" },
  { role: "parent", label: "Parent" },
  { role: "subadmin", label: "Staff" },
];

/** Short names for the demo list, so none truncate in a two-column grid. */
const DEMO_LABEL: Partial<Record<Role, string>> = { subadmin: "Staff" };

const PIN_LENGTH = 4;
// Scoped to this page only (not the global `font-display` mapping, which stays Inter
// everywhere else) — a warmer, rounder headline face for the two big greeting moments.

interface DemoAccount {
  role: Role;
  email: string;
  pin: string;
  /** Overrides the backend's own `defaultRoute` for this entry. Used only for
   *  "student": there's no separate Student account on the backend (students are
   *  UserRole.Parent's children, not their own login — see UserRole.cs) so this entry
   *  signs in with the Parent account's own credentials and jumps straight to
   *  /student, a route RequireAuth already allows for role "parent". */
  homePathOverride?: string;
}

// One real login per portal role — actual accounts created in the production
// database via Admin → Users, so this list works on the live, API-backed login page,
// not just demo mode. Coordinator/Management are Sub Admin accounts with that
// permission preset applied (there's no separate UserRole for them; see
// SystemRoleSeeds in DatabaseInitializer.cs).
const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "admin", email: "admin@meettomanage.cloud", pin: "1234" },
  { role: "teacher", email: "teacher@meettomanage.cloud", pin: "1268" },
  { role: "parent", email: "parent@meettomanage.cloud", pin: "6998" },
  { role: "subadmin", email: "subadmin@meettomanage.cloud", pin: "4892" },
  { role: "admission", email: "admission@meettomanage.cloud", pin: "1933" },
  { role: "coordinator", email: "coordinator@meettomanage.cloud", pin: "0887" },
  { role: "management", email: "management@meettomanage.cloud", pin: "6032" },
  { role: "student", email: "parent@meettomanage.cloud", pin: "6998", homePathOverride: "/student" },
];

export default function Login() {
  useLightBrandScope();
  const brand = useBrand();
  const tenantPortal = isTenantPortal();
  const [discoveredEmail] = useState(() => isTenantPortal() ? takeDiscoveredEmail() : "");
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(apiEnabled() ? discoveredEmail : "admin@meettomanage.cloud");
  const [pin, setPin] = useState(apiEnabled() ? "" : "1234");
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(getRemember());
  const {
    role: sessionRole,
    homePath: sessionHomePath,
    setRole: setSessionRole,
    setUserName,
    setPermissions,
    setHomePath,
    setTimeZoneId,
  } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  // Where RequireAuth bounced the visitor from, so login lands them back there.
  // Their portal home stays the fallback; a cross-role path re-bounces harmlessly.
  // Sanitised because both this and the API's defaultRoute are navigate() targets:
  // an off-origin value would turn a successful sign-in into an external redirect.
  const from = safeInternalPath((location.state as { from?: { pathname?: string } } | null)?.from?.pathname);

  // Mirrors RequireAuth's own check: a visitor who's already signed in (valid
  // session role, and a real API token when a backend is configured) shouldn't
  // see the login form again just because they hit /login directly — back
  // button, a stale bookmark, or the portal-select "back to portals" bounce in
  // production. Send them straight to where they already are.
  if (sessionRole && (!apiEnabled() || getAccessToken())) {
    return <Navigate to={sessionHomePath ?? ROLE_META[sessionRole].homePath} replace />;
  }

  // Demo mode has no real credential check, so a typed email that matches one of the
  // listed demo accounts picks its role; otherwise fall back to whichever role was
  // last selected from the list (defaults to admin).
  function resolveDemoRole(): Role {
    const matched = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    return matched?.role ?? role;
  }

  function enterDemoAs(demoRole: Role, homeOverride?: string) {
    const homePath = homeOverride ?? ROLE_META[demoRole].homePath;
    setSessionRole(demoRole);
    setHomePath(homePath);
    navigate(from ?? homePath);
  }

  // Shared by the form's own Sign In button and the demo-account list: calls the
  // real API and lands on homeOverride when given (the "student" entry needs this —
  // see DemoAccount.homePathOverride), otherwise the backend's own defaultRoute.
  async function performApiLogin(loginEmail: string, loginPin: string, homeOverride?: string) {
    setSubmitting(true);
    try {
      const response = await login(loginEmail, loginPin);
      const frontendRole = toFrontendRole(response.user.role);
      // The marketing team signs in only through its own console login, never this
      // academy-facing one — drop the token it was just issued instead of letting it in.
      if (frontendRole === "marketing") {
        setAccessToken(null);
        throw new Error("Sign in failed. Please check your email and PIN.");
      }
      // Persist the resolved organisation for every login, including /t/<code>.
      // Besides prefixing calls made from the single /login URL, this lets startup
      // reject a remembered tenant-A session opened under tenant B's portal.
      setSessionTenant(response.tenantCode ?? null);
      const homePath = homeOverride ?? safeInternalPath(response.defaultRoute) ?? ROLE_META[frontendRole].homePath;
      setSessionRole(frontendRole);
      setUserName(response.user.fullName);
      setPermissions(response.permissions);
      setHomePath(homePath);
      setTimeZoneId(response.user.timeZoneId);
      navigate(from ?? homePath);
    } catch (err) {
      // Shown as a popup so it can't be missed (and doesn't push the form around on a one-screen page).
      toast({ variant: "error", title: "Sign in failed", description: userMessage(err, "Sign in failed. Please try again.") });
      // A wrong PIN otherwise just sat there — the visitor had to clear it themselves before
      // retyping. Clear and refocus so retrying is just "type the PIN again."
      setPin("");
      document.getElementById("pin")?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  // Clicking a listed account fills the form (for visual feedback / consistency with
  // the Sign In button) and signs straight in as that role — via the real API when
  // one's configured, or the mock demo-mode path otherwise.
  function handleDemoAccountClick(account: DemoAccount) {
    setEmail(account.email);
    setPin(account.pin);
    setRole(account.role);
    setRemember(rememberMe);
    // Shows on the marketing console which demo roles visitors try.
    trackMarketingEvent("demo_login_clicked", "/login", `demo-login:${account.role}`);

    if (!apiEnabled()) {
      enterDemoAs(account.role, account.homePathOverride);
      return;
    }
    void performApiLogin(account.email, account.pin, account.homePathOverride);
  }

  function pickRole(next: Role) {
    const account = DEMO_ACCOUNTS.find((x) => x.role === next);
    setRole(next);
    if (account) {
      setEmail(account.email);
      setPin(account.pin);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Decided before any session state is written, so setRole/setUserName/etc.
    // below (and setAccessToken inside login()) all land in the right store.
    setRemember(rememberMe);

    // Demo mode: no backend configured, enter as the role implied by the typed email
    if (!apiEnabled()) {
      enterDemoAs(resolveDemoRole());
      return;
    }

    await performApiLogin(email, pin);
  }

  return (
    <div className="theme-light-scope relative h-dvh overflow-hidden bg-[#FFF6EE] lg:grid lg:grid-cols-[1.3fr_1fr]">
      <Helmet><meta name="robots" content="noindex, follow" /></Helmet>
      {/* Left: the institute photo under a light warm wash, with a no-commitment card at the bottom. */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/loginpage.png" alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_bottom]" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#FFF6EE]/30 to-transparent" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#FFF6EE]/30 via-transparent to-transparent" />

        <div className="relative flex h-full flex-col px-12 pt-9 xl:px-16">
          <Link to="/get-started" className="mt-auto mb-7 flex w-fit max-w-[440px] items-center gap-4 rounded-2xl bg-white/90 px-5 py-4 shadow-[0_18px_40px_-24px_rgba(28,25,23,0.4)] backdrop-blur transition-transform hover:-translate-y-0.5">
            <Clock aria-hidden className="h-8 w-8 shrink-0 text-[#EA580C]" />
            <span><span className="block text-base font-bold text-[#1C1917]">No commitment</span><span className="block text-sm text-[#57534E]">Request a demo and we'll follow up at a convenient time.</span></span>
          </Link>
        </div>
      </div>

      {/* Right: the sign-in card. The whole page is one screen tall; only the demo list may scroll inside itself. */}
      <div className="flex h-full min-h-0 items-center justify-center p-3 sm:p-5">
        <div className="animate-fade-in flex max-h-full min-h-0 w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_30px_70px_-30px_rgba(194,65,12,0.35)] ring-1 ring-[#F6E3D3] sm:p-7">
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-pop ring-1 ring-[#EFE3D7] [@media(max-height:760px)]:h-11 [@media(max-height:760px)]:w-11`}>
              <img src={brand.logoUrl ?? "/logo-icon-128.webp"} alt={brand.name} className={`h-9 w-9 object-contain [@media(max-height:760px)]:h-7 [@media(max-height:760px)]:w-7`} />
            </div>
            <h2 className={`font-display mt-2.5 text-3xl font-extrabold tracking-[-0.02em] text-[#1C1917] [@media(max-height:760px)]:mt-1.5 [@media(max-height:760px)]:text-2xl`}>Welcome back</h2>
            <p className={`mt-1 text-sm text-[#57534E] [@media(max-height:760px)]:hidden`}>Sign in to your account and continue</p>
          </div>

          <div role="tablist" aria-label="Sign in as" className={`mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-[#FFF3EA] p-1 [@media(max-height:760px)]:mt-2.5`}>
            {ROLE_TABS.map((t) => {
              const Icon = ROLE_META[t.role].icon;
              const on = role === t.role;
              return (
                <button
                  key={t.role}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => pickRole(t.role)}
                  className={cn("flex items-center justify-center gap-1.5 !rounded-xl px-1 py-2.5 text-[13px] font-semibold transition-colors", on ? "bg-[#EA580C] text-white shadow-md" : "text-[#44403C] hover:bg-white/70")}
                >
                  <Icon className="hidden h-4 w-4 shrink-0 sm:block" /> {t.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className={`mt-4 flex min-h-0 flex-1 flex-col gap-3 [@media(max-height:760px)]:mt-2.5 [@media(max-height:760px)]:gap-2`}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-[#1C1917]">Email or Mobile Number</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#44403C]" />
                <Input id="email" type="text" inputMode="email" autoComplete="username" placeholder="you@meettomanage.cloud or 98765 43210" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 !rounded-xl border-[#EBD9C8] ps-11 text-sm" required />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pin" className="text-sm font-semibold text-[#1C1917]">PIN</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#44403C]" />
                <input
                  id="pin"
                  // type="text" (not "password") so inputMode="numeric" reliably brings up the numeric keypad on mobile; masked via -webkit-text-security instead.
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={PIN_LENGTH}
                  autoComplete="current-password"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
                  required
                  style={{ WebkitTextSecurity: showPin ? "none" : "disc" } as CSSProperties}
                  className="h-12 w-full rounded-xl border border-[#EBD9C8] bg-background ps-11 pe-11 text-sm tracking-[0.3em] ring-offset-background transition-colors placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <button type="button" onClick={() => setShowPin((v) => !v)} aria-label={showPin ? "Hide PIN" : "Show PIN"} className="absolute end-3.5 top-1/2 -translate-y-1/2 rounded text-[#6B6560] transition-colors hover:text-[#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {showPin ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1C1917]">
                <Checkbox checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} />
                Remember me
              </label>
              <Link to="/forgot-pin" className="text-sm font-semibold text-[#C2410C] hover:underline">Forgot your PIN?</Link>
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="h-12 w-full !rounded-xl !bg-[#EA580C] text-base !text-white shadow-[0_14px_26px_-14px_rgba(194,65,12,0.8)] transition-all hover:!bg-[#C2410C]">
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
              ) : apiEnabled() ? (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Sign in to {ROLE_META[role].shortLabel}<ArrowRight className="h-4 w-4" /></>
              )}
            </Button>

            <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-2xl bg-[#FFF6EE] p-3">
              <p className="flex items-center justify-between gap-2 text-sm font-bold text-[#C2410C]">
                <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Try a demo account</span>
                <span className="hidden text-[11px] font-medium text-[#57534E] sm:inline">Tap to sign in</span>
              </p>
              <div className="grid min-h-[64px] flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-0.5 [scrollbar-width:thin]">
                {DEMO_ACCOUNTS.map((account) => {
                  const meta = ROLE_META[account.role];
                  return (
                    <button
                      key={account.role}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDemoAccountClick(account)}
                      title={account.email}
                      className={cn("flex min-w-0 items-center gap-2.5 !rounded-xl bg-white px-2.5 py-2 text-start shadow-sm ring-1 ring-[#F6E3D3] transition-colors hover:ring-[#F97316] disabled:pointer-events-none disabled:opacity-50", role === account.role && "relative z-10 ring-2 ring-[#F97316]")}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFEBDD] text-[#C2410C]">
                        {role === account.role && submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <meta.icon className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#1C1917]">{DEMO_LABEL[account.role] ?? meta.shortLabel}</span>
                      <span className="shrink-0 rounded-md bg-[#FFF3EA] px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-[#C2410C]">{account.pin}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>

          <p className={`mt-2.5 shrink-0 text-center text-sm text-[#57534E] [@media(max-height:760px)]:mt-1.5`}>
            New here? <Link to="/" className="font-semibold text-[#C2410C] hover:underline">Explore More</Link>
            {!apiEnabled() && <span className="block text-xs">Demo build with mock data: no credentials are verified.</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
