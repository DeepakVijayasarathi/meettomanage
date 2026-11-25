import { MarketingLogo } from "./MarketingLogo";
import { Link } from "react-router-dom";
import { Mail, MessageCircle, Facebook, Instagram, Youtube, Linkedin, Twitter } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { COPY } from "./home/copy";
import { trackMarketingEvent } from "@/lib/analytics";

const LINK = "py-1.5 text-sm font-medium text-[#57534E] transition-colors hover:text-[#1C1917] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]";
const HEAD = "text-xs font-bold uppercase tracking-[0.08em] text-[#1C1917] rtl:tracking-normal";

/** The site-wide footer: light grey, with 7.6:1 body links on it. */
export function MarketingFooter() {
  const [lang] = useLang();
  const f = COPY[lang].footer;

  return (
    <footer className="border-t border-[#EFE3D7] bg-[#FFFBF7] text-[#57534E]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-10 px-5 py-14 sm:py-16 md:grid-cols-4 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_0.8fr] lg:gap-x-8">
        <div className="col-span-2 md:col-span-4 lg:col-span-1 lg:col-start-1">
          <MarketingLogo className="h-14 w-auto max-w-full object-contain" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{f.tagline}</p>
        </div>

        <nav aria-label={f.company}>
          <p className={HEAD}>{f.company}</p>
          <ul className="mt-4 flex flex-col">
            <li><Link to="/signup?plan=free" className={LINK} onClick={() => trackMarketingEvent("sales_cta_clicked", window.location.pathname, "footer:free_signup")}>{f.freeAccount}</Link></li>
            <li><Link to="/demo-login" className={LINK}>{f.liveDemo}</Link></li>
            <li><Link to="/get-started" className={LINK}>{f.demo}</Link></li>
            <li><Link to="/get-started?intent=call&from=footer" className={LINK}>{lang === "ar" ? "حدد موعد مكالمة" : "Schedule a call"}</Link></li>
            <li><Link to="/pricing" className={LINK}>{f.pricing}</Link></li>
            <li><Link to="/pricing-calculator" className={LINK}>Pricing calculator</Link></li>
            <li><Link to="/portal-select" className={LINK}>{f.portals}</Link></li>
            <li><Link to="/login" className={LINK}>{f.signIn}</Link></li>
          </ul>
        </nav>

        <nav aria-label={f.solutions}>
          <p className={HEAD}>{f.solutions}</p>
          <ul className="mt-4 flex flex-col">
            <li><Link to="/solutions/live-class-software-for-institutes" className={LINK}>Live class software</Link></li>
            <li><Link to="/solutions/online-attendance-software-for-institutes" className={LINK}>Attendance software</Link></li>
            <li><Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>Fee management software</Link></li>
            <li><Link to="/solutions/phonics-live-class-software" className={LINK}>Phonics class software</Link></li>
            <li><Link to="/solutions/tuition-centre-management-software" className={LINK}>Tuition centre software</Link></li>
            <li><Link to="/solutions/coaching-centre-admission-crm" className={LINK}>Admission CRM</Link></li>
            <li><Link to="/alternatives/classplus-alternative-for-coaching-centres" className={LINK}>Classplus alternative</Link></li>
            <li><Link to="/alternatives/topshelf-alternative-for-coaching-centres" className={LINK}>Topshelf alternative</Link></li>
            <li><Link to="/alternatives/class4all-alternative-for-coaching-centres" className={LINK}>Class4all alternative</Link></li>
            <li><Link to="/alternatives/eduprise-alternative-for-coaching-centres" className={LINK}>Eduprise alternative</Link></li>
            <li><Link to="/alternatives/eaddkar-alternative-for-coaching-centres" className={LINK}>eAdkar alternative</Link></li>
            <li><Link to="/alternatives/tutorcruncher-alternative-for-coaching-centres" className={LINK}>TutorCruncher alternative</Link></li>
            <li><Link to="/compare" className={LINK}>Compare plans</Link></li>
          </ul>
        </nav>

        <nav aria-label={f.resources}>
          <p className={HEAD}>{f.resources}</p>
          <ul className="mt-4 flex flex-col">
            <li><Link to="/customers" className={LINK}>{f.customers}</Link></li>
            <li><Link to="/blog" className={LINK}>{f.blog}</Link></li>
            <li><Link to="/resources" className={LINK}>Free coaching centre templates</Link></li>
            <li><Link to="/free-games" className={LINK}>Free alphabet & phonics games</Link></li>
            <li><Link to="/docs" className={LINK}>Documentation</Link></li>
            <li><Link to="/careers" className={LINK}>{f.careers}</Link></li>
          </ul>
        </nav>

        <div>
          <p className={HEAD}>{lang === "ar" ? "تابعنا" : "Follow us"}</p>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
            <a href="https://www.youtube.com/@meettomanage" target="_blank" rel="noopener noreferrer" className={cn(LINK, "inline-flex items-center")} aria-label="Meet to Manage on YouTube">
              <Youtube className="h-4 w-4" /> YouTube
            </a>
            <a href="https://www.instagram.com/meettomanage" target="_blank" rel="noopener noreferrer" className={cn(LINK, "inline-flex items-center")} aria-label="Meet to Manage on Instagram">
              <Instagram className="h-4 w-4" /> Instagram
            </a>
            <a href="https://www.facebook.com/meettomanage" target="_blank" rel="noopener noreferrer" className={cn(LINK, "inline-flex items-center")} aria-label="Meet to Manage on Facebook">
              <Facebook className="h-4 w-4" /> Facebook
            </a>
            <a href="https://www.linkedin.com/company/meettomanage" target="_blank" rel="noopener noreferrer" className={cn(LINK, "inline-flex items-center")} aria-label="Meet to Manage on LinkedIn">
              <Linkedin className="h-4 w-4" /> LinkedIn
            </a>
            <a href="https://x.com/meettomanage" target="_blank" rel="noopener noreferrer" className={cn(LINK, "inline-flex items-center")} aria-label="Meet to Manage on X (Twitter)">
              <Twitter className="h-4 w-4" /> X
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-10">
          <nav aria-label={f.legal}>
            <p className={HEAD}>{f.legal}</p>
            <ul className="mt-4 flex flex-col">
              <li><Link to="/legal/terms" className={LINK}>{f.terms}</Link></li>
              <li><Link to="/privacy" className={LINK}>{f.privacy}</Link></li>
              <li><Link to="/policy" className={LINK}>{f.clientFinder}</Link></li>
              <li><Link to="/status" className={LINK}>System status</Link></li>
            </ul>
          </nav>
          <div>
            <p className={HEAD}>{f.contact}</p>
            <ul className="mt-4 flex flex-col">
              <li>
                <a href="https://wa.me/919344773231" target="_blank" rel="noopener noreferrer" className={`${LINK} inline-flex items-center gap-2`} onClick={() => trackMarketingEvent("whatsapp_clicked", window.location.pathname, "footer:contact")}>
                  <MessageCircle className="h-4 w-4 shrink-0" /> {f.whatsapp}
                </a>
              </li>
              <li>
                <a href="mailto:support@meettomanage.cloud" className={`${LINK} inline-flex items-center gap-2`}>
                  <Mail className="h-4 w-4 shrink-0" /> <span>support@<wbr />meettomanage.cloud</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-[#EFE3D7]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-[#6B6560]">{f.rights(new Date().getFullYear())}</p>
          <p className="flex items-center gap-2 text-xs font-medium text-[#6B6560]">
            {lang === "ar" ? "إحدى منتجات" : "A product of"}
            <img loading="lazy" src="/infinity-uniquers-logo.png" alt="Infinity Uniquers" width={351} height={150} className="h-7 w-auto object-contain" />
            <span className="font-bold text-[#1C1917]">Infinity Uniquers</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
