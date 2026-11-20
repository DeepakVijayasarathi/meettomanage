import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertCircle, BarChart3, CheckCircle2, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { apiEnabled, getAccessToken, setAccessToken, userMessage } from "@/lib/api";
import { loginMarketing } from "@/api/auth";
import { toFrontendRole } from "@/api/types";
import { useSession } from "@/state/session";
import { setSessionTenant } from "@/lib/tenantPath";
import { loadBrandingFromApi } from "@/lib/branding";

const PIN_LENGTH = 4;

/**
 * Sign-in for the marketing console only (Marketing role). Not linked from anywhere public and
 * marked noindex; the academy's own /login refuses these accounts, and this page refuses every
 * other account — with the same generic message either way, so neither page reveals which
 * emails belong where.
 */
export default function MarketingLogin() {
  const navigate = useNavigate();
  const { role: sessionRole, setRole, setUserName, setPermissions, setHomePath, setTimeZoneId } = useSession();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sessionRole === "marketing" && (!apiEnabled() || getAccessToken())) {
    return <Navigate to="/marketing" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!apiEnabled()) {
      setError("The marketing console needs the live API.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await loginMarketing(email.trim(), pin);
      if (toFrontendRole(response.user.role) !== "marketing") {
        setAccessToken(null);
        throw new Error("Sign in failed. Please check your email and PIN.");
      }
      setSessionTenant(response.tenantCode ?? null);
      await loadBrandingFromApi();
      setRole("marketing");
      setUserName(response.user.fullName);
      setPermissions(response.permissions);
      setHomePath("/marketing");
      setTimeZoneId(response.user.timeZoneId);
      navigate("/marketing", { replace: true });
    } catch (err) {
      setError(userMessage(err, "Sign in failed. Please try again."));
      setPin("");
      document.getElementById("marketing-pin")?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0B1020] px-4 py-8 sm:px-6">
      <Helmet>
        <title>Marketing Console — Sign in</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div aria-hidden className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
      <div aria-hidden className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-orange-500/15 blur-3xl" />
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.05fr_1fr]">
        <section className="hidden bg-gradient-to-br from-[#111936] via-[#10172F] to-[#25151A] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div><Logo platform imgClassName="h-14 brightness-0 invert" /><p className="mt-12 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Growth workspace</p><h2 className="mt-3 text-3xl font-bold leading-tight">Turn website attention into your next academy customer.</h2><p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">Keep acquisition, conversations, content and follow-ups in one focused command centre.</p></div>
          <ul className="mt-10 space-y-3 text-sm text-slate-200"><li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-orange-300" />Measure the complete conversion journey</li><li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300" />Prioritise and follow up every real lead</li><li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-orange-300" />Private workspace for the marketing team</li></ul>
        </section>
        <section className="p-7 sm:p-10">
        <Logo platform imgClassName="h-14 lg:hidden" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B83A06]">Team sign in</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#111827]">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-[#5B6472]">Sign in to the Meet to Manage Marketing Console.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="marketing-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <Input
                id="marketing-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-9"
                required
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="marketing-pin">PIN</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <Input
                id="marketing-pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={PIN_LENGTH}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
                className="h-11 pl-9 tracking-[0.4em]"
                required
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          <Button type="submit" disabled={submitting || pin.length !== PIN_LENGTH || !email.trim()} className="h-11 bg-[#B83A06] text-white hover:bg-[#962F05] disabled:bg-[#B83A06]">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
          <p className="text-center text-xs leading-5 text-[#6B7280]">Authorised marketing team members only. Your session is securely protected.</p>
        </form>
        </section>
      </div>
    </main>
  );
}
