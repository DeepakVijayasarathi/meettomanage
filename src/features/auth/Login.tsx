import { useState, type CSSProperties, type SVGProps } from "react";
import { useLocation, useNavigate, Navigate, Link } from "react-router-dom";
import { AlertCircle, ArrowRight, CalendarCheck2, Eye, EyeOff, IndianRupee, Loader2, Lock, Mail, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import { useSession } from "@/state/session";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { apiEnabled, getAccessToken } from "@/lib/api";
import { getRemember, setRemember } from "@/lib/authStorage";
import { login } from "@/api/auth";
import { toFrontendRole } from "@/api/types";
import { safeInternalPath } from "@/lib/utils";
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

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.96 13.96 0 0 1 10.94 24c0-1.45.25-2.86.7-4.18v-5.7H4.34A21.98 21.98 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export default function Login() {
  useLightBrandScope();
  const brand = useBrand();
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(apiEnabled() ? "" : "demo@meettomanage.cloud");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Decided before any session state is written, so setRole/setUserName/etc.
    // below (and setAccessToken inside login()) all land in the right store.
    setRemember(rememberMe);

    // Demo mode: no backend configured, enter as the selected preview role
    if (!apiEnabled()) {
      setSessionRole(role);
      setHomePath(ROLE_META[role].homePath);
      navigate(from ?? ROLE_META[role].homePath);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await login(email, pin);
      const frontendRole = toFrontendRole(response.user.role);
      const homePath = safeInternalPath(response.defaultRoute) ?? ROLE_META[frontendRole].homePath;
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

  return (
    <div className="theme-light-scope min-h-screen bg-white lg:grid lg:grid-cols-[3fr_2fr]">
      {/* Left — full-bleed hero panel. This gradient is a stand-in for a real institute
          photo (the reference design uses one) — swap this block for an <img> once a
          licensed photo is supplied; there's no image-generation step in this pass.
          Colours here read hsl(var(--primary))/hsl(var(--brand-accent)) via inline style
          rather than Tailwind classes — an arbitrary-value class like bg-[#1e3a5f] bakes
          the literal hex in at build time and can't react to a runtime brand color change,
          which defeats the whole point of this being a white-label deployment. */}
      <div
        className="relative hidden overflow-hidden lg:block"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 60%, color-mix(in srgb, hsl(var(--primary)) 60%, black) 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 25% 15%, hsl(var(--brand-accent) / 0.28), transparent 55%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 80% 75%, hsl(var(--brand-accent) / 0.18), transparent 55%)" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />

        <p className="absolute left-10 top-8 text-xs font-medium text-white/60">© 2026 {brand.name}</p>

        <div className="absolute right-10 top-16 flex flex-col gap-4">
          {HERO_BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-pop backdrop-blur">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-accent/15 text-brand-accent">
                <badge.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-brand-ink">{badge.label}</span>
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-12">
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
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-pop ring-1 ring-brand-ink/10">
              <img src={brand.logoUrl ?? "/logo-icon.png"} alt={brand.name} className="h-11 w-11 object-contain" />
            </div>
            <p className="mt-4 font-display text-[12px] font-bold uppercase tracking-[0.25em] text-brand-accent">
              {brand.tagline}
            </p>
            <h2 style={{ fontFamily: HEADLINE_FONT }} className="mt-2 text-3xl font-semibold tracking-tight text-brand-ink">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-brand-ink/70">Sign in to your account and continue</p>
          </div>

          <button
            type="button"
            onClick={() => setError("Google sign-in isn't set up for this deployment yet — use email and PIN below.")}
            className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-sm transition-colors hover:bg-brand-ink/[0.03]"
          >
            <GoogleIcon className="h-4 w-4" /> Continue with Google
          </button>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-brand-ink/10" />
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Email sign in</span>
            <span className="h-px flex-1 bg-brand-ink/10" />
          </div>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ink/35 hover:text-brand-ink/60"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!apiEnabled() && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="portal" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-ink/70">
                  <Sparkles className="h-3 w-3 text-brand-amber" /> Preview as (demo)
                </Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger id="portal" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_ORDER.map((r) => (
                      <SelectItem key={r} value={r}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ROLE_META[r].hex }} />
                          {ROLE_META[r].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
              className="mt-1 w-full !bg-gradient-to-r !from-primary !to-brand-accent !text-white hover:!opacity-90"
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
