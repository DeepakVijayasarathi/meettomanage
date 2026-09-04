import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, IndianRupee, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Currency = "INR" | "USD" | "AED";
type Cycle = "monthly" | "annual";

const CURRENCY_SYMBOL: Record<Currency, string> = { INR: "₹", USD: "$", AED: "AED " };

/** Illustrative rates only — no billing engine enforces per-student charges yet (see
 *  docs/requirements/influencer-personal-coaches.md, open questions). INR stays the
 *  India-market anchor. USD was previously a bare FX peg off the INR rate (₹100 ≈ $1.2) —
 *  that's real underpricing for the US/global SaaS market this plan actually competes in
 *  (Acuity/Calendly/SimplePractice-class tools sit at $16-99/month, not $1.2/student), so
 *  USD is now priced independently at what that market will bear, not a currency
 *  conversion. AED follows the same logic one step further — priced at roughly double the
 *  USD-equivalent, reflecting real willingness-to-pay in the Gulf market this outreach
 *  targets (see outreach/leads.json), not what ₹/$/AED happen to convert to day to day. */
const SAAS_RATE: Record<Currency, Record<Cycle, number>> = {
  INR: { monthly: 100, annual: 1000 }, // annual = 10 months billed, ~17% off
  USD: { monthly: 3.5, annual: 35 },
  AED: { monthly: 26, annual: 260 },
};

const FREE_STUDENTS = 10;

const VOLUME_TIER_RATES: { INR: number; USD: number; AED: number }[] = [
  { INR: 0, USD: 0, AED: 0 },
  { INR: 100, USD: 3.5, AED: 26 },
  { INR: 85, USD: 3.0, AED: 22 },
  { INR: 70, USD: 2.5, AED: 18 },
];

const ADDON_RATES: { unit: string; INR: number; USD: number; AED: number }[] = [
  { unit: "/month", INR: 499, USD: 15, AED: 110 },
  { unit: "/pack", INR: 299, USD: 9, AED: 66 },
];

/** Flat-fee plan for solo coaches, counselors and independent tutors — per-student metering
 *  reads as "charged per person" at this scale (20-50 clients), where course-creator tools
 *  this persona actually benchmarks against (Kajabi, Teachable, Podia) all use a flat monthly
 *  tier instead. USD/AED priced independently of the INR rate, same market-rate reasoning
 *  as SAAS_RATE's comment above — not an FX conversion of each other. */
const SOLO_RATE: Record<Currency, Record<Cycle, number>> = {
  INR: { monthly: 999, annual: 9990 }, // annual = 10 months billed, ~17% off, same discount shape as SAAS_RATE
  USD: { monthly: 29, annual: 290 },
  AED: { monthly: 220, annual: 2200 },
};
const SOLO_INCLUDED_CLIENTS = 30;
const SOLO_OVERAGE: Record<Currency, number> = { INR: 15, USD: 0.5, AED: 3.5 };

/** Anchor for the ownership plan — a real "starting at" number instead of a bare "Custom",
 *  which otherwise gives a self-serve-leaning visitor no signal to decide whether to even ask.
 *  Placeholder pending a real cost-plus-margin calculation (dev/hosting/support to stand up a
 *  white-label instance) — treat as illustrative until priced properly, same caveat as every
 *  other number on this page (see the SAAS_RATE comment above). */
const OWN_BRAND_START: Record<Currency, number> = { INR: 250000, USD: 8000, AED: 58000 };
const OWN_BRAND_CUSTOM_ABOVE = 500;

function formatAmount(amount: number, currency: Currency, freeLabel: string): string {
  if (amount === 0) return freeLabel;
  const symbol = CURRENCY_SYMBOL[currency];
  return currency === "INR"
    ? `${symbol}${amount.toLocaleString("en-IN")}`
    : `${symbol}${Number.isInteger(amount) ? amount.toLocaleString("en-US") : amount.toFixed(2)}`;
}

/** Every feature line restates a capability already shipped and described on the homepage
 *  (FEATURES in Home.tsx) — nothing promised here that the product doesn't actually do.
 *  Plan NAMES (Solo / Pay As You Grow / Own Brand, Own Software) stay in English in both
 *  languages, same as the "Meet to Manage" product name itself — every other string here
 *  translates. */
const T = {
  en: {
    backHome: "Back home",
    eyebrow: "Pricing",
    heading: "One flat fee, pay per student, or own it outright.",
    subheading: (brandName: string) =>
      `Three ways to run on ${brandName}, priced in ₹, $ or AED — a flat rate for a solo practice, a rate that scales with your enrollment, or a one-time ownership license with an annual contract.`,
    currencyOptions: [
      { value: "INR" as Currency, label: "₹ INR" },
      { value: "USD" as Currency, label: "$ USD" },
      { value: "AED" as Currency, label: "AED" },
    ],
    cycleOptions: [
      { value: "monthly" as Cycle, label: "Monthly" },
      { value: "annual" as Cycle, label: "Annual — 2 months free" },
    ],
    free: "Free",
    mostFlexible: "MOST FLEXIBLE",
    solo: {
      eyebrow: "Flat monthly",
      priceNote: { monthly: "per month, flat", annual: "per year, flat" },
      description: (included: number, overage: string) =>
        `For a solo coach, counselor or independent tutor — one flat fee, not billed per client. First ${included} active clients included, then ${overage}/client.`,
      features: [
        "Everything in Pay As You Grow",
        `First ${SOLO_INCLUDED_CLIENTS} active clients included`,
        "One flat monthly fee — not billed per client",
        "No setup fee, cancel anytime",
      ],
      cta: "Request a Demo",
    },
    payAsYouGrow: {
      eyebrow: "Subscription",
      priceNote: { monthly: "per active student / month", annual: "per active student / year" },
      banner: (n: number) => `Free for your first ${n} students`,
      description:
        "Billed only on students actually enrolled that month — add or drop batches freely, with every feature included from day one and no setup fee.",
      features: [
        "Live Classroom, Whiteboard & Gamification",
        "Smart Scheduling — 1:1 and group classes",
        "Admissions CRM & conversion pipeline",
        "Billing via Razorpay or Cashfree",
        "Analytics & Reports dashboard",
        "Email, SMS & WhatsApp notifications",
      ],
      cta: "Request a Demo",
    },
    ownBrand: {
      eyebrow: "One-time + AMC",
      priceNote: "one-time license + Annual Maintenance Contract",
      description: (n: number) =>
        `For academies that want to run the platform under their own name and domain, with no recurring per-student cost — maintained through an annual support contract instead. Custom quote above ${n} students.`,
      features: [
        "Everything in Pay As You Grow",
        "Your own brand, logo and domain — not ours",
        "Deployed on infrastructure of your choice",
        "No per-student billing, ever",
        "Annual Maintenance Contract: updates, fixes & support",
        "Priced once for your scale, not per student",
      ],
      cta: "Talk to Sales",
    },
    volumeTitle: "Volume pricing",
    volumeSubtitle:
      "The per-student rate on Pay As You Grow steps down automatically as your enrollment grows — no need to renegotiate.",
    volumeColStudents: "Active students",
    volumeColRate: "Rate per student / month",
    volumeRanges: [`First ${FREE_STUDENTS} students`, "11–200 students", "201–500 students", "501+ students"],
    addonsTitle: "Optional add-ons",
    addons: [
      { name: "Extended recording retention — 60 days instead of 15", unit: "/month" },
      { name: "Extra WhatsApp/SMS notification credits — 1,000-pack", unit: "/pack" },
    ],
    notSure:
      "Not sure which fits? Solo coaches and counselors usually start on Solo; growing academies use Pay As You Grow; multi-branch institutes that want their own brand on the platform move to ownership. Either way, a demo walks through all three before you decide.",
    rightsReserved: (year: number, brandName: string) => `© ${year} ${brandName}. All rights reserved.`,
  },
  ar: {
    backHome: "العودة للرئيسية",
    eyebrow: "الأسعار",
    heading: "رسوم ثابتة، أو الدفع لكل طالب، أو التملك الكامل.",
    subheading: (brandName: string) =>
      `ثلاث طرق لتشغيل ${brandName} — بالروبية الهندية أو الدولار أو الدرهم الإماراتي — سعر ثابت للممارسة الفردية، أو سعر يتوسع مع نمو عدد طلابك، أو ترخيص تملك كامل مع عقد صيانة سنوي.`,
    currencyOptions: [
      { value: "INR" as Currency, label: "₹ روبية" },
      { value: "USD" as Currency, label: "$ دولار" },
      { value: "AED" as Currency, label: "د.إ درهم" },
    ],
    cycleOptions: [
      { value: "monthly" as Cycle, label: "شهري" },
      { value: "annual" as Cycle, label: "سنوي — شهران مجانًا" },
    ],
    free: "مجانًا",
    mostFlexible: "الأكثر مرونة",
    solo: {
      eyebrow: "اشتراك شهري ثابت",
      priceNote: { monthly: "شهريًا، ثابت", annual: "سنويًا، ثابت" },
      description: (included: number, overage: string) =>
        `للمدرب أو المستشار أو المعلّم المستقل العامل بمفرده — رسوم ثابتة وليست محسوبة لكل عميل. أول ${included} عميلًا نشطًا مشمولون، وبعد ذلك ${overage} لكل عميل إضافي.`,
      features: [
        "كل ما تقدمه خطة Pay As You Grow",
        `أول ${SOLO_INCLUDED_CLIENTS} عميلًا نشطًا مشمولون`,
        "رسوم شهرية ثابتة — غير محسوبة لكل عميل",
        "بدون رسوم إعداد، ويمكن الإلغاء في أي وقت",
      ],
      cta: "اطلب عرضًا توضيحيًا",
    },
    payAsYouGrow: {
      eyebrow: "اشتراك",
      priceNote: { monthly: "لكل طالب نشط / شهريًا", annual: "لكل طالب نشط / سنويًا" },
      banner: (n: number) => `مجانًا لأول ${n} طالبًا`,
      description:
        "تُحتسب الفاتورة فقط على الطلاب المسجَّلين فعليًا خلال الشهر — أضِف أو ألغِ الدفعات بحرية، مع جميع الميزات متاحة من اليوم الأول وبدون رسوم إعداد.",
      features: [
        "فصل دراسي مباشر، سبورة تفاعلية، وتحفيز بالألعاب",
        "جدولة ذكية — حصص فردية وجماعية",
        "نظام إدارة القبول ومتابعة التحويل",
        "الفوترة عبر Razorpay أو Cashfree",
        "لوحة تحليلات وتقارير",
        "إشعارات عبر البريد الإلكتروني والرسائل القصيرة وواتساب",
      ],
      cta: "اطلب عرضًا توضيحيًا",
    },
    ownBrand: {
      eyebrow: "دفعة واحدة + عقد صيانة",
      priceNote: "ترخيص لمرة واحدة + عقد صيانة سنوي",
      description: (n: number) =>
        `للأكاديميات التي ترغب في تشغيل المنصة تحت اسمها ونطاقها الخاص، دون أي تكلفة متكررة لكل طالب — تتم الصيانة عبر عقد دعم سنوي بدلًا من ذلك. عرض سعر مخصص لما يزيد عن ${n} طالب.`,
      features: [
        "كل ما تقدمه خطة Pay As You Grow",
        "بعلامتك التجارية وشعارك ونطاقك الخاص — وليس علامتنا",
        "يتم النشر على البنية التحتية التي تختارها",
        "بدون أي فوترة لكل طالب، إطلاقًا",
        "عقد صيانة سنوي: تحديثات وإصلاحات ودعم فني",
        "سعر واحد يناسب حجمك، وليس لكل طالب",
      ],
      cta: "تحدث مع فريق المبيعات",
    },
    volumeTitle: "أسعار الحجم",
    volumeSubtitle:
      "ينخفض السعر لكل طالب في خطة Pay As You Grow تلقائيًا مع نمو عدد المسجَّلين لديك — دون الحاجة لإعادة التفاوض.",
    volumeColStudents: "الطلاب النشطون",
    volumeColRate: "السعر لكل طالب / شهريًا",
    volumeRanges: [`أول ${FREE_STUDENTS} طلاب`, "من 11 إلى 200 طالب", "من 201 إلى 500 طالب", "أكثر من 501 طالب"],
    addonsTitle: "إضافات اختيارية",
    addons: [
      { name: "تمديد فترة الاحتفاظ بالتسجيلات — 60 يومًا بدلًا من 15", unit: "/شهريًا" },
      { name: "رصيد إضافي لإشعارات واتساب/الرسائل القصيرة — باقة 1000 رسالة", unit: "/للباقة" },
    ],
    notSure:
      "غير متأكد أي خطة تناسبك؟ عادةً ما يبدأ المدربون والمستشارون المستقلون بخطة Solo، بينما تعتمد الأكاديميات النامية خطة Pay As You Grow، أما المؤسسات متعددة الفروع التي ترغب بعلامتها التجارية الخاصة على المنصة فتنتقل إلى خطة التملك. في جميع الأحوال، يوضح لك العرض التوضيحي الخطط الثلاث قبل أن تقرر.",
    rightsReserved: (year: number, brandName: string) => `© ${year} ${brandName}. جميع الحقوق محفوظة.`,
  },
};

/** Toggle-pill group — same visual pattern as the Features section's category filter on the
 *  homepage, reused here for currency and billing cycle instead of introducing a new control style. */
function ToggleGroup<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
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
              active ? "bg-[#F97316] text-[#171B22]" : "text-[#5B6472] hover:text-[#171B22]"
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
  mostFlexibleLabel: string;
  highlighted?: boolean;
  banner?: string;
}

function PlanCard({ icon: Icon, eyebrow, name, price, priceNote, description, features, ctaLabel, ctaTo, mostFlexibleLabel, highlighted, banner }: PlanCardProps) {
  return (
    <div
      className={
        highlighted
          ? "relative flex flex-col rounded-2xl border-2 border-[#F97316] bg-white p-7 shadow-pop sm:p-8"
          : "relative flex flex-col rounded-2xl border border-black/10 bg-white p-7 sm:p-8"
      }
    >
      {highlighted && (
        <span className="absolute -top-3 left-7 rounded-full bg-[#F97316] px-3 py-1 text-[11px] font-bold tracking-wide text-[#171B22] rtl:left-auto rtl:right-7">
          {mostFlexibleLabel}
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
            ? "mt-8 !bg-[#F97316] !text-[#171B22] hover:!bg-[#EA580C]"
            : "mt-8 border-[#171B22]/15 text-[#171B22] hover:bg-[#171B22]/5"
        }
        variant={highlighted ? undefined : "outline"}
      >
        <Link to={ctaTo}>
          {ctaLabel} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </Button>
    </div>
  );
}

export default function Pricing() {
  useLightBrandScope();
  const brand = useBrand();
  const [lang] = useLang();
  const t = T[lang];
  const [currency, setCurrency] = useState<Currency>("INR");
  const [cycle, setCycle] = useState<Cycle>("monthly");

  const rate = SAAS_RATE[currency][cycle];
  const saasPrice = formatAmount(rate, currency, t.free);
  const saasPriceNote = t.payAsYouGrow.priceNote[cycle];

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="pricing"
        title="Pricing — Meet to Manage"
        description="A flat monthly rate for solo coaches, per-student pricing for growing academies, or own Meet to Manage outright under your own brand."
        path="/pricing"
      />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label={`${brand.name} home`}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button asChild variant="ghost">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t.backHome}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.eyebrow}</p>
          <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.heading}</h1>
          <p className="mt-3 text-sm text-[#5B6472]">{t.subheading(brand.name)}</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ToggleGroup value={currency} onChange={setCurrency} options={t.currencyOptions} />
          <ToggleGroup value={cycle} onChange={setCycle} options={t.cycleOptions} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <PlanCard
            icon={Sparkles}
            eyebrow={t.solo.eyebrow}
            name="Solo"
            price={formatAmount(SOLO_RATE[currency][cycle], currency, t.free)}
            priceNote={t.solo.priceNote[cycle]}
            description={t.solo.description(SOLO_INCLUDED_CLIENTS, formatAmount(SOLO_OVERAGE[currency], currency, t.free))}
            features={t.solo.features}
            ctaLabel={t.solo.cta}
            ctaTo="/get-started?for=coach"
            mostFlexibleLabel={t.mostFlexible}
          />
          <PlanCard
            icon={IndianRupee}
            eyebrow={t.payAsYouGrow.eyebrow}
            name="Pay As You Grow"
            price={saasPrice}
            priceNote={saasPriceNote}
            banner={t.payAsYouGrow.banner(FREE_STUDENTS)}
            description={t.payAsYouGrow.description}
            features={t.payAsYouGrow.features}
            ctaLabel={t.payAsYouGrow.cta}
            ctaTo="/get-started"
            mostFlexibleLabel={t.mostFlexible}
            highlighted
          />
          <PlanCard
            icon={Building2}
            eyebrow={t.ownBrand.eyebrow}
            name="Own Brand, Own Software"
            price={`${formatAmount(OWN_BRAND_START[currency], currency, t.free)}+`}
            priceNote={t.ownBrand.priceNote}
            description={t.ownBrand.description(OWN_BRAND_CUSTOM_ABOVE)}
            features={t.ownBrand.features}
            ctaLabel={t.ownBrand.cta}
            ctaTo="/get-started"
            mostFlexibleLabel={t.mostFlexible}
          />
        </div>

        {/* Volume pricing — how the per-student rate steps down at scale, for institutes
            weighing Pay As You Grow against a custom ownership quote. */}
        <div className="mt-16">
          <h2 className="font-display text-center text-xl font-extrabold tracking-tight">{t.volumeTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[#5B6472]">{t.volumeSubtitle}</p>
          <div className="mx-auto mt-6 max-w-2xl overflow-x-auto rounded-2xl border border-black/10">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#F5F6F9] text-start text-xs font-bold uppercase tracking-[0.06em] text-[#5B6472]">
                  <th className="px-5 py-3 text-start">{t.volumeColStudents}</th>
                  <th className="px-5 py-3 text-end">{t.volumeColRate}</th>
                </tr>
              </thead>
              <tbody>
                {VOLUME_TIER_RATES.map((tier, i) => (
                  <tr key={t.volumeRanges[i]} className="border-t border-black/10">
                    <td className="px-5 py-3 text-start text-[#171B22]">{t.volumeRanges[i]}</td>
                    <td className="px-5 py-3 text-end font-semibold tabular-nums text-[#171B22]">
                      {formatAmount(tier[currency], currency, t.free)}
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
          <h2 className="font-display text-center text-xl font-extrabold tracking-tight">{t.addonsTitle}</h2>
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {t.addons.map((addon, i) => (
              <div key={addon.name} className="flex flex-col gap-1 rounded-2xl border border-black/10 bg-[#F5F6F9] p-5">
                <span className="text-sm font-semibold leading-snug text-[#171B22]">{addon.name}</span>
                <span className="text-sm font-bold tabular-nums text-[#EA580C]">
                  {formatAmount(ADDON_RATES[i][currency], currency, t.free)}
                  <span className="font-medium text-[#5B6472]"> {addon.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-14 max-w-2xl text-center text-xs text-[#5B6472]">{t.notSure}</p>
      </section>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-start">
          <Logo imgClassName="h-11 w-11" />
          <p className="text-xs font-medium text-[#5B6472]">{t.rightsReserved(new Date().getFullYear(), brand.name)}</p>
        </div>
      </footer>
    </div>
  );
}
