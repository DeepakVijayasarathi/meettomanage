import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { BookDemoForm } from "@/components/BookDemoForm";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";

const T = {
  en: {
    backHome: "Back home",
    eyebrow: "Free demo class",
    heading: "See a class before you commit to one.",
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
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="demo"
        title="Book a Free Demo — Meet to Manage"
        description="Book a free demo class and see how Meet to Manage's live classroom, scheduling and billing work together."
        path="/demo"
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
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.eyebrow}</p>
          <h1 className="font-display mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            {t.heading}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#5B6472]">{t.sub}</p>

          <ul className="mt-8 flex flex-col gap-4">
            {t.included.map((item) => (
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
          <BookDemoForm />
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
