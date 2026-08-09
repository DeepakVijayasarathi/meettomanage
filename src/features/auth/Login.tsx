import { useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, Sparkles, Video, CalendarCheck2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import { useSession } from "@/state/session";
import { apiEnabled } from "@/lib/api";
import { login } from "@/api/auth";
import { toFrontendRole } from "@/api/types";
import type { Role } from "@/types";

// Colour-matched to the logo's own cast: the blue boy, the pink girl, the green nest.
const TRUST_CHIPS = [
  { icon: Video, label: "Live Classes", hex: "#5B93E0" },
  { icon: CalendarCheck2, label: "Attendance", hex: "#F53BA6" },
  { icon: Wallet, label: "Billing", hex: "#57B33B" },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.4 35.4 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.9 36 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

const PIN_LENGTH = 4;

export default function Login() {
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState(apiEnabled() ? "" : "demo@readernest.com");
  const [pin, setPin] = useState<string[]>(apiEnabled() ? Array(PIN_LENGTH).fill("") : ["1", "2", "3", "4"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setRole: setSessionRole, setUserName, setPermissions, setHomePath } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Where RequireAuth bounced the visitor from, so login lands them back there.
  // Their portal home stays the fallback; a cross-role path re-bounces harmlessly.
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setPin((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < PIN_LENGTH - 1) {
      pinRefs.current[index + 1]?.focus();
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  function handlePinPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH).split("");
    if (digits.length === 0) return;
    e.preventDefault();
    setPin((prev) => {
      const next = [...prev];
      digits.forEach((d, i) => (next[i] = d));
      return next;
    });
    pinRefs.current[Math.min(digits.length, PIN_LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
      const response = await login(email, pin.join(""));
      const frontendRole = toFrontendRole(response.user.role);
      const homePath = response.defaultRoute || ROLE_META[frontendRole].homePath;
      setSessionRole(frontendRole);
      setUserName(response.user.fullName);
      setPermissions(response.permissions);
      setHomePath(homePath);
      navigate(from ?? homePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream lg:grid lg:grid-cols-[2fr_1fr]">
      {/* Left — a composed brand panel on the same cream canvas as the page (no stock photo) */}
      <div className="hidden flex-col justify-center gap-10 p-10 lg:flex">
        <div className="relative mx-auto w-full max-w-3xl">
          <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#EAF3FF] via-brand-cream to-[#FDECF6] ring-4 ring-white">
            {/* Soft washes in the same three hues as the trust chips below — brand colour, not a generic gradient. */}
            <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#5B93E0]/25 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#F53BA6]/20 blur-[90px]" />
            <div className="pointer-events-none absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-[#57B33B]/20 blur-[80px]" />

            <div className="relative flex h-full flex-col items-center justify-center gap-5 px-14 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[26px] bg-white shadow-lg ring-1 ring-brand-ink/5">
                <img src="/logo.png" alt="" className="h-16 w-16 object-contain" />
              </div>
              <div>
                <p className="font-display text-[13px] font-bold uppercase tracking-[0.3em] text-brand-green">
                  Read &middot; Write &middot; Speak
                </p>
                <h2 className="font-display mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight text-brand-ink xl:text-5xl">
                  Learning today,
                  <br />
                  leading tomorrow.
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <p className="text-lg font-semibold leading-snug text-brand-ink">
            One platform for live classes, admissions, billing and every parent conversation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {TRUST_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: `${chip.hex}1F`, color: chip.hex }}
              >
                <chip.icon className="h-3.5 w-3.5" />
                {chip.label}
              </span>
            ))}
          </div>
          <p className="mt-6 text-xs font-medium text-brand-ink/70">© 2026 The Reader Nest. All rights reserved.</p>
        </div>
      </div>

      {/* Right — sign-in card, floating on the same cream canvas */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-3xl border border-brand-ink/10 bg-white p-8">
          <div className="flex flex-col items-center text-center">
            <img src="/logo.png" alt="The Reader Nest" className="h-14 w-14 object-contain lg:hidden" />
            <h1 className="font-display mt-2 text-2xl font-extrabold tracking-tight text-brand-ink sm:text-3xl lg:mt-0">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-brand-ink/70">Sign in to your account and continue</p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-7 w-full gap-2.5 border-brand-ink/15 font-semibold text-brand-ink hover:bg-brand-ink/5"
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-ink/10" />
            <span className="text-xs font-medium text-brand-ink/70">or sign in with email</span>
            <div className="h-px flex-1 bg-brand-ink/10" />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
                  placeholder="you@readernest.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pin-0" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-ink/70">
                <Lock className="h-3 w-3" /> PIN
              </Label>
              <div className="flex gap-2.5">
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      pinRefs.current[i] = el;
                    }}
                    id={`pin-${i}`}
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    autoComplete={i === 0 ? "current-password" : "off"}
                    value={digit}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    onPaste={handlePinPaste}
                    required
                    aria-label={`PIN digit ${i + 1} of ${PIN_LENGTH}`}
                    className="h-12 w-full rounded-xl border border-brand-ink/15 text-center text-lg font-bold text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ))}
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
                <Checkbox defaultChecked />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-brand-green hover:underline">
                Forgot your PIN?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-1 w-full !bg-brand-green !text-white hover:!bg-brand-greenDark"
            >
              {submitting ? (
                <>
                  Signing in… <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : apiEnabled() ? (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
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
            <Link to="/" className="font-semibold text-brand-green hover:underline">
              Explore More
            </Link>
          </p>

          {!apiEnabled() && (
            <p className="mt-6 text-center text-xs text-brand-ink/70">
              This is a demo build with mock data — no credentials are verified.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
