import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Hand,
  HeartHandshake,
  Mic,
  MessageSquare,
  PenTool,
  ScreenShare,
  ShieldCheck,
  Sparkles,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { BookDemoDialog } from "@/components/BookDemoDialog";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";

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

const STATS = [
  { value: "8", label: "Role-based portals" },
  { value: "100%", label: "Real-time classroom" },
  { value: "15-day", label: "Recording access window" },
  { value: "24/7", label: "Automated fee & reminder engine" },
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
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-[#171B22]/15 text-[#171B22] hover:bg-[#171B22]/5"
              onClick={() => setDemoOpen(true)}
            >
              Book a Demo
            </Button>
            <Button asChild className="!bg-[#F97316] !text-white hover:!bg-[#EA580C]">
              <Link to="/login">
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FFE1C7] bg-[#FFF3EA] px-3.5 py-1.5 text-xs font-semibold text-[#C2410C]">
            <Sparkles className="h-3.5 w-3.5" /> Learning Management &amp; Virtual Classroom Platform
          </div>
          <h1 className="font-display mt-5 text-4xl font-extrabold leading-[1.14] tracking-tight sm:text-5xl">
            Meet your students live.
            <span className="text-[#EA580C]"> Manage</span> your academy end to end.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#5B6472]">
            {brand.name} brings live teaching, scheduling, admissions, billing and reporting into a single,
            role-based system — so every meeting turns into progress everyone can track.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="!bg-[#F97316] !text-white hover:!bg-[#EA580C]">
              <Link to="/login">
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[#171B22]/15 text-[#171B22] hover:bg-[#171B22]/5">
              <Link to="/portal-select">Explore Portals</Link>
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-extrabold text-[#171B22]">{s.value}</p>
                <p className="mt-0.5 text-xs font-medium leading-snug text-[#5B6472]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual: live session mockup */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -left-4 -top-4 z-10 flex h-14 w-14 -rotate-6 items-center justify-center rounded-full bg-white p-2 shadow-pop ring-1 ring-black/10">
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
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
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

          <div className="absolute -bottom-5 -right-3 flex items-center gap-2.5 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-pop">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF3EA] text-[#EA580C]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-[#171B22]">Class in progress</p>
              <p className="text-xs text-[#5B6472]">3 batches running now</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-black/10 bg-[#F5F6F9] py-16">
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
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-black/10 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-pop"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${f.hex}1A`, color: f.hex }}
                >
                  <f.icon className="h-[22px] w-[22px]" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-[#171B22]">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5B6472]">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <section className="bg-white py-16">
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
            {ROLE_ORDER.map((r) => {
              const meta = ROLE_META[r];
              return (
                <Link
                  key={r}
                  to="/portal-select"
                  className="group flex flex-col gap-3 rounded-2xl border border-black/10 bg-[#F5F6F9] p-5 transition-all hover:-translate-y-1 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: "#1A1F27" }}
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
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-white py-16">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] bg-[#1A1F27] px-8 py-12 text-center shadow-pop sm:px-14">
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
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
          <Logo imgClassName="h-7 w-7" />
          <p className="text-xs font-medium text-[#5B6472]">
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
        </div>
      </footer>

      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
