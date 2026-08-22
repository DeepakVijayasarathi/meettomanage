import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  HeartHandshake,
  LayoutGrid,
  Menu,
  MessageSquare,
  PenTool,
  ShieldCheck,
  Sparkles,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBrand } from "@/lib/branding";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Literal Tailwind classes when the color matches a design-system token. */
  colorClass?: string;
  /** Raw hex fallback for a color with no matching token. */
  hex?: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: Video,
    colorClass: "bg-brand-blue/10 text-brand-blue",
    title: "Live Classroom",
    description: "One-click Jitsi video, screen share, chat, raise-hand and teacher controls — built for real teaching, not just meetings.",
  },
  {
    icon: PenTool,
    // No matching design-system token for this hex — kept as a literal color.
    hex: "#8B5CF6",
    title: "Interactive Whiteboard",
    description: "Infinite, multi-page boards with drawing, drag & drop, tag & match and hotspot activities, synced live for every student.",
  },
  {
    icon: CalendarCheck2,
    colorClass: "bg-role-teacher/10 text-role-teacher",
    title: "Smart Scheduling",
    description: "1:1 and group classes, conflict-free academic calendars, automatic no-show handling and intelligent rescheduling.",
  },
  {
    icon: HeartHandshake,
    colorClass: "bg-brand-pink/10 text-brand-pink",
    title: "Admissions CRM",
    description: "Demo bookings, teacher feedback, follow-ups and a conversion pipeline that turns leads into enrolled families.",
  },
  {
    icon: Wallet,
    colorClass: "bg-brand-green/10 text-brand-green",
    title: "Billing & Payments",
    description: "Subscriptions, auto invoices, dual payment-gateway routing and automatic fee-suspension with instant restoration.",
  },
  {
    icon: BarChart3,
    colorClass: "bg-brand-cyan/10 text-brand-cyan",
    title: "Analytics & AI Reports",
    description: "Engagement scores, attendance trends, teacher performance and business KPIs — all in one live dashboard.",
  },
  {
    icon: Sparkles,
    colorClass: "bg-status-scheduled/10 text-status-scheduled",
    title: "Gamification",
    description: "Live quizzes, stars, badges, milestones and leaderboards that make every class something kids look forward to.",
  },
  {
    icon: MessageSquare,
    colorClass: "bg-role-coordinator/10 text-role-coordinator",
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

export default function MarketingHome() {
  const brand = useBrand();

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-brand-ink/10 bg-brand-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/store">Browse Courses</Link>
            </Button>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/portal-select">Explore Portals</Link>
            </Button>
            <Button asChild className="!bg-brand-green !text-white hover:!bg-brand-greenDark">
              <Link to="/login">
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/store" className="cursor-pointer">
                    <BookOpen /> Browse Courses
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/portal-select" className="cursor-pointer">
                    <LayoutGrid /> Explore Portals
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <Badge className="gap-1.5 bg-brand-green/10 text-brand-greenDark hover:bg-brand-green/10">
            <Sparkles className="h-3.5 w-3.5" /> Learning Management &amp; Virtual Classroom Platform
          </Badge>
          <h1 className="font-display mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            One platform for live classes,
            <span className="text-brand-greenDark"> admissions</span>,
            <span className="text-brand-blue"> billing</span> and every
            <span className="text-brand-pink"> parent conversation</span>.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-brand-ink/65">
            {brand.name} brings live teaching, scheduling, admissions, billing and reporting into a single,
            role-based system — so every class runs smoothly and every family stays in the loop.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="!bg-brand-green !text-white hover:!bg-brand-greenDark">
              <Link to="/login">
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-brand-ink/15 text-brand-ink hover:bg-brand-ink/5">
              <Link to="/portal-select">Explore Portals</Link>
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-extrabold text-brand-ink">{s.value}</p>
                <p className="mt-0.5 text-xs font-medium leading-snug text-brand-ink/55">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -left-4 -top-4 z-10 flex h-14 w-14 -rotate-6 items-center justify-center rounded-full bg-white p-2 shadow-pop ring-1 ring-brand-ink/10">
            <img src={brand.logoUrl ?? "/logo.png"} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="overflow-hidden rounded-[28px] shadow-pop ring-4 ring-white">
            <img
              src="/login.png"
              alt={`Two children reading together at ${brand.name}`}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 -right-3 flex items-center gap-2 rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 shadow-pop">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-brand-ink">Live &amp; Running</p>
              <p className="text-xs text-brand-ink/50">Classes in session right now</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-brand-ink/10 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything a modern learning academy needs
            </h2>
            <p className="mt-3 text-sm text-brand-ink/60">
              From the first demo class to monthly billing, {brand.name} covers the entire journey — for admins,
              teachers, parents and students alike.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-brand-ink/10 p-5 transition-all hover:-translate-y-1 hover:shadow-pop"
              >
                <span
                  className={cn("flex h-11 w-11 items-center justify-center rounded-xl", f.colorClass)}
                  style={f.hex ? { backgroundColor: `${f.hex}1A`, color: f.hex } : undefined}
                >
                  <f.icon className="h-[22px] w-[22px]" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-brand-ink">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-brand-ink/55">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <section className="bg-brand-cream py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="gap-1.5 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/10">
              <ShieldCheck className="h-3.5 w-3.5" /> One login, the right view every time
            </Badge>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              A dedicated portal for every role
            </h2>
            <p className="mt-3 text-sm text-brand-ink/60">
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
                  className="group flex flex-col gap-3 rounded-2xl border border-brand-ink/10 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: meta.hex }}
                  >
                    <meta.icon className="h-[22px] w-[22px]" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-brand-ink">{meta.label}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-brand-ink/55">{meta.description}</p>
                  </div>
                  <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-brand-green opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
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
        <div className="mx-auto max-w-4xl rounded-[28px] bg-brand-navy px-8 py-12 text-center shadow-pop sm:px-14">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
            <BookOpen className="h-6 w-6" />
          </span>
          <h2 className="font-display mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Ready to bring your academy online?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
            Sign in to your portal and pick up right where you left off — or explore every role first.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="!bg-brand-green !text-white hover:!bg-brand-greenDark">
              <Link to="/login">
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="!bg-transparent border-white/30 !text-white hover:!bg-white/10">
              <Link to="/portal-select">Explore Portals</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-ink/10 bg-brand-cream py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
          <Logo imgClassName="h-7 w-7" />
          <p className="text-xs font-medium text-brand-ink/45">
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
