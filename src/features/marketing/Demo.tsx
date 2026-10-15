import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { BookDemoForm } from "@/components/BookDemoForm";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MarketingHero } from "./MarketingHero";
import { CARD, EYEBROW, HERO_OVERLAP } from "./styles";

const T = {
  en: {
    backHome: "Back home",
    eyebrow: "Free demo class",
    heading: "See a class before you commit to one.",
    includedHeading: "What you get",
    sub: "Pick a time and we'll match you with a teacher — the same live classroom, scheduling and billing every enrolled family uses.",
    included: [
      "A real class with one of our teachers, on your child's actual subject",
      "A walkthrough of the parent portal — billing, schedule and progress in one place",
      "No obligation, no payment details required to book",
    ],
    rights: (year: number) => `© ${year} Meet to Manage. All rights reserved.`,
  },
  ar: {
    backHome: "العودة للرئيسية",
    eyebrow: "حصة تجريبية مجانية",
    heading: "شاهد حصة قبل أن تلتزم بها.",
    includedHeading: "ما الذي ستحصل عليه",
    sub: "اختر موعدًا وسنُطابقك مع معلّم — نفس الفصل الدراسي المباشر والجدولة والفوترة التي تستخدمها كل عائلة مسجَّلة.",
    included: [
      "حصة حقيقية مع أحد معلمينا، في مادة طفلك الفعلية",
      "جولة على بوابة ولي الأمر — الفوترة والجدول والتقدّم في مكان واحد",
      "بلا التزام، ودون الحاجة لبيانات دفع للحجز",
    ],
    rights: (year: number) => `© ${year} Meet to Manage. جميع الحقوق محفوظة.`,
  },
};

export default function Demo() {
  useLightBrandScope();
  const [lang] = useLang();
  const t = T[lang];

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="demo"
        title="Book a Free Demo — Meet to Manage"
        description="Book a free demo class and see how Meet to Manage's live classroom, scheduling and billing work together."
        path="/demo"
      />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Meet to Manage home">
            <Logo wordmarkClassName="mix-blend-multiply" />
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

      <MarketingHero eyebrow={t.eyebrow} title={t.heading} sub={t.sub} overlap />

      <section className="mx-auto max-w-[1160px] px-5 pb-[clamp(72px,8vw,120px)]">
        <div className={cn(CARD, HERO_OVERLAP, "grid grid-cols-1 lg:grid-cols-2")}>
        <div className="p-8 sm:p-12">
          <p className={EYEBROW}>{t.includedHeading}</p>
          <ul className="mt-6 flex flex-col gap-5">
            {t.included.map((item) => (
              <li key={item} className="flex items-start gap-3 border-b border-[#D9E1F0] pb-5 last:border-b-0 last:pb-0">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#EA580C]" />
                <span className="text-base leading-relaxed text-[#111]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[#D9E1F0] bg-[#F8F9FB] p-8 sm:p-12 lg:border-s lg:border-t-0">
          <BookDemoForm />
        </div>
        </div>
      </section>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-start">
          <Logo imgClassName="h-11 w-11" wordmarkClassName="mix-blend-multiply" />
          <p className="text-xs font-medium text-[#5B6472]">{t.rights(new Date().getFullYear())}</p>
        </div>
      </footer>
    </div>
  );
}
