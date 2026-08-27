import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, ShieldQuestion } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiEnabled } from "@/lib/api";
import { requestPinReset } from "@/api/auth";

// Same headline face as Login.tsx (scoped to this page only, not the global font-display).
const HEADLINE_FONT = "'Fredoka', ui-rounded, 'Segoe UI', sans-serif";

export default function ForgotPassword() {
  const live = apiEnabled();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestPinReset(email.trim());
      // Always the same message on success, regardless of whether the address
      // actually has an account — the UI must never leak that distinction.
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the reset link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_24px_70px_-24px_rgba(43,32,20,0.22)] ring-1 ring-brand-ink/[0.04]">
        <Logo className="mb-6 justify-center" />

        {!live ? (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <ShieldQuestion className="h-6 w-6" />
            </span>
            <h2 style={{ fontFamily: HEADLINE_FONT }} className="text-lg font-semibold tracking-tight text-brand-ink sm:text-xl">
              Forgot your PIN?
            </h2>
            <p className="mt-1.5 text-sm text-brand-ink/70">
              Demo mode — connect the API (VITE_API_BASE_URL) to try the real self-service reset flow.
            </p>
          </>
        ) : sent ? (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h2 style={{ fontFamily: HEADLINE_FONT }} className="text-lg font-semibold tracking-tight text-brand-ink sm:text-xl">
              Check your email
            </h2>
            <p className="mt-1.5 text-sm text-brand-ink/70">
              If <strong className="text-brand-ink">{email.trim()}</strong> has an account with us, a reset link is on
              its way — it expires in 30 minutes and works once.
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <ShieldQuestion className="h-6 w-6" />
            </span>
            <h2 style={{ fontFamily: HEADLINE_FONT }} className="text-lg font-semibold tracking-tight text-brand-ink sm:text-xl">
              Forgot your PIN?
            </h2>
            <p className="mt-1.5 text-sm text-brand-ink/70">
              Enter the email on your account and we'll send you a link to set a new PIN.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 text-left">
              <div className="grid gap-1.5">
                <Label htmlFor="forgot-email" className="text-xs font-bold uppercase tracking-wide text-brand-ink/70">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink/35" />
                  <Input
                    id="forgot-email"
                    type="email"
                    required
                    autoFocus
                    className="h-11 pl-9"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={submitting || !email.trim()}
                className="mt-1 !bg-brand-green !text-white hover:!bg-brand-greenDark"
              >
                {submitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <p className="mt-4 text-xs text-brand-ink/70">
              Staff accounts can also ask an admin to resend credentials directly.
            </p>
          </>
        )}

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-greenDark hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    </div>
  );
}
