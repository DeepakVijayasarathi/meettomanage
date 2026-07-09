import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, Video, CalendarCheck2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import { useSession } from "@/state/session";
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

export default function Login() {
  const [role, setRole] = useState<Role>("admin");
  const [showPassword, setShowPassword] = useState(false);
  const { setRole: setSessionRole } = useSession();
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSessionRole(role);
    navigate(ROLE_META[role].homePath);
  }

  return (
    <div className="min-h-screen bg-brand-cream lg:grid lg:grid-cols-[2fr_1fr]">
      {/* Left — the illustration lives on the same cream canvas as the page, framed like a photo on a wall */}
      <div className="hidden flex-col justify-center gap-10 p-10 lg:flex">
        <div className="relative mx-auto w-full max-w-3xl">
          <div className="absolute -left-5 -top-5 z-10 flex h-16 w-16 -rotate-6 items-center justify-center rounded-full bg-white p-2 ring-1 ring-brand-ink/10">
            <img src="/logo.png" alt="" className="h-full w-full object-contain" />
          </div>
          <div className="overflow-hidden rounded-[28px] ring-4 ring-white">
            <img
              src="/login.png"
              alt="Two children reading together at The Reader Nest"
              className="aspect-[16/11] w-full object-cover"
            />
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
          <p className="mt-6 text-xs font-medium text-brand-ink/45">© 2026 The Reader Nest. All rights reserved.</p>
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
            <p className="mt-1.5 text-sm text-brand-ink/55">Sign in to your account and continue</p>
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
            <span className="text-xs font-medium text-brand-ink/40">or sign in with email</span>
            <div className="h-px flex-1 bg-brand-ink/10" />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-brand-ink/50">
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink/35" />
                <Input id="email" type="email" placeholder="you@readernest.com" defaultValue="demo@readernest.com" className="h-11 pl-9" required />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wide text-brand-ink/50">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink/35" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  defaultValue="demo-password"
                  className="h-11 pl-9 pr-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ink/35 hover:text-brand-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="portal" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-ink/50">
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-brand-ink/70">
                <Checkbox defaultChecked />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-brand-green hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" className="mt-1 w-full !bg-brand-green !text-white hover:!bg-brand-greenDark">
              Sign in to {ROLE_META[role].shortLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-brand-ink/55">
            New here?{" "}
            <Link to="/portal-select" className="font-semibold text-brand-green hover:underline">
              Browse all portals
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-brand-ink/40">
            This is a demo build with mock data — no credentials are verified.
          </p>
        </div>
      </div>
    </div>
  );
}
