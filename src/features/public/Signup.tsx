import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useLightBrandScope } from "@/lib/theme";
import { formatMoney, saasPublic, type PublicPlan } from "@/api/saas";
import { requestPlatformDemo } from "@/api/marketing";

const field = "w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-3 text-sm text-brand-ink outline-none transition placeholder:text-brand-ink/40 focus:border-primary focus:ring-4 focus:ring-primary/20";

/** Shown while self-service signup is switched off: the request goes to the team's lead queue, and the team creates the login. */
function AccessRequest() {
  const [form, setForm] = useState({ fullName: "", academyName: "", workEmail: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await requestPlatformDemo({
        fullName: form.fullName.trim(),
        academyName: form.academyName.trim(),
        workEmail: form.workEmail.trim(),
        phone: form.phone.trim(),
        message: "Account request from the signup page: please create my workspace and send my login.",
        landingPath: window.location.pathname,
      });
      setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send your request. Please try again."); }
    finally { setBusy(false); }
  }

  if (sent) return <div className="space-y-3 text-center" role="status">
    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
    <h1 className="text-2xl font-semibold text-brand-ink">Request received</h1>
    <p className="text-sm text-brand-ink/70">Our team will set up your workspace and send your login details to {form.workEmail}.</p>
  </div>;

  return <form onSubmit={submit} className="space-y-5">
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

/** Public self-service signup (/signup): creates an academy workspace on a free trial. */
export default function Signup() {
  useLightBrandScope();
  const [settings, setSettings] = useState<{ enabled: boolean; trialDays: number; platformName: string } | null>(null);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [form, setForm] = useState({ organizationName: "", code: "", adminEmail: "", adminPin: "", acceptTerms: false });
  const [codeNote, setCodeNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    void saasPublic.settings().then(setSettings).catch(() => setSettings({ enabled: false, trialDays: 14, platformName: "Meet to Manage" }));
    void saasPublic.plans().then(setPlans).catch(() => setPlans([]));
  }, []);

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
      const result = await saasPublic.signup({ ...form, code: form.code.trim().toLowerCase(), organizationName: form.organizationName.trim(), adminEmail: form.adminEmail.trim() });
      setCreated(result.loginPath);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create your workspace."); }
    finally { setBusy(false); }
  }

  const name = settings?.platformName ?? "Meet to Manage";
  return <div className="theme-light-scope min-h-screen bg-brand-cream px-4 py-10">
    <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6 shadow-[0_24px_70px_-24px_rgba(43,32,20,0.22)] ring-1 ring-brand-ink/[0.04] sm:p-10">
      <Logo className="mb-6 justify-center" />
      {created ? <div className="space-y-4 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="text-2xl font-semibold text-brand-ink">Your workspace is ready</h1>
        <p className="text-sm text-brand-ink/70">Sign in with the e-mail and PIN you just chose. Your {settings?.trialDays ?? 14}-day free trial has started.</p>
        <a href={created} className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Go to sign in</a>
      </div> : settings && !settings.enabled ? <AccessRequest /> : <form onSubmit={submit} className="space-y-5">
        <div className="text-center"><h1 className="text-2xl font-semibold text-brand-ink sm:text-3xl">Start your free trial</h1>
          <p className="mt-2 text-sm text-brand-ink/70">{settings?.trialDays ?? 14} days of {name}, no card needed. Set up your academy in minutes.</p></div>
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
        {plans.length > 0 && <p className="text-center text-xs text-brand-ink/60">After the trial, plans start at {formatMoney(Math.min(...plans.flatMap(p => p.prices.filter(x => x.billingInterval === "Month").map(x => x.amount))))}/month + GST.</p>}
      </form>}
    </div>
  </div>;
}
