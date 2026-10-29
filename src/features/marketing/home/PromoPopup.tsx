import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, Gift, MessageSquare, Play, Users, Video, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SEEN_KEY = "m2m.promo.seen";
const DELAY_MS = 14000;

/** What the popup says. Keep the offer wording to what the business can honour today: it is a free demo class, not a trial,
 *  because the plans carry no trial period. Change `badge`, `cta` and `note` here if a trial is added later. */
const T = {
  en: {
    badge: "Free demo class",
    headline: ["Run your academy", "smarter."],
    sub: "Live classes, admissions, fees and parent updates, all in one place.",
    items: ["Live Classes", "Admissions", "Fees & Payments", "Parent Updates"],
    cta: "Book my free demo",
    watch: "Watch the full tour",
    note: "No payment details needed.",
    close: "Close",
    label: "Offer: book a free demo class",
  },
  ar: {
    badge: "حصة تجريبية مجانية",
    headline: ["أدِر أكاديميتك", "بذكاء."],
    sub: "حصص مباشرة وقبول ورسوم وتحديثات لأولياء الأمور، كلها في مكان واحد.",
    items: ["الحصص المباشرة", "القبول", "الرسوم والمدفوعات", "تحديثات أولياء الأمور"],
    cta: "احجز عرضي المجاني",
    watch: "شاهد الجولة الكاملة",
    note: "لا حاجة لبيانات الدفع.",
    close: "إغلاق",
    label: "عرض: احجز حصة تجريبية مجانية",
  },
};

const TILES = [
  { icon: Video, bg: "from-[#FFF3EA] to-[#FFDFC8]", fg: "#C2410C" },
  { icon: Users, bg: "from-[#FFF3EA] to-[#FFDFC8]", fg: "#C2410C" },
  { icon: CreditCard, bg: "from-[#FFF3EA] to-[#FFDFC8]", fg: "#C2410C" },
  { icon: MessageSquare, bg: "from-[#FFF3EA] to-[#FFDFC8]", fg: "#C2410C" },
];

function seen(): boolean {
  try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage unavailable: the popup may show once more */ }
}

/** A single promotional popup on the home page: once per visit, after a pause, and never over an open chat. It closes with the
 *  close button, Escape or a click outside, returns focus to where the visitor was, and locks page scroll while open. */
export function PromoPopup({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    if (seen()) return;
    const id = window.setTimeout(() => {
      if (document.querySelector('[role="dialog"]')) return; // don't talk over the chat
      returnTo.current = document.activeElement;
      markSeen();
      setOpen(true);
    }, DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  function close() {
    setOpen(false);
    (returnTo.current as HTMLElement | null)?.focus?.();
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = document.querySelectorAll<HTMLElement>("#promo-dialog a, #promo-dialog button");
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div aria-hidden="true" className="absolute inset-0 bg-[#1C1917]/55 backdrop-blur-sm motion-safe:animate-fade-in" />
      <div
        id="promo-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t.label}
        className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-[860px] overflow-y-auto rounded-[28px] bg-gradient-to-r from-white from-55% to-[#FFF1E6] shadow-[0_40px_100px_-30px_rgba(28,25,23,0.6)] motion-safe:animate-pop-in md:grid-cols-[1.15fr_1fr]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label={t.close}
          className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-[#44403C] transition-colors hover:bg-[#F5F0EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C2410C]"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-7 sm:p-9">
          <img src="/logo-full.webp" alt="Meet to Manage" width={420} height={150} className="h-12 w-auto object-contain mix-blend-multiply" />
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FFE9D8] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#C2410C] rtl:tracking-normal">
            <Gift className="h-4 w-4" /> {t.badge}
          </p>
          <h2 className="font-display mt-4 text-[clamp(1.9rem,4vw,2.7rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#1C1917] rtl:tracking-normal">
            {t.headline[0]} <span className="text-[#C2410C]">{t.headline[1]}</span>
          </h2>
          <p className="mt-3 max-w-[34ch] text-base leading-relaxed text-[#57534E]">{t.sub}</p>

          <ul className="mt-6 grid grid-cols-4 gap-2">
            {TILES.map((tile, i) => {
              const Icon = tile.icon;
              return (
                <li key={t.items[i]} className="flex flex-col items-center gap-2 text-center">
                  <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b shadow-[0_6px_14px_-8px_rgba(28,25,23,0.45)] ring-1 ring-white", tile.bg)} style={{ color: tile.fg }}><Icon className="h-6 w-6" /></span>
                  <span className="text-[12px] font-semibold leading-tight text-[#1C1917]">{t.items[i]}</span>
                </li>
              );
            })}
          </ul>

          <Link
            to="/get-started"
            onClick={close}
            className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#C2410C] text-base font-bold text-white shadow-[0_16px_30px_-14px_rgba(194,65,12,0.8)] transition-colors hover:bg-[#9A3412] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
          >
            {t.cta} <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
          </Link>
          <p className="mt-2 text-center text-xs font-medium text-[#6B6560]">{t.note}</p>
          <a
            href="#walkthrough"
            onClick={close}
            className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold text-[#C2410C] hover:bg-[#FFF3EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C2410C]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#C2410C]"><Play className="h-3 w-3 translate-x-px" fill="currentColor" /></span> {t.watch}
          </a>
        </div>

        <div aria-hidden="true" className="relative hidden min-h-[460px] items-center justify-center overflow-hidden md:flex">
          <div className="absolute bottom-6 start-1/2 h-24 w-64 -translate-x-1/2 rounded-[50%] bg-[#FFD9BD]/70 blur-xl" />
          <div className="absolute end-[-30px] top-6 h-56 w-56 rounded-full bg-[#FFE3CF]/80 blur-2xl" />
          <img src="/product/mito-robot.webp" alt="" width={483} height={700} decoding="async" className="mx-float relative h-[420px] w-auto select-none object-contain drop-shadow-[0_24px_30px_rgba(194,65,12,0.25)]" />
          {/* floating feature chips, in the page's language */}
          {[
            { i: 0, cls: "start-3 top-10 -rotate-3" },
            { i: 1, cls: "end-2 top-24 rotate-2" },
            { i: 2, cls: "end-4 bottom-28 -rotate-2" },
            { i: 3, cls: "start-2 bottom-14 rotate-2" },
          ].map(({ i, cls }) => {
            const Icon = TILES[i].icon;
            return (
              <span key={i} className={cn("absolute flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[#1C1917] shadow-[0_12px_24px_-12px_rgba(28,25,23,0.4)]", cls)}>
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-b", TILES[i].bg)} style={{ color: TILES[i].fg }}><Icon className="h-4 w-4" /></span>
                {t.items[i]}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
