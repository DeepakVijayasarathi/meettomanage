import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useLightBrandScope } from "@/lib/theme";
import { formatMoney, isModuleKey, saasPublic, type PublicPlan, type SignupSettings } from "@/api/saas";
import { requestPlatformDemo } from "@/api/marketing";
import { marketingAttribution, marketingVisitorId, trackDemoBooked, trackMarketingEvent, trackMarketingPageView } from "@/lib/analytics";
import { markDemoBooked } from "@/features/marketing/chatTeaser";
import { Helmet } from "react-helmet-async";

/** Saves a signup as a lead in the marketing console, linked to the visitor's journey and traffic source. */
function saveSignupLead(input: { fullName: string; academyName: string; workEmail: string; phone: string; message: string }) {
  const attribution = marketingAttribution();
  return requestPlatformDemo({
    ...input,
    visitorId: marketingVisitorId(),
    source: attribution.utmSource ?? attribution.referrerHost,
    medium: attribution.utmMedium,
    campaign: attribution.utmCampaign,
    landingPath: window.location.pathname,
  });
}

/** Form funnel events (started / abandoned) for the marketing console. Returns the "started" handler and a "submitted" marker. */
function useFormFunnel() {
  const started = useRef(false);
  const submitted = useRef(false);
  useEffect(() => {
    const abandoned = () => { if (started.current && !submitted.current) trackMarketingEvent("form_abandoned"); };
    window.addEventListener("pagehide", abandoned);
    return () => { window.removeEventListener("pagehide", abandoned); abandoned(); };
  }, []);
  return {
    onStart: () => { if (!started.current) { started.current = true; trackMarketingEvent("form_started"); } },
    onSubmitted: () => { submitted.current = true; trackMarketingEvent("form_submitted"); markDemoBooked(); void trackDemoBooked(window.location.pathname); },
  };
}

const field = "w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-3 text-sm text-brand-ink outline-none transition placeholder:text-brand-ink/40 focus:border-primary focus:ring-4 focus:ring-primary/20";

/** Shown while self-service signup is switched off: the request goes to the team's lead queue, and the team creates the login. */
function AccessRequest() {
  const [form, setForm] = useState({ fullName: "", academyName: "", workEmail: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const funnel = useFormFunnel();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await saveSignupLead({
        fullName: form.fullName.trim(),
        academyName: form.academyName.trim(),
        workEmail: form.workEmail.trim(),
        phone: form.phone.trim(),
        message: "Account request from the signup page: please create my workspace and send my login.",
      });
      funnel.onSubmitted();
      setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send your request. Please try again."); }
    finally { setBusy(false); }
  }

  if (sent) return <div className="space-y-3 text-center" role="status">
    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
    <h1 className="text-2xl font-semibold text-brand-ink">Request received</h1>
    <p className="text-sm text-brand-ink/70">Our team will set up your workspace and send your login details to {form.workEmail}.</p>
  </div>;

  return <form onSubmit={submit} onFocus={funnel.onStart} className="space-y-5">
    <div className="text-center"><h1 className="text-2xl font-semibold text-brand-ink sm:text-3xl">Request your account</h1>
      <p className="mt-2 text-sm text-brand-ink/70">Tell us about your academy. Our team creates your workspace and sends your login details by e-mail.</p></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block space-y-1.5 text-sm font-medium text-brand-ink"><span>Your name</span>
        <input required maxLength={120} autoComplete="name" placeholder="e.g. Priya Sharma" className={field} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
      <label className="block space-y-1.5 text-sm font-medium text-brand-ink"><span>Academy name</span>
        <input required maxLength={200} placeholder="e.g. Bright Minds Academy" className={field} value={form.academyName} onChange={e => setForm({ ...form, academyName: e.target.value })} /></label>
      <label className="block space-y-1.5 text-sm font-medium text-brand-ink"><span>E-mail</span>
        <input type="email" required autoComplete="email" placeholder="you@youracademy.com" className={field} value={form.workEmail} onChange={e => setForm({ ...form, workEmail: e.target.value })} /></label>
      <label className="block space-y-1.5 text-sm font-medium text-brand-ink"><span>Phone / WhatsApp</span>
        <input type="tel" required autoComplete="tel" placeholder="+91 98765 43210" className={field} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
    </div>
    <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
      {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : "Send request"}</button>
    <p className="text-center text-xs text-brand-ink/60">Prefer to talk first? <Link to="/demo" className="font-medium text-primary underline-offset-4 hover:underline">Book a free walkthrough</Link>.</p>
  </form>;
}

/** Public self-service signup (/signup): creates an academy workspace on the Free plan or a free trial. */
export default function Signup() {
  useLightBrandScope();
  const [settings, setSettings] = useState<SignupSettings | null>(null);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [form, setForm] = useState({ organizationName: "", code: "", adminEmail: "", adminPin: "", acceptTerms: false });
  const [codeNote, setCodeNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  // "free" plan code, or "trial". Free is the default when the platform offers one.
  const [choice, setChoice] = useState<string | null>(null);
  // From the pricing page: ?plan=free|trial, and ?for=<paid plan> when they came from a paid plan's trial button.
  const [params] = useSearchParams();
  const wantedPlan = params.get("plan");
  const forPlan = params.get("for");
  const funnel = useFormFunnel();

  // /signup isn't a marketing page (no <Seo>), so count its visit here for the console.
  useEffect(() => { void trackMarketingPageView("/signup", "Sign up"); }, []);

  useEffect(() => {
    void saasPublic.settings().then(value => { setSettings(value); setChoice(c => c ?? (wantedPlan === "trial" || !value.freePlanCode ? "trial" : value.freePlanCode)); }).catch(() => setSettings({ enabled: false, trialDays: 14, platformName: "Meet to Manage" }));
    void saasPublic.plans().then(setPlans).catch(() => setPlans([]));
  }, [wantedPlan]);

  async function checkCode() {
    const code = form.code.trim().toLowerCase();
    if (!code) return setCodeNote(null);
    try {
      const result = await saasPublic.checkCode(code);
      setCodeNote(result.available ? { ok: true, text: "That address is available." } : { ok: false, text: result.reason ?? "Not available." });
    } catch { setCodeNote(null); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await saasPublic.signup({ ...form, planCode: choice ?? undefined, code: form.code.trim().toLowerCase(), organizationName: form.organizationName.trim(), adminEmail: form.adminEmail.trim() });
      setCreated(result.loginPath);
      // The workspace exists now; also list the new academy as a lead in the marketing console.
      funnel.onSubmitted();
      void saveSignupLead({
        fullName: form.organizationName.trim(),
        academyName: form.organizationName.trim(),
        workEmail: form.adminEmail.trim(),
        phone: "",
        message: `Self-service signup: created workspace /t/${result.tenantCode} on ${isFree ? `the ${result.planName ?? "Free"} plan` : "a free trial"}.`,
      }).catch(() => undefined);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create your workspace."); }
    finally { setBusy(false); }
  }

  const name = settings?.platformName ?? "Meet to Manage";
  const trialDays = settings?.trialDays ?? 14;
  const freePlan = plans.find(p => p.code === settings?.freePlanCode);
  const isFree = !!settings?.freePlanCode && choice === settings.freePlanCode;
  const freeLimit = (key: string, unit: string) => {
    const value = freePlan?.entitlements.find(e => e.key === key)?.value;
    return value === undefined || value < 0 ? null : `${value} ${unit}`;
  };
  const freeHighlights = [freeLimit("max_students", "students"), freeLimit("max_staff", "staff accounts")].filter(Boolean).join(" · ");
  const freeModules = freePlan?.entitlements.filter(e => isModuleKey(e.key) && e.value === 1).length ?? 0;
  const paidPrices = plans.flatMap(p => p.prices.filter(x => x.billingInterval === "Month" && x.amount > 0).map(x => x.amount));
  return <div className="theme-light-scope min-h-screen bg-brand-cream px-4 py-10">
    <Helmet><title>Create your Meet to Manage workspace</title><meta name="robots" content="noindex, follow" /></Helmet>
    <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6 shadow-[0_24px_70px_-24px_rgba(43,32,20,0.22)] ring-1 ring-brand-ink/[0.04] sm:p-10">
      <Logo className="mb-6 justify-center" />
      {created ? <div className="space-y-4 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="text-2xl font-semibold text-brand-ink">Your workspace is ready</h1>
        <p className="text-sm text-brand-ink/70">Sign in with the e-mail and PIN you just chose. {isFree ? `You're on the ${settings?.freePlanName ?? "Free"} plan: free forever, upgrade any time from Billing.` : `Your ${trialDays}-day free trial has started.`}</p>
        <a href={created} className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Go to sign in</a>
      </div> : settings && !settings.enabled ? <AccessRequest /> : <form onSubmit={submit} onFocus={funnel.onStart} className="space-y-5">
        <div className="text-center"><h1 className="text-2xl font-semibold text-brand-ink sm:text-3xl">{settings?.freePlanCode ? "Create your free account" : "Start your free trial"}</h1>
          <p className="mt-2 text-sm text-brand-ink/70">{settings?.freePlanCode ? `Use ${name} free, no card needed.` : `${trialDays} days of ${name}, no card needed.`} Set up your academy in minutes.</p></div>
        {settings?.freePlanCode && <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Choose how to start</legend>
          {[
            { code: settings.freePlanCode, title: `${settings.freePlanName ?? "Free"} plan`, badge: "Free forever",
              text: `Core modules${freeModules ? ` (${freeModules})` : ""}: students, courses, batches, live classes and content.${freeHighlights ? ` Up to ${freeHighlights}.` : ""}` },
            { code: "trial", title: `${trialDays}-day trial`, badge: "Everything",
              text: "Every module and feature, including fees, payouts, reports and recordings. Afterwards you stay on Free unless you pick a plan." },
          ].map(option => <label key={option.code} className={`cursor-pointer rounded-2xl border p-4 text-sm transition ${choice === option.code ? "border-primary bg-primary/5 ring-4 ring-primary/15" : "border-brand-ink/15 hover:border-brand-ink/30"}`}>
            <input type="radio" name="plan" className="sr-only" checked={choice === option.code} onChange={() => setChoice(option.code)} />
            <span className="flex items-center justify-between gap-2"><span className="font-semibold text-brand-ink">{option.title}</span>
              <span className="rounded-full bg-brand-ink/5 px-2 py-0.5 text-xs font-medium text-brand-ink/70">{option.badge}</span></span>
            <span className="mt-1.5 block text-brand-ink/70">{option.text}</span>
          </label>)}
        </fieldset>}
        {choice === "trial" && forPlan && <p className="-mt-2 text-center text-xs text-brand-ink/60">The trial includes everything in the {forPlan.charAt(0).toUpperCase() + forPlan.slice(1)} plan. Choose it from Billing whenever you're ready.</p>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <label className="block space-y-1.5 text-sm font-medium text-brand-ink"><span>Academy name</span>
          <input required maxLength={200} className={field} value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} /></label>
        <label className="block space-y-1.5 text-sm font-medium text-brand-ink"><span>Your web address</span>
          <input required pattern="[a-z][a-z0-9\-]{2,49}" title="3-50 lowercase letters, numbers or hyphens, starting with a letter" placeholder="my-academy" className={field} value={form.code}
            onChange={e => setForm({ ...form, code: e.target.value.toLowerCase() })} onBlur={() => { void checkCode(); }} />
          <span className={`block text-xs font-normal ${codeNote ? (codeNote.ok ? "text-emerald-700" : "text-red-700") : "text-brand-ink/50"}`}>{codeNote?.text ?? `Your sign-in page will be /t/${form.code || "my-academy"}/login`}</span></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium text-brand-ink"><span>Administrator e-mail</span>
            <input type="email" required autoComplete="email" className={field} value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} /></label>
          <label className="block space-y-1.5 text-sm font-medium text-brand-ink"><span>Choose a 4-digit PIN</span>
            <input type="password" inputMode="numeric" required pattern="[0-9]{4}" maxLength={4} autoComplete="new-password" className={field} value={form.adminPin} onChange={e => setForm({ ...form, adminPin: e.target.value })} /></label>
        </div>
        <label className="flex items-start gap-2 text-sm text-brand-ink/80"><input type="checkbox" required className="mt-1" checked={form.acceptTerms} onChange={e => setForm({ ...form, acceptTerms: e.target.checked })} />
          <span>I agree to the <Link to="/terms" className="font-medium text-primary underline-offset-4 hover:underline">Terms &amp; Conditions</Link> and the <Link to="/policy" className="font-medium text-primary underline-offset-4 hover:underline">Privacy Policy</Link>.</span></label>
        <button disabled={busy || codeNote?.ok === false} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Creating your workspace… this can take a minute</> : "Create my workspace"}</button>
        {paidPrices.length > 0 && <p className="text-center text-xs text-brand-ink/60">{isFree ? "Need more? Paid" : "After the trial, paid"} plans start at {formatMoney(Math.min(...paidPrices))}/month + GST.</p>}
      </form>}
    </div>
  </div>;
}
