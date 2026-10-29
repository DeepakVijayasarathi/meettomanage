import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertCircle, Loader2, Lock, Mail, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiEnabled, getAccessToken, setAccessToken, userMessage } from "@/lib/api";
import { loginMarketing } from "@/api/auth";
import { toFrontendRole } from "@/api/types";
import { useSession } from "@/state/session";

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
    <div className="flex min-h-dvh items-center justify-center bg-[#0D1024] px-4 py-10">
      <Helmet>
        <title>Marketing Console — Sign in</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="w-full max-w-sm bg-white p-8 shadow-pop">
        <span className="flex h-12 w-12 items-center justify-center bg-[#0D1024] text-[#F97316]">
          <Megaphone className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight text-[#111]">Marketing Console</h1>
        <p className="mt-1 text-sm text-[#5B6472]">Demo requests, blog, SEO and website analytics.</p>

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
            <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          <Button type="submit" disabled={submitting || pin.length !== PIN_LENGTH || !email.trim()} className="h-11">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
