import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, CreditCard, Landmark, Loader2, Mail, MessageCircle, MessageSquare, Phone, User, Users, Video, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Seo } from "@/components/Seo";
import { apiEnabled } from "@/lib/api";
import { requestPlatformDemo } from "@/api/marketing";
import { cn } from "@/lib/utils";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { CTA_DARK, CTA_ORANGE } from "./styles";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { marketingAttribution, marketingVisitorId, trackDemoBooked, trackMarketingEvent } from "@/lib/analytics";
import { markDemoBooked } from "./chatTeaser";
import { experimentVariant } from "@/lib/experiments";

const T = {
  en: {
    backHome: "Back home",
    badgeCoach: "For coaches & personal brands",
    badgeAcademy: "For academy owners",
    includedHeading: "What you get",
    headingCoach: "See Meet to Manage running your master class.",
    headingAcademy: "See Meet to Manage running your academy.",
    introCoach: "This is a walkthrough of the platform itself — for coaches deciding whether to run their online master class and client bookings on it.",
    introAcademy: "This is a walkthrough of the platform itself — for academy owners deciding whether to run their business on it.",
    includedCoach: [
      "A walkthrough of live classes, scheduling and billing — as one system",
      "How to set up a single online master class and turn attendees into paying clients",
      "No commitment — we'll follow up to find a time that works for you",
    ],
    includedAcademy: [
      "A walkthrough of live classes, scheduling, admissions and billing — as one system",
      "Time to ask about your academy's specific setup: branches, staff size, existing tools",
      "No commitment — we'll follow up to find a time that works for you",
    ],
    thanksHeading: "Thanks — we've got it!",
    thanksCoach: "Our team will reach out shortly to help you get your first class live.",
    thanksAcademy: "Our team will reach out shortly to find a time for your platform demo.",
    demoModeNote: "Demo mode — no request was actually sent.",
    backToHome: "Back to home",
    yourName: "Your name",
    namePlaceholder: "e.g. Rohan Mehta",
    workEmail: "Work email",
    emailPlaceholder: "you@youracademy.com",
    phone: "Phone",
    phonePlaceholder: "+91 98765 43210",
    academyNameCoach: "Brand or coach name (optional)",
    academyNameAcademy: "Academy name",
    academyPlaceholderCoach: "e.g. Priya Coaching, or just your name",
    academyPlaceholderAcademy: "e.g. Bright Step Academy",
    anythingElse: "Anything else? (optional)",
    messagePlaceholder: "Branches, staff size, what you're currently using…",
    errorCoach: "Enter your name.",
    errorAcademy: "Enter your name and academy name.",
    submitError: "Couldn't submit your request. Please try again.",
    requestDemo: "Book free walkthrough",
    fallbackName: "Independent coach",
    rights: (year: number) => `© ${year} Meet to Manage. All rights reserved.`,
    seoTitleCoach: "Request a Demo for Coaches — Meet to Manage",
    seoTitleAcademy: "Request a Demo — Meet to Manage",
    seoDescCoach: "Running a master class to grow your coaching business? See how Meet to Manage's live classroom, scheduling and billing work together — request a demo.",
    seoDescAcademy: "Running an academy? See how Meet to Manage's live classroom, scheduling, admissions and billing work together — request a platform demo.",
  },
  ar: {
    backHome: "العودة للرئيسية",
    badgeCoach: "للمدربين والعلامات الشخصية",
    badgeAcademy: "لأصحاب الأكاديميات",
    includedHeading: "ما الذي ستحصل عليه",
    headingCoach: "شاهد Meet to Manage وهي تُدير الكلاس ماستر الخاص بك.",
    headingAcademy: "شاهد Meet to Manage وهي تُدير أكاديميتك.",
    introCoach: "هذه جولة على المنصة نفسها — للمدربين الذين يقرّرون ما إذا كانوا سيشغّلون الكلاس ماستر الإلكتروني وحجوزات عملائهم عليها.",
    introAcademy: "هذه جولة على المنصة نفسها — لأصحاب الأكاديميات الذين يقرّرون ما إذا كانوا سيديرون أعمالهم عليها.",
    includedCoach: [
      "جولة على الحصص المباشرة والجدولة والفوترة — كنظام واحد",
      "كيفية إعداد كلاس ماستر إلكتروني واحد وتحويل الحاضرين إلى عملاء يدفعون",
      "بلا التزام — سنتابع معك لإيجاد الوقت المناسب لك",
    ],
    includedAcademy: [
      "جولة على الحصص المباشرة والجدولة والقبول والفوترة — كنظام واحد",
      "وقت للسؤال عن إعداد أكاديميتك الخاص: الفروع، وحجم الفريق، والأدوات الحالية",
      "بلا التزام — سنتابع معك لإيجاد الوقت المناسب لك",
    ],
    thanksHeading: "شكرًا — تم الاستلام!",
    thanksCoach: "سيتواصل فريقنا معك قريبًا لمساعدتك على تشغيل أول حصة لك.",
    thanksAcademy: "سيتواصل فريقنا معك قريبًا لتحديد موعد للعرض التوضيحي للمنصة.",
    demoModeNote: "وضع العرض التجريبي — لم يُرسل أي طلب فعليًا.",
    backToHome: "العودة للرئيسية",
    yourName: "اسمك",
    namePlaceholder: "مثال: روهان ميهتا",
    workEmail: "البريد الإلكتروني للعمل",
    emailPlaceholder: "you@youracademy.com",
    phone: "الهاتف",
    phonePlaceholder: "+91 98765 43210",
    academyNameCoach: "اسم العلامة أو المدرب (اختياري)",
    academyNameAcademy: "اسم الأكاديمية",
    academyPlaceholderCoach: "مثال: Priya Coaching، أو اسمك فقط",
    academyPlaceholderAcademy: "مثال: Bright Step Academy",
    anythingElse: "أي شيء آخر؟ (اختياري)",
    messagePlaceholder: "الفروع، حجم الفريق، ما تستخدمه حاليًا…",
    errorCoach: "أدخل اسمك.",
    errorAcademy: "أدخل اسمك واسم الأكاديمية.",
    submitError: "تعذّر إرسال طلبك. حاول مرة أخرى.",
    requestDemo: "اطلب عرضًا توضيحيًا",
    fallbackName: "مدرب مستقل",
    rights: (year: number) => `© ${year} Meet to Manage. جميع الحقوق محفوظة.`,
    seoTitleCoach: "Request a Demo for Coaches — Meet to Manage",
    seoTitleAcademy: "Request a Demo — Meet to Manage",
    seoDescCoach: "Running a master class to grow your coaching business? See how Meet to Manage's live classroom, scheduling and billing work together — request a demo.",
    seoDescAcademy: "Running an academy? See how Meet to Manage's live classroom, scheduling, admissions and billing work together — request a platform demo.",
  },
};

/** Copy for the two-panel layout: the pitch on the left, the form on the right. */
const PANEL = {
  en: {
    eyebrow: "Free platform walkthrough",
    heading: ["See how Meet to Manage works for", "your academy."],
    sub: "Get a personalised walkthrough of live classes, admissions, fees and parent updates, as one platform.",
    features: [
      { title: "Live Classes", body: "Smoother teaching experience" },
      { title: "Admissions", body: "Track and convert enquiries" },
      { title: "Fees & Payments", body: "Simple and secure" },
      { title: "Parent Updates", body: "Keep everyone informed" },
    ],
    noCommit: "30 minutes. No payment details or commitment.",
    formTitle: "Book your free walkthrough",
    formSub: "Share a few details and we'll get in touch within one business day to find a convenient time.",
  },
  ar: {
    eyebrow: "اطلب عرضًا توضيحيًا",
    heading: ["شاهد كيف تعمل Meet to Manage مع", "أكاديميتك."],
    sub: "احصل على جولة مخصصة في الحصص المباشرة والقبول والرسوم وتحديثات أولياء الأمور، كمنصة واحدة.",
    features: [
      { title: "الحصص المباشرة", body: "تجربة تدريس أسلس" },
      { title: "القبول", body: "تتبّع الاستفسارات وحوّلها" },
      { title: "الرسوم والمدفوعات", body: "بسيطة وآمنة" },
      { title: "تحديثات أولياء الأمور", body: "أبقِ الجميع على اطلاع" },
    ],
    noCommit: "دون التزام. سنتواصل معك في وقت مناسب.",
    formTitle: "اطلب عرضًا توضيحيًا",
    formSub: "شاركنا بعض التفاصيل وسنتواصل معك لتحديد موعد عرض لأكاديميتك.",
  },
};

/**
 * A/B test on the academy (non-coach) copy: "a" is the panel copy above, "b" is this
 * outcome-led version. Visitors are split 50/50 by their analytics id and the bucket rides on
 * every form event, so the Marketing Console's Visitors page can compare submit rates.
 * Preview a bucket with ?variant=a or ?variant=b. To end the test, keep the winner and
 * delete the loser plus the experiment plumbing in GetStarted.
 */
const EXPERIMENT = "getstarted-copy";
const VARIANTS = ["a", "b"] as const;
type Variant = (typeof VARIANTS)[number];

const PANEL_B = {
  en: {
    eyebrow: "Free 30-minute walkthrough",
    heading: ["Run classes, admissions and fees from", "one dashboard."],
    sub: "We'll show you, on a sample academy like yours, how an enquiry becomes an enrolled, fee-paying student. Bring your questions about branches, staff and the tools you use today.",
    noCommit: "No payment details and no commitment, just answers for your academy.",
    formTitle: "Get your free walkthrough",
    formSub: "Leave an email or WhatsApp number and we'll reply within one business day to pick a time.",
    cta: "Show me how it works",
  },
  ar: {
    eyebrow: "جولة مجانية لمدة 30 دقيقة",
    heading: ["أدِر الحصص والقبول والرسوم من", "لوحة واحدة."],
    sub: "سنريك على أكاديمية نموذجية تشبه أكاديميتك كيف يتحول الاستفسار إلى طالب مسجّل يدفع الرسوم. أحضر أسئلتك عن الفروع والفريق والأدوات التي تستخدمها اليوم.",
    noCommit: "بلا بيانات دفع وبلا التزام، فقط إجابات تخص أكاديميتك.",
    formTitle: "احصل على جولتك المجانية",
    formSub: "اترك بريدًا إلكترونيًا أو رقم واتساب وسنرد خلال يوم عمل واحد لتحديد موعد.",
    cta: "أرني كيف تعمل",
  },
};

const PANEL_TILES = [
  { icon: Video, bg: "from-[#FFF3EA] to-[#FFDFC8]", fg: "#C2410C" },
  { icon: Users, bg: "from-[#FFF3EA] to-[#FFDFC8]", fg: "#C2410C" },
  { icon: CreditCard, bg: "from-[#FFF3EA] to-[#FFDFC8]", fg: "#C2410C" },
  { icon: MessageSquare, bg: "from-[#FFF3EA] to-[#FFDFC8]", fg: "#C2410C" },
];

/** A form field with a leading icon, rounded, in the page's soft style. */
function Field({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon aria-hidden className="pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#44403C]" />
      {children}
    </div>
  );
}
const FIELD = "h-12 w-full !rounded-xl border border-[#EBD9C8] bg-white ps-11 pe-3 text-sm text-[#1C1917] shadow-none placeholder:text-[#8A817A] focus:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/25";

const EMPTY_FORM = { fullName: "", workEmail: "", phone: "", academyName: "", message: "" };

export default function GetStarted() {
  useLightBrandScope();
  const live = apiEnabled();
  const [lang] = useLang();
  const t = T[lang];
  // ?for=coach arrives from the homepage's "Influencers & personal-brand coaches" Solutions
  // card and the Pricing page's Pay As You Grow plan — same form and same sales-assisted
  // flow underneath, just reframed so a solo coach isn't greeted with "academy owners" copy
  // or forced to invent an academy name they don't have.
  const [searchParams] = useSearchParams();
  const isCoach = searchParams.get("for") === "coach";
  // Coaches see their own copy, so only academy visitors join the copy test.
  const [variant] = useState<Variant>(() => experimentVariant(EXPERIMENT, VARIANTS));
  const tag = isCoach ? undefined : `${EXPERIMENT}:${variant}`;
  const pc = { ...PANEL[lang], cta: t.requestDemo, ...(tag && variant === "b" ? PANEL_B[lang] : {}) };
  // The homepage hero hands over whatever the visitor typed (an email or a mobile number) as ?contact=.
  const [form, setForm] = useState(() => {
    const contact = (searchParams.get("contact") ?? "").trim().slice(0, 120);
    // ?offer=ngo comes from the homepage's "Free for NGOs" banner; the team confirms eligibility from this note.
    // ?plan=&cycle= come from the pricing page, so the team knows which plan the visitor was weighing.
    const plan = (searchParams.get("plan") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
    const cycle = searchParams.get("cycle") === "Year" ? "yearly" : "monthly";
    const base = searchParams.get("offer") === "ngo"
      ? { ...EMPTY_FORM, message: "NGO / non-profit offer: please confirm eligibility and next steps." }
      : plan ? { ...EMPTY_FORM, message: `Interested in the ${plan} plan (${cycle} billing).` } : EMPTY_FORM;
    if (!contact) return base;
    return contact.includes("@") ? { ...base, workEmail: contact } : { ...base, phone: contact };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const startedRef = useRef(false);
  const submittedRef = useRef(false);
  const tagRef = useRef(tag);

  function markFormStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    trackMarketingEvent("form_started", undefined, tag);
  }

  useEffect(() => {
    tagRef.current = tag;
    if (tag) trackMarketingEvent("experiment_viewed", undefined, tag);
  }, [tag]);

  useEffect(() => {
    const abandoned = () => {
      if (startedRef.current && !submittedRef.current) trackMarketingEvent("form_abandoned", undefined, tagRef.current);
    };
    window.addEventListener("pagehide", abandoned);
    return () => {
      window.removeEventListener("pagehide", abandoned);
      abandoned();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) {
      trackMarketingEvent("form_validation_failed", undefined, tag);
      setError(t.errorCoach);
      return;
    }
    if (!form.workEmail.trim() && !form.phone.trim()) {
      trackMarketingEvent("form_validation_failed", undefined, tag);
      setError(lang === "en" ? "Enter an email address or WhatsApp number so we can contact you." : "أدخل بريدًا إلكترونيًا أو رقم واتساب لنتواصل معك.");
      return;
    }

    if (!live) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const attribution = marketingAttribution();
      await requestPlatformDemo({
        fullName: form.fullName,
        workEmail: form.workEmail,
        phone: form.phone,
        academyName: form.academyName.trim() || t.fallbackName,
        message: form.message || undefined,
        visitorId: marketingVisitorId(), source: attribution.utmSource ?? attribution.referrerHost,
        medium: attribution.utmMedium, campaign: attribution.utmCampaign, landingPath: window.location.pathname,
      });
      markDemoBooked();
      submittedRef.current = true;
      trackMarketingEvent("form_submitted", undefined, tag);
      void trackDemoBooked(window.location.pathname);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="getStarted"
        title={isCoach ? t.seoTitleCoach : t.seoTitleAcademy}
        description={isCoach ? t.seoDescCoach : t.seoDescAcademy}
        path="/get-started"
      />

      <MarketingNav />

      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF3EA] via-[#FFF8F3] to-white px-5 py-[clamp(32px,5vw,72px)]">
        <div className="mx-auto max-w-[1160px] overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05),0_40px_80px_-40px_rgba(194,65,12,0.35)] ring-1 ring-[#F6E3D3]">
          <div className="grid lg:grid-cols-[1.05fr_1fr]">
            <div className="relative overflow-hidden p-7 sm:p-10 lg:p-12">
              <p className="relative text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C] rtl:tracking-normal">{pc.eyebrow}</p>
              <h1 className="font-display relative mt-3 text-[clamp(1.7rem,2.7vw,2.4rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#1C1917] rtl:tracking-normal">
                {isCoach ? t.headingCoach : <>{pc.heading[0]} <span className="text-[#C2410C]">{pc.heading[1]}</span></>}
              </h1>
              <p className="relative mt-3 max-w-[46ch] text-[15px] leading-relaxed text-[#57534E]">{isCoach ? t.introCoach : pc.sub}</p>

              <div className="relative mt-7 flex items-end gap-2">
              <ul className="flex min-w-0 flex-1 flex-col gap-3">
                {pc.features.map((f, i) => {
                  const Icon = PANEL_TILES[i].icon;
                  return (
                    <li key={f.title} className="flex items-center gap-4">
                      <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b shadow-[0_6px_14px_-8px_rgba(28,25,23,0.45)] ring-1 ring-white", PANEL_TILES[i].bg)} style={{ color: PANEL_TILES[i].fg }}><Icon className="h-6 w-6" /></span>
                      <span><span className="block text-[15px] font-bold text-[#1C1917]">{f.title}</span><span className="block text-sm text-[#57534E]">{f.body}</span></span>
                    </li>
                  );
                })}
              </ul>
              <div aria-hidden="true" className="relative hidden w-[210px] shrink-0 self-stretch xl:block">
                <div className="absolute bottom-1 start-1/2 h-5 w-32 -translate-x-1/2 rounded-[50%] bg-[#F4C9A4]/50 blur-md" />
                <img src="/product/mito-robot.webp" alt="" width={483} height={700} loading="lazy" decoding="async" className="absolute bottom-2 start-1/2 h-[290px] w-auto max-w-none -translate-x-1/2 select-none rtl:-scale-x-100" />
              </div>
              </div>
              <p className="relative mt-8 flex items-center gap-3 border-t border-[#EFE3D7] pt-5 text-sm font-medium text-[#57534E]">
                <CheckCircle2 aria-hidden className="h-6 w-6 shrink-0 text-[#EA580C]" /> {pc.noCommit}
              </p>
            </div>

            <div className="flex flex-col justify-center border-t border-[#EFE3D7] p-7 sm:p-10 lg:border-s lg:border-t-0 lg:p-12">
              {submitted ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3EA] text-[#EA580C]"><CheckCircle2 className="h-7 w-7" /></span>
                  <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[#1C1917] rtl:tracking-normal">{t.thanksHeading}</h2>
                  <p className="mt-2 max-w-sm text-sm text-[#57534E]">{live ? (isCoach ? t.thanksCoach : t.thanksAcademy) : t.demoModeNote}</p>
                  <Link to="/" className={cn(CTA_DARK, "mt-7 !rounded-2xl")}>{t.backToHome}</Link>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-[clamp(1.6rem,2.6vw,2rem)] font-extrabold tracking-[-0.02em] text-[#1C1917] rtl:tracking-normal">{pc.formTitle}</h2>
                  <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-[#57534E]">{pc.formSub}</p>
                  <form onSubmit={handleSubmit} onFocus={markFormStarted} className="mt-6 flex flex-col gap-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="gs-fullName" className="font-semibold text-[#1C1917]">{t.yourName} <span aria-hidden className="text-[#C2410C]">*</span></Label>
                      <Field icon={User}>
                        <Input id="gs-fullName" required className={FIELD} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder={t.namePlaceholder} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="gs-workEmail" className="font-semibold text-[#1C1917]">{t.workEmail} <span className="font-normal text-[#78716C]">({lang === "en" ? "optional" : "اختياري"})</span></Label>
                        <Field icon={Mail}>
                          <Input id="gs-workEmail" type="email" autoComplete="email" className={FIELD} value={form.workEmail} onChange={(e) => setForm((f) => ({ ...f, workEmail: e.target.value }))} placeholder={t.emailPlaceholder} />
                        </Field>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="gs-phone" className="font-semibold text-[#1C1917]">{lang === "en" ? "WhatsApp number" : t.phone} <span className="font-normal text-[#78716C]">({lang === "en" ? "optional" : "اختياري"})</span></Label>
                        <Field icon={Phone}>
                          <Input id="gs-phone" type="tel" autoComplete="tel" className={FIELD} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={t.phonePlaceholder} />
                        </Field>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="gs-academyName" className="font-semibold text-[#1C1917]">{isCoach ? t.academyNameCoach : t.academyNameAcademy} {!isCoach && <span className="font-normal text-[#78716C]">({lang === "en" ? "optional" : "اختياري"})</span>}</Label>
                      <Field icon={Landmark}>
                        <Input id="gs-academyName" autoComplete="organization" className={FIELD} value={form.academyName} onChange={(e) => setForm((f) => ({ ...f, academyName: e.target.value }))} placeholder={isCoach ? t.academyPlaceholderCoach : t.academyPlaceholderAcademy} />
                      </Field>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="gs-message" className="font-semibold text-[#1C1917]">{t.anythingElse}</Label>
                      <div className="relative">
                        <MessageCircle aria-hidden className="pointer-events-none absolute start-4 top-4 h-[18px] w-[18px] text-[#44403C]" />
                        <Textarea id="gs-message" rows={3} className={cn(FIELD, "h-auto py-3.5")} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder={t.messagePlaceholder} />
                      </div>
                    </div>
                    {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
                    <button type="submit" disabled={submitting} className={cn(CTA_ORANGE, "mt-1 h-14 w-full !rounded-2xl text-base normal-case tracking-normal shadow-[0_16px_30px_-14px_rgba(194,65,12,0.8)]")}>
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{pc.cta} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" /></>}
                    </button>
                    <p className="text-center text-xs leading-relaxed text-[#78716C]">
                      {lang === "en" ? "We only use these details to arrange your walkthrough." : "نستخدم هذه التفاصيل فقط لترتيب العرض التوضيحي."}
                    </p>
                    <a
                      href="https://wa.me/919344773231?text=I%27d%20like%20a%20free%20Meet%20to%20Manage%20walkthrough."
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackMarketingEvent("whatsapp_clicked", undefined, tag)}
                      className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#166534] underline decoration-[#22C55E]/40 underline-offset-4 hover:decoration-[#166534]"
                    >
                      <MessageSquare className="h-4 w-4" /> {lang === "en" ? "Prefer WhatsApp? Chat with us" : "تفضل واتساب؟ تحدث معنا"}
                    </a>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
