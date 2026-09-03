import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { apiEnabled } from "@/lib/api";
import { requestPlatformDemo } from "@/api/marketing";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";

const T = {
  en: {
    backHome: "Back home",
    badgeCoach: "For coaches & personal brands",
    badgeAcademy: "For academy owners",
    headingCoach: "See Meet to Manage running your master class.",
    headingAcademy: "See Meet to Manage running your academy.",
    introCoach: "This is a walkthrough of the platform itself — for coaches deciding whether to run their online master class and client bookings on it. Looking for a free trial class for your child instead? ",
    introAcademy: "This is a walkthrough of the platform itself — for academy owners deciding whether to run their business on it. Looking for a free trial class for your child instead? ",
    bookClassHere: "Book a class demo here.",
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
    requestDemo: "Request a Demo",
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
    headingCoach: "شاهد Meet to Manage وهي تُدير الكلاس ماستر الخاص بك.",
    headingAcademy: "شاهد Meet to Manage وهي تُدير أكاديميتك.",
    introCoach: "هذه جولة على المنصة نفسها — للمدربين الذين يقرّرون ما إذا كانوا سيشغّلون الكلاس ماستر الإلكتروني وحجوزات عملائهم عليها. تبحث عن حصة تجريبية مجانية لطفلك بدلًا من ذلك؟ ",
    introAcademy: "هذه جولة على المنصة نفسها — لأصحاب الأكاديميات الذين يقرّرون ما إذا كانوا سيديرون أعمالهم عليها. تبحث عن حصة تجريبية مجانية لطفلك بدلًا من ذلك؟ ",
    bookClassHere: "احجز حصة تجريبية من هنا.",
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || (!isCoach && !form.academyName.trim())) {
      setError(isCoach ? t.errorCoach : t.errorAcademy);
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
        academyName: form.academyName.trim() || t.fallbackName,
        message: form.message || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="getStarted"
        title={isCoach ? t.seoTitleCoach : t.seoTitleAcademy}
        description={isCoach ? t.seoDescCoach : t.seoDescAcademy}
        path="/get-started"
      />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Meet to Manage home">
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

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          {isCoach ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FFE1C7] bg-[#FFF3EA] px-3.5 py-1.5 text-xs font-semibold text-[#C2410C]">
              <Megaphone className="h-3.5 w-3.5" /> {t.badgeCoach}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FFE1C7] bg-[#FFF3EA] px-3.5 py-1.5 text-xs font-semibold text-[#C2410C]">
              <Building2 className="h-3.5 w-3.5" /> {t.badgeAcademy}
            </div>
          )}
          <h1 className="font-display mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            {isCoach ? t.headingCoach : t.headingAcademy}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#5B6472]">
            {isCoach ? t.introCoach : t.introAcademy}
            <Link to="/demo" className="font-semibold text-[#EA580C] hover:text-[#C2410C]">
              {t.bookClassHere}
            </Link>
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {(isCoach ? t.includedCoach : t.includedAcademy).map((item) => (
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
              <h2 className="text-lg font-bold">{t.thanksHeading}</h2>
              <p className="mt-1.5 text-sm text-[#5B6472]">
                {live ? (isCoach ? t.thanksCoach : t.thanksAcademy) : t.demoModeNote}
              </p>
              <Button asChild variant="outline" className="mt-6 border-[#171B22]/15 text-[#171B22] hover:bg-[#171B22]/5">
                <Link to="/">{t.backToHome}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="grid gap-1.5">
                <Label htmlFor="gs-fullName">{t.yourName}</Label>
                <Input
                  id="gs-fullName"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder={t.namePlaceholder}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="gs-workEmail">{t.workEmail}</Label>
                  <Input
                    id="gs-workEmail"
                    type="email"
                    required
                    value={form.workEmail}
                    onChange={(e) => setForm((f) => ({ ...f, workEmail: e.target.value }))}
                    placeholder={t.emailPlaceholder}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="gs-phone">{t.phone}</Label>
                  <Input
                    id="gs-phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder={t.phonePlaceholder}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gs-academyName">{isCoach ? t.academyNameCoach : t.academyNameAcademy}</Label>
                <Input
                  id="gs-academyName"
                  required={!isCoach}
                  value={form.academyName}
                  onChange={(e) => setForm((f) => ({ ...f, academyName: e.target.value }))}
                  placeholder={isCoach ? t.academyPlaceholderCoach : t.academyPlaceholderAcademy}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gs-message">{t.anythingElse}</Label>
                <Textarea
                  id="gs-message"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder={t.messagePlaceholder}
                />
              </div>
              {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="mt-1 w-full !bg-[#F97316] !text-white hover:!bg-[#EA580C]">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.requestDemo}
              </Button>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-start">
          <Logo imgClassName="h-11 w-11" />
          <p className="text-xs font-medium text-[#5B6472]">{t.rights(new Date().getFullYear())}</p>
        </div>
      </footer>
    </div>
  );
}
