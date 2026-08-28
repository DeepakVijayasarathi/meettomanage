import { useCallback, useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Logo } from "@/components/Logo";
import { useBrand } from "@/lib/branding";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { bookStoreDemo, listDemoAvailability, listStorePlans, submitStoreInquiry, type ApiAvailableDemoSlot, type ApiStorePlan } from "@/api/store";
import { cn, formatCurrency } from "@/lib/utils";

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

const EMPTY_DEMO_FORM = {
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  childName: "",
  childAge: "",
  department: "none",
  preferredStart: "",
};

/** yyyy-MM-ddTHH:mm in the visitor's own timezone, for a datetime-local input's min/max/value. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Store() {
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
  const [demoForm, setDemoForm] = useState(EMPTY_DEMO_FORM);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoConfirmed, setDemoConfirmed] = useState<string | null>(null);

  // The date the visitor is browsing for a slot — separate from demoForm.preferredStart,
  // which only gets set once they actually pick one of the real openings below.
  const [demoDate, setDemoDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<ApiAvailableDemoSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const demoMinStart = toLocalInputValue(new Date(Date.now() + 2 * 3_600_000 + 10 * 60_000)); // 2h + a small buffer
  const demoMaxStart = toLocalInputValue(new Date(Date.now() + 29 * 86_400_000));

  const demoDepartment = demoForm.department === "none" ? undefined : (demoForm.department as "Phonics" | "Maths");

  const loadAvailableSlots = useCallback(
    (date: string) => {
      if (!date) {
        setAvailableSlots([]);
        return;
      }
      setSlotsLoading(true);
      setSlotsError(null);
      listDemoAvailability(date, demoDepartment)
        .then(setAvailableSlots)
        .catch((err) => setSlotsError(err instanceof Error ? err.message : "Couldn't load available times."))
        .finally(() => setSlotsLoading(false));
    },
    [demoDepartment]
  );

  // Real openings only exist with a backend to ask — demo mode keeps the old free-text picker.
  useEffect(() => {
    if (!live || !demoOpen) return;
    loadAvailableSlots(demoDate);
  }, [live, demoOpen, demoDate, loadAvailableSlots]);

  function openEnroll(plan: ApiStorePlan) {
    setSelectedPlan(plan);
    setForm(EMPTY_FORM);
    setError(null);
    setSubmitted(false);
  }

  function openDemoBooking() {
    setDemoOpen(true);
    setDemoForm(EMPTY_DEMO_FORM);
    setDemoDate("");
    setAvailableSlots([]);
    setSlotsError(null);
    setDemoError(null);
    setDemoConfirmed(null);
  }

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The native `required` attribute blocks a truly empty field but not a whitespace-only
    // one (" " satisfies it), which then reads back as a blank name on every screen that
    // shows this booking.
    if (!demoForm.parentName.trim() || !demoForm.childName.trim()) {
      setDemoError("Enter a parent name and child name.");
      return;
    }
    if (!demoForm.preferredStart) {
      setDemoError(live ? "Pick one of the available times below." : "Pick a date and time for the demo.");
      return;
    }

    if (!live) {
      setDemoConfirmed(new Date(demoForm.preferredStart).toLocaleString());
      return;
    }

    setDemoSubmitting(true);
    setDemoError(null);
    try {
      const confirmation = await bookStoreDemo({
        parentName: demoForm.parentName,
        parentEmail: demoForm.parentEmail,
        parentPhone: demoForm.parentPhone,
        childName: demoForm.childName,
        childAge: demoForm.childAge ? Number(demoForm.childAge) : undefined,
        department: demoForm.department === "none" ? undefined : (demoForm.department as "Phonics" | "Maths"),
        preferredStartAtUtc: new Date(demoForm.preferredStart).toISOString(),
      });
      setDemoConfirmed(new Date(confirmation.scheduledStartAtUtc).toLocaleString());
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Couldn't book that slot. Please try again.");
      // Someone else likely just took it — clear the stale pick and refresh what's actually
      // still open, instead of leaving a slot chip selected that no longer works.
      setDemoForm((f) => ({ ...f, preferredStart: "" }));
      loadAvailableSlots(demoDate);
    } finally {
      setDemoSubmitting(false);
    }
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
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="sticky top-0 z-30 border-b border-brand-ink/10 bg-brand-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label={`${brand.name} home`}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> Back home
              </Link>
            </Button>
            <Button asChild className="!bg-brand-green !text-white hover:!bg-brand-greenDark">
              <Link to="/login">
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14 text-center">
        <Badge className="gap-1.5 bg-brand-green/10 text-brand-greenDark hover:bg-brand-green/10">
          <Sparkles className="h-3.5 w-3.5" /> Course Catalogue
        </Badge>
        <h1 className="font-display mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
          Find the right course for {brand.name === "The Reader Nest" ? "your child" : "your family"}.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-ink/65">
          Browse our current courses below. Tell us a little about your child and our team will reach out within a
          day to complete enrollment and set up the first session.
        </p>
        <Button
          size="lg"
          onClick={openDemoBooking}
          className="mt-6 !bg-brand-navy !text-white hover:!bg-brand-navyDark"
        >
          <CalendarClock className="h-4 w-4" /> Book a Free Demo
        </Button>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        {loading ? (
          <div className="flex justify-center py-16 text-brand-ink/50">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : plansError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-brand-ink">Couldn't load courses right now.</p>
            <Button variant="outline" onClick={() => reloadPlans()}>
              Try again
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <EmptyState icon={BookOpen} title="No courses open for enrollment right now" description="Check back soon, or sign in if you already have an account." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-col rounded-2xl border border-brand-ink/10 bg-white p-6 shadow-[0_16px_40px_-24px_rgba(43,32,20,0.18)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <h3 className="font-display mt-4 text-lg font-bold tracking-tight text-brand-ink">{plan.name}</h3>
                {plan.courseName && <p className="mt-0.5 text-sm text-brand-ink/60">{plan.courseName}</p>}
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-brand-ink">{formatCurrency(plan.price)}</span>
                  <span className="text-xs font-medium text-brand-ink/50">{BILLING_LABEL[plan.billingCycle]}</span>
                </div>
                {plan.sessionsIncluded && (
                  <p className="mt-1 text-xs text-brand-ink/50">{plan.sessionsIncluded} sessions included</p>
                )}
                <Button onClick={() => openEnroll(plan)} className="mt-6 !bg-brand-green !text-white hover:!bg-brand-greenDark">
                  Enroll Now
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

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
              <Button className="mt-6 !bg-brand-green !text-white hover:!bg-brand-greenDark" onClick={() => setSelectedPlan(null)}>
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
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
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
                <Button type="submit" disabled={submitting} className="mt-1 w-full !bg-brand-green !text-white hover:!bg-brand-greenDark">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Enquiry"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-md">
          {demoConfirmed ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <h2 className="text-lg font-bold">Demo booked!</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {live
                  ? `See you on ${demoConfirmed}. A confirmation with the join link is on its way to your email.`
                  : `Demo mode — "booked" for ${demoConfirmed}, but nothing was actually scheduled.`}
              </p>
              <Button className="mt-6 !bg-brand-green !text-white hover:!bg-brand-greenDark" onClick={() => setDemoOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Book a free demo class</DialogTitle>
                <DialogDescription>
                  Pick a time that works for you — we'll match you with a teacher and send the join link by email.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleDemoSubmit} className="flex flex-col gap-3.5">
                <div className="grid gap-1.5">
                  <Label htmlFor="demoParentName">Your name</Label>
                  <Input
                    id="demoParentName"
                    required
                    value={demoForm.parentName}
                    onChange={(e) => setDemoForm((f) => ({ ...f, parentName: e.target.value }))}
                    placeholder="e.g. Priya Kapoor"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="demoParentEmail">Email</Label>
                    <Input
                      id="demoParentEmail"
                      type="email"
                      required
                      value={demoForm.parentEmail}
                      onChange={(e) => setDemoForm((f) => ({ ...f, parentEmail: e.target.value }))}
                      placeholder="you@email.com"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="demoParentPhone">Phone</Label>
                    <Input
                      id="demoParentPhone"
                      type="tel"
                      required
                      value={demoForm.parentPhone}
                      onChange={(e) => setDemoForm((f) => ({ ...f, parentPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="demoChildName">Child's name</Label>
                    <Input
                      id="demoChildName"
                      required
                      value={demoForm.childName}
                      onChange={(e) => setDemoForm((f) => ({ ...f, childName: e.target.value }))}
                      placeholder="e.g. Aarav Kapoor"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="demoChildAge">Child's age</Label>
                    <Input
                      id="demoChildAge"
                      type="number"
                      min={1}
                      max={25}
                      value={demoForm.childAge}
                      onChange={(e) => setDemoForm((f) => ({ ...f, childAge: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Subject (optional)</Label>
                  <Select value={demoForm.department} onValueChange={(v) => setDemoForm((f) => ({ ...f, department: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No preference</SelectItem>
                      <SelectItem value="Phonics">Phonics</SelectItem>
                      <SelectItem value="Maths">Maths</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {live ? (
                  <>
                    <div className="grid gap-1.5">
                      <Label htmlFor="demoDate">Preferred date</Label>
                      <Input
                        id="demoDate"
                        type="date"
                        required
                        min={demoMinStart.slice(0, 10)}
                        max={demoMaxStart.slice(0, 10)}
                        value={demoDate}
                        onChange={(e) => {
                          setDemoDate(e.target.value);
                          setDemoForm((f) => ({ ...f, preferredStart: "" }));
                        }}
                      />
                      <p className="text-xs text-brand-ink/50">At least 2 hours from now, within the next month.</p>
                    </div>
                    {demoDate && (
                      <div className="grid gap-1.5">
                        <Label>Available times</Label>
                        {slotsLoading ? (
                          <p className="flex items-center gap-1.5 text-xs text-brand-ink/50">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking availability…
                          </p>
                        ) : slotsError ? (
                          <p className="text-xs text-destructive">{slotsError}</p>
                        ) : availableSlots.length === 0 ? (
                          <p className="text-xs text-brand-ink/50">No open slots that day — try another date.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {availableSlots.map((slot) => {
                              const slotLocal = toLocalInputValue(new Date(slot.startAtUtc));
                              const isSelected = demoForm.preferredStart === slotLocal;
                              return (
                                <button
                                  key={slot.startAtUtc}
                                  type="button"
                                  onClick={() => setDemoForm((f) => ({ ...f, preferredStart: slotLocal }))}
                                  aria-pressed={isSelected}
                                  className={cn(
                                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                                    isSelected
                                      ? "border-brand-green bg-brand-green text-white"
                                      : "border-brand-ink/15 text-brand-ink hover:border-brand-green"
                                  )}
                                >
                                  {new Date(slot.startAtUtc).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid gap-1.5">
                    <Label htmlFor="demoStart">Preferred date &amp; time</Label>
                    <Input
                      id="demoStart"
                      type="datetime-local"
                      required
                      min={demoMinStart}
                      max={demoMaxStart}
                      value={demoForm.preferredStart}
                      onChange={(e) => setDemoForm((f) => ({ ...f, preferredStart: e.target.value }))}
                    />
                    <p className="text-xs text-brand-ink/50">At least 2 hours from now, within the next month.</p>
                  </div>
                )}
                {demoError && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {demoError}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={demoSubmitting}
                  className="mt-1 w-full !bg-brand-navy !text-white hover:!bg-brand-navyDark"
                >
                  {demoSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book Demo"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
