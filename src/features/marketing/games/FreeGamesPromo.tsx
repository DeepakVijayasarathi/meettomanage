import { ArrowRight, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";

export function FreeGamesPromo() {
  return <section aria-labelledby="free-games-heading" className="border-y border-[#F0DDCD] bg-[#FFFAF5] py-9 sm:py-11">
    <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-6 px-5 lg:flex-row lg:items-center">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFE7D3] text-[#C2410C]"><Gamepad2 aria-hidden="true" className="h-6 w-6" /></span>
        <div><p className="text-[11px] font-bold uppercase tracking-wider text-[#A4431B]">Free for curious learners</p><h2 id="free-games-heading" className="font-display mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">Alphabet, phonics and listening games.</h2><p className="mt-2 text-sm leading-relaxed text-[#786B60]">Short rounds, gentle feedback and optional word audio. No signup needed.</p></div>
      </div>
      <Link to="/free-games" className="inline-flex min-h-12 shrink-0 items-center gap-3 rounded-full bg-[#C2410C] px-6 py-3 text-sm font-bold text-white hover:bg-[#9A3412] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]">Play free games<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
    </div>
  </section>;
}
