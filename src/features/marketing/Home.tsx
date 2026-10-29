import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, BookOpenText, Calculator, CheckCircle2, ChevronDown, Code2, CreditCard, GraduationCap, Languages, Lock, ShieldCheck, Sparkles, Users, type LucideIcon } from "lucide-react";
import { Seo } from "@/components/Seo";
import { saasPublic } from "@/api/saas";
import { apiEnabled } from "@/lib/api";
import { useBrand } from "@/lib/branding";
import { useLang } from "@/lib/i18n";
import { useLightBrandScope } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ChaosToOne } from "./ChaosToOne";
import { MarketingFooter } from "./MarketingFooter";
import { BTN_PRIMARY, MarketingNav } from "./MarketingNav";
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
const ChatWidget = lazy(() => import("./HomeChat").then((m) => ({ default: m.ChatWidget })));

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
  const [fromPrice, setFromPrice] = useState(2999);

  // The cheapest live monthly price, so the teaser can never drift from what billing charges.
  useEffect(() => {
    if (!apiEnabled()) return;
    let active = true;
    saasPublic.plans()
      .then((plans) => {
        const prices = plans.flatMap((p) => p.prices.filter((x) => x.billingInterval === "Month" && x.currency === "INR").map((x) => x.amount));
        if (active && prices.length > 0) setFromPrice(Math.min(...prices));
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
        { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Meet to Manage", applicationCategory: "EducationalApplication", operatingSystem: "Web, iOS, Android", description: COPY.en.hero.sub, offers: { "@type": "Offer", priceCurrency: "INR", price: fromPrice, url: "https://meettomanage.cloud/pricing" } },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: COPY.en.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      ]),
    [fromPrice],
  );

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#1C1917]">
      <style>{FX_CSS}</style>
      <Seo
        pageKey="home"
        title="Meet to Manage — Online Coaching Software for Abacus, Phonics & Tuition Centres"
        description="Automate live classes, fee collection, admissions and parent updates. Meet to Manage is the LMS and virtual classroom built for abacus, phonics and online tuition centres."
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
            <div className="text-center lg:text-start">
              <h1 className="font-display text-[clamp(1.8rem,3.1vw,2.7rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#1C1917] rtl:tracking-normal">
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
              <p className="mx-fade-up mx-auto mt-6 max-w-[560px] text-[clamp(1.0625rem,1.4vw,1.2rem)] leading-relaxed text-[#57534E] lg:mx-0" style={{ animationDelay: "0.55s" }}>{c.hero.sub}</p>

              <div className="mt-8">
                <AccessForm c={c.hero.form} watch={{ label: c.hero.watch, cta: c.hero.demo }} />
              </div>

              <ul className="mx-fade-up mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-[#57534E] lg:justify-start" style={{ animationDelay: "0.85s" }}>
                {c.hero.trust.map((item) => (
                  <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#EA580C]" /> {item}</li>
                ))}
              </ul>
            </div>

            <HeroPicture c={c.hero.room} />
          </div>
        </section>

        {/* PROOF: what it's built on */}
        <section aria-label={c.proof.label} className="border-y border-[#EFE3D7] bg-white py-7">
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.1em] text-[#6B6560] rtl:tracking-normal">{c.proof.label}</p>
          <div className="mx-auto max-w-[1200px] overflow-hidden px-5 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
            <ul className="mx-marquee flex w-max items-center gap-10 motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:justify-center">
              {[...c.proof.items, ...c.proof.items].map((item, i) => (
                <li key={`${item}-${i}`} aria-hidden={i >= c.proof.items.length || undefined} className="whitespace-nowrap text-[15px] font-semibold text-[#57534E]">{item}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* NGO OFFER: the designed banner on wider English screens; live text on phones and in Arabic, where the picture's baked-in English would not read */}
        <section aria-labelledby="ngo-offer" className="bg-white pt-[clamp(40px,5vw,72px)]">
          <div className="mx-auto max-w-[1200px] px-5">
            {lang === "en" && (
              <Reveal className="hidden md:block">
                <Link
                  to="/get-started?offer=ngo"
                  className="group block overflow-hidden rounded-3xl shadow-[0_24px_60px_-30px_rgba(194,65,12,0.55)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]"
                >
                  <img
                    src="/product/ngo-offer.webp"
                    srcSet="/product/ngo-offer-1100.webp 1100w, /product/ngo-offer.webp 2055w"
                    sizes="1160px"
                    alt={`${c.ngo.heading} ${c.ngo.body} ${c.ngo.note} ${c.ngo.cta}`}
                    width={2055}
                    height={500}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full"
                  />
                </Link>
              </Reveal>
            )}
            <Reveal className={cn("relative overflow-hidden rounded-3xl bg-[#C2410C] px-7 py-9 text-white sm:px-12 sm:py-11", lang === "en" && "md:hidden")}>
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
        <section className="bg-white py-[clamp(72px,8vw,120px)]">
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
                  <Reveal as="li" key={item.key} delay={(i % 3) * 90} className="group rounded-2xl border border-[#EFE3D7] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#F2B98A] hover:shadow-[0_24px_50px_-28px_rgba(194,65,12,0.45)]">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFEBDD] text-[#C2410C] transition-colors group-hover:bg-[#C2410C] group-hover:text-white"><Icon className="h-6 w-6" /></span>
                    <h3 className="font-display mt-5 text-lg font-extrabold tracking-[-0.01em] rtl:tracking-normal">{item.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{item.body}</p>
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
        <section id="features" className="scroll-mt-20 bg-white py-[clamp(72px,8vw,120px)]">
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
        <section id="walkthrough" className="scroll-mt-20 bg-[#FFF6EE] py-[clamp(72px,8vw,120px)]">
          <div className="mx-auto max-w-[1000px] px-5">
            <Reveal className="mx-auto max-w-[680px] text-center">
              <p className={EYEBROW}>{c.video.eyebrow}</p>
              <h2 className={cn(H2, "mt-4")}>{c.video.heading}</h2>
              <p className="mt-5 text-lg leading-relaxed text-[#57534E]">{c.video.sub}</p>
            </Reveal>
            <Reveal delay={120} className="mt-12 overflow-hidden rounded-2xl border border-[#E7D6C5] shadow-[0_1px_2px_rgba(28,25,23,0.06),0_30px_70px_-35px_rgba(194,65,12,0.4)]">
              <ExplainerVideo />
            </Reveal>
          </div>
        </section>

        {/* METRICS */}
        <section aria-label="Platform facts" className="bg-white py-14">
          <dl className="mx-auto grid max-w-[1200px] grid-cols-2 gap-y-10 px-5 lg:grid-cols-4">
            {c.metrics.map((m, i) => (
              <Reveal key={m.label} delay={i * 90} className="border-s-2 border-[#F4B98C] ps-6">
                <dd className="font-display text-[clamp(1.9rem,3.2vw,2.7rem)] font-extrabold leading-none tracking-[-0.03em] text-[#C2410C]"><CountUp to={m.to} suffix={m.suffix} /></dd>
                <dt className="mt-2 text-sm font-medium text-[#57534E]">{m.label}</dt>
              </Reveal>
            ))}
          </dl>
        </section>

        {/* SECURITY */}
        <section id="security" className="scroll-mt-20 bg-[#FFF6EE] py-[clamp(72px,8vw,120px)]">
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
                  <Reveal as="li" key={item.title} delay={i * 100} className="rounded-2xl border border-[#EBD9C8] bg-white p-7">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFEBDD] text-[#C2410C]"><Icon className="h-6 w-6" /></span>
                    <h3 className="font-display mt-5 text-lg font-extrabold tracking-[-0.01em] rtl:tracking-normal">{item.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{item.body}</p>
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
        <section className="bg-white py-[clamp(64px,7vw,104px)]">
          <div className="mx-auto max-w-[1200px] px-5">
            <Reveal className="grid items-center gap-10 rounded-3xl border border-[#EBD9C8] bg-gradient-to-br from-[#FFF3EA] to-white p-8 md:grid-cols-[1.4fr_1fr] md:p-12">
              <div>
                <p className={EYEBROW}>{c.pricing.eyebrow}</p>
                <h2 className="font-display mt-3 text-[clamp(1.5rem,2.5vw,2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] rtl:tracking-normal">{c.pricing.heading}</h2>
                <p className="mt-4 text-lg leading-relaxed text-[#57534E]">{c.pricing.sub}</p>
                <ul className="mt-6 flex flex-col gap-2.5">
                  {c.pricing.points.map((p) => <li key={p} className="flex items-center gap-2.5 text-[15px] font-medium text-[#292524]"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#EA580C]" /> {p}</li>)}
                </ul>
              </div>
              <div className="border-[#EBD9C8] md:border-s md:ps-10">
                <p className="text-sm font-semibold text-[#57534E]">{c.pricing.from}</p>
                <p className="font-display mt-1 text-5xl font-extrabold tracking-[-0.03em] text-[#1C1917]">₹{fromPrice.toLocaleString("en-IN")}</p>
                <p className="mt-1 text-sm font-semibold text-[#57534E]">{c.pricing.perMonth}</p>
                <Link to="/pricing" className={cn(BTN_PRIMARY, "mt-6 w-full sm:w-auto")}>{c.pricing.cta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-[#FFF6EE] py-[clamp(72px,8vw,120px)]">
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
      {chatReady && (
        <Suspense fallback={null}>
          <ChatWidget lang={lang} openRequest={aiOpenRequest} />
        </Suspense>
      )}
    </div>
  );
}
