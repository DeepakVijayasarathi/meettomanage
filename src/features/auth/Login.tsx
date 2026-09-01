import { useState, type CSSProperties } from "react";
import { useLocation, useNavigate, Navigate, Link } from "react-router-dom";
import { AlertCircle, ArrowRight, CalendarCheck2, Eye, EyeOff, IndianRupee, Loader2, Lock, Mail, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLE_META } from "@/lib/roles";
import { useSession } from "@/state/session";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { apiEnabled, getAccessToken } from "@/lib/api";
import { getRemember, setRemember } from "@/lib/authStorage";
import { login } from "@/api/auth";
import { toFrontendRole } from "@/api/types";
import { cn, safeInternalPath } from "@/lib/utils";
import type { Role } from "@/types";

// Floating feature badges over the hero panel — colour comes from the brand-accent
// token (Settings → Branding → Accent color), not a literal hex.
const HERO_BADGES = [
  { icon: Video, label: "Live Classes" },
  { icon: CalendarCheck2, label: "Attendance" },
  { icon: IndianRupee, label: "Fees" },
];

const PIN_LENGTH = 4;
// Scoped to this page only (not the global `font-display` mapping, which stays Inter
// everywhere else) — a warmer, rounder headline face for the two big greeting moments.
const HEADLINE_FONT = "'Fredoka', ui-rounded, 'Segoe UI', sans-serif";

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
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(apiEnabled() ? "" : "admin@meettomanage.cloud");
  const [pin, setPin] = useState(apiEnabled() ? "" : "1234");
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    try {
      const response = await login(loginEmail, loginPin);
      const frontendRole = toFrontendRole(response.user.role);
      const homePath = homeOverride ?? safeInternalPath(response.defaultRoute) ?? ROLE_META[frontendRole].homePath;
      setSessionRole(frontendRole);
      setUserName(response.user.fullName);
      setPermissions(response.permissions);
      setHomePath(homePath);
      setTimeZoneId(response.user.timeZoneId);
      navigate(from ?? homePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
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

    if (!apiEnabled()) {
      enterDemoAs(account.role, account.homePathOverride);
      return;
    }
    void performApiLogin(account.email, account.pin, account.homePathOverride);
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
    <div className="theme-light-scope min-h-screen bg-white lg:grid lg:grid-cols-[3fr_2fr]">
      {/* Left — full-bleed hero panel. Real institute photo (public/loginpage.png) —
          object-cover fills the panel at any viewport height, dark gradient overlay
          on top keeps the white headline/badge text legible over it. */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="/loginpage.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 80% 75%, hsl(var(--brand-accent) / 0.18), transparent 55%)" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10" />

        <p className="absolute left-10 top-8 text-xs font-medium text-white/60">© 2026 {brand.name}</p>

        <div className="absolute right-10 top-16 flex flex-col gap-4">
          {HERO_BADGES.map((badge, i) => (
            <div
              key={badge.label}
              style={{ animationDelay: `${i * 90}ms`, animationFillMode: "backwards" }}
              className="animate-slide-up flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-pop backdrop-blur transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-accent/15 text-brand-accent">
                <badge.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-brand-ink">{badge.label}</span>
            </div>
          ))}
        </div>

        <div className="animate-slide-up absolute inset-x-0 bottom-0 p-12">
          <h1 style={{ fontFamily: HEADLINE_FONT }} className="text-4xl font-bold leading-[1.1] text-white xl:text-5xl">
            Teach live.
            <br />
            Track everything.
          </h1>
          <p className="mt-4 max-w-md text-base text-white/80">
            Classes, attendance, fees, and reports in one focused workspace for your institute.
          </p>
        </div>
      </div>

      {/* Right — sign-in */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="animate-fade-in w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-pop ring-1 ring-brand-ink/10">
              <img src={brand.logoUrl ?? "/logo.png"} alt={brand.name} className="h-11 w-11 object-contain" />
            </div>
            <h2 style={{ fontFamily: HEADLINE_FONT }} className="mt-4 text-3xl font-semibold tracking-tight text-brand-ink">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-brand-ink/70">Sign in to your account and continue</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-brand-ink/70">
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink/35" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@meettomanage.cloud"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pin" className="text-xs font-bold uppercase tracking-wide text-brand-ink/70">
                PIN
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink/35" />
                <input
                  id="pin"
                  // type="text" (not "password") so inputMode="numeric" reliably brings up
                  // the numeric keypad on mobile — combining password+numeric is a known
                  // Safari/WebView gotcha where the full keyboard shows regardless. Masked
                  // visually instead via -webkit-text-security when hidden (Chrome/Edge/
                  // Safari; Firefox falls back to showing the digits — a minor, non-
                  // security-critical gap for a 4-digit login PIN, not a password).
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
                  className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-10 text-sm tracking-[0.3em] ring-offset-background transition-colors placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-brand-ink/35 transition-colors hover:text-brand-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Purely decorative fill progress — the input's own maxLength/required
                  already enforce the real constraint; this just gives the familiar
                  OTP-style "digits entered" feedback as you type. */}
              <div className="mt-0.5 flex gap-1.5" aria-hidden="true">
                {Array.from({ length: PIN_LENGTH }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-200",
                      i < pin.length ? "bg-brand-accent" : "bg-brand-ink/10"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-ink/70">
                <Sparkles className="h-3 w-3 text-brand-amber" /> Demo accounts — tap to sign in
              </Label>
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-brand-ink/10 p-1.5">
                {DEMO_ACCOUNTS.map((account) => {
                  const meta = ROLE_META[account.role];
                  return (
                    <button
                      key={account.role}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDemoAccountClick(account)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-brand-ink/5 disabled:pointer-events-none disabled:opacity-50",
                        role === account.role && "bg-brand-accent/10 ring-1 ring-brand-accent/40"
                      )}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${meta.hex}1A`, color: meta.hex }}
                      >
                        {role === account.role && submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <meta.icon className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-brand-ink">{meta.shortLabel}</span>
                        <span className="block truncate font-mono text-xs text-brand-ink/60">{account.email}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tracking-[0.2em] text-brand-ink/40">{account.pin}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-brand-ink/70">
                <Checkbox checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-brand-accent hover:underline">
                Forgot your PIN?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-1 w-full !bg-gradient-to-r !from-primary !to-brand-accent !text-white shadow-md transition-all hover:!opacity-90 hover:shadow-lg"
            >
              {submitting ? (
                <>
                  Signing in… <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : apiEnabled() ? (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Sign in to {ROLE_META[role].shortLabel}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-brand-ink/70">
            New here?{" "}
            <Link to="/" className="font-semibold text-brand-accent hover:underline">
              Explore More
            </Link>
          </p>

          {!apiEnabled() && (
            <p className="mt-6 text-center text-xs text-brand-ink/70">
              This is a demo build with mock data — no credentials are verified.
            </p>
          )}

          <p className="mt-8 text-center text-xs text-brand-ink/50">
            Powered by <span className="font-semibold text-brand-ink/70">{brand.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
