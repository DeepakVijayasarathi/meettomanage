import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { Seo } from "@/components/Seo";
import { apiEnabled } from "@/lib/api";
import { requestPlatformDemo } from "@/api/marketing";
import { useLightBrandScope } from "@/lib/theme";

const INCLUDED = [
  "A walkthrough of live classes, scheduling, admissions and billing — as one system",
  "Time to ask about your academy's specific setup: branches, staff size, existing tools",
  "No commitment — we'll follow up to find a time that works for you",
];

const EMPTY_FORM = { fullName: "", workEmail: "", phone: "", academyName: "", message: "" };

export default function GetStarted() {
  useLightBrandScope();
  const live = apiEnabled();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.academyName.trim()) {
      setError("Enter your name and academy name.");
      return;
    }

    if (!live) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await requestPlatformDemo({
        fullName: form.fullName,
        workEmail: form.workEmail,
        phone: form.phone,
        academyName: form.academyName,
        message: form.message || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="getStarted"
        title="Request a Demo — Meet to Manage"
        description="Running an academy? See how Meet to Manage's live classroom, scheduling, admissions and billing work together — request a platform demo."
        path="/get-started"
      />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Meet to Manage home">
            <Logo />
          </Link>
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Back home
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FFE1C7] bg-[#FFF3EA] px-3.5 py-1.5 text-xs font-semibold text-[#C2410C]">
            <Building2 className="h-3.5 w-3.5" /> For academy owners
          </div>
          <h1 className="font-display mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            See Meet to Manage running your academy.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#5B6472]">
            This is a walkthrough of the platform itself — for academy owners deciding whether to run their business
            on it. Looking for a free trial class for your child instead?{" "}
            <Link to="/demo" className="font-semibold text-[#EA580C] hover:text-[#C2410C]">
              Book a class demo here.
            </Link>
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF3EA] text-[#EA580C]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="text-sm leading-relaxed text-[#171B22]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[#F5F6F9] p-6 shadow-pop sm:p-8">
          {submitted ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3EA] text-[#EA580C]">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <h2 className="text-lg font-bold">Thanks — we've got it!</h2>
              <p className="mt-1.5 text-sm text-[#5B6472]">
                {live
                  ? "Our team will reach out shortly to find a time for your platform demo."
                  : "Demo mode — no request was actually sent."}
              </p>
              <Button asChild variant="outline" className="mt-6 border-[#171B22]/15 text-[#171B22] hover:bg-[#171B22]/5">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="grid gap-1.5">
                <Label htmlFor="gs-fullName">Your name</Label>
                <Input
                  id="gs-fullName"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="e.g. Rohan Mehta"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="gs-workEmail">Work email</Label>
                  <Input
                    id="gs-workEmail"
                    type="email"
                    required
                    value={form.workEmail}
                    onChange={(e) => setForm((f) => ({ ...f, workEmail: e.target.value }))}
                    placeholder="you@youracademy.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="gs-phone">Phone</Label>
                  <Input
                    id="gs-phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gs-academyName">Academy name</Label>
                <Input
                  id="gs-academyName"
                  required
                  value={form.academyName}
                  onChange={(e) => setForm((f) => ({ ...f, academyName: e.target.value }))}
                  placeholder="e.g. Bright Step Academy"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gs-message">Anything else? (optional)</Label>
                <Textarea
                  id="gs-message"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Branches, staff size, what you're currently using…"
                />
              </div>
              {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="mt-1 w-full !bg-[#F97316] !text-white hover:!bg-[#EA580C]">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request a Demo"}
              </Button>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
          <Logo imgClassName="h-7 w-7" />
          <p className="text-xs font-medium text-[#5B6472]">© {new Date().getFullYear()} Meet to Manage. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
