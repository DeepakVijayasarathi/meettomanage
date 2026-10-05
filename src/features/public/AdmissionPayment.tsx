import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { userMessage } from "@/lib/api";
import { useLightBrandScope } from "@/lib/theme";
import { formatCurrency } from "@/lib/utils";
import { FeeDisclaimer } from "@/components/FeeDisclaimer";
import { TERMS_ACCEPT_LABEL, TERMS_PAGE_PATH } from "@/content/terms";
import {
  getPublicAdmissionPayment,
  startPublicAdmissionPayment,
  type PublicAdmissionPayment,
} from "@/api/demoBookings";

// Same headline face as Login.tsx (scoped to this page only, not the global font-display).
const HEADLINE_FONT = "'Fredoka', ui-rounded, 'Segoe UI', sans-serif";

/**
 * The page behind the payment link an admission counsellor shares (/pay/:token). The parent has no
 * login yet -- it's emailed only after the counsellor verifies the payment and clicks Enroll -- so
 * this is anonymous and keyed by the link's own token. The Terms & Conditions are asked only at
 * the parent's FIRST payment (recorded server-side when "Pay now" is pressed); a parent who has
 * accepted before goes straight to payment.
 */
export default function AdmissionPayment() {
  useLightBrandScope();
  const { token = "" } = useParams();
  const [details, setDetails] = useState<PublicAdmissionPayment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicAdmissionPayment(token)
      .then((d) => !cancelled && setDetails(d))
      .catch((err) => !cancelled && setLoadError(userMessage(err, "This payment link couldn't be opened.")));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const termsRequired = details?.termsRequired ?? true;

  async function handlePay() {
    if ((termsRequired && !accepted) || starting) return;
    setStarting(true);
    setError(null);
    try {
      const { url } = await startPublicAdmissionPayment(token, termsRequired);
      window.location.assign(url);
    } catch (err) {
      setError(userMessage(err, "Couldn't start the payment. Please try again."));
      setStarting(false);
    }
  }

  return (
    <div className="theme-light-scope flex min-h-screen items-center justify-center bg-brand-cream px-6 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_24px_70px_-24px_rgba(43,32,20,0.22)] ring-1 ring-brand-ink/[0.04]">
        <Logo className="mb-6 justify-center" />

        {loadError ? (
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {loadError}
          </p>
        ) : !details ? (
          <div className="flex justify-center py-8 text-brand-ink/60">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : details.isPaid ? (
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h2 style={{ fontFamily: HEADLINE_FONT }} className="text-lg font-semibold tracking-tight text-brand-ink sm:text-xl">
              Payment received - thank you!
            </h2>
            <p className="mt-2 text-sm text-brand-ink/70">
              Our admission team will verify it shortly. Once they do, your login details for {details.childName}'s classes will be
              emailed to you automatically.
            </p>
          </div>
        ) : (
          <>
            <h2
              style={{ fontFamily: HEADLINE_FONT }}
              className="text-center text-lg font-semibold tracking-tight text-brand-ink sm:text-xl"
            >
              Confirm {details.childName}'s admission
            </h2>
            <p className="mt-1.5 text-center text-sm text-brand-ink/70">Hello {details.parentName}, here is your payment summary.</p>

            <dl className="mt-5 divide-y divide-brand-ink/10 rounded-2xl bg-brand-cream/60 text-sm">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-brand-ink/70">Course</dt>
                <dd className="text-right font-semibold text-brand-ink">{details.courseName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-brand-ink/70">Amount to pay</dt>
                <dd className="text-right text-base font-bold text-brand-ink">
                  {formatCurrency(details.amount - details.amountPaid, details.currency)}*
                </dd>
              </div>
            </dl>
            <FeeDisclaimer className="mt-2 !text-brand-ink/60" />

            {termsRequired && (
            <div className="mt-5 rounded-2xl border border-brand-ink/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                <ShieldCheck className="h-4 w-4 text-brand-green" /> Terms &amp; Conditions
              </p>
              {details.termsText && (
                <div className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line rounded-lg bg-brand-cream/60 p-3 text-xs leading-relaxed text-brand-ink/80">
                  {details.termsText}
                </div>
              )}
              {/* Always a way to read the full terms: the admin's own link if set, else the in-portal page. */}
              <a
                href={details.termsUrl || TERMS_PAGE_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue underline"
              >
                Read the full Terms &amp; Conditions <ExternalLink className="h-3 w-3" />
              </a>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-brand-ink">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                  aria-label={TERMS_ACCEPT_LABEL}
                  className="mt-0.5"
                />
                <span>{TERMS_ACCEPT_LABEL}</span>
              </label>
            </div>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button className="mt-5 w-full" size="lg" disabled={(termsRequired && !accepted) || starting} onClick={handlePay}>
              {starting && <Loader2 className="h-4 w-4 animate-spin" />}
              {starting ? "Opening secure payment…" : "Pay now"}
            </Button>
            {termsRequired && !accepted && (
              <p className="mt-2 text-center text-xs text-brand-ink/60">Accept the Terms &amp; Conditions to continue.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
