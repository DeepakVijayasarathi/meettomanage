import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Logo } from "@/components/Logo";
import { BookDemoDialog } from "@/components/BookDemoDialog";
import { Seo } from "@/components/Seo";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listStorePlans, submitStoreInquiry, type ApiStorePlan } from "@/api/store";
import { cn, formatCurrency } from "@/lib/utils";
import { MarketingHero } from "./MarketingHero";
import { CARD, CTA_DARK, CTA_ORANGE, HERO_OVERLAP } from "./styles";

const DEMO_PLANS: ApiStorePlan[] = [
  { id: "pp-1", name: "Phonics Foundations — Monthly", courseName: "Phonics", billingType: "Subscription", billingCycle: "Monthly", price: 2500, sessionsIncluded: 12 },
  { id: "pp-2", name: "Maths Explorers — Quarterly", courseName: "Maths", billingType: "Subscription", billingCycle: "Quarterly", price: 6900, sessionsIncluded: 36 },
  { id: "pp-3", name: "Public Speaking Foundations", courseName: "Public Speaking", billingType: "Subscription", billingCycle: "Monthly", price: 2800, sessionsIncluded: 12 },
];

const BILLING_LABEL: Record<ApiStorePlan["billingCycle"], string> = {
  Monthly: "per month",
  Quarterly: "per quarter",
  Yearly: "per year",
  OneTime: "one-time",
};

const EMPTY_FORM = { parentName: "", parentEmail: "", parentPhone: "", childName: "", childAge: "", notes: "" };

export default function Store() {
  useLightBrandScope();
  const brand = useBrand();
  const live = apiEnabled();
  const { data: plans, loading, error: plansError, reload: reloadPlans } = useApiData<ApiStorePlan[]>(() => listStorePlans(), DEMO_PLANS);

  const [selectedPlan, setSelectedPlan] = useState<ApiStorePlan | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Book-a-demo dialog — separate from the per-plan enroll dialog above, since a demo
  // isn't tied to any specific paid plan.
  const [demoOpen, setDemoOpen] = useState(false);

  function openEnroll(plan: ApiStorePlan) {
    setSelectedPlan(plan);
    setForm(EMPTY_FORM);
    setError(null);
    setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    // Same whitespace-only gap as the demo form above.
    if (!form.parentName.trim() || !form.childName.trim()) {
      setError("Enter a parent name and child name.");
      return;
    }

    if (!live) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitStoreInquiry({
        packagePlanId: selectedPlan.id,
        parentName: form.parentName,
        parentEmail: form.parentEmail,
        parentPhone: form.parentPhone,
        childName: form.childName,
        childAge: form.childAge ? Number(form.childAge) : undefined,
        notes: form.notes || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="store"
        title="Course Catalogue — Meet to Manage"
        description="Browse current courses and book a free demo class — no account needed."
        path="/store"
      />
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label={`${brand.name} home`}>
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Text label collapses to an icon-only button below `sm` — there isn't room for
                both this and Sign In as full-width buttons, but a visitor should still get an
                explicit way back to the homepage, not just an implicit logo tap. */}
            <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label="Back home">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> Back home
              </Link>
            </Button>
            <Button asChild className="!bg-[#F97316] !text-[#171B22] hover:!bg-[#EA580C]">
              <Link to="/login">
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <MarketingHero
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5 text-[#F97316]" /> Course Catalogue
          </>
        }
        title={<>Find the right course for {brand.name === "Meet to Manage" ? "your child" : "your family"}.</>}
        sub="Browse our current courses below. Tell us a little about your child and our team will reach out within a day to complete enrollment and set up the first session."
        overlap
      >
        <button type="button" onClick={() => setDemoOpen(true)} className={cn(CTA_ORANGE, "mt-8")}>
          <CalendarClock className="h-4 w-4" /> Book a Free Demo
        </button>
      </MarketingHero>

      <section className="mx-auto max-w-[1160px] px-5 pb-[clamp(72px,8vw,120px)]">
        {loading ? (
          <div className={cn(CARD, HERO_OVERLAP, "flex justify-center py-16 text-[#5B6472]")}>
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : plansError ? (
          <div className={cn(CARD, HERO_OVERLAP, "flex flex-col items-center gap-3 px-6 py-16 text-center")}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-[#111]">Couldn't load courses right now.</p>
            <Button variant="outline" onClick={() => reloadPlans()}>
              Try again
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div className={cn(CARD, HERO_OVERLAP, "px-6 py-10")}>
            <EmptyState icon={BookOpen} title="No courses open for enrollment right now" description="Check back soon, or sign in if you already have an account." />
          </div>
        ) : (
          <div className={cn(HERO_OVERLAP, "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3")}>
            {plans.map((plan) => (
              <div key={plan.id} className={cn(CARD, "flex flex-col p-8")}>
                <span className="flex h-12 w-12 items-center justify-center bg-[#0D1024] text-[#F97316]">
                  <GraduationCap className="h-6 w-6" />
                </span>
                <h3 className="font-display mt-5 text-xl font-extrabold leading-snug tracking-[-0.02em] text-[#111]">{plan.name}</h3>
                {plan.courseName && <p className="mt-1 text-sm text-[#5B6472]">{plan.courseName}</p>}
                <div className="mt-5 flex flex-1 flex-col border-t border-[#D9E1F0] pt-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-[clamp(1.75rem,2.6vw,2.25rem)] font-extrabold leading-none tracking-[-0.03em] text-[#111]">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-xs font-medium text-[#5B6472]">{BILLING_LABEL[plan.billingCycle]}</span>
                  </div>
                  {plan.sessionsIncluded && <p className="mt-2 text-xs text-[#5B6472]">{plan.sessionsIncluded} sessions included</p>}
                </div>
                <button type="button" onClick={() => openEnroll(plan)} className={cn(CTA_DARK, "mt-7 w-full")}>
                  Enroll Now
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
          <Logo imgClassName="h-11 w-11" />
          <p className="text-xs font-medium text-[#5B6472]">
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
        </div>
      </footer>

      <Dialog open={selectedPlan !== null} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="max-w-md">
          {submitted ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <h2 className="text-lg font-bold">Thanks — we've got it!</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {live
                  ? "Our admission team will reach out within a day to complete your enrollment."
                  : "Demo mode — no enquiry was actually sent."}
              </p>
              <Button className="mt-6 !bg-[#F97316] !text-[#171B22] hover:!bg-[#EA580C]" onClick={() => setSelectedPlan(null)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Enroll in {selectedPlan?.name}</DialogTitle>
                <DialogDescription>Tell us about your child — we'll follow up to complete enrollment and payment.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div className="grid gap-1.5">
                  <Label htmlFor="parentName">Your name</Label>
                  <Input
                    id="parentName"
                    required
                    value={form.parentName}
                    onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                    placeholder="e.g. Priya Kapoor"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="parentEmail">Email</Label>
                    <Input
                      id="parentEmail"
                      type="email"
                      required
                      value={form.parentEmail}
                      onChange={(e) => setForm((f) => ({ ...f, parentEmail: e.target.value }))}
                      placeholder="you@email.com"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="parentPhone">Phone</Label>
                    <Input
                      id="parentPhone"
                      type="tel"
                      required
                      value={form.parentPhone}
                      onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="childName">Child's name</Label>
                    <Input
                      id="childName"
                      required
                      value={form.childName}
                      onChange={(e) => setForm((f) => ({ ...f, childName: e.target.value }))}
                      placeholder="e.g. Aarav Kapoor"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="childAge">Child's age</Label>
                    <Input id="childAge" type="number" min={1} max={25} value={form.childAge} onChange={(e) => setForm((f) => ({ ...f, childAge: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="notes">Anything else? (optional)</Label>
                  <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
                <Button type="submit" disabled={submitting} className="mt-1 w-full !bg-[#F97316] !text-[#171B22] hover:!bg-[#EA580C]">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Enquiry"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
