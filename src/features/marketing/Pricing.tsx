import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, Layers, Minus, Rocket } from "lucide-react";
import { Seo } from "@/components/Seo";
import { saasPublic, type PublicPlan } from "@/api/saas";
import { apiEnabled } from "@/lib/api";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { detectMarketCurrency, formatMarketPrice, planPrice } from "@/lib/region";
import { MarketingHero } from "./MarketingHero";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { ACCENT_GRADIENT, CARD, CTA_DARK, CTA_ORANGE, HERO_OVERLAP } from "./styles";

type Cycle = "Month" | "Year";

/** What the page shows if the live plan list can't be fetched (offline preview, API hiccup).
 *  Mirrors the plans configured in the billing system so the page never advertises a different
 *  price from what an academy is actually invoiced — the live list always wins when it loads. */
const FALLBACK_PLANS: PublicPlan[] = [
  {
    id: "fallback-starter", code: "starter", name: "Starter", description: null, trialDays: 0,
    prices: [{ id: "s-m", billingInterval: "Month", currency: "INR", amount: 2999 }, { id: "s-y", billingInterval: "Year", currency: "INR", amount: 29990 }],
    entitlements: [
      { key: "max_students", value: 100 }, { key: "max_staff", value: 15 }, { key: "max_storage_mb", value: 20480 },
      { key: "max_session_minutes_per_month", value: 6000 }, { key: "recording_retention_days", value: 16 },
      { key: "feature_recordings", value: 1 }, { key: "feature_payment_gateway", value: 1 }, { key: "feature_white_label", value: 1 },
      { key: "feature_whatsapp", value: 0 }, { key: "feature_custom_domain", value: 0 }, { key: "feature_api_access", value: 0 },
    ],
  },
  {
    id: "fallback-growth", code: "growth", name: "Growth", description: null, trialDays: 0,
    prices: [{ id: "g-m", billingInterval: "Month", currency: "INR", amount: 7999 }, { id: "g-y", billingInterval: "Year", currency: "INR", amount: 79990 }],
    entitlements: [
      { key: "max_students", value: 500 }, { key: "max_staff", value: 50 }, { key: "max_storage_mb", value: 204800 },
      { key: "max_session_minutes_per_month", value: 30000 }, { key: "recording_retention_days", value: 30 },
      { key: "feature_recordings", value: 1 }, { key: "feature_payment_gateway", value: 1 }, { key: "feature_white_label", value: 1 },
      { key: "feature_whatsapp", value: 1 }, { key: "feature_custom_domain", value: 0 }, { key: "feature_api_access", value: 1 },
    ],
  },
];

/** Features left off the entry plan's card. */
const ENTRY_HIDDEN_FEATURES = ["feature_recordings", "feature_whatsapp"];

function entitlement(plan: PublicPlan, key: string): number | undefined {
  return plan.entitlements.find((e) => e.key === key)?.value;
}

const T = {
  en: {
    backHome: "Back home",
    eyebrow: "Pricing",
    heading: "Simple plans that grow with your academy.",
    subheading: (brandName: string) =>
      `One price per academy, not per student. Every plan includes live classes, scheduling, admissions, fee collection and the parent app on ${brandName}.`,
    cycle: { Month: "Monthly", Year: "Yearly" } as Record<Cycle, string>,
    perCycle: { Month: "per month", Year: "per year" } as Record<Cycle, string>,
    monthsFree: (n: number) => `${n} months free`,
    popular: "MOST POPULAR",
    limitsTitle: "Included",
    limits: {
      students: (n: string) => `Up to ${n} active students`,
      staff: (n: string) => `Up to ${n} teachers & staff`,
      storage: (n: string) => `${n} storage`,
      hours: (n: string) => `${n} live-class hours a month`,
      recordings: (n: string) => `Recordings kept ${n}`,
    },
    unlimited: "Unlimited",
    days: (n: number) => `${n} days`,
    featuresTitle: "Features",
    features: {
      feature_payment_gateway: "Online fee collection",
      feature_recordings: "Class recordings",
      feature_white_label: "Your academy's branding",
      feature_whatsapp: "WhatsApp notifications",
      feature_custom_domain: "Custom domain",
      feature_api_access: "API access",
    } as Record<string, string>,
    planCta: "Request a Demo",
    own: {
      eyebrow: "Own it outright",
      name: "Own Brand, Own Software",
      price: "Custom quote",
      note: "one-time licence + annual maintenance",
      description: "For multi-branch institutes that want the platform under their own name and domain, hosted where they choose, with no per-seat cost.",
      features: ["Your brand, logo and domain", "Hosted on infrastructure you choose", "Everything in Growth", "Annual maintenance: updates, fixes and support"],
      cta: "Talk to Sales",
    },
    notes: [
      "Prices exclude applicable taxes such as GST.",
      "Pay yearly and save — the saving is shown on each plan.",
      "Change or cancel your plan any time from your admin panel. See our",
      "Prices are shown in INR for India and USD everywhere else. Need AED or another currency? Ask us and we'll quote you.",
    ],
    termsLink: "Terms of Service",
    and: "and",
    privacyLink: "Privacy Policy",
    rightsReserved: (year: number, brandName: string) => `© ${year} ${brandName}. All rights reserved.`,
    loading: "Loading plans…",
  },
  ar: {
    backHome: "العودة للرئيسية",
    eyebrow: "الأسعار",
    heading: "خطط بسيطة تنمو مع أكاديميتك.",
    subheading: (brandName: string) =>
      `سعر واحد لكل أكاديمية، وليس لكل طالب. تشمل كل خطة الحصص المباشرة والجدولة والقبول وتحصيل الرسوم وتطبيق أولياء الأمور على ${brandName}.`,
    cycle: { Month: "شهري", Year: "سنوي" } as Record<Cycle, string>,
    perCycle: { Month: "شهريًا", Year: "سنويًا" } as Record<Cycle, string>,
    monthsFree: (n: number) => `${n} أشهر مجانًا`,
    popular: "الأكثر شيوعًا",
    limitsTitle: "المشمول",
    limits: {
      students: (n: string) => `حتى ${n} طالب نشط`,
      staff: (n: string) => `حتى ${n} معلم وموظف`,
      storage: (n: string) => `مساحة تخزين ${n}`,
      hours: (n: string) => `${n} ساعة حصص مباشرة شهريًا`,
      recordings: (n: string) => `تُحفظ التسجيلات ${n}`,
    },
    unlimited: "غير محدود",
    days: (n: number) => `${n} يومًا`,
    featuresTitle: "الميزات",
    features: {
      feature_payment_gateway: "تحصيل الرسوم عبر الإنترنت",
      feature_recordings: "تسجيلات الحصص",
      feature_white_label: "هوية أكاديميتك",
      feature_whatsapp: "إشعارات واتساب",
      feature_custom_domain: "نطاق خاص",
      feature_api_access: "الوصول عبر API",
    } as Record<string, string>,
    planCta: "اطلب عرضًا توضيحيًا",
    own: {
      eyebrow: "امتلكه بالكامل",
      name: "علامتك، برنامجك",
      price: "عرض سعر مخصص",
      note: "ترخيص لمرة واحدة + صيانة سنوية",
      description: "للمؤسسات متعددة الفروع التي ترغب في تشغيل المنصة باسمها ونطاقها، على بنية تحتية تختارها، دون تكلفة لكل مقعد.",
      features: ["علامتك التجارية وشعارك ونطاقك", "استضافة على بنية تحتية تختارها", "كل ما في خطة Growth", "صيانة سنوية: تحديثات وإصلاحات ودعم"],
      cta: "تحدث مع فريق المبيعات",
    },
    notes: [
      "الأسعار لا تشمل الضرائب المطبقة مثل ضريبة السلع والخدمات.",
      "ادفع سنويًا ووفّر — يظهر التوفير على كل خطة.",
      "يمكنك تغيير خطتك أو إلغاؤها في أي وقت من لوحة الإدارة. اطلع على",
      "تُعرض الأسعار بالروبية الهندية في الهند وبالدولار الأمريكي في بقية الدول. تحتاج الدرهم أو عملة أخرى؟ اسألنا وسنرسل لك عرضًا.",
    ],
    termsLink: "شروط الخدمة",
    and: "و",
    privacyLink: "سياسة الخصوصية",
    rightsReserved: (year: number, brandName: string) => `© ${year} ${brandName}. جميع الحقوق محفوظة.`,
    loading: "جارٍ تحميل الخطط…",
  },
};

function ToggleGroup<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <div role="tablist" className="inline-flex gap-1 rounded-full border border-[#EFE3D7] bg-white p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn("rounded-full px-4 py-2 text-xs font-semibold transition-colors", active ? "bg-[#111] text-white" : "text-[#5B6472] hover:text-[#111]")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface CardProps {
  eyebrow: string;
  name: string;
  price: string;
  priceNote: string;
  badge?: string;
  description?: string | null;
  highlighted?: boolean;
  icon: typeof Layers;
  ctaLabel: string;
  ctaTo: string;
  popularLabel: string;
  children: React.ReactNode;
}

function PlanCard({ eyebrow, name, price, priceNote, badge, description, highlighted, icon: Icon, ctaLabel, ctaTo, popularLabel, children }: CardProps) {
  return (
    <div className={cn(CARD, "relative flex flex-col overflow-hidden p-8 sm:p-9", highlighted && "lg:-mt-4 lg:pb-12")}>
      {highlighted && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: ACCENT_GRADIENT }} />}
      {highlighted && (
        <span className="absolute end-8 top-0 rounded-b-xl bg-[#111] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white rtl:tracking-normal">{popularLabel}</span>
      )}
      <span className="flex h-12 w-12 items-center justify-center bg-[#FFF3EA] text-[#EA580C]"><Icon className="h-6 w-6" /></span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.08em] text-[#C2410C] rtl:tracking-normal">{eyebrow}</p>
      <h2 className="font-display mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-[#111] rtl:tracking-normal">{name}</h2>
      <p className="font-display mt-5 text-[clamp(2.25rem,3.4vw,3rem)] font-extrabold leading-none tracking-[-0.03em] text-[#111] rtl:tracking-normal">{price}</p>
      <p className="mt-2 text-sm font-semibold text-[#5B6472]">{priceNote}</p>
      {badge && <p className="mt-3 inline-flex w-fit items-center rounded-full bg-[#FFF3EA] px-3 py-1.5 text-xs font-semibold text-[#C2410C]">{badge}</p>}
      {description && <p className="mt-4 text-sm leading-relaxed text-[#333]">{description}</p>}
      <div className="mt-6 flex flex-1 flex-col gap-5 border-t border-[#D9E1F0] pt-6">{children}</div>
      <Link to={ctaTo} className={cn(highlighted ? CTA_ORANGE : CTA_DARK, "mt-8 w-full !rounded-2xl")}>
        {ctaLabel} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
      </Link>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" />
          <span className="text-sm leading-relaxed text-[#111]">{f}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Pricing() {
  useLightBrandScope();
  const brand = useBrand();
  const [lang] = useLang();
  const t = T[lang];
  const [cycle, setCycle] = useState<Cycle>("Month");
  const [plans, setPlans] = useState<PublicPlan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(apiEnabled());
  const currency = useMemo(detectMarketCurrency, []);

  // The billing system is the source of truth for prices and limits; the fallback only shows if it can't be reached.
  useEffect(() => {
    if (!apiEnabled()) return;
    let active = true;
    saasPublic.plans()
      .then((list) => { if (active && list.length > 0) setPlans(list); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    const monthly = (p: PublicPlan) => planPrice(p, "Month", currency)?.amount ?? Number.MAX_SAFE_INTEGER;
    return plans.filter((p) => p.prices.some((x) => x.currency === "INR" || x.currency === currency)).sort((a, b) => monthly(a) - monthly(b));
  }, [plans, currency]);
  const popularCode = visible.length > 1 ? visible[visible.length - 1].code : null;

  function limitLines(plan: PublicPlan, entry: boolean): string[] {
    const num = (v: number, fmt: (n: number) => string) => (v === -1 ? t.unlimited : fmt(v));
    const lines: string[] = [];
    const students = entitlement(plan, "max_students");
    const staff = entitlement(plan, "max_staff");
    const storage = entitlement(plan, "max_storage_mb");
    const minutes = entitlement(plan, "max_session_minutes_per_month");
    const retention = entitlement(plan, "recording_retention_days");
    if (students !== undefined) lines.push(t.limits.students(num(students, (n) => n.toLocaleString("en-IN"))));
    if (staff !== undefined) lines.push(t.limits.staff(num(staff, (n) => n.toLocaleString("en-IN"))));
    if (storage !== undefined) lines.push(t.limits.storage(num(storage, (n) => `${(n / 1024).toLocaleString("en-IN", { maximumFractionDigits: 0 })} GB`)));
    if (minutes !== undefined) lines.push(t.limits.hours(num(minutes, (n) => Math.round(n / 60).toLocaleString("en-IN"))));
    if (retention !== undefined && !entry) lines.push(t.limits.recordings(num(retention, t.days)));
    return lines;
  }

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="pricing"
        title="Pricing — Meet to Manage"
        description="One simple price per academy, with live classes, admissions, fee collection and a parent app included. Pay monthly or yearly."
        path="/pricing"
      />

      <MarketingNav />

      <MarketingHero eyebrow={t.eyebrow} title={t.heading} sub={t.subheading(brand.name)} overlap>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ToggleGroup value={cycle} onChange={setCycle} options={(["Month", "Year"] as Cycle[]).map((value) => ({ value, label: t.cycle[value] }))} />
        </div>
      </MarketingHero>

      <section className="mx-auto max-w-[1160px] px-5 pb-[clamp(72px,8vw,120px)]">
        {loading && <p className="mb-4 text-center text-sm text-[#5B6472]" aria-live="polite">{t.loading}</p>}
        <div className={cn(HERO_OVERLAP, "grid grid-cols-1 gap-2 lg:items-stretch", visible.length >= 2 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
          {visible.map((plan, index) => {
            // The entry plan is marketed without recordings or WhatsApp notifications.
            const entry = index === 0 && visible.length > 1;
            const month = planPrice(plan, "Month", currency);
            const year = planPrice(plan, "Year", currency);
            const chosen = cycle === "Year" && year ? year : month ?? year!;
            const shownCycle: Cycle = chosen === year ? "Year" : "Month";
            const freeMonths = month && year ? Math.round(12 - year.amount / month.amount) : 0;
            return (
              <PlanCard
                key={plan.id}
                icon={plan.code === popularCode ? Rocket : Layers}
                eyebrow={t.eyebrow}
                name={plan.name}
                price={formatMarketPrice(chosen.amount, chosen.currency)}
                priceNote={t.perCycle[shownCycle]}
                badge={shownCycle === "Year" && freeMonths > 0 ? t.monthsFree(freeMonths) : undefined}
                description={plan.description}
                highlighted={plan.code === popularCode}
                ctaLabel={t.planCta}
                ctaTo="/get-started"
                popularLabel={t.popular}
              >
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#5B6472] rtl:tracking-normal">{t.limitsTitle}</p>
                  <Bullets items={limitLines(plan, entry)} />
                </div>
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#5B6472] rtl:tracking-normal">{t.featuresTitle}</p>
                  <ul className="flex flex-col gap-2.5">
                    {Object.keys(t.features).filter((key) => !(entry && ENTRY_HIDDEN_FEATURES.includes(key))).map((key) => {
                      const on = (entitlement(plan, key) ?? 0) >= 1;
                      return (
                        <li key={key} className="flex items-start gap-2.5">
                          {on ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" /> : <Minus className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />}
                          <span className={cn("text-sm leading-relaxed", on ? "text-[#111]" : "text-[#6B6560]")}>{t.features[key]}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </PlanCard>
            );
          })}

          <PlanCard
            icon={Building2}
            eyebrow={t.own.eyebrow}
            name={t.own.name}
            price={t.own.price}
            priceNote={t.own.note}
            description={t.own.description}
            ctaLabel={t.own.cta}
            ctaTo="/get-started"
            popularLabel={t.popular}
          >
            <Bullets items={t.own.features} />
          </PlanCard>
        </div>

        <div className="mx-auto mt-14 flex max-w-2xl flex-col gap-2 text-center text-sm text-[#5B6472]">
          <p>{t.notes[0]}</p>
          <p>{t.notes[1]}</p>
          <p>
            {t.notes[2]}{" "}
            <Link to="/legal/terms" className="font-semibold text-[#C2410C] hover:underline">{t.termsLink}</Link> {t.and}{" "}
            <Link to="/privacy" className="font-semibold text-[#C2410C] hover:underline">{t.privacyLink}</Link>.
          </p>
          <p>{t.notes[3]}</p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
