import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-card">
        <Logo className="mb-6" />
        {sent ? (
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold sm:text-xl">Check your email</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              If an account exists for that address, we've sent a link to reset your password.
            </p>
            <Link to="/login" className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Reset your password</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Enter the email linked to your account and we'll send a reset link.</p>
            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" autoComplete="username" placeholder="you@readernest.com" className="pl-9" required />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </form>
            <Link to="/login" className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
