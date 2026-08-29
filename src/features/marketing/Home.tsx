import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  ChevronDown,
  CheckCircle2,
  Hand,
  HeartHandshake,
  Mail,
  Mic,
  MessageSquare,
  PenTool,
  Phone,
  ScreenShare,
  ShieldCheck,
  Sparkles,
  Video,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { BookDemoDialog } from "@/components/BookDemoDialog";
import { Seo } from "@/components/Seo";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

/** Fades and slides an element up once it scrolls into view — plays once, not on every pass. */
function Reveal({ children, delayMs = 0, className }: { children: React.ReactNode; delayMs?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className
      )}
      style={{ transitionDelay: inView ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Meet to Manage brand accent — alternates orange/navy, no matching design-system token yet. */
  hex: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: Video,
    hex: "#F97316",
    title: "Live Classroom",
    description: "One-click Jitsi video, screen share, chat, raise-hand and teacher controls — built for real teaching, not just meetings.",
  },
  {
    icon: PenTool,
    hex: "#262D37",
    title: "Interactive Whiteboard",
    description: "Infinite, multi-page boards with drawing, drag & drop, tag & match and hotspot activities, synced live for every student.",
  },
  {
    icon: CalendarCheck2,
    hex: "#F97316",
    title: "Smart Scheduling",
    description: "1:1 and group classes, conflict-free academic calendars, automatic no-show handling and intelligent rescheduling.",
  },
  {
    icon: HeartHandshake,
    hex: "#262D37",
    title: "Admissions CRM",
    description: "Demo bookings, teacher feedback, follow-ups and a conversion pipeline that turns leads into enrolled families.",
  },
  {
    icon: Wallet,
    hex: "#F97316",
    title: "Billing & Payments",
    description: "Subscriptions, auto invoices, dual payment-gateway routing and automatic fee-suspension with instant restoration.",
  },
  {
    icon: BarChart3,
    hex: "#262D37",
    title: "Analytics & AI Reports",
    description: "Engagement scores, attendance trends, teacher performance and business KPIs — all in one live dashboard.",
  },
  {
    icon: Sparkles,
    hex: "#F97316",
    title: "Gamification",
    description: "Live quizzes, stars, badges, milestones and leaderboards that make every class something kids look forward to.",
  },
  {
    icon: MessageSquare,
    hex: "#262D37",
    title: "Notifications, Built In",
    description: "Email, SMS and WhatsApp reminders, booking confirmations and payment alerts — nobody misses a class.",
  },
];

const PAIN_POINTS = [
  {
    pain: "Fee reminders lost in a WhatsApp thread, and a child quietly drops out of class.",
    fix: "Automatic invoices and dual-gateway billing — with instant fee-suspension and restoration the moment a parent pays.",
  },
  {
    pain: "A demo booking sits in someone's inbox until the family gives up and goes elsewhere.",
    fix: "An admissions pipeline that tracks every booking from first call to enrolled family.",
  },
  {
    pain: "You find out a class had three no-shows a week later — if at all.",
    fix: "Live attendance and engagement scores, the moment a session ends.",
  },
  {
    pain: "Teaching happens on one app, billing on another, admissions on a third.",
    fix: "One login. One role-based system. Every piece already connected.",
  },
];

const STATS = [
  { value: "8", label: "Role-based portals" },
  { value: "100%", label: "Real-time classroom" },
  { value: "15-day", label: "Recording access window" },
  { value: "24/7", label: "Automated fee & reminder engine" },
];

/** Anchors into this same page — kept to sections that actually exist, so the nav never promises more than the page delivers. */
const NAV_LINKS = [
  { label: "Platform", href: "#features" },
  { label: "Portals", href: "#portals" },
  { label: "FAQ", href: "#faq" },
  { label: "Blog", href: "/blog" },
];

/** Every answer restates a fact already stated elsewhere on this page (STATS/FEATURES/PAIN_POINTS) — no numbers or claims invented for this section alone. */
const FAQS = [
  {
    q: "Is this just another video-call tool?",
    a: "No — the live classroom is one part of it. Scheduling, admissions, billing and reporting all live in the same system, so a session connects straight to attendance, invoices and reports instead of sitting in its own app.",
  },
  {
    q: "How long can a family access a class recording?",
    a: "Recordings stay available for a 15-day window after each session, from the same portal the family already uses to check schedules and pay fees.",
  },
  {
    q: "What happens when a fee payment is late?",
    a: "Invoices generate automatically and a family's access can suspend automatically when a payment is overdue — then restore instantly the moment they pay, no manual follow-up needed.",
  },
  {
    q: "Do teachers, parents and admins all use the same login screen?",
    a: "Yes. One sign-in, then each of the 8 role-based portals — admin, teacher, parent, student and more — shows only what that person needs.",
  },
  {
    q: "How do I see it before committing to anything?",
    a: "Book a free demo class. No payment details required — we match you with a teacher and send the join link by email.",
  },
];

const SESSION_TILES = [
  { label: "Teacher", initial: "T", bg: "#F97316" },
  { label: "Aarav", initial: "A", bg: "#5B6472" },
  { label: "Riya", initial: "R", bg: "#EA580C" },
  { label: "Sana", initial: "S", bg: "#3A4150" },
];

export default function MarketingHome() {
  useLightBrandScope();
  const brand = useBrand();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        title="Meet to Manage — LMS & Virtual Classroom"
        description="Meet to Manage brings live teaching, scheduling, admissions, billing and reporting into one role-based platform for schools and academies."
        path="/"
      />
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Logo wordmarkClassName="hidden sm:inline" />

          {/* Section anchors — desktop only. On narrow screens there's only room for the two
              CTAs (see the mobile-header wrap this replaced), so wayfinding there stays limited
              to scrolling; that's an acceptable trade for not cramping the primary actions. */}
          <nav aria-label="Page sections" className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-[#5B6472] transition-colors hover:text-[#171B22]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              className="border-[#171B22]/15 px-2.5 text-[#171B22] hover:bg-[#171B22]/5 sm:px-4"
              onClick={() => setDemoOpen(true)}
            >
              <span className="sm:hidden">Demo</span>
              <span className="hidden sm:inline">Book a Demo</span>
            </Button>
            <Button asChild className="!bg-[#F97316] px-3 !text-white hover:!bg-[#EA580C] sm:px-4">
              <Link to="/login">
                Sign In <ArrowRight className="hidden h-4 w-4 sm:inline" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — the faint top-right glow echoes the dark CTA banner's radial glow lower down,
          a quiet visual bookend rather than a one-off decoration. */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.10), rgba(249,115,22,0) 70%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 lg:grid-cols-2 lg:py-20">
          <div>
          <div className="motion-safe:animate-slide-up inline-flex items-center gap-1.5 rounded-full border border-[#FFE1C7] bg-[#FFF3EA] px-3.5 py-1.5 text-xs font-semibold text-[#C2410C]">
            <Sparkles className="h-3.5 w-3.5" /> Learning Management &amp; Virtual Classroom Platform
          </div>
          <h1
            className="motion-safe:animate-slide-up font-display mt-5 text-4xl font-extrabold leading-[1.14] tracking-tight sm:text-5xl"
            style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
          >
            Meet your students live.
            <span className="text-[#EA580C]"> Manage</span> your academy end to end.
          </h1>
          <p
            className="motion-safe:animate-slide-up mt-5 max-w-lg text-base leading-relaxed text-[#5B6472]"
            style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
          >
            {brand.name} brings live teaching, scheduling, admissions, billing and reporting into a single,
            role-based system — so every meeting turns into progress everyone can track.
          </p>
          <div
            className="motion-safe:animate-slide-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
          >
            <Button asChild size="lg" className="!bg-[#F97316] !text-white hover:!bg-[#EA580C]">
              <Link to="/login">
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[#171B22]/15 text-[#171B22] hover:bg-[#171B22]/5">
              <Link to="/portal-select">Explore Portals</Link>
            </Button>
          </div>

          <div
            className="motion-safe:animate-slide-up mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4"
            style={{ animationDelay: "320ms", animationFillMode: "backwards" }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-extrabold text-[#171B22]">{s.value}</p>
                <p className="mt-0.5 text-xs font-medium leading-snug text-[#5B6472]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual: live session mockup */}
        <div
          className="motion-safe:animate-slide-up relative mx-auto w-full max-w-md lg:max-w-none"
          style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
        >
          <div className="motion-safe:animate-float absolute -left-4 -top-4 z-10 flex h-14 w-14 -rotate-6 items-center justify-center rounded-full bg-white p-2 shadow-pop ring-1 ring-black/10">
            <img src="/logo-icon.png" alt="" className="h-full w-full object-contain" />
          </div>

          <div className="overflow-hidden rounded-[24px] shadow-pop ring-4 ring-white">
            <div className="flex items-center justify-between bg-[#1A1F27] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                </div>
                <span className="text-xs font-semibold text-white/85">Live Session — Grade 4 Reading</span>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-[#F97316] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">
                <span className="motion-safe:animate-pulse h-1.5 w-1.5 rounded-full bg-white" />
                LIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#12151C] p-3.5">
              {SESSION_TILES.map((tile) => (
                <div
                  key={tile.label}
                  className="relative flex aspect-[4/3] items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(160deg,#2B3140,#1B1F28)" }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: tile.bg }}
                  >
                    {tile.initial}
                  </div>
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold text-white/85">
                    {tile.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-3 bg-[#1A1F27] p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                <Mic className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                <Video className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316] text-white">
                <Hand className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                <MessageSquare className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                <ScreenShare className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          <div
            className="motion-safe:animate-float absolute -bottom-5 -right-3 flex items-center gap-2.5 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-pop"
            style={{ animationDelay: "1.2s" }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF3EA] text-[#EA580C]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-[#171B22]">Class in progress</p>
              <p className="text-xs text-[#5B6472]">3 batches running now</p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Pain points → solutions */}
      <section className="border-t border-black/10 bg-[#FBFBFC] py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">The old way vs. {brand.name}</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
              You didn't start an academy to manage five different apps.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5B6472] sm:text-lg">
              {brand.name} replaces the spreadsheet, the WhatsApp group and the sticky notes — one system, already
              talking to itself.
            </p>
          </Reveal>

          <div className="mt-14 flex flex-col gap-4">
            {PAIN_POINTS.map((p, i) => (
              <Reveal key={p.pain} delayMs={i * 80}>
                <div className="rounded-2xl border border-black/10 bg-white p-6 sm:p-7">
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#B8BEC9]" />
                    <p className="text-base leading-snug text-[#5B6472] sm:text-lg">{p.pain}</p>
                  </div>
                  <div className="mt-4 flex items-start gap-3 border-t border-dashed border-black/10 pt-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#EA580C]" />
                    <p className="text-base font-bold leading-snug text-[#171B22] sm:text-lg">{p.fix}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="scroll-mt-20 border-t border-black/10 bg-[#F5F6F9] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">Platform</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything a growing academy needs to meet, teach and manage
            </h2>
            <p className="mt-3 text-sm text-[#5B6472]">
              From the first demo class to monthly billing, {brand.name} covers the entire journey — for admins,
              teachers, parents and students alike.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delayMs={(i % 4) * 80}>
                <div className="group h-full rounded-2xl border border-black/10 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-pop">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${f.hex}1A`, color: f.hex }}
                  >
                    <f.icon className="h-[22px] w-[22px]" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-[#171B22]">{f.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5B6472]">{f.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="scroll-mt-20 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEFF3] px-3.5 py-1.5 text-xs font-semibold text-[#262D37]">
              <ShieldCheck className="h-3.5 w-3.5" /> One login, every role
            </div>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              A dedicated portal for every person in your academy
            </h2>
            <p className="mt-3 text-sm text-[#5B6472]">
              Eight role-based portals, each showing exactly what that person needs — nothing more, nothing less.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_ORDER.map((r, i) => {
              const meta = ROLE_META[r];
              return (
                <Reveal key={r} delayMs={(i % 4) * 80}>
                  <Link
                    to="/portal-select"
                    className="group flex h-full flex-col gap-3 rounded-2xl border border-black/10 bg-[#F5F6F9] p-5 transition-all hover:-translate-y-1 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {/* meta.hex ties each card to that role's own color identity across the
                        app (sidebar, PortalSelect, login role picker) instead of a flat
                        one-off navy, so a returning user recognizes "their" portal by color. */}
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: meta.hex }}
                    >
                      <meta.icon className="h-[22px] w-[22px]" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#171B22]">{meta.label}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#5B6472]">{meta.description}</p>
                    </div>
                    <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#EA580C] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      Explore <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-black/10 bg-[#F5F6F9] py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <p className="text-center text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">FAQ</p>
            <h2 className="font-display mt-3 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              Questions academies ask before switching
            </h2>
          </Reveal>

          <div className="mt-10 flex flex-col gap-3">
            {FAQS.map((item, i) => (
              <Reveal key={item.q} delayMs={i * 60}>
                <details className="group rounded-2xl border border-black/10 bg-white open:shadow-soft">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-bold text-[#171B22] marker:content-none [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#5B6472] transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed text-[#5B6472]">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-white py-16 sm:py-20">
        <Reveal className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[28px] bg-[#1A1F27] px-8 py-12 text-center shadow-pop sm:px-14">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(249,115,22,0.35), rgba(249,115,22,0) 70%)" }}
            />
            <div className="relative">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <img src="/logo-icon.png" alt="" className="h-7 w-7 object-contain" />
              </span>
              <h2 className="font-display mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Ready to bring every meeting under one roof?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
                Sign in to your portal and pick up right where you left off — or explore what each role sees first.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="!bg-[#F97316] !text-white hover:!bg-[#EA580C]">
                  <Link to="/login">
                    Sign In <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="!bg-transparent border-white/30 !text-white hover:!bg-white/10">
                  <Link to="/portal-select">Explore Portals</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer — every link below points at a real route or in-page section (no Privacy/
          Terms/social links, since none of those exist yet; inventing the URLs would just
          trade a sparse footer for a broken one). */}
      <footer className="border-t border-black/10 bg-[#F5F6F9] pb-8 pt-14">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Logo imgClassName="h-8 w-8" />
            <p className="mt-4 max-w-[22ch] text-sm leading-relaxed text-[#5B6472]">
              Live teaching, scheduling, admissions and billing — one role-based system for your whole academy.
            </p>
            <ul className="mt-5 flex flex-col gap-3">
              <li>
                <a
                  href="mailto:hello@infinityuniquers.dev"
                  className="group flex items-center gap-2.5 text-sm font-medium text-[#5B6472] hover:text-[#EA580C]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#EA580C] transition-colors group-hover:bg-[#F97316]/15">
                    <Mail className="h-4 w-4" />
                  </span>
                  hello@infinityuniquers.dev
                </a>
              </li>
              <li>
                <a
                  href="tel:+919344773231"
                  className="group flex items-center gap-2.5 text-sm font-medium text-[#5B6472] hover:text-[#EA580C]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#EA580C] transition-colors group-hover:bg-[#F97316]/15">
                    <Phone className="h-4 w-4" />
                  </span>
                  +91 93447 73231
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#8B93A1]">Platform</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a href="#features" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  Features
                </a>
              </li>
              <li>
                <a href="#portals" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  Portals
                </a>
              </li>
              <li>
                <a href="#faq" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#8B93A1]">Get started</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]"
                >
                  Book a Demo
                </button>
              </li>
              <li>
                <Link to="/login" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/portal-select" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  Explore Portals
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#8B93A1]">Resources</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link to="/blog" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-6xl border-t border-black/10 px-6 pt-6">
          <p className="text-xs font-medium text-[#5B6472]">
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
        </div>
      </footer>

      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
