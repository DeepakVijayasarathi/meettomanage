import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  ChevronDown,
  CheckCircle2,
  Clock,
  CreditCard,
  HeartHandshake,
  Layers,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  PenTool,
  Phone,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Video,
  Wallet,
  X,
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

/** Autoplaying hero reel — muted by default since browsers block unmuted autoplay outright,
    with a tap-to-unmute control since the video has real narration a visitor may want to hear. */
function HeroReel() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlay() {
    setPlaying(true);
    videoRef.current?.play();
  }

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-[24px] bg-[#12151C] shadow-pop ring-4 ring-white">
      <video
        ref={videoRef}
        src="/videos/reels.mp4"
        poster="/videos/reels-poster.jpg"
        className="h-full w-full object-cover"
        controls={playing}
        loop
        playsInline
        preload="none"
      />
      {!playing && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Play video"
          className="group absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/25"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#EA580C] shadow-pop transition-transform group-hover:scale-105">
            <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}

/** Floating contact widget — links out (WhatsApp/email/Request a Demo) rather than answering
    questions itself, unlike the FAQ-matching "Ask a Doubt" bot used inside the logged-in
    portals (DoubtChatbot.tsx). This page has no other fixed-position widget to collide with. */
function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="w-72 rounded-2xl border border-black/10 bg-white p-5 shadow-pop">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#171B22]">Chat with us</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-[#8B93A1] transition-colors hover:text-[#171B22]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[#5B6472]">
            Reach us directly, or request a platform demo.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="https://wa.me/919344773231"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl border border-black/10 px-3.5 py-2.5 text-sm font-semibold text-[#171B22] transition-colors hover:bg-[#F5F6F9]"
            >
              <MessageSquare className="h-4 w-4 text-[#25D366]" /> WhatsApp us
            </a>
            <a
              href="mailto:hello@infinityuniquers.dev"
              className="flex items-center gap-2.5 rounded-xl border border-black/10 px-3.5 py-2.5 text-sm font-semibold text-[#171B22] transition-colors hover:bg-[#F5F6F9]"
            >
              <Mail className="h-4 w-4 text-[#EA580C]" /> Email us
            </a>
            <Link
              to="/get-started"
              className="flex items-center gap-2.5 rounded-xl bg-[#F97316] px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
            >
              <ArrowRight className="h-4 w-4" /> Request a demo
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Chat with us"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F97316] text-white shadow-pop transition-transform hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}

/** Real product screenshots (captured from the actual admin portal in demo mode — seed/demo
    data, not a real customer's) — a plain framed image rather than a fake browser-chrome
    shell, since the screenshot already contains the app's own real header and nav. */
function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 shadow-pop">
      <img src={src} alt={alt} loading="lazy" className="h-auto w-full" />
    </div>
  );
}

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Meet to Manage brand accent — alternates orange/navy, no matching design-system token yet. */
  hex: string;
  /** Customer-outcome bucket used by the Features section's filter — Create/Manage/Teach/Measure, not the underlying technical module. */
  category: "Create" | "Manage" | "Teach" | "Measure";
}

const FEATURES: FeatureItem[] = [
  {
    icon: Video,
    hex: "#F97316",
    title: "Live Classroom",
    description: "One-click Jitsi video, screen share, chat, raise-hand and teacher controls — built for real teaching, not just meetings.",
    category: "Teach",
  },
  {
    icon: PenTool,
    hex: "#262D37",
    title: "Interactive Whiteboard",
    description: "Infinite, multi-page boards with drawing, drag & drop, tag & match and hotspot activities, synced live for every student.",
    category: "Create",
  },
  {
    icon: CalendarCheck2,
    hex: "#F97316",
    title: "Smart Scheduling",
    description: "1:1 and group classes, conflict-free academic calendars, automatic no-show handling and intelligent rescheduling.",
    category: "Manage",
  },
  {
    icon: HeartHandshake,
    hex: "#262D37",
    title: "Admissions CRM",
    description: "Demo bookings, teacher feedback, follow-ups and a conversion pipeline that turns leads into enrolled families.",
    category: "Manage",
  },
  {
    icon: Wallet,
    hex: "#F97316",
    title: "Billing & Payments",
    description: "Subscriptions, auto invoices, dual payment-gateway routing and automatic fee-suspension with instant restoration.",
    category: "Manage",
  },
  {
    icon: BarChart3,
    hex: "#262D37",
    title: "Analytics & Reports",
    description: "Engagement scores, attendance trends, teacher performance and business KPIs — all in one live dashboard.",
    category: "Measure",
  },
  {
    icon: Sparkles,
    hex: "#F97316",
    title: "Gamification",
    description: "Live quizzes, stars, badges, milestones and leaderboards that make every class something kids look forward to.",
    category: "Teach",
  },
  {
    icon: MessageSquare,
    hex: "#262D37",
    title: "Notifications, Built In",
    description: "Email, SMS and WhatsApp reminders, booking confirmations and payment alerts — nobody misses a class.",
    category: "Manage",
  },
];

const CATEGORY_FILTERS = ["All", "Create", "Manage", "Teach", "Measure"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

interface PainPoint {
  icon: LucideIcon;
  label: string;
  pain: string;
  fix: string;
}

const PAIN_POINTS: PainPoint[] = [
  {
    icon: Wallet,
    label: "Billing",
    pain: "Fee reminders lost in a WhatsApp thread, and a child quietly drops out of class.",
    fix: "Automatic invoices and dual-gateway billing — with instant fee-suspension and restoration the moment a parent pays.",
  },
  {
    icon: HeartHandshake,
    label: "Admissions",
    pain: "A demo booking sits in someone's inbox until the family gives up and goes elsewhere.",
    fix: "An admissions pipeline that tracks every booking from first call to enrolled family.",
  },
  {
    icon: BarChart3,
    label: "Attendance",
    pain: "You find out a class had three no-shows a week later — if at all.",
    fix: "Live attendance and engagement scores, the moment a session ends.",
  },
  {
    icon: Layers,
    label: "Systems",
    pain: "Teaching happens on one app, billing on another, admissions on a third.",
    fix: "One login. One role-based system. Every piece already connected.",
  },
];

/** Reframes the same four PAIN_POINTS facts as a head-to-head strip — no new claims, just a second, more decision-stage lens on facts already stated above. */
const COMPARISON_ROWS = [
  { old: "Fee follow-ups tracked manually, easy to miss", now: "Automatic invoices, auto-suspend and instant restoration on payment" },
  { old: "Admissions tracked in an inbox or a notebook", now: "One pipeline from first call to enrolled family" },
  { old: "Attendance found out about days later, if at all", now: "Live attendance and engagement the moment class ends" },
  { old: "A video app, a spreadsheet and a WhatsApp group", now: "One login, every role, already connected" },
];

const STATS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "8", label: "Role-based portals", icon: Layers },
  { value: "100%", label: "Real-time classroom", icon: Video },
  { value: "15-day", label: "Recording access window", icon: Clock },
  { value: "24/7", label: "Automated fee & reminder engine", icon: RefreshCw },
];

interface SolutionAudience {
  icon: LucideIcon;
  title: string;
  description: string;
  chips: string[];
  ctaLabel: string;
  ctaTo: string;
}

/** Real, evidenced sub-segments of the product's actual audience — tutoring/coaching academies — not generic corporate-L&D or MOOC-creator verticals the product has no evidence of fitting. */
const SOLUTIONS: SolutionAudience[] = [
  {
    icon: Target,
    title: "Single-subject academies",
    description:
      "Running one core subject — phonics, maths, coding — and need every demo, batch and fee followed up without adding admin headcount.",
    chips: ["Smart Scheduling", "Admissions CRM"],
    ctaLabel: "See the Admission Portal",
    ctaTo: "/portal-select",
  },
  {
    icon: Building2,
    title: "Multi-branch coaching institutes",
    description:
      "Coordinating several batches, teachers and branches, where fee collection and attendance need to be visible in one place, not five.",
    chips: ["Billing & Payments", "Analytics & Reports"],
    ctaLabel: "See the Management Dashboard",
    ctaTo: "/portal-select",
  },
  {
    icon: Users,
    title: "Independent tutors & small teaching teams",
    description:
      "Growing past spreadsheets and personal WhatsApp groups, without wanting to stitch together five separate tools to get there.",
    chips: ["Live Classroom", "One login, every role"],
    ctaLabel: "Explore Portals",
    ctaTo: "/portal-select",
  },
];

interface SecurityItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Every line here is a verified architectural fact (permission-gated portals, dual gateway, per-request status re-check) — no compliance badges, since none are held. */
const SECURITY_ITEMS: SecurityItem[] = [
  {
    icon: ShieldCheck,
    title: "Role-based access, everywhere",
    description: "Eight distinct portals, each gated by permission — a teacher can't see billing, and a parent can't see admin tools.",
  },
  {
    icon: Lock,
    title: "Session-based sign-in",
    description: "A deactivated account loses access on its very next request — not once its token happens to expire.",
  },
  {
    icon: RefreshCw,
    title: "Automatic fee safeguards",
    description: "Access can suspend the moment a payment is overdue, and restore itself the instant a family pays — no manual follow-up either way.",
  },
  {
    icon: CreditCard,
    title: "Two independent payment routes",
    description: "Payments route through Razorpay or Cashfree, so fee collection isn't dependent on a single gateway.",
  },
];

interface IntegrationItem {
  icon: LucideIcon;
  name: string;
  description: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  { icon: Video, name: "Jitsi", description: "Live video classroom" },
  { icon: CreditCard, name: "Razorpay", description: "Payment gateway" },
  { icon: Wallet, name: "Cashfree", description: "Payment gateway" },
  { icon: Mail, name: "Email", description: "Reminders & confirmations" },
  { icon: MessageSquare, name: "WhatsApp", description: "Reminders & confirmations" },
  { icon: Phone, name: "SMS", description: "Reminders & confirmations" },
];

/** Anchors into this same page — kept to sections that actually exist, so the nav never promises more than the page delivers. */
const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Portals", href: "#portals" },
  { label: "Solutions", href: "#solutions" },
  { label: "FAQ", href: "#faq" },
  { label: "Blog", href: "/blog" },
];

/** Every answer restates a fact already stated elsewhere on this page (STATS/FEATURES/PAIN_POINTS/SECURITY_ITEMS) — no numbers or claims invented for this section alone. */
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
    q: "Can I control what each staff member can see or do?",
    a: "Yes — every portal is gated by permission, not just by role. A teacher's portal can't reach billing, and front-desk staff can be given exactly the access they need and nothing more.",
  },
  {
    q: "How does scheduling handle a no-show or a clash?",
    a: "Batches are scheduled against a conflict-free calendar, no-shows are handled automatically, and rescheduling happens without a manual back-and-forth.",
  },
  {
    q: "How is a payment actually collected — and is it secure?",
    a: "Payments route through Razorpay or Cashfree, whichever your academy has configured, so collection isn't dependent on a single gateway going down.",
  },
  {
    q: "How do I see it before committing to anything?",
    a: "Book a free demo class. No payment details required — we match you with a teacher and send the join link by email.",
  },
];

export default function MarketingHome() {
  useLightBrandScope();
  const brand = useBrand();
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");

  const visibleFeatures = activeCategory === "All" ? FEATURES : FEATURES.filter((f) => f.category === activeCategory);

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="home"
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
          <nav aria-label="Page sections" className="hidden items-center gap-6 lg:flex">
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

          {/* Sign In stays available for returning users, but a fresh visitor's highest-value
              next step is requesting a demo — that CTA now carries the primary (filled) weight
              here and in the hero, matching how the rest of the page's CTAs are prioritized. */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button asChild variant="outline" className="border-[#171B22]/15 px-2.5 text-[#171B22] hover:bg-[#171B22]/5 sm:px-4">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="!bg-[#F97316] px-3 !text-white hover:!bg-[#EA580C] sm:px-4">
              <Link to="/get-started">
                <span className="sm:hidden">Demo</span>
                <span className="hidden sm:inline">Request a Demo</span>
                <ArrowRight className="hidden h-4 w-4 sm:inline" />
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
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-6 py-14 lg:grid-cols-[1.15fr_380px] lg:gap-16 lg:py-24">
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
              <Link to="/get-started">
                Request a Demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[#171B22]/15 text-[#171B22] hover:bg-[#171B22]/5">
              <Link to="/portal-select">Explore Portals</Link>
            </Button>
          </div>

          {/* Real, verifiable trust indicators only — every phrase here restates language
              already used on the dedicated /demo and /get-started flows, not a generic
              "no credit card" line this product's signup doesn't actually have.
              Stacked (not flex-wrap) at every width: at the hero column's ~500px desktop
              width, wrapping left three items of uneven length two-then-one, creating a
              lopsided row instead of a clean list. */}
          <div
            className="motion-safe:animate-slide-up mt-7 flex flex-col gap-2"
            style={{ animationDelay: "280ms", animationFillMode: "backwards" }}
          >
            {[
              "No payment details to book a demo",
              "One login — 8 role-based portals",
              "Free demo class before you commit",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6472]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#EA580C]" /> {item}
              </span>
            ))}
          </div>
        </div>

        {/* Hero visual: autoplaying 60-second reel, replacing the earlier static mockup. */}
        <div
          className="motion-safe:animate-slide-up relative w-full max-w-[260px] sm:max-w-[300px]"
          style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
        >
          {/* Inset (not overlapping above/left of the card via a negative offset) so it's
              structurally clamped inside the card's own bounds — it can never render behind
              the sticky header, regardless of any transient layout shift (web-font swap,
              browser zoom, etc.) that might otherwise nudge a negatively-offset badge upward. */}
          <div className="motion-safe:animate-float absolute left-2 top-2 z-10 flex h-11 w-11 -rotate-6 items-center justify-center rounded-full bg-white p-2 shadow-pop ring-1 ring-black/10">
            <img src="/logo-icon.png" alt="" className="h-full w-full object-contain" />
          </div>
          <HeroReel />
        </div>
        </div>
      </section>

      {/* Social proof strip — no fabricated customer counts or logos exist for this product yet,
          so this states real, verifiable platform facts instead of an invented "Trusted by..."
          claim. Swap the eyebrow to real customer trust language once that data exists. */}
      <section className="border-y border-black/10 bg-[#F5F6F9] py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-[0.08em] text-[#8B93A1]">What's already built in</p>
          <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-soft">
                  <s.icon className="h-4 w-4" />
                </span>
                <p className="font-display mt-3 text-2xl font-extrabold text-[#171B22]">{s.value}</p>
                <p className="mt-0.5 text-xs font-medium leading-snug text-[#5B6472]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain points → solutions */}
      <section className="border-t border-black/10 bg-[#FBFBFC] py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">The old way vs. {brand.name}</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
              You didn't start an academy to manage five different apps.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5B6472] sm:text-lg">
              {brand.name} replaces the spreadsheet, the WhatsApp group and the sticky notes — one system, already
              talking to itself.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PAIN_POINTS.map((p, i) => (
              <Reveal key={p.pain} delayMs={i * 80} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-6 sm:p-7">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F6F9] text-[#5B6472]">
                      <p.icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide text-[#8B93A1]">{p.label}</span>
                  </div>
                  <div className="mt-4 flex items-start gap-3">
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

          {/* Same four facts as the cards above, restated head-to-head for a reader already
              past "does this understand my problem" and into "why this over the alternative". */}
          <Reveal delayMs={PAIN_POINTS.length * 80} className="mt-10">
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
              <div className="grid grid-cols-2 border-b border-black/10 bg-[#F5F6F9]">
                <div className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#8B93A1] sm:px-5">The old way</div>
                <div className="border-l border-black/10 px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#EA580C] sm:px-5">
                  {brand.name}
                </div>
              </div>
              {COMPARISON_ROWS.map((row, i) => (
                <div key={row.old} className={cn("grid grid-cols-2", i !== 0 && "border-t border-black/10")}>
                  <div className="flex items-start gap-2 px-4 py-4 text-sm text-[#5B6472] sm:px-5">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#B8BEC9]" />
                    {row.old}
                  </div>
                  <div className="flex items-start gap-2 border-l border-black/10 px-4 py-4 text-sm font-semibold text-[#171B22] sm:px-5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" />
                    {row.now}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Product showcase — the interfaces below are illustrative product views built for
          this page (the same visual language as the hero mockup), not literal screenshots
          or real customer data. That's stated plainly beneath them rather than left ambiguous. */}
      <section id="product" className="scroll-mt-20 border-t border-black/10 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">Product</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything you need to run learning, in one place
            </h2>
            <p className="mt-3 text-sm text-[#5B6472]">
              A closer look at how {brand.name} presents batches, billing and performance — the same building blocks
              every portal uses.
            </p>
          </div>

          <div className="mt-16 flex flex-col gap-16 sm:gap-20">
            {/* Row A — batches & attendance */}
            <Reveal>
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div>
                  <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Batches and attendance, without the spreadsheet
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[#5B6472]">
                    See every batch, its teacher and how many students are enrolled — attendance updates the moment a
                    class ends, with no manual entry after the fact.
                  </p>
                  <ul className="mt-5 flex flex-col gap-3">
                    {[
                      "Conflict-free scheduling across teachers and time slots",
                      "Automatic no-show handling and rescheduling",
                      "One roster per batch, visible to every role that needs it",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-[#171B22]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <Screenshot
                  src="/screenshots/batches.webp"
                  alt="Batches screen in the Meet to Manage admin portal, listing six active batches with teacher, schedule and capacity"
                />
              </div>
            </Reveal>

            {/* Row B — billing (mockup on the left this time, for an alternating rhythm) */}
            <Reveal>
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div className="lg:order-2">
                  <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Billing that chases itself</h3>
                  <p className="mt-3 text-base leading-relaxed text-[#5B6472]">
                    Invoices generate automatically, and a family's access can pause the moment a payment is overdue —
                    then restore instantly the second they pay. No manual follow-up either way.
                  </p>
                  <ul className="mt-5 flex flex-col gap-3">
                    {[
                      "Dual-gateway routing — Razorpay or Cashfree",
                      "Instant fee-suspension and restoration",
                      "One payment history per family, not per spreadsheet tab",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-[#171B22]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:order-1">
                  <Screenshot
                    src="/screenshots/billing.webp"
                    alt="Billing & Finance screen in the Meet to Manage admin portal, showing an invoice table with paid, pending and overdue statuses"
                  />
                </div>
              </div>
            </Reveal>

            {/* Row C — analytics */}
            <Reveal>
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div>
                  <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Know how a class went, the moment it ends
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[#5B6472]">
                    Attendance, engagement scores and teacher performance land on one dashboard — not a week later,
                    and not stitched together from three different exports.
                  </p>
                  <ul className="mt-5 flex flex-col gap-3">
                    {[
                      "Live attendance & engagement scoring",
                      "Teacher performance at a glance",
                      "Business KPIs for the whole academy, updated as classes happen",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-[#171B22]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <Screenshot
                  src="/screenshots/analytics.webp"
                  alt="Admin Dashboard screen in Meet to Manage, showing growth KPIs, a revenue trend chart and a department revenue breakdown"
                />
              </div>
            </Reveal>
          </div>

          <p className="mt-14 text-center text-xs text-[#8B93A1]">
            Real screens from the Meet to Manage admin portal, shown with seed/demo data — not a real customer's.
          </p>
        </div>
      </section>

      {/* Feature grid — organized by customer outcome (Create / Manage / Teach / Measure)
          rather than by technical module, with the filter reusing the same 8 features
          instead of duplicating them into a second, redundant section. */}
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

          <div role="tablist" aria-label="Filter features by outcome" className="mt-8 flex flex-wrap justify-center gap-2">
            {CATEGORY_FILTERS.map((cat) => {
              const count = cat === "All" ? FEATURES.length : FEATURES.filter((f) => f.category === cat).length;
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-[#F97316] bg-[#F97316] text-white"
                      : "border-black/10 bg-white text-[#5B6472] hover:border-[#F97316]/40 hover:text-[#171B22]"
                  )}
                >
                  {cat} <span className={cn(active ? "text-white/70" : "text-[#B8BEC9]")}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleFeatures.map((f, i) => (
              <Reveal key={f.title} delayMs={(i % 4) * 80}>
                <div className="group h-full rounded-2xl border border-black/10 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-pop">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${f.hex}1A`, color: f.hex }}
                  >
                    <f.icon className="h-[22px] w-[22px]" />
                  </span>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-[#B8BEC9]">{f.category}</p>
                  <h3 className="mt-1 text-sm font-bold text-[#171B22]">{f.title}</h3>
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

      {/* Solutions — real, evidenced sub-segments of the product's actual audience (tutoring
          and coaching academies), not generic corporate-L&D or MOOC-creator verticals with no
          evidence in this codebase. */}
      <section id="solutions" className="scroll-mt-20 border-t border-black/10 bg-[#F5F6F9] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">Who it's for</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built for how tutoring and coaching academies actually run
            </h2>
            <p className="mt-3 text-sm text-[#5B6472]">
              Whether you teach one subject out of a single classroom or coordinate several branches and teachers,
              the same system scales with you.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {SOLUTIONS.map((s, i) => (
              <Reveal key={s.title} delayMs={i * 100}>
                <div className="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF3EA] text-[#EA580C]">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-[#171B22]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">{s.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.chips.map((chip) => (
                      <span key={chip} className="rounded-full bg-[#F5F6F9] px-2.5 py-1 text-[11px] font-semibold text-[#262D37]">
                        {chip}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={s.ctaTo}
                    className="mt-5 flex items-center gap-1 text-sm font-semibold text-[#EA580C] hover:text-[#C2410C]"
                  >
                    {s.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Security & trust — verified architectural facts only. No ISO/SOC2/GDPR badges are
          claimed here since none have been obtained for this product; the closing note says
          so directly instead of staying silent about it. */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">Security &amp; trust</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Real access control, not just a login screen
            </h2>
            <p className="mt-3 text-sm text-[#5B6472]">
              Every portal only shows what that role is allowed to see — and money movement has its own safeguards.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY_ITEMS.map((item, i) => (
              <Reveal key={item.title} delayMs={(i % 4) * 80}>
                <div className="h-full rounded-2xl border border-black/10 bg-[#F5F6F9] p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-soft">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-[#171B22]">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5B6472]">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-xl text-center text-xs text-[#8B93A1]">
            We don't yet publish formal compliance certifications — happy to walk through our specific security setup
            on a call.
          </p>
        </div>
      </section>

      {/* Integrations — the real, fixed set of channels this product ships with today, not an
          open marketplace. Framed as "built in" rather than "connect your stack" since that's
          the accurate description. */}
      <section id="integrations" className="scroll-mt-20 border-t border-black/10 bg-[#F5F6F9] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">Integrations</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built in, not bolted on
            </h2>
            <p className="mt-3 text-sm text-[#5B6472]">
              Live video, payments and every reminder run through the same system a family already uses to check
              schedules and pay fees.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {INTEGRATIONS.map((integration, i) => (
              <Reveal key={integration.name} delayMs={(i % 6) * 60}>
                <div className="flex h-full flex-col items-center gap-2.5 rounded-2xl border border-black/10 bg-white p-5 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF3EA] text-[#EA580C]">
                    <integration.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#171B22]">{integration.name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#5B6472]">{integration.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-white py-16 sm:py-20">
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
                <details className="group rounded-2xl border border-black/10 bg-[#F5F6F9] open:shadow-soft">
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

      {/* CTA banner — the page's two real conversion paths, not a hero repeat: an academy
          owner requesting a platform demo, or a parent booking a class demo. Sign-in stays
          reachable as a quiet text link for returning users, without competing for weight
          against the two lead-gen actions. */}
      <section className="border-t border-black/10 bg-[#F5F6F9] py-16 sm:py-20">
        <Reveal className="mx-auto max-w-4xl px-6">
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
                Your next class, your next invoice, your next admission — one login away.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
                See {brand.name} running an academy before you decide anything, or book a free class for your child
                first — whichever you're ready for.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="!bg-[#F97316] !text-white hover:!bg-[#EA580C]">
                  <Link to="/get-started">
                    Request a Demo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="!bg-transparent border-white/30 !text-white hover:!bg-white/10"
                  onClick={() => setDemoOpen(true)}
                >
                  Book a Class Demo
                </Button>
              </div>
              <Link to="/login" className="mt-6 inline-block text-xs font-semibold text-white/50 hover:text-white/80">
                Already have an account? Sign in
              </Link>
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
                <a href="#product" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  Product
                </a>
              </li>
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
                <a href="#solutions" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  Solutions
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
                <Link to="/get-started" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  Request a Demo
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]"
                >
                  Book a Class Demo
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
      <ChatWidget />
    </div>
  );
}
