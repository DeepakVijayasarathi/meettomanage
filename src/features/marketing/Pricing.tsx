import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Seo } from "@/components/Seo";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Currency = "INR" | "USD";
type Cycle = "monthly" | "annual";

const CURRENCY_SYMBOL: Record<Currency, string> = { INR: "₹", USD: "$" };

/** Illustrative rates only — no billing engine enforces per-student charges yet (see
 *  docs/requirements/influencer-personal-coaches.md, open questions). USD is a rounded,
 *  quoted equivalent for coaches/academies billing outside India, not a live FX conversion. */
const SAAS_RATE: Record<Currency, Record<Cycle, number>> = {
  INR: { monthly: 100, annual: 1000 }, // annual = 10 months billed, ~17% off
  USD: { monthly: 1.2, annual: 12 },
};

const FREE_STUDENTS = 10;

const VOLUME_TIERS: { range: string; INR: number; USD: number }[] = [
  { range: `First ${FREE_STUDENTS} students`, INR: 0, USD: 0 },
  { range: "11–200 students", INR: 100, USD: 1.2 },
  { range: "201–500 students", INR: 85, USD: 1.0 },
  { range: "501+ students", INR: 70, USD: 0.85 },
];

const ADDONS: { name: string; unit: string; INR: number; USD: number }[] = [
  { name: "Extended recording retention — 60 days instead of 15", unit: "/month", INR: 499, USD: 6 },
  { name: "Extra WhatsApp/SMS notification credits — 1,000-pack", unit: "/pack", INR: 299, USD: 3.5 },
];

function formatAmount(amount: number, currency: Currency): string {
  if (amount === 0) return "Free";
  const symbol = CURRENCY_SYMBOL[currency];
  return currency === "INR" ? `${symbol}${amount.toLocaleString("en-IN")}` : `${symbol}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/** Every feature line restates a capability already shipped and described on the homepage
 *  (FEATURES in Home.tsx) — nothing promised here that the product doesn't actually do. */
const SAAS_FEATURES = [
  "Live Classroom, Whiteboard & Gamification",
  "Smart Scheduling — 1:1 and group classes",
  "Admissions CRM & conversion pipeline",
  "Billing via Razorpay or Cashfree",
  "Analytics & Reports dashboard",
  "Email, SMS & WhatsApp notifications",
];

const OWNERSHIP_FEATURES = [
  "Everything in Pay As You Grow",
  "Your own brand, logo and domain — not ours",
  "Deployed on infrastructure of your choice",
  "No per-student billing, ever",
  "Annual Maintenance Contract: updates, fixes & support",
  "Priced once for your scale, not per student",
];

/** Toggle-pill group — same visual pattern as the Features section's category filter on the
 *  homepage, reused here for currency and billing cycle instead of introducing a new control style. */
function ToggleGroup<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="inline-flex gap-1 rounded-full border border-black/10 bg-[#F5F6F9] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              active ? "bg-[#F97316] text-white" : "text-[#5B6472] hover:text-[#171B22]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface PlanCardProps {
  icon: typeof IndianRupee;
  eyebrow: string;
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaTo: string;
  highlighted?: boolean;
  banner?: string;
}

function PlanCard({ icon: Icon, eyebrow, name, price, priceNote, description, features, ctaLabel, ctaTo, highlighted, banner }: PlanCardProps) {
  return (
    <div
      className={
        highlighted
          ? "relative flex flex-col rounded-2xl border-2 border-[#F97316] bg-white p-7 shadow-pop sm:p-8"
          : "relative flex flex-col rounded-2xl border border-black/10 bg-white p-7 sm:p-8"
      }
    >
      {highlighted && (
        <span className="absolute -top-3 left-7 rounded-full bg-[#F97316] px-3 py-1 text-[11px] font-bold tracking-wide text-white">
          MOST FLEXIBLE
        </span>
      )}
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF3EA] text-[#EA580C]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{eyebrow}</p>
      <h3 className="font-display mt-1.5 text-2xl font-extrabold tracking-tight text-[#171B22]">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-extrabold tracking-tight text-[#171B22]">{price}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-[#5B6472]">{priceNote}</p>
      {banner && (
        <p className="mt-3 inline-flex w-fit items-center rounded-full bg-[#FFF3EA] px-3 py-1 text-xs font-semibold text-[#C2410C]">{banner}</p>
      )}
      <p className="mt-4 text-sm leading-relaxed text-[#5B6472]">{description}</p>

      <ul className="mt-6 flex flex-col gap-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" />
            <span className="text-sm leading-relaxed text-[#171B22]">{f}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        size="lg"
        className={
          highlighted
            ? "mt-8 !bg-[#F97316] !text-white hover:!bg-[#EA580C]"
            : "mt-8 border-[#171B22]/15 text-[#171B22] hover:bg-[#171B22]/5"
        }
        variant={highlighted ? undefined : "outline"}
      >
        <Link to={ctaTo}>
          {ctaLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export default function Pricing() {
  useLightBrandScope();
  const brand = useBrand();
  const [currency, setCurrency] = useState<Currency>("INR");
  const [cycle, setCycle] = useState<Cycle>("monthly");

  const rate = SAAS_RATE[currency][cycle];
  const saasPrice = formatAmount(rate, currency);
  const saasPriceNote = cycle === "monthly" ? "per active student / month" : "per active student / year";

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="pricing"
        title="Pricing — Meet to Manage"
        description="Pay per active student in ₹ or $ with no setup fee, or own Meet to Manage outright under your own brand with an Annual Maintenance Contract."
        path="/pricing"
      />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label={`${brand.name} home`}>
            <Logo />
          </Link>
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Back home
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">Pricing</p>
          <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Pay per student, or own it outright.
          </h1>
          <p className="mt-3 text-sm text-[#5B6472]">
            Two ways to run on {brand.name} — a rate that scales with your enrollment, priced in ₹ or $, or a
            one-time ownership license with an annual contract. Your first {FREE_STUDENTS} students are always free.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ToggleGroup
            value={currency}
            onChange={setCurrency}
            options={[
              { value: "INR", label: "₹ INR" },
              { value: "USD", label: "$ USD" },
            ]}
          />
          <ToggleGroup
            value={cycle}
            onChange={setCycle}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "annual", label: "Annual — 2 months free" },
            ]}
          />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PlanCard
            icon={IndianRupee}
            eyebrow="Subscription"
            name="Pay As You Grow"
            price={saasPrice}
            priceNote={saasPriceNote}
            banner={`Free for your first ${FREE_STUDENTS} students`}
            description="Billed only on students actually enrolled that month — add or drop batches freely, with every feature included from day one and no setup fee."
            features={SAAS_FEATURES}
            ctaLabel="Request a Demo"
            ctaTo="/get-started?for=coach"
            highlighted
          />
          <PlanCard
            icon={Building2}
            eyebrow="One-time + AMC"
            name="Own Brand, Own Software"
            price="Custom"
            priceNote="one-time license + Annual Maintenance Contract"
            description="For academies that want to run the platform under their own name and domain, with no recurring per-student cost — maintained through an annual support contract instead."
            features={OWNERSHIP_FEATURES}
            ctaLabel="Talk to Sales"
            ctaTo="/get-started"
          />
        </div>

        {/* Volume pricing — how the per-student rate steps down at scale, for institutes
            weighing Pay As You Grow against a custom ownership quote. */}
        <div className="mt-16">
          <h2 className="font-display text-center text-xl font-extrabold tracking-tight">Volume pricing</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[#5B6472]">
            The per-student rate on Pay As You Grow steps down automatically as your enrollment grows — no need to
            renegotiate.
          </p>
          <div className="mx-auto mt-6 max-w-2xl overflow-x-auto rounded-2xl border border-black/10">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#F5F6F9] text-left text-xs font-bold uppercase tracking-[0.06em] text-[#5B6472]">
                  <th className="px-5 py-3">Active students</th>
                  <th className="px-5 py-3 text-right">Rate per student / month</th>
                </tr>
              </thead>
              <tbody>
                {VOLUME_TIERS.map((tier) => (
                  <tr key={tier.range} className="border-t border-black/10">
                    <td className="px-5 py-3 text-[#171B22]">{tier.range}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-[#171B22]">
                      {formatAmount(tier[currency], currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add-ons — kept separate from the base rate so the headline price stays low; only
            billed to accounts that actually use them. */}
        <div className="mt-14">
          <h2 className="font-display text-center text-xl font-extrabold tracking-tight">Optional add-ons</h2>
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {ADDONS.map((addon) => (
              <div key={addon.name} className="flex flex-col gap-1 rounded-2xl border border-black/10 bg-[#F5F6F9] p-5">
                <span className="text-sm font-semibold leading-snug text-[#171B22]">{addon.name}</span>
                <span className="text-sm font-bold tabular-nums text-[#EA580C]">
                  {formatAmount(addon[currency], currency)}
                  <span className="font-medium text-[#5B6472]"> {addon.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-14 max-w-2xl text-center text-xs text-[#5B6472]">
          Not sure which fits? Most single coaches and growing academies start on Pay As You Grow; multi-branch
          institutes that want their own brand on the platform usually move to ownership. Either way, a demo walks
          through both before you decide.
        </p>
      </section>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
          <Logo imgClassName="h-11 w-11" />
          <p className="text-xs font-medium text-[#5B6472]">© {new Date().getFullYear()} Meet to Manage. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
