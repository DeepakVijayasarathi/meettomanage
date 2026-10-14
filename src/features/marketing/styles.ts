/* Shared look of the marketing pages: a deep-navy stage for heroes and dark bands, one
   orange → pink → violet accent gradient, oversized centered headings, and square-cornered
   cards and buttons. Kept as constants so every page reaches for the same handful. */
export const ACCENT_GRADIENT = "linear-gradient(90deg, #F97316 0%, #F53BA6 55%, #7C5CFC 100%)";
export const HERO_BG =
  "radial-gradient(60% 50% at 50% 0%, rgba(124,92,252,0.38), transparent 70%), radial-gradient(40% 40% at 88% 62%, rgba(249,115,22,0.22), transparent 70%), radial-gradient(40% 40% at 8% 72%, rgba(245,59,166,0.16), transparent 70%), #0D1024";
export const DARK_BAND_BG =
  "radial-gradient(50% 70% at 100% 100%, rgba(249,115,22,0.18), transparent 70%), linear-gradient(176deg, #0D1024 10%, #2A1B6B 112%)";
export const FAQ_BG =
  "radial-gradient(45% 55% at 0% 0%, rgba(249,115,22,0.14), transparent 70%), radial-gradient(45% 55% at 100% 100%, rgba(124,92,252,0.16), transparent 70%), #F0F0F0";
export const READY_BG = "linear-gradient(135deg, rgba(255,225,199,0.55) 0%, #FFFFFF 50%)";

export const GRADIENT_TEXT = "bg-[linear-gradient(90deg,#F97316_0%,#F53BA6_55%,#7C5CFC_100%)] bg-clip-text text-transparent";
export const H2 =
  "font-display text-[clamp(2.125rem,4vw,3.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#111] rtl:tracking-normal";
/** Second-tier heading, for sub-sections inside a page that already has a hero h1. */
export const H2_SM =
  "font-display text-[clamp(1.5rem,2.4vw,2.125rem)] font-extrabold leading-tight tracking-[-0.02em] text-[#111] rtl:tracking-normal";
export const LEAD = "text-[clamp(1rem,1.4vw,1.1875rem)] leading-relaxed text-[#333]";
export const EYEBROW = "text-xs font-bold uppercase tracking-[0.08em] text-[#C2410C]";
export const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]";
const CTA_BASE = `inline-flex min-w-[199px] items-center justify-center gap-2 px-8 py-4 text-[15px] font-bold uppercase tracking-[-0.01em] transition-colors disabled:pointer-events-none disabled:opacity-60 rtl:tracking-normal ${FOCUS_RING}`;
export const CTA_ORANGE = `${CTA_BASE} bg-[#F97316] text-[#171B22] hover:bg-[#FB8B3C]`;
export const CTA_DARK = `${CTA_BASE} bg-[#111] text-white hover:bg-[#262D37]`;
export const CTA_GHOST = `${CTA_BASE} border border-white/30 text-white hover:bg-white/10`;
export const ARROW_LINK = `inline-flex items-center gap-1.5 text-[15px] font-bold uppercase text-[#C2410C] hover:text-[#9A3412] ${FOCUS_RING}`;
export const ROUND_ARROW = `flex h-[55px] w-[55px] shrink-0 items-center justify-center rounded-full border border-[#D9E1F0] bg-[#EAEEF4] text-[#111] transition-colors hover:bg-[#D9E1F0] ${FOCUS_RING}`;
/** Square white card on a hairline border — the default surface for anything boxed. */
export const CARD = "border border-[#D9E1F0] bg-white shadow-[0_8px_40px_0_rgba(0,0,0,0.08)]";
/** Pulls the block after a `<MarketingHero overlap>` up across the dark/white seam. */
export const HERO_OVERLAP = "relative z-10 -mt-[clamp(72px,9vw,128px)]";
