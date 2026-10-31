import { Link } from "react-router-dom";
import { Mail, MessageCircle } from "lucide-react";
import { useBrand } from "@/lib/branding";
import { useLang } from "@/lib/i18n";
import { COPY } from "./home/copy";

const LINK = "py-1.5 text-sm font-medium text-[#57534E] transition-colors hover:text-[#1C1917] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]";
const HEAD = "text-xs font-bold uppercase tracking-[0.08em] text-[#1C1917] rtl:tracking-normal";

/** The site-wide footer: light grey, with 7.6:1 body links on it. */
export function MarketingFooter() {
  const brand = useBrand();
  const [lang] = useLang();
  const f = COPY[lang].footer;

  return (
    <footer className="border-t border-[#EFE3D7] bg-[#FFFBF7] text-[#57534E]">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <img src="/logo-full.webp" alt={brand.name} width={420} height={150} loading="lazy" className="h-14 w-auto object-contain mix-blend-multiply" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{f.tagline}</p>
        </div>

        <nav aria-label={f.company}>
          <p className={HEAD}>{f.company}</p>
          <ul className="mt-4 flex flex-col">
            <li><Link to="/get-started" className={LINK}>{f.demo}</Link></li>
            <li><Link to="/portal-select" className={LINK}>{f.portals}</Link></li>
            <li><Link to="/customers" className={LINK}>{f.customers}</Link></li>
            <li><Link to="/pricing" className={LINK}>{f.pricing}</Link></li>
            <li><Link to="/login" className={LINK}>{f.signIn}</Link></li>
            <li><Link to="/blog" className={LINK}>{f.blog}</Link></li>
            <li><Link to="/solutions/live-class-software-for-institutes" className={LINK}>Live class software</Link></li>
            <li><Link to="/solutions/online-attendance-software-for-institutes" className={LINK}>Attendance software</Link></li>
            <li><Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>Fee management software</Link></li>
            <li><Link to="/solutions/phonics-live-class-software" className={LINK}>Phonics class software</Link></li>
            <li><Link to="/alternatives/classplus-alternative-for-coaching-centres" className={LINK}>Classplus alternative</Link></li>
            <li><Link to="/docs" className={LINK}>Documentation</Link></li>
            <li><Link to="/careers" className={LINK}>{f.careers}</Link></li>
          </ul>
        </nav>

        <nav aria-label={f.legal}>
          <p className={HEAD}>{f.legal}</p>
          <ul className="mt-4 flex flex-col">
            <li><Link to="/legal/terms" className={LINK}>{f.terms}</Link></li>
            <li><Link to="/privacy" className={LINK}>{f.privacy}</Link></li>
            <li><Link to="/policy" className={LINK}>{f.clientFinder}</Link></li>
          </ul>
        </nav>

        <div>
          <p className={HEAD}>{f.contact}</p>
          <ul className="mt-4 flex flex-col">
            <li>
              <a href="https://wa.me/919344773231" target="_blank" rel="noopener noreferrer" className={`${LINK} inline-flex items-center gap-2`}>
                <MessageCircle className="h-4 w-4" /> {f.whatsapp}
              </a>
            </li>
            <li>
              <a href="mailto:info@infinityuniquers.com" className={`${LINK} inline-flex items-center gap-2`}>
                <Mail className="h-4 w-4" /> info@infinityuniquers.com
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#EFE3D7]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-[#6B6560]">{f.rights(new Date().getFullYear())}</p>
          <p className="flex items-center gap-2 text-xs font-medium text-[#6B6560]">
            {lang === "ar" ? "إحدى منتجات" : "A product of"}
            <img src="/infinity-uniquers-logo.png" alt="Infinity Uniquers" width={351} height={150} loading="lazy" className="h-7 w-auto object-contain" />
            <span className="font-bold text-[#1C1917]">Infinity Uniquers</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
