import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Building2, Globe2, Lock, ShieldCheck, Users, CheckCircle2, Headphones } from "lucide-react";
import { PageShell } from "./PageShell";
import { cn } from "@/lib/utils";
import { CTA_ORANGE, CARD } from "./styles";
import { trackMarketingEvent } from "@/lib/analytics";

const WHATSAPP_URL = "https://wa.me/919344773231?text=I%27m%20interested%20in%20the%20own-brand%20option%20for%20Meet%20to%20Manage.";

const FEATURES = [
  { icon: "brand", title: "Your brand, your domain", body: "Replace Meet to Manage with your academy's name, logo, colours and custom web address." },
  { icon: "host", title: "Host it where you choose", body: "On your own servers, cloud provider or private infrastructure. You control the infrastructure." },
  { icon: "all", title: "Everything in Growth", body: "Live classes, admissions, fees, WhatsApp, reports, multi-branch and more — included." },
  { icon: "seatless", title: "No per-seat cost", body: "A one-time licence plus annual maintenance. No surprise fees when you add teachers or students." },
  { icon: "updates", title: "Updates and support", body: "Annual maintenance covers product updates, security fixes and priority support." },
  { icon: "data", title: "You own your data", body: "Complete control over data retention, backup schedules and compliance requirements." },
];

const PROCESS = [
  { step: 1, title: "Discovery call", body: "We understand your centre's size, compliance needs and infrastructure preferences." },
  { step: 2, title: "Custom setup", body: "We configure your branding, domain, hosting and migrate your existing data." },
  { step: 3, title: "Team training", body: "Your admins, teachers and staff learn the platform through guided onboarding." },
  { step: 4, title: "Go live", body: "Your branded platform launches with your data, your team, and full support." },
];

const FAQ = [
  {
    q: "What does a one-time licence cover?",
    a: "A perpetual licence to use the software with your branding on infrastructure you choose. Annual maintenance (a separate fee) covers product updates, security patches and support.",
  },
  {
    q: "Do I need technical infrastructure?",
    a: "Not necessarily. We can help set up hosting on your preferred cloud provider (AWS, Azure, GCP) or your own servers. You choose what works best for your compliance needs.",
  },
  {
    q: "How does pricing work?",
    a: "We quote based on your centre's size, customisation needs and infrastructure. Contact us for a personalised quote. There are no per-student or per-teacher fees.",
  },
  {
    q: "Can I start with SaaS and move to own-brand later?",
    a: "Absolutely. Many centres start on our cloud platform and migrate when they're ready. We help with the transition — your data stays intact.",
  },
  {
    q: "What happens to updates after migration?",
    a: "Your annual maintenance contract covers all product updates, new features and security patches. We handle the installation on your infrastructure.",
  },
];

function IconBox({ type, children }: { type: string; children: React.ReactNode }) {
  const bg: Record<string, string> = {
    brand: "from-[#FFF3EA] to-[#FFE6D3]",
    host: "from-[#EEF2FF] to-[#E0E7FF]",
    all: "from-[#ECFDF5] to-[#D1FAE5]",
    seatless: "from-[#FEF3C7] to-[#FDE68A]",
    updates: "from-[#FCE7F3] to-[#FBCFE8]",
    data: "from-[#F0FDF4] to-[#BBF7D0]",
  };
  return (
    <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md", bg[type] ?? "from-[#FFF3EA] to-[#FFE6D3]")}>
      {children}
    </div>
  );
}

export default function Enterprise() {
  return (
    <PageShell
      eyebrow="Own Brand, Own Software"
      title="Make Meet to Manage your own."
      sub="For multi-branch institutes that want the platform under their name, on their infrastructure, with no per-seat cost."
      seo={{
        title: "Own Brand Academy Software — Custom Licence | Meet to Manage",
        description: "Run academy management software under your own brand and domain. One-time licence, your infrastructure, no per-seat fees. For multi-branch institutes.",
        path: "/enterprise",
      }}
    >
      {/* HERO IMAGE */}
      <section className="relative overflow-hidden bg-white pb-[clamp(48px,5vw,72px)] pt-[clamp(32px,4vw,48px)]">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="flex items-center gap-3 rounded-2xl bg-[#C2410C] px-5 py-3 text-sm font-bold text-white">
                <Building2 className="h-5 w-5" /> For growing institutes
              </div>
              <p className="mt-6 text-base leading-relaxed text-[#57534E]">
                The same platform your centre uses today — but rebranded for your institute, hosted on infrastructure you choose, with a one-time licence instead of per-seat fees.
              </p>
            </div>
            <div className="relative">
              <div className={cn(CARD, "overflow-hidden border-2 border-[#E5DCCD] bg-[#FFFBF7]")}>
                <img
                  src="/product/hero-classroom-v2.webp"
                  alt="Academy management dashboard with custom branding"
                  className="h-auto w-full object-cover"
                  width={1200}
                  height={675}
                  decoding="async"
                />
                <div className="bg-gradient-to-r from-[#C2410C] to-[#EA580C] p-4 text-center text-sm font-bold text-white">
                  Your branding · Your domain · Your infrastructure
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#FFFBF7] py-[clamp(56px,7vw,96px)]">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="mx-auto max-w-[720px] text-center">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C]">Everything included</p>
            <h2 className="font-display mt-4 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-[#1C1917]">
              The complete platform, under your brand.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-3xl border border-[#E5DDD1] bg-white p-7 transition-colors hover:border-[#F2B98A]">
                <IconBox type={f.icon}>
                  {f.icon === "brand" && <Globe2 className="h-7 w-7 text-[#C2410C]" />}
                  {f.icon === "host" && <Building2 className="h-7 w-7 text-[#3B82F6]" />}
                  {f.icon === "all" && <Users className="h-7 w-7 text-[#10B981]" />}
                  {f.icon === "seatless" && <ShieldCheck className="h-7 w-7 text-[#F59E0B]" />}
                  {f.icon === "updates" && <Headphones className="h-7 w-7 text-[#EC4899]" />}
                  {f.icon === "data" && <Lock className="h-7 w-7 text-[#22C55E]" />}
                </IconBox>
                <h3 className="font-display mt-5 text-xl font-extrabold text-[#1C1917]">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="bg-white py-[clamp(56px,7vw,96px)]">
        <div className="mx-auto max-w-[1000px] px-5">
          <p className="text-center text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C]">How it works</p>
          <h2 className="font-display mx-auto mt-4 max-w-[600px] text-center text-[clamp(1.5rem,2.8vw,2.2rem)] font-extrabold tracking-[-0.025em] text-[#1C1917]">
            From conversation to launch in 4 steps.
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((step) => (
              <div key={step.step} className="relative rounded-2xl border border-[#E5DDD1] bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C2410C] text-sm font-extrabold text-white">
                  {step.step}
                </span>
                <h3 className="mt-4 font-display text-lg font-extrabold text-[#1C1917]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#57534E]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="bg-[#FFFBF7] py-[clamp(56px,7vw,96px)]">
        <div className="mx-auto max-w-[1000px] px-5">
          <h2 className="font-display text-center text-[clamp(1.5rem,2.8vw,2.2rem)] font-extrabold tracking-[-0.025em] text-[#1C1917]">
            Compare: Cloud vs Own Brand
          </h2>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b-2 border-[#C2410C]">
                  <th className="pb-4 text-start font-extrabold text-[#1C1917]">Feature</th>
                  <th className="pb-4 text-center font-extrabold text-[#1C1917]">Cloud</th>
                  <th className="pb-4 text-center font-extrabold text-[#C2410C]">Own Brand</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Pricing", "Monthly subscription", "One-time licence"],
                  ["Per-seat fees", "Included in plan", "None"],
                  ["Branding", "Your academy name", "Your full brand"],
                  ["Domain", "academy.meettomanage.cloud", "yourdomain.com"],
                  ["Infrastructure", "Our cloud", "Your choice"],
                  ["Data ownership", "Shared responsibility", "You control it"],
                  ["Multi-branch", "Up to 50 staff", "Unlimited"],
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#E5DDD1]">
                    <td className="py-4 font-semibold text-[#1C1917]">{row[0]}</td>
                    <td className="py-4 text-center text-[#57534E]">{row[1]}</td>
                    <td className="py-4 text-center font-bold text-[#C2410C]">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-[#111] py-[clamp(64px,8vw,112px)] text-white">
        <div aria-hidden="true" className="absolute inset-0 opacity-15 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative mx-auto max-w-[800px] px-5 text-center">
          <Building2 className="mx-auto h-12 w-12 text-orange-300" />
          <h2 className="font-display mt-6 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-[-0.03em] text-white">
            Ready to make it yours?
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-lg leading-relaxed text-white/75">
            Tell us about your institute and we'll send a personalised quote. No commitment — just a conversation.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-[15px] font-bold text-[#111] transition-colors hover:bg-orange-50"
              onClick={() => trackMarketingEvent("whatsapp_clicked", "/enterprise", "enterprise-cta")}
            >
              Chat on WhatsApp <span className="text-base">💬</span>
            </a>
            <Link
              to="/get-started?intent=enterprise"
              className={cn(CTA_ORANGE, "rounded-xl px-7 py-4 text-[15px] font-bold text-white")}
              onClick={() => trackMarketingEvent("sales_cta_clicked", "/enterprise", "enterprise-demo")}
            >
              Book a walkthrough <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/50">Custom quote · No per-seat fees · Annual maintenance included</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-[clamp(56px,7vw,96px)]">
        <div className="mx-auto max-w-[820px] px-5">
          <h2 className="font-display text-[clamp(1.5rem,2.5vw,2rem)] font-extrabold tracking-[-0.025em] text-[#1C1917]">
            Frequently asked questions
          </h2>
          <div className="mt-8 border-t border-[#E7D6C5]">
            {FAQ.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E7D6C5]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-6 py-5 text-start text-[15px] font-bold text-[#1C1917] transition-colors hover:text-[#C2410C]"
        aria-expanded={open}
      >
        {question}
        <svg className={cn("h-5 w-5 shrink-0 text-[#C2410C] transition-transform duration-300", open && "rotate-180")} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div className={cn("overflow-hidden transition-[max-height] duration-300 ease-in-out", open ? "max-h-48" : "max-h-0")}>
        <p className="pb-5 text-[15px] leading-relaxed text-[#57534E]">{answer}</p>
      </div>
    </div>
  );
}
