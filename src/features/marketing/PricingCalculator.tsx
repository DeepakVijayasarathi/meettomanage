import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calculator, Check as CheckIcon, CheckCircle2, TrendingUp, Users, Clock } from "lucide-react";
import { Seo } from "@/components/Seo";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { cn } from "@/lib/utils";
import { CTA_ORANGE, CARD, FOCUS_RING, H2_SM } from "./styles";
import { trackMarketingEvent } from "@/lib/analytics";

const SITE_URL = "https://meettomanage.cloud";

/** Plan data mirrored from Pricing.tsx FALLBACK_PLANS. Keeps this page accurate even before API loads. */
interface PlanData {
  name: string;
  monthlyINR: number;
  yearlyINR: number;
  students: number;
  staff: number;
  storageGB: number;
  classHours: number;
  recordingRetentionDays: number;
  hasGateway: boolean;
  hasWhatsApp: boolean;
  hasReports: boolean;
  hasWhiteLabel: boolean;
}

const PLANS: PlanData[] = [
  {
    name: "Basic",
    monthlyINR: 999,
    yearlyINR: 9990,
    students: 75,
    staff: 5,
    storageGB: 10,
    classHours: 360,
    recordingRetentionDays: 7,
    hasGateway: true,
    hasWhatsApp: false,
    hasReports: false,
    hasWhiteLabel: true,
  },
  {
    name: "Pro",
    monthlyINR: 2499,
    yearlyINR: 24990,
    students: 250,
    staff: 15,
    storageGB: 50,
    classHours: 1200,
    recordingRetentionDays: 30,
    hasGateway: true,
    hasWhatsApp: true,
    hasReports: false,
    hasWhiteLabel: true,
  },
  {
    name: "Growth",
    monthlyINR: 5999,
    yearlyINR: 59990,
    students: 750,
    staff: 50,
    storageGB: 200,
    classHours: 3600,
    recordingRetentionDays: 90,
    hasGateway: true,
    hasWhatsApp: true,
    hasReports: true,
    hasWhiteLabel: true,
  },
];

const ADDONS = [
  { name: "50 extra students", monthlyINR: 399 },
  { name: "50 GB extra storage", monthlyINR: 299 },
  { name: "Recording retention 180 days", monthlyINR: 499 },
  { name: "Custom domain (on Growth)", monthlyINR: 499 },
];

const FAQ = [
  {
    q: "How does Meet to Manage pricing work?",
    a: "One flat price per academy, not per student or per teacher. Every plan includes live classes, the parent app, and core scheduling. Add-ons are available when you need a little more.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes — upgrade or downgrade any time from your admin panel. You won't lose any data or settings.",
  },
  {
    q: "Is there a free plan?",
    a: "The free plan supports up to 25 students with live classes and the parent app. No credit card needed. Paid plans start at ₹999/month with a 14-day free trial.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Razorpay and Cashfree — UPI, debit cards, credit cards, and net banking. Annual plans give you two months free.",
  },
  {
    q: "Do you support multi-branch centres?",
    a: "Yes. The Growth plan supports up to 50 staff across locations. For custom branding and multi-branch setups, contact us for an enterprise quote.",
  },
  {
    q: "What happens if I reach my student limit?",
    a: "You can add a 50-student add-on for ₹399/month, or upgrade to the next plan. Nothing is removed from your account.",
  },
];

function CalculatorIcon({ className }: { className?: string }) {
  return <Calculator className={cn("h-5 w-5", className)} />;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  ariaLabel?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-[#1C1917]">
        {label}{" "}
        <span className="float-end font-bold text-[#C2410C]">
          {value.toLocaleString("en-IN")}
          {suffix}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-[#C2410C]"
        aria-label={ariaLabel || label}
      />
    </div>
  );
}

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <CheckCircle2 className={cn("h-4 w-4 shrink-0", on ? "text-[#EA580C]" : "text-[#D1D5DB]")} />
      <span className={on ? "text-[#1C1917]" : "text-[#9CA3AF]"}>{label}</span>
    </li>
  );
}

export default function PricingCalculator() {
  const [students, setStudents] = useState(50);
  const [teachers, setTeachers] = useState(3);
  const [addons, setAddons] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<"Monthly" | "Yearly">("Monthly");

  /** Recommend the best plan based on student and teacher count. */
  const recommendedPlan = useMemo(() => {
    return [...PLANS].sort((a, b) => {
      if (a.students >= students && b.students < students) return -1;
      if (b.students >= students && a.students < students) return 1;
      return 0;
    })[0] ?? PLANS[0];
  }, [students]);

  /** Calculate monthly cost including addons. */
  const monthlyCost = useMemo(() => {
    const plan = recommendedPlan;
    let cost = billingCycle === "Yearly" ? plan.yearlyINR / 12 : plan.monthlyINR;
    const addOnMonthly = addons.reduce((sum, a) => {
      const found = ADDONS.find((o) => o.name === a);
      return sum + (found?.monthlyINR ?? 0);
    }, 0);
    return Math.round(cost + addOnMonthly);
  }, [recommendedPlan, addons, billingCycle]);

  /** Yearly savings */
  const yearlySavings = useMemo(() => {
    return Math.round((recommendedPlan.monthlyINR * 12 - recommendedPlan.yearlyINR) / recommendedPlan.monthlyINR / 12 * 100);
  }, [recommendedPlan]);

  function toggleAddon(name: string) {
    setAddons((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  function handleWhatsAppClick() {
    trackMarketingEvent("whatsapp_clicked", "/pricing-calculator", "calculator-cta");
  }

  return (
    <div className="min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="calculator"
        title="Pricing Calculator — Find the Right Plan for Your Academy | Meet to Manage"
        description="Calculate how much coaching centre software costs for your academy size. Compare plans, add-ons, and yearly savings. Start free."
        path="/pricing-calculator"
      />

      <MarketingNav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF8F3] to-white pb-[clamp(48px,6vw,88px)] pt-[clamp(40px,5vw,72px)]">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(60%_80%_at_50%_0%,#FFE6D0,transparent)]" />
        <div className="relative mx-auto max-w-[860px] px-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C]">Pricing Calculator</p>
          <h1 className="font-display mt-4 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#1C1917]">
            Find the right plan for your academy.
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-lg leading-relaxed text-[#57534E]">
            Tell us how many students and teachers you have, and we'll recommend the best plan — including add-ons when you need a little more.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setBillingCycle("Monthly")}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                billingCycle === "Monthly"
                  ? "bg-[#111] text-white"
                  : "bg-white text-[#5B6472] hover:text-[#111]"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("Yearly")}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                billingCycle === "Yearly"
                  ? "bg-[#111] text-white"
                  : "bg-white text-[#5B6472] hover:text-[#111]"
              )}
            >
              Yearly <span className="font-bold text-[#EA580C]">(save {yearlySavings}%)</span>
            </button>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section className="mx-auto max-w-[1200px] px-5 pb-[clamp(64px,7vw,104px)]">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          {/* Left: Sliders + Add-ons */}
          <div>
            <div className={cn(CARD, "p-7 sm:p-8")}>
              <h2 className="font-display text-xl font-extrabold text-[#1C1917]">Your academy size</h2>
              <div className="mt-8 space-y-7">
                <Slider
                  label="Active students"
                  value={students}
                  min={5}
                  max={800}
                  step={5}
                  onChange={setStudents}
                  ariaLabel="Number of active students"
                />
                <Slider
                  label="Teachers & staff"
                  value={teachers}
                  min={1}
                  max={60}
                  onChange={setTeachers}
                  ariaLabel="Number of teachers and staff"
                />
              </div>
            </div>

            {/* Add-ons */}
            <div className={cn(CARD, "mt-6 p-7 sm:p-8")}>
              <h2 className="font-display text-xl font-extrabold text-[#1C1917]">Add-ons (optional)</h2>
              <p className="mt-2 text-sm text-[#57534E]">Only add what you need. Change any time.</p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {ADDONS.map((addon) => (
                  <li key={addon.name}>
                    <button
                      onClick={() => toggleAddon(addon.name)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-4 text-start transition-colors",
                        addons.includes(addon.name)
                          ? "border-[#C2410C] bg-[#FFF3EA]"
                          : "border-[#E5DDD1] bg-white hover:border-[#F2B98A]"
                      )}
                      aria-pressed={addons.includes(addon.name)}
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
                        style={{
                          borderColor: addons.includes(addon.name) ? "#C2410C" : "#D1D5DB",
                          backgroundColor: addons.includes(addon.name) ? "#C2410C" : "transparent",
                        }}
                      >
                        {addons.includes(addon.name) && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1C1917]">{addon.name}</p>
                        <p className="mt-0.5 text-xs font-bold text-[#C2410C]">₹{addon.monthlyINR}/month</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Plan */}
            <div className={cn(CARD, "mt-6 p-7 sm:p-8 border-[#C2410C] shadow-[0_4px_20px_-12px_rgba(194,65,12,0.3)]")}>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#C2410C]">Recommended for you</p>
              <p className="font-display mt-2 text-3xl font-extrabold text-[#1C1917]">{recommendedPlan.name} Plan</p>
              <p className="mt-1 text-sm text-[#57534E]">
                {recommendedPlan.students.toLocaleString("en-IN")} students · {recommendedPlan.staff.toLocaleString("en-IN")} staff
              </p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                <Check on={students <= recommendedPlan.students} label={`${students.toLocaleString("en-IN")} students fits`} />
                <Check on={teachers <= recommendedPlan.staff} label={`${teachers.toLocaleString("en-IN")} teachers fits`} />
                <Check on={recommendedPlan.hasGateway} label="Online fee collection" />
                <Check on={recommendedPlan.hasWhiteLabel} label="Your academy branding" />
                {students <= recommendedPlan.classHours && <Check on label={`${recommendedPlan.classHours} hours/mo classes`} />}
                {recommendedPlan.hasWhatsApp && <Check on label="WhatsApp notifications" />}
              </ul>
            </div>
          </div>

          {/* Right: Cost Summary */}
          <div className="lg:sticky lg:top-24">
            <div className={cn(CARD, "border-[#E5DDD1] bg-[#FFFBF7] p-7 sm:p-8")}>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#57534E]">
                Estimated monthly cost
              </p>
              <p className="font-display mt-3 text-[clamp(2.8rem,5vw,4rem)] font-extrabold tracking-tight text-[#C2410C]">
                ₹{monthlyCost.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-sm text-[#57534E]">
                {billingCycle === "Yearly" ? "per month (billed yearly)" : "per month"}
              </p>

              {billingCycle === "Yearly" && (
                <p className="mt-2 text-sm font-semibold text-[#EA580C]">
                  Save ₹{Math.round((recommendedPlan.monthlyINR - recommendedPlan.yearlyINR / 12) * 12)}/year
                </p>
              )}

              {addons.length > 0 && (
                <div className="mt-4 border-t border-[#E5DDD1] pt-4">
                  {addons.map((a) => {
                    const found = ADDONS.find((o) => o.name === a);
                    return found ? (
                      <div key={a} className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-[#57534E]">{a}</span>
                        <span className="font-semibold text-[#C2410C]">+₹{found.monthlyINR}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              <div className="mt-6 space-y-3">
                <Link
                  to="/get-started"
                  className={cn(CTA_ORANGE, "w-full justify-center rounded-2xl")}
                  onClick={() =>
                    trackMarketingEvent("sales_cta_clicked", "/pricing-calculator", `calculator-plan:${recommendedPlan.name.toLowerCase()}`)
                  }
                >
                  Book a free demo <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://wa.me/919344773231?text=Hi%2C%20I%27m%20using%20your%20pricing%20calculator%20and%20would%20like%20to%20discuss%20a%20plan."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D9E1F0] bg-white px-4 py-3 text-sm font-bold text-[#166534] transition-colors hover:border-[#86C99A] hover:bg-[#F0FDF4]"
                  onClick={handleWhatsAppClick}
                >
                  Chat on WhatsApp <span className="text-base">💬</span>
                </a>
                <Link
                  to="/signup?plan=free"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E8C8AD] bg-white px-4 py-3 text-sm font-bold text-[#9A3412] transition-colors hover:bg-[#FFF3EA]"
                >
                  Start free forever <span className="text-sm">→</span>
                </Link>
              </div>

              <p className="mt-4 text-center text-xs text-[#9CA3AF]">
                No credit card required · Free 30-minute walkthrough · No commitment
              </p>
            </div>

            {/* Trust strip */}
            <div className="mt-6 rounded-2xl border border-[#E5DDD1] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">What's included in every plan</p>
              <ul className="mt-3 grid gap-2.5 text-sm">
                <Check on label="Live video classroom" />
                <Check on label="Parent mobile app (iOS & Android)" />
                <Check on label="Scheduling and attendance" />
                <Check on label="Role-based team access" />
                <Check on label="Class recordings & resources" />
                <Check on label="WhatsApp notifications" />
              </ul>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-[clamp(56px,7vw,96px)] max-w-[820px]">
          <h2 className="font-display text-[clamp(1.5rem,2.8vw,2.2rem)] font-extrabold tracking-[-0.025em] text-[#1C1917]">
            Frequently asked questions
          </h2>
          <div className="mt-8 border-t border-[#E7D6C5]">
            {FAQ.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E7D6C5]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-6 py-5 text-start text-[15px] font-bold text-[#1C1917] transition-colors hover:text-[#C2410C]"
        aria-expanded={open}
      >
        {question}
        <svg className={cn("h-5 w-5 shrink-0 text-[#C2410C] transition-transform duration-300", open && "rotate-180")} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div className={cn("overflow-hidden transition-[max-height] duration-300 ease-in-out", open ? "max-h-48" : "max-h-0")}>
        <p className="pb-5 text-[15px] leading-relaxed text-[#57534E]">{answer}</p>
      </div>
    </div>
  );
}
