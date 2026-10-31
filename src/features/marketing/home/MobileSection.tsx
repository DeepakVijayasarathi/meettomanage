import { CheckCircle2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeCopy } from "./copy";
import { Reveal } from "./fx";
import { Phone } from "./Phone";

const EYEBROW = "text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C] rtl:tracking-normal";
const H2 = "font-display text-[clamp(1.65rem,3vw,2.5rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1C1917] rtl:tracking-normal";
const SHOTS = ["/product/app-home.webp", "/product/app-classes.webp", "/product/app-fees.webp"];
// Stagger the phones without overlapping their screens or labels.
const LAYOUT = ["mt-10 -rotate-2", "z-10", "mt-10 rotate-2"];

/** The parent app: three real screens fanned out beside what a family can do with it. */
export function MobileSection({ c }: { c: HomeCopy["app"] }) {
  return (
    <section id="app" className="scroll-mt-20 overflow-hidden bg-[#FFF6EE] py-[clamp(48px,5.5vw,80px)]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <Reveal>
            <p className={EYEBROW}>{c.eyebrow}</p>
            <h2 className={cn(H2, "mt-4")}>{c.heading}</h2>
            <p className="mt-5 text-lg leading-relaxed text-[#57534E]">{c.sub}</p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#1C1917] ring-1 ring-[#EBD9C8]"><Smartphone className="h-4 w-4 text-[#C2410C]" /> {c.badge}</p>
          </Reveal>
          <ul className="mt-8 flex flex-col gap-5">
            {c.points.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 80} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFE2CC] text-[#C2410C]"><CheckCircle2 className="h-4 w-4" /></span>
                <p className="text-[15px] leading-relaxed text-[#44403C]"><span className="font-bold text-[#1C1917]">{p.title}.</span> {p.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <div className="relative mx-auto grid w-full max-w-[520px] grid-cols-[1fr_1.06fr_1fr] items-start gap-2 px-2 pb-3 pt-4 sm:gap-3 sm:px-3">
            <div aria-hidden="true" className="absolute inset-x-[8%] top-[10%] h-[80%] rounded-full bg-[#FDBA74]/40 blur-[70px]" />
            {SHOTS.map((src, i) => (
              <Reveal key={src} delay={i * 140} className={cn("relative min-w-0", LAYOUT[i])}>
                <Phone src={src} alt={c.alts[i]} />
                <p className="mt-3 text-center text-xs font-bold text-[#57534E]">{c.labels[i]}</p>
              </Reveal>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-[420px] text-center text-xs font-medium leading-relaxed text-[#6B6560]">{c.caption}</p>
        </div>
      </div>
    </section>
  );
}
