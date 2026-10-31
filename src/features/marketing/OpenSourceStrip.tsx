import { Link } from "react-router-dom";
import { ArrowRight, Video } from "lucide-react";
import { cn } from "@/lib/utils";

/** "Live meetings are free" banner, linking to the live class page. English only, like the other recent marketing blocks. */
export function OpenSourceStrip({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-[1160px]", className)}>
      <Link to="/solutions/live-class-software-for-institutes" aria-label="Live meetings are free. See how live classes work." className="group relative isolate block overflow-hidden rounded-3xl bg-[#C2410C] shadow-[0_16px_45px_-24px_rgba(194,65,12,0.35)] transition-shadow hover:shadow-[0_20px_50px_-20px_rgba(194,65,12,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]">
        <div className="relative z-10 p-6 text-white sm:p-8 md:w-[49%] md:py-10 lg:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider"><Video aria-hidden="true" className="h-4 w-4" /> Live classes</span>
          <h2 className="font-display mt-4 text-3xl font-extrabold leading-tight tracking-tight">Live meetings are <span className="text-[#FEF08A]">free</span></h2>
          <p className="mt-3 text-base leading-relaxed text-orange-50">Conduct unlimited online classes with MeetToManage’s built-in meeting solution. No extra meeting charges.</p>
          <span className="mt-5 inline-flex min-h-12 items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#C2410C]">See How It Works <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden md:hidden" aria-hidden="true">
          <img src="/images/live-class-mobile-v2.webp" srcSet="/images/live-class-mobile-v2-480.webp 480w, /images/live-class-mobile-v2.webp 960w" sizes="(min-width: 768px) 0px, calc(100vw - 40px)" alt="" width={960} height={720} loading="lazy" decoding="async" className="block h-full w-full object-cover" />
        </div>
        <img
          src="/images/live-class-banner-v2.webp"
          srcSet="/images/live-class-banner-v2-1200.webp 1200w, /images/live-class-banner-v2.webp 2172w"
          sizes="(min-width: 1200px) 1160px, calc(100vw - 40px)"
          alt="Teacher leading an online class on a laptop, with student video tiles, attendance and learning progress."
          width={2172}
          height={724}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 hidden h-full w-full object-cover object-right md:block"
        />
      </Link>
    </div>
  );
}
