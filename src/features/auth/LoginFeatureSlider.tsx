import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Bot, CalendarDays, ChevronLeft, ChevronRight, Gamepad2, IndianRupee, Layers, Smartphone, Sparkles, Video, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
  icon: LucideIcon;
  title: string;
  body: string;
  src: string;
  alt: string;
  /** photo: full-bleed photograph; screen: desktop screenshot in a frame; phone: mobile screenshot in a phone frame. */
  kind: "photo" | "screen" | "phone";
}

const SLIDES: Slide[] = [
  { kind: "photo", icon: Sparkles, title: "Your whole academy in one place", body: "Classes, students, fees and parents, managed from a single login.", src: "/loginpage.png", alt: "Academy team using Meet to Manage" },
  { kind: "screen", icon: Video, title: "Live classes", body: "Built-in HD classroom with recordings, whiteboard and join requests.", src: "/product/classroom-1200.webp", alt: "Live classroom with teacher and students" },
  { kind: "screen", icon: BarChart3, title: "Dashboard and analytics", body: "Enrolments, revenue, attendance and renewals at a glance.", src: "/screenshots/analytics.webp", alt: "Admin dashboard with revenue and attendance metrics" },
  { kind: "screen", icon: Layers, title: "Batches and attendance", body: "Capacity, schedules and teacher assignment for every batch.", src: "/screenshots/batches.webp", alt: "Batches page with capacity and schedules" },
  { kind: "screen", icon: IndianRupee, title: "Fees and billing", body: "Invoices, receipts, reminders and overdue tracking for every parent.", src: "/screenshots/billing.webp", alt: "Billing page with invoices and payment status" },
  { kind: "screen", icon: CalendarDays, title: "Academic calendar", body: "Classes, demos, holidays and leave in one colour-coded calendar.", src: "/product/calendar-1312.webp", alt: "Academic calendar with scheduled sessions" },
  { kind: "screen", icon: Gamepad2, title: "Learning games", body: "145 ready-to-launch games and resources, opened inside the live class.", src: "/product/games-1312.webp", alt: "Learning games library" },
  { kind: "screen", icon: Bot, title: "AI Command Center", body: "Ask about collections, students and classes and get live answers.", src: "/product/ai-1312.webp", alt: "AI Command Center with business copilot" },
  { kind: "phone", icon: Smartphone, title: "Parent and student app", body: "Classes, homework and fee payments on every parent's phone.", src: "/product/app-fees.webp", alt: "Mobile app fees screen" },
];

const AUTO_MS = 5000;

/** The login page's left panel: an auto-playing tour of the platform's features. Pauses on hover/focus and under reduced motion. */
export function LoginFeatureSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const count = SLIDES.length;

  useEffect(() => {
    if (paused || reduced.current) return;
    const id = window.setTimeout(() => setActive((i) => (i + 1) % count), AUTO_MS);
    return () => window.clearTimeout(id);
  }, [active, paused, count]);

  const go = (step: number) => setActive((i) => (i + step + count) % count);
  const slide = SLIDES[active];
  const Icon = slide.icon;

  return (
    <div
      className="relative h-full overflow-hidden bg-gradient-to-br from-[#FFE9D6] via-[#FFF6EE] to-[#FFE1C7]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Meet to Manage features"
    >
      {/* Slides are stacked and crossfade, so images stay decoded and switching is instant. */}
      {SLIDES.map((s, i) => (
        <div key={s.src} aria-hidden={i !== active} className={cn("absolute inset-0 transition-opacity duration-700 ease-out", i === active ? "opacity-100" : "pointer-events-none opacity-0")}>
          {s.kind === "photo" ? (
            <>
              <img src={s.src} alt={s.alt} className="absolute inset-0 h-full w-full object-cover object-[62%_bottom]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/35 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-x-0 top-0 bottom-[210px] flex items-center justify-center px-10 pt-10 xl:px-16">
              {s.kind === "screen" ? (
                <div className={cn("w-full max-w-[760px] overflow-hidden rounded-2xl bg-white shadow-[0_40px_80px_-30px_rgba(124,45,18,0.45)] ring-1 ring-[#F2D8C2] transition-transform duration-700", i === active ? "scale-100" : "scale-95")}>
                  <div className="flex items-center gap-1.5 border-b border-[#F3E6DA] bg-[#FFFAF5] px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" /><span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
                    <span className="ms-3 truncate rounded-md bg-white px-3 py-0.5 text-[11px] text-[#78716C] ring-1 ring-[#F3E6DA]">meettomanage.cloud</span>
                  </div>
                  <img src={s.src} alt={s.alt} loading={i === 0 ? "eager" : "lazy"} decoding="async" className="block max-h-[calc(100dvh-340px)] w-full object-cover object-top" />
                </div>
              ) : (
                <div className={cn("h-full max-h-[600px] overflow-hidden rounded-[36px] border-[10px] border-[#1C1917] bg-white shadow-[0_40px_80px_-30px_rgba(124,45,18,0.55)] transition-transform duration-700", i === active ? "scale-100" : "scale-95")}>
                  <img src={s.src} alt={s.alt} loading="lazy" decoding="async" className="h-full w-auto object-cover object-top" />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Caption card: the current feature, controls and the demo request link. */}
      <div className="absolute inset-x-0 bottom-0 px-10 pb-7 xl:px-16">
        <div className="max-w-[560px] rounded-2xl bg-white/95 p-5 shadow-[0_18px_40px_-24px_rgba(28,25,23,0.45)] backdrop-blur">
          <div aria-live="polite" className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFEBDD] text-[#EA580C]"><Icon className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span key={active} className="animate-fade-in block text-base font-bold text-[#1C1917]">{slide.title}</span>
              <span className="block text-sm text-[#57534E]">{slide.body}</span>
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose a feature">
              {SLIDES.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={s.title}
                  onClick={() => setActive(i)}
                  className={cn("h-2 rounded-full transition-all", i === active ? "w-6 bg-[#EA580C]" : "w-2 bg-[#E7D3C2] hover:bg-[#F0A774]")}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => go(-1)} aria-label="Previous feature" className="flex h-8 w-8 items-center justify-center rounded-full text-[#57534E] ring-1 ring-[#EBD9C8] transition-colors hover:bg-[#FFF3EA] hover:text-[#C2410C] rtl:rotate-180"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => go(1)} aria-label="Next feature" className="flex h-8 w-8 items-center justify-center rounded-full text-[#57534E] ring-1 ring-[#EBD9C8] transition-colors hover:bg-[#FFF3EA] hover:text-[#C2410C] rtl:rotate-180"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <Link to="/get-started" className="mt-3 flex items-center gap-1 border-t border-[#F3E6DA] pt-3 text-sm font-semibold text-[#C2410C] hover:underline">
            No commitment: request a demo and we'll follow up <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
