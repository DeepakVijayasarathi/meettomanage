import { cn } from "@/lib/utils";
import { HERO_BG } from "./styles";

interface MarketingHeroProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** Leaves extra room at the bottom for the next block to overlap into (pair it with
   *  HERO_OVERLAP from ./styles on that block). */
  overlap?: boolean;
  children?: React.ReactNode;
}

/** The light, centered page header every marketing sub-page opens with — the same stage as
 *  the homepage hero, at a smaller scale. */
export function MarketingHero({ eyebrow, title, sub, overlap, children }: MarketingHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[#F1E6DC] text-[#111]" style={{ background: HERO_BG }}>
      <div
        className={cn(
          "mx-auto max-w-[1280px] px-5 pt-[clamp(48px,6vw,88px)] text-center",
          overlap ? "pb-[clamp(128px,15vw,216px)]" : "pb-[clamp(48px,6vw,88px)]"
        )}
      >
        {eyebrow && (
          <div className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#F97316]/25 bg-white px-3.5 py-2 text-xs font-semibold text-[#C2410C]">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display mx-auto mt-5 max-w-[22ch] text-[clamp(2.25rem,4.4vw,4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] rtl:tracking-normal">
          {title}
        </h1>
        {sub && <p className="mx-auto mt-5 max-w-2xl text-[clamp(1rem,1.4vw,1.1875rem)] leading-relaxed text-[#333]">{sub}</p>}
        {children}
      </div>
    </section>
  );
}
