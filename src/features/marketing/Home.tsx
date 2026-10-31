import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Bell, Smartphone, Tag, Video, BookOpenText, UserRound, Mail, MessageSquare, Calculator, CheckCircle2, ChevronDown, Code2, CreditCard, GraduationCap, Languages, Lock, ShieldCheck, Sparkles, Users, type LucideIcon } from "lucide-react";
import { Seo } from "@/components/Seo";
import { saasPublic } from "@/api/saas";
import { apiEnabled } from "@/lib/api";
import { useBrand } from "@/lib/branding";
import { useLang } from "@/lib/i18n";
import { useLightBrandScope } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { detectMarketCurrency, formatMarketPrice, INR_PER_USD } from "@/lib/region";
import { ChaosToOne } from "./ChaosToOne";
import { MarketingFooter } from "./MarketingFooter";
import { BTN_PRIMARY, MarketingNav } from "./MarketingNav";
import { OpenSourceStrip } from "./OpenSourceStrip";
import { FreeGamesPromo } from "./games/FreeGamesPromo";
import { SALES_WHATSAPP_URL } from "./WalkthroughCta";
import { COPY } from "./home/copy";
import { ExplainerVideo } from "./home/ExplainerVideo";
import { CountUp, Reveal } from "./home/fx";
import { FX_CSS } from "./home/fxCore";
import { AccessForm } from "./home/AccessForm";
import { HeroPicture } from "./home/HeroPicture";
import { LiveSection } from "./home/LiveSection";
import { MobileSection } from "./home/MobileSection";
import { Showcase } from "./home/Showcase";

// The assistant (about 1,000 lines of chat and voice code) loads after the page is interactive, or at once if asked for.
// The offer popup loads after the page is interactive and shows once per visit.
const PromoPopup = lazy(() => import("./home/PromoPopup").then((m) => ({ default: m.PromoPopup })));
const ChatWidget = lazy(() => import("./HomeChat").then((m) => ({ default: m.ChatWidget })));

/** One mark per item in the "built on" strip, in the same order as the copy. Cashfree has no logo in the open icon set we
 *  use, so it (like email and SMS, which are channels rather than brands) gets a plain icon instead of a made-up logo. */
const PROOF_MARKS: { logo?: string; icon?: LucideIcon; color: string }[] = [
  { logo: "/tool-logos/razorpay.svg", color: "#0C2451" },
  { icon: CreditCard, color: "#57534E" },
  { logo: "/tool-logos/whatsapp.svg", color: "#25D366" },
  { icon: Mail, color: "#C2410C" },
  { icon: MessageSquare, color: "#7C3AED" },
];

function ProofMark({ mark, label }: { mark: { logo?: string; icon?: LucideIcon; color: string }; label: string }) {
  return (
    <span title={label} className="flex h-9 w-9 items-center justify-center">
      <span className="sr-only">{label}</span>
      {mark.logo ? (
        <span aria-hidden="true" className="block h-8 w-8" style={{ backgroundColor: mark.color, WebkitMask: `url(${mark.logo}) center / contain no-repeat`, mask: `url(${mark.logo}) center / contain no-repeat` }} />
      ) : (
        (() => { const Icon = mark.icon!; return <Icon aria-hidden="true" className="h-8 w-8" style={{ color: mark.color }} />; })()
      )}
    </span>
  );
}

/** One warm orange tint for every card: the brand colour is the only accent, so nothing competes with it. */
const PEACH = { tile: "from-[#FFF3EA] to-[#FFDFC8]", icon: "#C2410C", blob: "#FFE6D3", dot: "#F4B98C", wash: "#FFFAF6", shadow: "rgba(194,65,12,0.3)" };
const TINTS = Array.from({ length: 6 }, () => PEACH);

/** Which pastel each security card uses: peach, sky, mint. */
const SEC_TINT = [0, 3, 2];

/** Icons for the pricing teaser's three included points, in the order of the copy. */
const PRICE_POINT_ICONS: LucideIcon[] = [Video, Smartphone, Tag];

/** Icon and tint for each metric card, in the order of the copy: portals, games, reminders, login. */
const METRIC_STYLE: { icon: LucideIcon; tint: number }[] = [
  { icon: Users, tint: 0 },
  { icon: BookOpenText, tint: 1 },
  { icon: Bell, tint: 2 },
  { icon: UserRound, tint: 3 },
];

/** Soft, faded illustration in a security card's top-right corner: a peach blob plus a motif that matches the card. */
function SecurityArt({ index }: { index: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -end-6 -top-6 h-44 w-52">
      <div className="absolute end-0 top-0 h-36 w-36 rounded-full opacity-90" style={{ background: `linear-gradient(135deg, ${TINTS[SEC_TINT[index]].blob}, transparent)` }} />
      {index === 0 && <div className="absolute end-10 top-14 h-14 w-20 opacity-80 [background-size:20px_20px]" style={{ backgroundImage: `radial-gradient(${TINTS[SEC_TINT[0]].dot} 2.5px, transparent 2.5px)` }} />}
      {index === 1 && (
        <>
          <div className="absolute end-16 top-12 h-16 w-24 rotate-[-14deg] rounded-lg bg-gradient-to-br from-[#FDBA74] to-[#FFE0C2] opacity-80 shadow-md" />
          <div className="absolute end-8 top-14 h-16 w-24 rotate-[-8deg] rounded-lg bg-[#FFE9D8] opacity-70" />
        </>
      )}
      {index === 2 && (
        <svg viewBox="0 0 80 92" className="absolute end-10 top-9 h-24 w-20 opacity-80">
          <path d="M40 4 L74 16 V44 C74 66 58 82 40 90 C22 82 6 66 6 44 V16 Z" fill={TINTS[SEC_TINT[2]].dot} />
          <path d="M24 46 L36 58 L58 32" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

/** Faded corner motif for an audience card: a peach blob and a dot grid, varied by position so the six cards don't repeat. */
function CardArt({ index }: { index: number }) {
  const t = TINTS[index % TINTS.length];
  const flip = index % 2 === 1;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -end-8 -top-8 h-40 w-44">
      <div className="absolute end-0 top-0 h-32 w-32 rounded-full opacity-90 transition-transform duration-500 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${t.blob}, transparent)` }} />
      <div className={"absolute top-14 h-12 w-16 opacity-80 [background-size:18px_18px] " + (flip ? "end-14" : "end-10")} style={{ backgroundImage: `radial-gradient(${t.dot} 2.5px, transparent 2.5px)` }} />
    </div>
  );
}

const SECURITY_ICONS: LucideIcon[] = [Lock, CreditCard, ShieldCheck];
const AUDIENCE_ICONS: Record<string, LucideIcon> = { abacus: Calculator, phonics: BookOpenText, english: Languages, tuition: GraduationCap, coding: Code2, trainer: Users };
const EYEBROW = "text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C] rtl:tracking-normal";
const H2 = "font-display text-[clamp(1.65rem,3vw,2.5rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1C1917] rtl:tracking-normal";

export default function MarketingHome() {
  useLightBrandScope();
  const brand = useBrand();
  const [lang] = useLang();
  const c = COPY[lang];
  const [aiOpenRequest, setAiOpenRequest] = useState(0);
  const [chatReady, setChatReady] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const currency = useMemo(detectMarketCurrency, []);
  const [fromInr, setFromInr] = useState(2999);
  const [fromUsd, setFromUsd] = useState<number | null>(null);
  const fromPrice = currency === "USD" ? fromUsd ?? Math.round(fromInr / INR_PER_USD) : fromInr;

  // The cheapest live monthly price, so the teaser can never drift from what billing charges.
  useEffect(() => {
    if (!apiEnabled()) return;
    let active = true;
    saasPublic.plans()
      .then((plans) => {
        const monthly = (code: string) => plans.flatMap((p) => p.prices.filter((x) => x.billingInterval === "Month" && x.currency === code).map((x) => x.amount));
        const inr = monthly("INR");
        const usd = monthly("USD");
        if (!active) return;
        if (inr.length > 0) setFromInr(Math.min(...inr));
        if (usd.length > 0) setFromUsd(Math.min(...usd));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const start = () => setChatReady(true);
    const id = window.setTimeout(() => (idle ? idle(start, { timeout: 6000 }) : start()), 3500);
    return () => window.clearTimeout(id);
  }, []);

  const jsonLd = useMemo(
    () =>
      JSON.stringify([
        { "@context": "https://schema.org", "@type": "Organization", name: "Meet to Manage", url: "https://meettomanage.cloud", logo: "https://meettomanage.cloud/logo-icon.png", email: "info@infinityuniquers.com", parentOrganization: { "@type": "Organization", name: "Infinity Uniquers" } },
        { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Meet to Manage", applicationCategory: "EducationalApplication", operatingSystem: "Web, iOS, Android", description: COPY.en.hero.sub, featureList: ["Interactive live classes", "Admissions CRM", "Batch scheduling and attendance", "Automated fee collection", "Parent mobile app", "Academy reports"], offers: { "@type": "Offer", priceCurrency: "INR", price: fromInr, url: "https://meettomanage.cloud/pricing" } },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: COPY.en.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      ]),
    [fromInr],
  );

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white pb-20 text-[#1C1917] sm:pb-0">
      <style>{FX_CSS}</style>
      <Seo
        pageKey="home"
        title="Coaching Centre Management Software | Meet to Manage"
        description="Manage live classes, admissions, fees and parent updates in one platform built for tuition, abacus and phonics centres. Book a free demo."
        path="/"
      />
      <Helmet><script type="application/ld+json">{jsonLd}</script></Helmet>

      <a href="#main" className="sr-only z-50 bg-white px-4 py-3 text-sm font-bold text-[#1C1917] focus:not-sr-only focus:fixed focus:start-3 focus:top-3">{c.skip}</a>
      <MarketingNav home />

      <main id="main">
        {/* HERO */}
        <section className="relative overflow-hidden bg-white pb-[clamp(48px,6vw,88px)] pt-[clamp(24px,4vw,64px)]">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(55%_70%_at_30%_0%,#FFE6D0,transparent)]" />
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[560px] opacity-60 [background-image:radial-gradient(#F4C9A4_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(60%_80%_at_30%_0%,#000,transparent)]" />
          <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-6">
            <div className="min-w-0 text-start">
              <h1 className="font-display text-balance text-[clamp(2rem,3.35vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#1C1917] rtl:tracking-normal">
                {c.hero.words.map((word, i) => {
                  const accent = c.hero.accent.includes(i);
                  return (
                    <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.14em] align-bottom">
                      <span className={cn("mx-word", accent && "mx-hl text-[#C2410C]")} style={{ animationDelay: `${i * 80}ms` }}>{word}</span>
                      {i < c.hero.words.length - 1 && "\u00A0"}
                    </span>
                  );
                })}
              </h1>
              <p className="mx-fade-up mt-5 max-w-[510px] text-[clamp(1rem,1.25vw,1.125rem)] leading-[1.8] text-[#6B625B]" style={{ animationDelay: "0.55s" }}>{c.hero.sub}</p>

              <div className="mt-8">
                <AccessForm c={c.hero.form} watch={{ label: c.hero.watch, cta: c.hero.demo }} />
              </div>

              <ul className="mx-fade-up mt-7 grid gap-x-5 gap-y-3 border-t border-[#EBD9CA] pt-5 text-xs font-medium text-[#57534E] sm:grid-cols-2" style={{ animationDelay: "0.85s" }}>
                {c.hero.trust.map((item) => (
                  <li key={item} className="flex items-center gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF0E3]"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-[#C2410C]" /></span>{item}</li>
                ))}
              </ul>
            </div>

            <HeroPicture c={c.hero.room} />
          </div>
        </section>

        {/* SEARCH-INTENT LANDING BLOCK: crawlable, useful answers and direct paths to conversion. */}
        {lang === "en" && <section aria-labelledby="academy-software-heading" className="border-y border-[#F2DFCE] bg-[#FFF8F3] py-[clamp(56px,6vw,88px)] text-[#1C1917]">
          <div className="mx-auto max-w-[1200px] px-5">
            <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
              <div className="max-w-[780px]">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C]">Built for growing education businesses</p>
                <h2 id="academy-software-heading" className="font-display mt-4 text-[clamp(1.75rem,3.2vw,2.75rem)] font-extrabold leading-[1.08] tracking-[-0.035em]">
                  Coaching centre management software for classes, admissions and fees.
                </h2>
                <p className="mt-5 max-w-[720px] text-lg leading-relaxed text-[#57534E]">
                  Meet to Manage connects the work that usually lives across video apps, spreadsheets and message threads. Your team follows one workflow from the first enquiry to the next paid class.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link to="/get-started" className={cn(BTN_PRIMARY, "justify-center px-7 py-3.5")}>Book a free walkthrough <ArrowRight className="h-4 w-4" /></Link>
                <a href={SALES_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D9C9BA] bg-white px-7 py-3.5 text-sm font-bold text-[#166534] shadow-sm transition-colors hover:border-[#86C99A] hover:bg-[#F0FDF4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#166534]">
                  <MessageSquare className="h-4 w-4" /> Ask on WhatsApp
                </a>
              </div>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <Link to="/solutions/live-class-software-for-institutes" className="group rounded-2xl border border-[#EFE3D7] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(194,65,12,0.45)] transition-all hover:-translate-y-1 hover:border-[#F4B98C]">
                <Video className="h-7 w-7 text-[#EA580C]" />
                <h3 className="mt-5 font-display text-xl font-extrabold">Live class software</h3>
                <p className="mt-2 leading-relaxed text-[#57534E]">Interactive video, whiteboard, activities, recordings and one-click joining from the teacher and parent portals.</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#C2410C]">Explore live classes <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
              <Link to="/solutions/online-attendance-software-for-institutes" className="group rounded-2xl border border-[#EFE3D7] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(194,65,12,0.45)] transition-all hover:-translate-y-1 hover:border-[#F4B98C]">
                <GraduationCap className="h-7 w-7 text-[#EA580C]" />
                <h3 className="mt-5 font-display text-xl font-extrabold">Admissions and attendance</h3>
                <p className="mt-2 leading-relaxed text-[#57534E]">Track enquiries, demos, enrolments and attendance without losing the history in private messages or spreadsheets.</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#C2410C]">Explore attendance <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
              <Link to="/pricing" className="group rounded-2xl border border-[#EFE3D7] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(194,65,12,0.45)] transition-all hover:-translate-y-1 hover:border-[#F4B98C]">
                <CreditCard className="h-7 w-7 text-[#EA580C]" />
                <h3 className="mt-5 font-display text-xl font-extrabold">Fee collection and parent app</h3>
                <p className="mt-2 leading-relaxed text-[#57534E]">Create invoices, send reminders and give parents one place for payments, schedules, updates and recordings.</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#C2410C]">See plans and pricing <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            </div>
            <p className="mt-7 text-sm leading-relaxed text-[#625A53]">Organising your centre manually? Start with our <Link to="/resources/coaching-centre-fee-tracker" className="font-semibold text-[#C2410C] underline underline-offset-4">free fee-tracker template</Link> or <Link to="/resources/teacher-handover-checklist" className="font-semibold text-[#C2410C] underline underline-offset-4">teacher-handover checklist</Link>, with worked examples and no signup required.</p>
          </div>
        </section>}

        {lang === "en" && <section className="bg-white px-5 py-[clamp(32px,4vw,56px)]"><OpenSourceStrip /></section>}
        {lang === "en" && <FreeGamesPromo />}

        {/* PROOF: what it's built on */}
        <section aria-label={c.proof.label} className="border-y border-[#EFE3D7] bg-white py-7">
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.1em] text-[#6B6560] rtl:tracking-normal">{c.proof.label}</p>
          <ul className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-12 gap-y-5 px-5">
            {c.proof.items.map((item, i) => (
              <li key={item} className="opacity-90 transition-opacity hover:opacity-100">
                <ProofMark mark={PROOF_MARKS[i]} label={item} />
              </li>
            ))}
          </ul>
        </section>

        {/* REAL CUSTOMER PROOF: factual product use, linked to the full approved story. */}
        {lang === "en" && <section aria-labelledby="customer-proof-heading" className="bg-[#FFF8F3] py-7">
          <div className="mx-auto flex max-w-[1080px] flex-col items-center gap-5 px-5 text-center sm:flex-row sm:text-start">
            <img src="/clients/thereader.png" alt="The Reader Nest logo" width={64} height={64} loading="lazy" className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-black/10" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#C2410C]">Customer story</p>
              <h2 id="customer-proof-heading" className="font-display mt-1 text-lg font-extrabold tracking-[-0.02em] text-[#1C1917]">The Reader Nest runs enrolment, classes, worksheets, recordings and its parent dashboard in one platform.</h2>
            </div>
            <Link to="/customers/the-reader-nest" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#E8C8AD] bg-white px-5 py-3 text-sm font-bold text-[#9A3412] transition-colors hover:bg-[#FFF3EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]">Read the story <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Link>
          </div>
        </section>}

        {/* NGO OFFER: mobile artwork with readable live copy; designed desktop banner in English. */}
        <section aria-labelledby="ngo-offer" className="bg-white pt-[clamp(40px,5vw,72px)]">
          <div className="mx-auto max-w-[1200px] px-5">
            {lang === "en" && (
              <Reveal className="md:hidden">
                <Link
                  to="/get-started?offer=ngo"
                  className="group block overflow-hidden rounded-3xl bg-[#C2410C] text-white shadow-[0_24px_60px_-30px_rgba(194,65,12,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]"
                >
                  <div className="p-6 sm:p-8">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-50">{c.ngo.eyebrow}</p>
                    <h2 id="ngo-offer-mobile" className="font-display mt-4 text-3xl font-extrabold leading-tight tracking-tight">Free for <span className="text-[#FEF08A]">NGOs.</span></h2>
                    <p className="mt-3 text-base leading-relaxed text-orange-50">{c.ngo.body}</p>
                    <p className="mt-3 text-sm font-semibold text-white">{c.ngo.note}</p>
                    <span className="mt-5 inline-flex min-h-12 items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#C2410C]">{c.ngo.cta} <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </div>
                  <img
                    src="/product/ngo-mobile-v2.webp"
                    srcSet="/product/ngo-mobile-v2-480.webp 480w, /product/ngo-mobile-v2.webp 960w"
                    sizes="(min-width: 768px) 0px, calc(100vw - 40px)"
                    alt="Volunteer teacher helping three children learn together using a laptop."
                    width={960}
                    height={720}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full"
                  />
                </Link>
              </Reveal>
            )}
            {lang === "en" && (
              <Reveal className="hidden md:block">
                <Link
                  to="/get-started?offer=ngo"
                  className="group relative isolate block overflow-hidden rounded-3xl bg-[#C2410C] text-white shadow-[0_24px_60px_-30px_rgba(194,65,12,0.55)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]"
                >
                  <div className="relative z-10 w-[48%] p-8 lg:p-10">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-50">{c.ngo.eyebrow}</p>
                    <h2 className="font-display mt-3 text-4xl font-extrabold leading-tight tracking-tight">Free for <span className="text-[#FEF08A]">NGOs.</span></h2>
                    <p className="mt-3 text-base leading-relaxed text-orange-50">{c.ngo.body}</p>
                    <p className="mt-3 text-sm font-semibold">{c.ngo.note}</p>
                    <span className="mt-5 inline-flex min-h-12 items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#C2410C]">{c.ngo.cta} <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </div>
                  <img
                    src="/product/ngo-children-desktop.webp"
                    srcSet="/product/ngo-children-desktop-1200.webp 1200w, /product/ngo-children-desktop.webp 2170w"
                    sizes="(min-width: 1200px) 1160px, calc(100vw - 40px)"
                    alt="Three children learning together using a laptop."
                    width={2170}
                    height={725}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-x-0 top-0 -z-10 h-[116%] w-full object-cover object-right-top"
                  />
                </Link>
              </Reveal>
            )}
            <Reveal className={cn("relative overflow-hidden rounded-3xl bg-[#C2410C] px-7 py-9 text-white sm:px-12 sm:py-11", lang === "en" && "hidden")}>
              <div aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(60%_100%_at_100%_50%,#000,transparent)]" />
              <div className="relative grid items-center gap-6 md:grid-cols-[1.5fr_auto]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-white rtl:tracking-normal">{c.ngo.eyebrow}</p>
                  <h2 id="ngo-offer" className="font-display mt-2 text-[clamp(1.6rem,2.8vw,2.3rem)] font-extrabold leading-[1.08] tracking-[-0.03em] rtl:tracking-normal">{c.ngo.heading}</h2>
                  <p className="mt-3 max-w-xl text-lg leading-relaxed text-white">{c.ngo.body}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{c.ngo.note}</p>
                </div>
                <Link to="/get-started?offer=ngo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-[15px] font-bold text-[#9A3412] transition-colors hover:bg-[#FFF3EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  {c.ngo.cta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="bg-white pb-[clamp(24px,3vw,40px)] pt-[clamp(48px,5.5vw,80px)]">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal className="mx-auto max-w-[760px] text-center">
              <p className={EYEBROW}>{c.audience.eyebrow}</p>
              <h2 className={cn(H2, "mt-4")}>{c.audience.heading}</h2>
              <p className="mt-5 text-lg leading-relaxed text-[#57534E]">{c.audience.sub}</p>
            </Reveal>
            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.audience.items.map((item, i) => {
                const Icon = AUDIENCE_ICONS[item.key];
                return (
                  <Reveal as="li" key={item.key} delay={(i % 3) * 90} className="group relative overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1">
                    <div className="absolute inset-0 -z-0 bg-white" style={{ background: `linear-gradient(160deg, #fff 35%, ${TINTS[i % TINTS.length].wash})`, boxShadow: `0 1px 2px rgba(28,25,23,0.05), 0 18px 40px -24px ${TINTS[i % TINTS.length].shadow}` }} />
                    <CardArt index={i} />
                    <span className={"relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b shadow-[0_6px_14px_-8px_rgba(28,25,23,0.45)] ring-1 ring-white transition-transform duration-300 group-hover:scale-105 " + TINTS[i % TINTS.length].tile} style={{ color: TINTS[i % TINTS.length].icon }}><Icon className="h-7 w-7" /></span>
                    <h3 className="font-display relative mt-6 text-xl font-extrabold tracking-[-0.02em] text-[#1C1917] rtl:tracking-normal">{item.title}</h3>
                    <p className="relative mt-2 text-[15px] leading-relaxed text-[#57534E]">{item.body}</p>
                  </Reveal>
                );
              })}
            </ul>

            <Reveal className="mt-10 rounded-2xl bg-[#FFF3EA] px-6 py-6 sm:px-8">
              <p className="text-sm font-bold text-[#9A3412]">{c.autopilot.heading}</p>
              <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2.5">
                {c.autopilot.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[15px] font-semibold text-[#1C1917]"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#EA580C]" /> {item}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* PROBLEM → ONE SYSTEM */}
        <ChaosToOne lang={lang} brandName={brand.name} />

        {/* LIVE CLASSROOM */}
        <LiveSection c={c.live} />

        {/* PARENT MOBILE APP */}
        <MobileSection c={c.app} />

        {/* PLATFORM TOUR */}
        <section id="features" className="scroll-mt-20 bg-white py-[clamp(48px,5.5vw,80px)]">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal className="max-w-[720px]">
              <p className={EYEBROW}>{c.showcase.eyebrow}</p>
              <h2 className={cn(H2, "mt-4")}>{c.showcase.heading}</h2>
              <p className="mt-5 text-lg leading-relaxed text-[#57534E]">{c.showcase.sub}</p>
            </Reveal>
            <Reveal delay={120} className="mt-12">
              <Showcase tabs={c.showcase.tabs} />
              <p className="mt-6 text-xs font-medium text-[#6B6560]">{c.showcase.caption}</p>
            </Reveal>
          </div>
        </section>

        {/* WALKTHROUGH */}
        <section id="walkthrough" className="relative scroll-mt-20 overflow-hidden bg-gradient-to-b from-[#FFF3EA] via-[#FFF8F3] to-[#FFF3EA] py-[clamp(48px,5.5vw,80px)]">
          {/* soft background blobs */}
          <div aria-hidden="true" className="pointer-events-none absolute -start-24 top-24 h-72 w-72 rounded-full bg-[#FFE3CF]/70 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -end-20 bottom-10 h-80 w-80 rounded-full bg-[#FFE3CF]/70 blur-2xl" />
          <div className="relative mx-auto max-w-[1120px] px-5">
            <Reveal className="mx-auto max-w-[760px] text-center">
              <p className={EYEBROW}>{c.video.eyebrow}</p>
              <h2 className={cn(H2, "mt-4")}>
                {c.video.heading.split(lang === "en" ? /(13-minute)/ : /(13 دقيقة)/).map((part, i) =>
                  i % 2 === 1 ? <span key={i} className="text-[#C2410C]">{part}</span> : <span key={i}>{part}</span>
                )}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-[#57534E]">{c.video.sub}</p>
            </Reveal>
            <Reveal delay={120} className="mt-10">
              <div className="rounded-[28px] bg-gradient-to-b from-[#FB923C] to-[#EA580C] p-[5px] shadow-[0_40px_80px_-30px_rgba(194,65,12,0.65)]">
                <div className="overflow-hidden rounded-[23px] bg-[#0B1220]">
                  <ExplainerVideo title={c.video.heading} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* METRICS */}
        <section aria-label="Platform facts" className="bg-white py-12">
          <dl className="mx-auto grid max-w-[1200px] gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.metrics.map((m, i) => {
              const { icon: Icon, tint } = METRIC_STYLE[i];
              const t = TINTS[tint];
              return (
                <Reveal key={m.label} delay={i * 90} className="group relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-6">
                  <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, #fff 35%, ${t.wash})`, boxShadow: `0 1px 2px rgba(28,25,23,0.05), 0 18px 40px -26px ${t.shadow}` }} />
                  <div aria-hidden="true" className="pointer-events-none absolute -end-6 -top-6 h-24 w-24 rounded-full opacity-90" style={{ background: `linear-gradient(135deg, ${t.blob}, transparent)` }} />
                  <span className={"relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b shadow-[0_6px_14px_-8px_rgba(28,25,23,0.45)] ring-1 ring-white " + t.tile} style={{ color: t.icon }}><Icon className="h-7 w-7" /></span>
                  <span aria-hidden="true" className="relative h-12 w-px shrink-0" style={{ backgroundColor: t.dot }} />
                  <div className="relative min-w-0">
                    <dd className="font-display text-[clamp(1.9rem,3vw,2.5rem)] font-extrabold leading-none tracking-[-0.03em]" style={{ color: t.icon }}><CountUp to={m.to} suffix={m.suffix} /></dd>
                    <dt className="mt-1.5 text-sm font-medium leading-snug text-[#57534E]">{m.label}</dt>
                  </div>
                </Reveal>
              );
            })}
          </dl>
        </section>

        {/* SECURITY */}
        <section id="security" className="scroll-mt-20 bg-[#FFF6EE] py-[clamp(48px,5.5vw,80px)]">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal className="max-w-[720px]">
              <p className={EYEBROW}>{c.security.eyebrow}</p>
              <h2 className={cn(H2, "mt-4")}>{c.security.heading}</h2>
              <p className="mt-5 text-lg leading-relaxed text-[#57534E]">{c.security.sub}</p>
            </Reveal>
            <ul className="mt-12 grid gap-5 md:grid-cols-3">
              {c.security.items.map((item, i) => {
                const Icon = SECURITY_ICONS[i];
                return (
                  <Reveal as="li" key={item.title} delay={i * 100} className="group relative overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1">
                    <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, #fff 35%, ${TINTS[SEC_TINT[i]].wash})`, boxShadow: `0 1px 2px rgba(28,25,23,0.05), 0 18px 40px -24px ${TINTS[SEC_TINT[i]].shadow}` }} />
                    <SecurityArt index={i} />
                    <span className={"relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b shadow-[0_6px_14px_-8px_rgba(28,25,23,0.45)] ring-1 ring-white " + TINTS[SEC_TINT[i]].tile} style={{ color: TINTS[SEC_TINT[i]].icon }}><Icon className="h-7 w-7" /></span>
                    <h3 className="font-display relative mt-6 text-xl font-extrabold tracking-[-0.02em] text-[#1C1917] rtl:tracking-normal">{item.title}</h3>
                    <p className="relative mt-2 text-[15px] leading-relaxed text-[#57534E]">{item.body}</p>
                  </Reveal>
                );
              })}
            </ul>
            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-[#57534E]">
              {c.security.note}{" "}
              <Link to="/legal/terms" className="font-semibold text-[#C2410C] underline underline-offset-4">{c.security.terms}</Link>
              {" · "}
              <Link to="/privacy" className="font-semibold text-[#C2410C] underline underline-offset-4">{c.security.privacy}</Link>
            </p>
          </div>
        </section>

        {/* PRICING TEASER */}
        <section className="bg-white py-[clamp(40px,4.5vw,64px)]">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal className="relative overflow-hidden rounded-3xl border border-[#F6CDB2] bg-gradient-to-br from-[#FFF3EA] via-[#FFF8F3] to-white shadow-[0_1px_2px_rgba(194,65,12,0.06),0_30px_60px_-36px_rgba(194,65,12,0.4)]">
              <img
                src="/product/pricing-girl.webp"
                alt=""
                width={932}
                height={698}
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute bottom-0 end-0 hidden h-[88%] w-auto select-none lg:block rtl:-scale-x-100"
              />
              <div className="relative grid items-center gap-8 p-8 md:grid-cols-[1.35fr_1fr] md:p-12 lg:grid-cols-[1.35fr_0.95fr_0.75fr]">
                <div>
                  <p className={EYEBROW}>{c.pricing.eyebrow}</p>
                  <h2 className="font-display mt-3 text-[clamp(1.6rem,2.8vw,2.3rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#1C1917] rtl:tracking-normal">
                    {lang === "en" ? <>One simple <span className="text-[#C2410C]">price</span> per centre.</> : c.pricing.heading}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-[#6B6560]">{c.pricing.sub}</p>
                  <ul className="mt-5 flex flex-col gap-3">
                    {c.pricing.points.map((point, i) => {
                      const Icon = PRICE_POINT_ICONS[i];
                      return (
                        <li key={point} className="flex items-center gap-3 text-[15px] font-medium text-[#292524]">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFE3CF] text-[#C2410C]"><Icon className="h-4 w-4" /></span>
                          {point}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="md:border-s md:border-[#F2D5BF] md:ps-10 lg:ps-8">
                  <p className="text-sm font-semibold text-[#57534E]">{c.pricing.from}</p>
                  <p className="font-display mt-1 text-[clamp(2.6rem,4vw,3.4rem)] font-extrabold leading-none tracking-[-0.03em] text-[#C2410C]">{formatMarketPrice(fromPrice, currency)}</p>
                  <p className="mt-1.5 text-sm font-semibold text-[#57534E]">{c.pricing.perMonth}</p>
                  <Link to="/pricing" className={cn(BTN_PRIMARY, "mt-6 w-full rounded-2xl sm:w-auto")}>{c.pricing.cta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Link>
                </div>
                <div className="hidden lg:block" aria-hidden="true" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-[#FFF6EE] py-[clamp(48px,5.5vw,80px)]">
          <div className="mx-auto max-w-[820px] px-5">
            <Reveal className="text-center">
              <p className={EYEBROW}>{c.faq.eyebrow}</p>
              <h2 className={cn(H2, "mt-4")}>{c.faq.heading}</h2>
            </Reveal>
            <div className="mt-12 border-t border-[#E7D6C5]">
              {c.faq.items.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q} className="border-b border-[#E7D6C5]">
                    <h3>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`faq-${i}`}
                        id={`faq-btn-${i}`}
                        onClick={() => setOpenFaq(open ? null : i)}
                        className="flex w-full items-center justify-between gap-6 py-6 text-start text-lg font-bold text-[#1C1917] transition-colors hover:text-[#C2410C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
                      >
                        {item.q}
                        <ChevronDown className={cn("h-5 w-5 shrink-0 text-[#C2410C] transition-transform duration-300", open && "rotate-180")} />
                      </button>
                    </h3>
                    <div id={`faq-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} className={cn("grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div className="overflow-hidden"><p className="pb-6 text-base leading-relaxed text-[#57534E]">{item.a}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative overflow-hidden bg-[#C2410C] py-[clamp(72px,8vw,112px)] text-white">
          <div aria-hidden="true" className="absolute inset-0 opacity-25 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(70%_90%_at_50%_50%,#000,transparent)]" />
          <Reveal className="relative mx-auto max-w-[900px] px-5 text-center">
            <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.8rem)] font-extrabold leading-[1.08] tracking-[-0.035em] rtl:tracking-normal">{c.cta.heading}</h2>
            <p className="mt-5 text-lg leading-relaxed text-white">{c.cta.sub}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/get-started" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-[15px] font-bold text-[#9A3412] transition-colors hover:bg-[#FFF3EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{c.cta.demo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Link>
              <button type="button" onClick={() => { setChatReady(true); setAiOpenRequest((n) => n + 1); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/60 px-7 py-4 text-[15px] font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><Sparkles className="h-4 w-4" /> {c.cta.ask}</button>
            </div>
            <p className="mt-6 text-sm"><Link to="/login" className="font-semibold text-white underline underline-offset-4">{c.cta.signIn}</Link></p>
          </Reveal>
        </section>
      </main>

      <MarketingFooter />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EBD9C8] bg-white/95 p-3 shadow-[0_-12px_30px_-22px_rgba(28,25,23,0.7)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Link to="/get-started" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#C2410C] px-4 text-sm font-bold text-white">{c.hero.demo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Link>
          <a href="https://wa.me/919344773231" target="_blank" rel="noopener noreferrer" aria-label="Chat with Meet to Manage on WhatsApp" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#E8C8AD] bg-white px-4 text-sm font-bold text-[#9A3412]"><MessageSquare className="h-4 w-4" /> WhatsApp</a>
        </div>
      </div>
      {chatReady && (
        <Suspense fallback={null}>
          <PromoPopup lang={lang} />
        </Suspense>
      )}
      {chatReady && (
        <Suspense fallback={null}>
          <ChatWidget lang={lang} openRequest={aiOpenRequest} />
        </Suspense>
      )}
    </div>
  );
}
