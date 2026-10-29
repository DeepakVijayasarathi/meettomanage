import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeCopy } from "./copy";
import { Reveal } from "./fx";

const EYEBROW = "text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C] rtl:tracking-normal";
const H2 = "font-display text-[clamp(1.65rem,3vw,2.5rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1C1917] rtl:tracking-normal";

/** The live classroom: a real screenshot beside the five things teachers care about. */
export function LiveSection({ c }: { c: HomeCopy["live"] }) {
  return (
    <section id="classroom" className="scroll-mt-20 bg-white pb-[clamp(48px,5.5vw,80px)] pt-[clamp(24px,3vw,40px)]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        <Reveal className="relative order-2 lg:order-1">
          <img
            src="/product/hero-classroom.webp"
            srcSet="/product/hero-classroom-768.webp 768w, /product/hero-classroom.webp 1536w"
            sizes="(min-width: 1024px) 700px, 100vw"
            alt={c.alt}
            width={1536}
            height={1024}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full rounded-2xl shadow-[0_1px_2px_rgba(28,25,23,0.06),0_30px_70px_-35px_rgba(194,65,12,0.45)]"
          />
          <p className="mt-4 text-center text-xs font-medium text-[#6B6560]">{c.caption}</p>
        </Reveal>

        <div className="order-1 lg:order-2">
          <Reveal>
            <p className={EYEBROW}>{c.eyebrow}</p>
            <h2 className={cn(H2, "mt-4")}>{c.heading}</h2>
            <p className="mt-5 text-lg leading-relaxed text-[#57534E]">{c.sub}</p>
          </Reveal>
          <ul className="mt-8 flex flex-col gap-5">
            {c.points.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 80} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFEBDD] text-[#C2410C]"><CheckCircle2 className="h-4 w-4" /></span>
                <p className="text-[15px] leading-relaxed text-[#44403C]"><span className="font-bold text-[#1C1917]">{p.title}.</span> {p.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
