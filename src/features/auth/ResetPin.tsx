import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resetPin } from "@/api/auth";

const PIN_LENGTH = 4;

function PinBoxes({
  id,
  values,
  onChange,
  autoFocus,
}: {
  id: string;
  values: string[];
  onChange: (next: string[]) => void;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[index] = digit;
    onChange(next);
    if (digit && index < PIN_LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !values[index] && index > 0) refs.current[index - 1]?.focus();
  }

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {values.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={`${id}-${i}`}
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          autoComplete="off"
          autoFocus={autoFocus && i === 0}
          value={digit}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          required
          aria-label={`PIN digit ${i + 1} of ${PIN_LENGTH}`}
          className="h-14 w-full rounded-xl border border-input bg-background text-center text-xl font-bold text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      ))}
    </div>
  );
}

export default function ResetPin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pinValue = pin.join("");
  const confirmValue = confirmPin.join("");
  const canSubmit = pinValue.length === PIN_LENGTH && confirmValue.length === PIN_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !canSubmit) return;
    if (pinValue !== confirmValue) {
      setError("Those two PINs don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resetPin(token, pinValue);
      setDone(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset your PIN. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <Logo className="mb-6 justify-center" />

        {!token ? (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">This link is missing information</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Open the reset link exactly as it arrived in your email, or request a new one.
            </p>
            <Button asChild className="mt-6">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </>
        ) : done ? (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Your PIN is updated</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Taking you to sign in…</p>
          </>
        ) : (
          <>
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Set a new PIN</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Choose a 4-digit PIN you'll use to sign in from now on.</p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 text-left">
              <div className="grid gap-1.5">
                <Label htmlFor="new-pin-0">New PIN</Label>
                <PinBoxes id="new-pin" values={pin} onChange={setPin} autoFocus />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="confirm-pin-0">Confirm PIN</Label>
                <PinBoxes id="confirm-pin" values={confirmPin} onChange={setConfirmPin} />
              </div>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={submitting || !canSubmit} className="mt-1">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Saving…" : "Save new PIN"}
              </Button>
            </form>
          </>
        )}

        {!done && (
          <Link to="/login" className="mt-6 block text-sm font-semibold text-primary hover:underline">
            Back to login
          </Link>
        )}
      </div>
    </div>
  );
}
