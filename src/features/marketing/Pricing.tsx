import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, Globe2, Lock, LogIn, MessageCircle, Minus, MousePointerClick } from "lucide-react";
import { Seo } from "@/components/Seo";
import { saasPublic, type PublicPlan } from "@/api/saas";
import { apiEnabled } from "@/lib/api";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { trackMarketingEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { detectMarketCurrency, formatMarketPrice, planPrice } from "@/lib/region";
import { MarketingHero } from "./MarketingHero";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { PricingExitIntent } from "./PricingExitIntent";
import { ACCENT_GRADIENT, CARD, CTA_DARK, CTA_ORANGE, H2_SM, HERO_OVERLAP } from "./styles";

type Cycle = "Month" | "Year";

/** What the page shows if the live plan list can't be fetched (offline preview, API hiccup).
 *  Mirrors the plans configured in the billing system so the page never advertises a different
 *  price from what an academy is actually invoiced — the live list always wins when it loads. */
const FALLBACK_PLANS: PublicPlan[] = [
  {
    id: "fallback-free", code: "free", name: "Free", description: null, trialDays: 0, isFree: true,
    prices: [{ id: "f-m", billingInterval: "Month", currency: "INR", amount: 0 }],
    entitlements: [
      { key: "max_students", value: 20 }, { key: "max_staff", value: 3 }, { key: "max_storage_mb", value: 1024 },
      { key: "max_session_minutes_per_month", value: 1200 }, { key: "recording_retention_days", value: 0 },
      { key: "feature_recordings", value: 0 }, { key: "feature_payment_gateway", value: 0 }, { key: "feature_white_label", value: 0 },
      { key: "feature_whatsapp", value: 0 }, { key: "feature_custom_domain", value: 0 }, { key: "feature_api_access", value: 0 },
      ...["BillingFinance", "Payouts", "ReportsAnalytics", "Admission", "LeaveManagement", "ClassSessionLogs"].map((m) => ({ key: `module_${m}`, value: 0 })),
    ],
  },
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

function entitlement(plan: PublicPlan, key: string): number | undefined {
  return plan.entitlements.find((e) => e.key === key)?.value;
}

/** A plan includes a module unless it switches it off (module_* = 0), matching the backend rule. */
function hasModules(plan: PublicPlan, modules: string[]): boolean {
  return modules.every((m) => entitlement(plan, `module_${m}`) !== 0);
}

/** True for a plan whose every price is zero (the backend also sends isFree). */
function isFreePlan(plan: PublicPlan): boolean {
  return plan.isFree ?? (plan.prices.length > 0 && plan.prices.every((p) => p.amount === 0));
}

/** The app's permission modules, grouped into the rows a buyer recognises. */
const MODULE_ROWS: { id: string; modules: string[] }[] = [
  { id: "classes", modules: ["SessionCalendarManagement"] },
  { id: "students", modules: ["UserManagement", "CourseBatchManagement"] },
  { id: "content", modules: ["ContentAccessManagement"] },
  { id: "communication", modules: ["Communication"] },
  { id: "admissions", modules: ["Admission"] },
  { id: "finance", modules: ["BillingFinance"] },
  { id: "payouts", modules: ["Payouts"] },
  { id: "reports", modules: ["ReportsAnalytics"] },
  { id: "leave", modules: ["LeaveManagement", "ClassSessionLogs"] },
];

const T = {
  en: {
    backHome: "Back home",
    eyebrow: "Pricing",
    heading: "Simple plans that grow with your academy.",
    subheading: (brandName: string) =>
      `One price per academy, not per student. Start free with live classes and the parent app on ${brandName}, then upgrade for admissions, fees, payouts and reports.`,
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
    } as Record<string, string>,
    planCta: "Book free walkthrough",
    reassure: "Free 30-minute platform walkthrough. No payment details.",
    freeForever: "free forever",
    freeBadge: "FREE FOREVER",
    freeCta: "Create free account",
    freeNote: "No card needed. Your academy is ready in 2 minutes.",
    requestCta: "Request a free account",
    modulesTitle: "Modules",
    modules: {
      classes: "Live classes & calendar",
      students: "Students, courses & batches",
      content: "Content & resources",
      communication: "Parent communication",
      admissions: "Admissions & enquiries",
      finance: "Fees, invoices & finance",
      payouts: "Teacher payouts & payroll",
      reports: "Reports & analytics",
      leave: "Leave & class logs",
    } as Record<string, string>,
    steps: {
      title: "Start in minutes, no sales call needed",
      items: [
        { title: "Pick a plan", body: "Start on Free, or try every module free for 14 days." },
        { title: "Name your academy", body: "Choose your web address, admin e-mail and a 4-digit PIN." },
        { title: "Sign in and teach", body: "Add students and batches, then run your first live class." },
      ],
    },
    trusted: { title: "Used by coaching centres including", all: "See all customers" },
    trial: { cta: (n: number) => `Start ${n % 30 === 0 ? `${n / 30}-month` : `${n}-day`} free trial`, note: "Every module unlocked for the trial, then Free unless you upgrade. No card needed.", or: "Or book a free walkthrough" },
    help: { title: "Not sure which plan fits your academy?", body: "Tell us your student count and we'll recommend one.", cta: "Chat on WhatsApp" },
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
      `سعر واحد لكل أكاديمية، وليس لكل طالب. ابدأ مجانًا بالحصص المباشرة وتطبيق أولياء الأمور على ${brandName}، ثم رقِّ خطتك للقبول والرسوم والمستحقات والتقارير.`,
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
    } as Record<string, string>,
    planCta: "اطلب عرضًا توضيحيًا",
    reassure: "جولة مجانية لمدة 30 دقيقة. بلا تفاصيل دفع.",
    freeForever: "مجاني دائمًا",
    freeBadge: "مجاني دائمًا",
    freeCta: "أنشئ حسابًا مجانيًا",
    freeNote: "لا حاجة لبطاقة. أكاديميتك جاهزة خلال دقيقتين.",
    requestCta: "اطلب حسابًا مجانيًا",
    modulesTitle: "الوحدات",
    modules: {
      classes: "الحصص المباشرة والتقويم",
      students: "الطلاب والدورات والمجموعات",
      content: "المحتوى والموارد",
      communication: "التواصل مع أولياء الأمور",
      admissions: "القبول والاستفسارات",
      finance: "الرسوم والفواتير والمالية",
      payouts: "مستحقات المعلمين والرواتب",
      reports: "التقارير والتحليلات",
      leave: "الإجازات وسجلات الحصص",
    } as Record<string, string>,
    steps: {
      title: "ابدأ خلال دقائق دون مكالمة مبيعات",
      items: [
        { title: "اختر خطة", body: "ابدأ بالخطة المجانية أو جرّب كل الوحدات مجانًا لمدة 14 يومًا." },
        { title: "سمِّ أكاديميتك", body: "اختر عنوانك على الويب وبريد المسؤول ورمزًا من 4 أرقام." },
        { title: "سجّل الدخول وابدأ التدريس", body: "أضف الطلاب والمجموعات ثم شغّل أول حصة مباشرة." },
      ],
    },
    trusted: { title: "يستخدمها مراكز تعليمية منها", all: "عرض كل العملاء" },
    trial: { cta: (n: number) => `ابدأ تجربة مجانية لمدة ${n} يومًا`, note: "كل الوحدات متاحة خلال التجربة، ثم الخطة المجانية ما لم ترقِّ. لا حاجة لبطاقة.", or: "أو احجز جولة مجانية" },
    help: { title: "لست متأكدًا أي خطة تناسب أكاديميتك؟", body: "أخبرنا بعدد طلابك وسنوصي لك بخطة.", cta: "تحدث عبر واتساب" },
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
  name: string;
  price: string;
  priceNote: string;
  ribbon?: string;
  saving?: string;
  description?: string | null;
  highlighted?: boolean;
  ctaLabel: string;
  ctaTo: string;
  note?: string;
  secondary?: { label: string; to: string };
  children: React.ReactNode;
}

/** One plan: price and the direct sign-up button up top, then the same comparison rows on every card. */
function PlanCard({ name, price, priceNote, ribbon, saving, description, highlighted, ctaLabel, ctaTo, note, secondary, children }: CardProps) {
  return (
    <article className={cn(CARD, "relative flex flex-col overflow-hidden p-7 sm:p-8", highlighted && "border-transparent ring-2 ring-[#EA580C] lg:-my-3 lg:py-10")}>
      {highlighted && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ background: ACCENT_GRADIENT }} />}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[#111] rtl:tracking-normal">{name}</h2>
        {ribbon && <span className={cn("rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] rtl:tracking-normal", highlighted ? "bg-[#111] text-white" : "bg-[#ECFDF3] text-[#047857]")}>{ribbon}</span>}
      </div>
      {description && <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-[#5B6472]">{description}</p>}
      <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-display text-[clamp(2.4rem,3.6vw,3.1rem)] font-extrabold leading-none tracking-[-0.03em] text-[#111] rtl:tracking-normal">{price}</span>
        <span className="text-sm font-semibold text-[#5B6472]">{priceNote}</span>
      </div>
      <p className={cn("mt-2 h-6 text-xs font-semibold", saving ? "text-[#C2410C]" : "text-transparent")} aria-hidden={!saving}>{saving ?? "."}</p>
      <Link to={ctaTo} className={cn(highlighted ? CTA_ORANGE : CTA_DARK, "mt-4 w-full min-w-0 !rounded-2xl !px-5 text-sm")}>
        {ctaLabel} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
      </Link>
      {/* Fixed-height slots so the comparison rows line up across cards. */}
      <p className="mt-2.5 min-h-[2.5rem] text-center text-xs leading-relaxed text-[#5B6472]">{note}</p>
      <div className="flex h-6 items-center justify-center">
        {secondary && <Link to={secondary.to} className="text-sm font-semibold text-[#C2410C] hover:underline">{secondary.label}</Link>}
      </div>
      <div className="mt-6 flex flex-1 flex-col gap-6 border-t border-[#EFE3D7] pt-6">{children}</div>
    </article>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#5B6472] rtl:tracking-normal">{children}</p>;
}

/** A row that is either included (orange tick) or not (grey dash / lock). */
function Row({ on, label, locked }: { on: boolean; label: string; locked?: boolean }) {
  const Off = locked ? Lock : Minus;
  return (
    <li className="flex items-start gap-2.5">
      {on ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" /> : <Off className="mt-0.5 h-4 w-4 shrink-0 text-[#A8A29E]" />}
      <span className={cn("text-sm leading-relaxed", on ? "text-[#111]" : "text-[#8A837D]")}>{label}</span>
    </li>
  );
}

function Bullets({ items }: { items: string[] }) {
  return <ul className="flex flex-col gap-2.5">{items.map((f) => <Row key={f} on label={f} />)}</ul>;
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
  // Self-service signup settings (same source as /signup). Assumed on until they load, so the buttons don't flicker.
  const [signup, setSignup] = useState({ enabled: true, trialDays: 14 });

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

  useEffect(() => {
    if (!apiEnabled()) return;
    let active = true;
    saasPublic.settings()
      .then((s) => { if (active) setSignup({ enabled: s.enabled, trialDays: s.trialDays }); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    const monthly = (p: PublicPlan) => planPrice(p, "Month", currency)?.amount ?? Number.MAX_SAFE_INTEGER;
    return plans.filter((p) => p.prices.some((x) => x.currency === "INR" || x.currency === currency)).sort((a, b) => monthly(a) - monthly(b));
  }, [plans, currency]);
  // Structured data always states INR, the currency academies are actually billed in, whatever the visitor sees on screen.
  const jsonLd = useMemo(() => {
    const offers = visible.flatMap((p) =>
      p.prices.filter((x) => x.currency === "INR").map((x) => ({
        "@type": "Offer",
        name: `${p.name} (${x.billingInterval === "Year" ? "yearly" : "monthly"})`,
        price: x.amount,
        priceCurrency: "INR",
        url: "https://meettomanage.cloud/pricing",
      })),
    );
    return {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "SoftwareApplication", name: "Meet to Manage", applicationCategory: "EducationalApplication", operatingSystem: "Web, iOS, Android", offers },
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://meettomanage.cloud/" },
          { "@type": "ListItem", position: 2, name: "Pricing", item: "https://meettomanage.cloud/pricing" },
        ] },
      ],
    };
  }, [visible]);
  const paid = visible.filter((p) => !isFreePlan(p));
  const popularCode = paid.length > 1 ? paid[paid.length - 1].code : null;

  function limitLines(plan: PublicPlan): string[] {
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
    if (retention !== undefined && retention !== 0) lines.push(t.limits.recordings(num(retention, t.days)));
    return lines;
  }

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="pricing"
        title="Pricing: Academy Management Software Plans | Meet to Manage"
        description="One simple price per academy with live classes, admissions, automatic fee collection and a parent app included. Start free, or pay monthly or yearly. Create your academy in minutes."
        path="/pricing"
        jsonLd={jsonLd}
      />

      <MarketingNav />

      <MarketingHero eyebrow={t.eyebrow} title={t.heading} sub={t.subheading(brand.name)} overlap>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ToggleGroup value={cycle} onChange={setCycle} options={(["Month", "Year"] as Cycle[]).map((value) => ({ value, label: t.cycle[value] }))} />
        </div>
      </MarketingHero>

      <section className="mx-auto max-w-[1160px] px-5 pb-[clamp(72px,8vw,120px)]">
        {loading && <p className="mb-4 text-center text-sm text-[#5B6472]" aria-live="polite">{t.loading}</p>}
        <div className={cn(HERO_OVERLAP, "grid grid-cols-1 gap-4 md:grid-cols-2 lg:items-stretch", visible.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
          {visible.map((plan) => {
            const free = isFreePlan(plan);
            const month = planPrice(plan, "Month", currency);
            const year = planPrice(plan, "Year", currency);
            const chosen = cycle === "Year" && year ? year : month ?? year!;
            const shownCycle: Cycle = chosen === year ? "Year" : "Month";
            const walkthroughTo = `/get-started?plan=${encodeURIComponent(plan.code)}&cycle=${shownCycle}`;
            const freeMonths = month && year && month.amount > 0 ? Math.round(12 - year.amount / month.amount) : 0;
            // A trial length set on the plan itself (Platform > Plans) wins over the site-wide signup setting.
            const planTrialDays = plan.trialDays > 0 ? plan.trialDays : signup.trialDays;
            const cta = free
              ? { label: signup.enabled ? t.freeCta : t.requestCta, to: `/signup?plan=${encodeURIComponent(plan.code)}`, note: t.freeNote, secondary: undefined }
              : signup.enabled && planTrialDays > 0
                ? { label: t.trial.cta(planTrialDays), to: `/signup?plan=trial&for=${encodeURIComponent(plan.code)}`, note: t.trial.note, secondary: { label: t.trial.or, to: walkthroughTo } }
                : { label: t.planCta, to: walkthroughTo, note: t.reassure, secondary: undefined };
            return (
              <PlanCard
                key={plan.id}
                name={plan.name}
                price={formatMarketPrice(chosen.amount, chosen.currency)}
                priceNote={free ? t.freeForever : t.perCycle[shownCycle]}
                ribbon={free ? t.freeBadge : plan.code === popularCode ? t.popular : undefined}
                saving={shownCycle === "Year" && freeMonths > 0 ? t.monthsFree(freeMonths) : undefined}
                description={plan.description}
                highlighted={plan.code === popularCode}
                ctaLabel={cta.label}
                ctaTo={cta.to}
                note={cta.note}
                secondary={cta.secondary}
              >
                <div>
                  <SectionTitle>{t.modulesTitle}</SectionTitle>
                  <ul className="flex flex-col gap-2.5">
                    {MODULE_ROWS.map((row) => <Row key={row.id} on={hasModules(plan, row.modules)} locked label={t.modules[row.id]} />)}
                  </ul>
                </div>
                <div>
                  <SectionTitle>{t.limitsTitle}</SectionTitle>
                  <Bullets items={limitLines(plan)} />
                </div>
                <div>
                  <SectionTitle>{t.featuresTitle}</SectionTitle>
                  <ul className="flex flex-col gap-2.5">
                    {Object.keys(t.features).map((key) => <Row key={key} on={(entitlement(plan, key) ?? 0) >= 1} label={t.features[key]} />)}
                  </ul>
                </div>
              </PlanCard>
            );
          })}
        </div>

        {/* Own brand: a wide strip under the self-service plans, since it is sold by quote, not signup. */}
        <div className="mt-6 grid gap-6 rounded-3xl bg-[#111] p-7 text-white sm:p-9 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-orange-300 rtl:tracking-normal"><Building2 className="h-4 w-4" />{t.own.eyebrow}</p>
            <h2 className="font-display mt-2 text-2xl font-extrabold tracking-[-0.02em] rtl:tracking-normal sm:text-3xl">{t.own.name}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">{t.own.description}</p>
            <p className="mt-4 text-sm"><span className="font-display text-xl font-extrabold">{t.own.price}</span> <span className="text-white/60">· {t.own.note}</span></p>
          </div>
          <div className="flex flex-col gap-5">
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              {t.own.features.map((f) => <li key={f} className="flex items-start gap-2.5 text-sm text-white/90"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />{f}</li>)}
            </ul>
            <Link to="/get-started" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold uppercase text-[#111] transition-colors hover:bg-orange-50 sm:w-fit">
              {t.own.cta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>

        {/* How self-service signup works. */}
        <div className="mt-16 text-center">
          <h2 className={H2_SM}>{t.steps.title}</h2>
          <ol className="mt-8 grid gap-4 text-start sm:grid-cols-3">
            {t.steps.items.map((step, i) => {
              const Icon = [MousePointerClick, Globe2, LogIn][i];
              return (
                <li key={step.title} className={cn(CARD, "flex gap-4 p-6 shadow-none")}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3EA] text-[#EA580C]"><Icon className="h-5 w-5" /></span>
                  <span>
                    <span className="block text-xs font-bold text-[#C2410C]">{i + 1}</span>
                    <span className="block font-display text-base font-extrabold text-[#111]">{step.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-[#5B6472]">{step.body}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          {signup.enabled && (
            <Link to="/signup" className={cn(CTA_ORANGE, "mt-8 !rounded-2xl")}>{t.freeCta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Link>
          )}
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#5B6472] rtl:tracking-normal">{t.trusted.title}</p>
          <Link to="/customers" className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]">
            <img src="/clients/thereader.png" alt="The Reader Nest" width={56} height={56} loading="lazy" className="h-14 w-14 rounded-full object-cover ring-1 ring-black/10" />
            <img src="/clients/alphabet.webp" alt="Alphabet — Jolly Phonics & Storytelling" width={800} height={400} loading="lazy" className="h-14 w-auto object-contain" />
          </Link>
          <p className="text-sm text-[#5B6472]"><span>Razorpay payments</span> · <span>Cashfree payments</span></p>
          <Link to="/customers" className="text-sm font-semibold text-[#C2410C] hover:underline">{t.trusted.all}</Link>
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-[#EFE3D7] bg-[#FFF8F2] px-6 py-6 text-center">
          <p className="font-display text-lg font-extrabold text-[#111] rtl:tracking-normal">{t.help.title}</p>
          <p className="text-sm text-[#5B6472]">{t.help.body}</p>
          <a
            href="https://wa.me/919344773231?text=Which%20Meet%20to%20Manage%20plan%20fits%20my%20academy%3F"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackMarketingEvent("whatsapp_clicked")}
            className={cn(CTA_DARK, "!rounded-2xl")}
          >
            <MessageCircle className="h-4 w-4" /> {t.help.cta}
          </a>
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 text-center text-sm text-[#5B6472]">
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
      <PricingExitIntent />
    </div>
  );
}
