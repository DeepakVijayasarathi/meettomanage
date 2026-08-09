import { Link } from "react-router-dom";
import { ArrowLeft, ShieldQuestion } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <Logo className="mb-6 justify-center" />
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldQuestion className="h-6 w-6" />
        </span>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">Forgot your PIN?</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          PIN resets are handled by an administrator, not by email. Contact your school's admin team and ask them to
          resend your login PIN — it'll arrive at the email address on your account.
        </p>
        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    </div>
  );
}
