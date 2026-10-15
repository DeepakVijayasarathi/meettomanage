import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  HeartHandshake,
  Layers,
  Loader2,
  Lock,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  PenTool,
  Phone,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Video,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";
import { useLang, type Lang } from "@/lib/i18n";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import { useInView } from "@/hooks/useInView";
import { askSalesAssistant, type SalesChatTurn } from "@/api/marketing";
import { apiEnabled } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ACCENT_GRADIENT,
  ARROW_LINK,
  CTA_DARK,
  CTA_GHOST,
  CTA_ORANGE,
  DARK_BAND_BG,
  EYEBROW,
  FAQ_BG,
  GRADIENT_TEXT,
  H2,
  HERO_BG,
  LEAD,
  READY_BG,
  ROUND_ARROW,
} from "./styles";

/** Cycles one word in place on a timer — used in a couple of hero spots so the same line of
 *  copy speaks to both the institute and personal-coach audiences instead of a second badge
 *  competing with the primary one. `colors` maps a specific word to its own text color (e.g.
 *  "clients" in green) — words with no entry inherit the surrounding text color. A true
 *  crossfade (fade + slide the outgoing word down and out, then the incoming word up and in)
 *  rather than a plain cut, via a two-phase transition instead of a one-shot keyframe. Skips
 *  the timer under prefers-reduced-motion; the word just holds on the first entry, static.
 *  Vertical-only transform, so it needs no RTL mirroring. */
function CyclingWord({ words, colors }: { words: readonly string[]; colors?: Record<string, string> }) {
  const [index, setIndex] = useState(0);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let exitTimeout: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setEntering(false);
      exitTimeout = setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setEntering(true);
      }, 300);
    }, 2600);
    return () => {
      clearInterval(id);
      clearTimeout(exitTimeout);
    };
  }, [words.length]);

  const word = words[index];
  return (
    <span
      className={cn(
        "inline-block transition-all duration-300 ease-out",
        entering ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0",
        colors?.[word]
      )}
    >
      {word}
    </span>
  );
}

/** Fades and slides an element up once it scrolls into view — plays once, not on every pass. */
function Reveal({ children, delayMs = 0, className }: { children: React.ReactNode; delayMs?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className
      )}
      style={{ transitionDelay: inView ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/** Autoplaying hero reel — muted by default since browsers block unmuted autoplay outright,
    with a tap-to-unmute control since the video has real narration a visitor may want to hear. */
function HeroReel() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlay() {
    setPlaying(true);
    videoRef.current?.play();
  }

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-[20px] bg-[#12151C] shadow-pop ring-4 ring-white">
      <video
        ref={videoRef}
        src="/videos/reels.mp4"
        poster="/videos/reels-poster.jpg"
        className="h-full w-full object-cover"
        controls={playing}
        loop
        playsInline
        preload="none"
      />
      {!playing && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Play video"
          className="group absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/25"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#EA580C] shadow-pop transition-transform group-hover:scale-105">
            <Play className="h-6 w-6 translate-x-0.5 rtl:-translate-x-0.5 rtl:-scale-x-100" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}

/** Landscape product-explainer video (click-to-play, same pattern as HeroReel) — a real
    screen-recorded walkthrough plus text-card callouts, not a talking-head piece, so it's a
    16:9 aspect-video rather than the hero's 9:16 card. */
function ExplainerVideo() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlay() {
    setPlaying(true);
    videoRef.current?.play();
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-[20px] bg-[#12151C]">
      <video
        ref={videoRef}
        src="/videos/demovedio.mp4"
        poster="/videos/demovedio-poster.jpg"
        className="h-full w-full object-cover"
        controls={playing}
        loop
        playsInline
        preload="none"
      />
      {!playing && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Play video"
          className="group absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/25"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#EA580C] shadow-pop transition-transform group-hover:scale-105">
            <Play className="h-6 w-6 translate-x-0.5 rtl:-translate-x-0.5 rtl:-scale-x-100" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}

const CHAT_T = {
  en: {
    heading: "Meet to Manage assistant",
    sub: "Ask about features, pricing or a demo",
    closeAria: "Close chat",
    greeting:
      "Hi! I can answer questions about running your academy on Meet to Manage — features, pricing, or how a demo works. What would you like to know?",
    suggestions: ["How much does it cost?", "What's included?", "Can I see a demo?"],
    placeholder: "Type your question…",
    sendAria: "Send",
    thinking: "Typing…",
    offline: "The assistant isn't available here right now — message us on WhatsApp or email and the team will answer directly.",
    teaser: "Questions about pricing or features? Ask me.",
    teaserDismissAria: "Dismiss",
    whatsapp: "WhatsApp",
    email: "Email",
    demo: "Request a demo",
    disclaimer: "AI answers can be wrong — the team confirms details on your demo.",
    toggleAria: (open: boolean) => (open ? "Close chat" : "Chat with us"),
  },
  ar: {
    heading: "مساعد Meet to Manage",
    sub: "اسأل عن الميزات أو الأسعار أو العرض التوضيحي",
    closeAria: "إغلاق الدردشة",
    greeting:
      "مرحبًا! يمكنني الإجابة عن أسئلتك حول إدارة أكاديميتك على Meet to Manage — الميزات أو الأسعار أو كيفية العرض التوضيحي. بماذا يمكنني مساعدتك؟",
    suggestions: ["كم التكلفة؟", "ما الذي تتضمنه المنصة؟", "هل يمكنني مشاهدة عرض توضيحي؟"],
    placeholder: "اكتب سؤالك…",
    sendAria: "إرسال",
    thinking: "يكتب…",
    offline: "المساعد غير متاح هنا حاليًا — راسلنا على واتساب أو البريد الإلكتروني وسيجيبك الفريق مباشرة.",
    teaser: "لديك أسئلة عن الأسعار أو الميزات؟ اسألني.",
    teaserDismissAria: "إغلاق",
    whatsapp: "واتساب",
    email: "البريد",
    demo: "اطلب عرضًا توضيحيًا",
    disclaimer: "قد تخطئ إجابات الذكاء الاصطناعي — يؤكد الفريق التفاصيل خلال العرض التوضيحي.",
    toggleAria: (open: boolean) => (open ? "إغلاق الدردشة" : "تحدث معنا"),
  },
};

/** Session key so the "ask me" teaser nudges a visitor at most once per browser session. */
const CHAT_TEASER_SEEN_KEY = "trn.chatTeaser.seen";

/** Renders an assistant reply as plain text with its URLs made clickable — React elements
 *  only, never injected HTML, since the text comes from a model. */
function ChatText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part.replace(/[.,]+$/, "")} target="_blank" rel="noopener noreferrer" className="break-words font-semibold text-[#C2410C] underline underline-offset-2">
            {part.replace(/^https?:\/\/(www\.)?/, "").replace(/[.,]+$/, "")}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** Floating chat on the homepage: answers a prospective academy's questions through the
    backend's Gemini assistant (POST /api/marketing/chat — the API key never reaches the
    browser) and keeps WhatsApp/email/Request a Demo one tap away underneath. The greeting is
    local and never sent, so the conversation the model sees always opens with the visitor.
    Separate from the FAQ-matching "Ask a Doubt" bot inside the logged-in portals
    (DoubtChatbot.tsx). */
function ChatWidget({ lang, onOpen }: { lang: Lang; onOpen?: () => void }) {
  const t = CHAT_T[lang];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SalesChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // One gentle nudge per session, a few seconds in, unless the visitor already opened the chat.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHAT_TEASER_SEEN_KEY) === "1") return;
    } catch {
      /* no storage — still show it once for this page view */
    }
    const id = setTimeout(() => setTeaser(true), 8000);
    return () => clearTimeout(id);
  }, []);

  function dismissTeaser() {
    setTeaser(false);
    try {
      sessionStorage.setItem(CHAT_TEASER_SEEN_KEY, "1");
    } catch {
      /* nothing to persist to */
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function toggle() {
    dismissTeaser();
    if (!open) onOpen?.();
    setOpen((o) => !o);
  }

  async function send(text: string) {
    const question = text.trim().slice(0, 1000);
    if (!question || pending) return;
    const next: SalesChatTurn[] = [...messages, { role: "user", text: question }];
    setMessages(next);
    setDraft("");

    if (!apiEnabled()) {
      setMessages([...next, { role: "assistant", text: t.offline }]);
      return;
    }

    setPending(true);
    try {
      const reply = await askSalesAssistant(next);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      // The API's own error text is generic and English-only; the chat's offline line is
      // localized and points at the contact links right below it.
      setMessages((m) => [...m, { role: "assistant", text: t.offline, failed: true }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6 rtl:right-auto rtl:left-5 rtl:items-start sm:rtl:left-6">
      {open && (
        <div
          role="dialog"
          aria-label={t.heading}
          className="flex h-[min(560px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col border border-[#D9E1F0] bg-white shadow-pop"
        >
          <div className="flex items-center gap-3 bg-[#0D1024] px-4 py-3.5 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
              <img src="/logo-icon.png" alt="" className="h-6 w-6 object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{t.heading}</p>
              <p className="truncate text-xs text-white/60">{t.sub}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={t.closeAria} className="p-1.5 text-white/60 transition-colors hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#F8F9FB] px-4 py-4">
            <div className="max-w-[85%] self-start whitespace-pre-line border border-[#D9E1F0] bg-white px-3.5 py-2.5 text-sm leading-relaxed text-[#111]">
              {t.greeting}
            </div>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {t.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-[10px] border border-[#F97316]/40 bg-white px-3 py-2 text-xs font-semibold text-[#C2410C] transition-colors hover:bg-[#FFF3EA]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="max-w-[85%] self-end whitespace-pre-line bg-[#0D1024] px-3.5 py-2.5 text-sm leading-relaxed text-white">
                  {m.text}
                </div>
              ) : (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] self-start whitespace-pre-line border bg-white px-3.5 py-2.5 text-sm leading-relaxed",
                    m.failed ? "border-[#F97316]/40 text-[#5B6472]" : "border-[#D9E1F0] text-[#111]"
                  )}
                >
                  <ChatText text={m.text} />
                </div>
              )
            )}
            {pending && (
              <div className="flex items-center gap-2 self-start text-xs font-semibold text-[#5B6472]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EA580C]" /> {t.thinking}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-center gap-2 border-t border-[#D9E1F0] p-3"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              className="h-11 min-w-0 flex-1 border border-[#D9E1F0] px-3 text-sm text-[#111] outline-none placeholder:text-[#6B7280] focus:border-[#F97316]"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              aria-label={t.sendAria}
              className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#F97316] text-[#171B22] transition-colors hover:bg-[#FB8B3C] disabled:opacity-50"
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#D9E1F0] px-3 py-2 text-xs font-semibold">
            <a href="https://wa.me/919344773231" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 py-1 text-[#111] hover:text-[#C2410C]">
              <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" /> {t.whatsapp}
            </a>
            <a href="mailto:info@infinityuniquers.com" className="flex items-center gap-1.5 py-1 text-[#111] hover:text-[#C2410C]">
              <Mail className="h-3.5 w-3.5 text-[#EA580C]" /> {t.email}
            </a>
            <Link to="/get-started" className="ms-auto flex items-center gap-1 py-1 text-[#C2410C] hover:text-[#9A3412]">
              {t.demo} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
            </Link>
            <p className="w-full pb-0.5 text-[10px] font-medium text-[#6B7280]">{t.disclaimer}</p>
          </div>
        </div>
      )}

      {teaser && !open && (
        <div className="motion-safe:animate-slide-up relative max-w-[240px] border border-[#D9E1F0] bg-white py-3 pe-8 ps-3.5 text-sm font-semibold leading-snug text-[#111] shadow-pop">
          <button type="button" onClick={toggle} className="text-start">
            {t.teaser}
          </button>
          <button
            type="button"
            onClick={dismissTeaser}
            aria-label={t.teaserDismissAria}
            className="absolute end-1.5 top-1.5 p-1 text-[#6B7280] hover:text-[#111]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={t.toggleAria(open)}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F97316] text-[#171B22] shadow-pop transition-transform hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}

/** Session key so a visitor sees this at most once per browser session, not every page load. */
const DEMO_POPUP_SEEN_KEY = "trn.demoPopup.seen";

const DEMO_POPUP_T = {
  en: {
    dialogAria: "Book a demo",
    closeAria: "Close",
    heading: "Before you go — see it running",
    sub: "A 30-minute walkthrough for academy owners — no payment details required.",
    requestDemo: "Request a Demo",
  },
  ar: {
    dialogAria: "احجز عرضًا توضيحيًا",
    closeAria: "إغلاق",
    heading: "قبل أن تغادر — شاهدها وهي تعمل",
    sub: "جولة مدتها 30 دقيقة لأصحاب الأكاديميات — دون الحاجة لبيانات دفع.",
    requestDemo: "اطلب عرضًا توضيحيًا",
  },
};

/**
 * A one-time nudge toward requesting a platform demo. Desktop: exit-intent (mouse leaves
 * the top of the viewport, the classic signal a visitor is about to close the tab or switch
 * away). Mobile has no mouse to read exit-intent from, so it falls back to a 25s on-page
 * timer instead. Either way it fires once per session (sessionStorage, not localStorage —
 * a genuinely new visit gets one shot at this again). Never fires once the visitor has opened
 * the chat assistant: they're already engaged, and the modal was landing on top of an
 * in-progress conversation.
 */
function DemoPopup({ lang, suppressed }: { lang: Lang; suppressed: boolean }) {
  const [open, setOpen] = useState(false);
  const t = DEMO_POPUP_T[lang];

  useEffect(() => {
    if (suppressed) {
      setOpen(false);
      return;
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem(DEMO_POPUP_SEEN_KEY) === "1";
    } catch {
      /* sessionStorage unavailable (private mode, etc.) — just skip the one-time gate */
    }
    if (seen) return;

    function trigger() {
      setOpen(true);
      try {
        sessionStorage.setItem(DEMO_POPUP_SEEN_KEY, "1");
      } catch {
        /* nothing to persist to — the popup still shows for this page view either way */
      }
    }

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) trigger();
    }

    // Exit-intent only arms after a few seconds on the page — attaching it immediately
    // was firing on completely ordinary interactions right after load (clicking the nav,
    // glancing at the address bar), not genuine "about to leave" behavior.
    const armTimer = window.setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5_000);
    // Touch-only: on desktop, exit-intent above is the signal; a timer there just
    // interrupted visitors who were still reading (or chatting).
    const fallbackTimer = window.matchMedia("(hover: none)").matches ? window.setTimeout(trigger, 25_000) : undefined;
    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.clearTimeout(fallbackTimer);
    };
  }, [suppressed]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.dialogAria}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm bg-white p-7 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t.closeAria}
          className="absolute right-4 top-4 text-[#6B7280] transition-colors hover:text-[#171B22] rtl:right-auto rtl:left-4"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex h-12 w-12 items-center justify-center bg-[#0D1024] text-[#F97316]">
          <Sparkles className="h-5 w-5" />
        </span>
        <h2 className="font-display mt-4 text-xl font-extrabold tracking-tight text-[#171B22]">{t.heading}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">{t.sub}</p>
        <div className="mt-5">
          <Button asChild size="lg" className="w-full !bg-[#F97316] !text-[#171B22] hover:!bg-[#EA580C]">
            <Link to="/get-started" onClick={() => setOpen(false)}>
              {t.requestDemo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Official Product Hunt "featured" badge for this exact launch post (post_id 1238365) — a
    live SVG that shows the real, current upvote count rather than a static image, from
    Product Hunt's own "Embed" dialog for this post. The href carries PH's own badge-campaign
    tracking params, separate from a plain outbound link. */
const PRODUCT_HUNT_BADGE_HREF =
  "https://www.producthunt.com/products/meet-to-manage?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-meet-to-manage";
const PRODUCT_HUNT_BADGE_SRC = "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1238365&theme=light";

/** Session key so a visitor who dismisses the launch banner doesn't see it again for the rest
    of that browser session (same one-shot pattern as DEMO_POPUP_SEEN_KEY above). */
const LAUNCH_BANNER_DISMISSED_KEY = "trn.launchBanner.dismissed";

const LAUNCH_BANNER_T = {
  en: {
    text: "🚀 We're live on Product Hunt today!",
    badgeAlt: "Meet to Manage - One login instead of five apps for your academy | Product Hunt",
    dismissAria: "Dismiss",
  },
  ar: {
    text: "🚀 نحن مباشرون اليوم على Product Hunt!",
    badgeAlt: "Meet to Manage - تسجيل دخول واحد بدلًا من خمسة تطبيقات لأكاديميتك | Product Hunt",
    dismissAria: "إغلاق",
  },
};

/** Dismissible top announcement bar for the Product Hunt launch, carrying the official live
    badge (see PRODUCT_HUNT_BADGE_SRC above). Light background so the badge's own white canvas
    doesn't sit inside a mismatched box. Reads sessionStorage synchronously on first render (no
    flash of an already-dismissed banner); dismissal doesn't persist past the session, so a
    later visit still sees it while the launch is current. */
function LaunchBanner({ lang }: { lang: Lang }) {
  const t = LAUNCH_BANNER_T[lang];
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(LAUNCH_BANNER_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(LAUNCH_BANNER_DISMISSED_KEY, "1");
    } catch {
      /* nothing to persist to — the banner just shows again next load */
    }
  }

  return (
    <div className="relative flex flex-wrap items-center justify-center gap-3 border-b border-black/10 bg-[#FFF3EA] px-10 py-2.5 text-center">
      <p className="text-xs font-bold text-[#C2410C] sm:text-sm">{t.text}</p>
      <a href={PRODUCT_HUNT_BADGE_HREF} target="_blank" rel="noopener noreferrer">
        <img
          src={PRODUCT_HUNT_BADGE_SRC}
          alt={t.badgeAlt}
          width={250}
          height={54}
          className="h-auto w-[180px] sm:w-[220px]"
        />
      </a>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t.dismissAria}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C2410C]/50 transition-colors hover:text-[#C2410C] rtl:right-auto rtl:left-3"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Real product screenshots (captured from the actual admin portal in demo mode — seed/demo
    data, not a real customer's) — a plain framed image rather than a fake browser-chrome
    shell, since the screenshot already contains the app's own real header and nav. */
function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#D9E1F0] shadow-[0_40px_80px_-32px_rgba(13,16,36,0.35)]">
      <img src={src} alt={alt} loading="lazy" className="h-auto w-full" />
    </div>
  );
}

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Meet to Manage brand accent — alternates orange/navy, no matching design-system token yet. */
  hex: string;
  /** Customer-outcome bucket used by the Features section's filter — a stable English key
   *  regardless of language, so filter state/matching never depends on translated text; the
   *  filter buttons render their own translated label for the same key (see CATEGORY_LABEL). */
  category: "Create" | "Manage" | "Teach" | "Measure";
}

const FEATURES: Record<Lang, FeatureItem[]> = {
  en: [
    { icon: Video, hex: "#F97316", title: "Live Classroom", description: "One-click Jitsi video, screen share, chat, raise-hand and teacher controls — built for real teaching, not just meetings.", category: "Teach" },
    { icon: PenTool, hex: "#262D37", title: "Interactive Whiteboard", description: "Infinite, multi-page boards with drawing, drag & drop, tag & match and hotspot activities, synced live for every student.", category: "Create" },
    { icon: CalendarCheck2, hex: "#F97316", title: "Smart Scheduling", description: "1:1 and group classes, conflict-free academic calendars, automatic no-show handling and intelligent rescheduling.", category: "Manage" },
    { icon: HeartHandshake, hex: "#262D37", title: "Admissions CRM", description: "Demo bookings, teacher feedback, follow-ups and a conversion pipeline that turns leads into enrolled families.", category: "Manage" },
    { icon: Wallet, hex: "#F97316", title: "Billing & Payments", description: "Subscriptions, auto invoices, dual payment-gateway routing and automatic fee-suspension with instant restoration.", category: "Manage" },
    { icon: BarChart3, hex: "#262D37", title: "Analytics & Reports", description: "Engagement scores, attendance trends, teacher performance and business KPIs — all in one live dashboard.", category: "Measure" },
    { icon: Sparkles, hex: "#F97316", title: "Gamification", description: "Live quizzes, stars, badges, milestones and leaderboards that make every class something kids look forward to.", category: "Teach" },
    { icon: MessageSquare, hex: "#262D37", title: "Notifications, Built In", description: "Email, SMS and WhatsApp reminders, booking confirmations and payment alerts — nobody misses a class.", category: "Manage" },
  ],
  ar: [
    { icon: Video, hex: "#F97316", title: "الفصل الدراسي المباشر", description: "فيديو Jitsi بنقرة واحدة، ومشاركة الشاشة، والدردشة، ورفع اليد، وأدوات تحكم للمعلم — مصمم للتدريس الحقيقي، لا مجرد اجتماعات.", category: "Teach" },
    { icon: PenTool, hex: "#262D37", title: "السبورة التفاعلية", description: "سبورات لا نهائية متعددة الصفحات مع الرسم والسحب والإفلات وأنشطة المطابقة والنقاط التفاعلية، متزامنة مباشرة لكل طالب.", category: "Create" },
    { icon: CalendarCheck2, hex: "#F97316", title: "الجدولة الذكية", description: "حصص فردية وجماعية، وتقويمات دراسية بلا تعارض، ومعالجة تلقائية للغياب وإعادة جدولة ذكية.", category: "Manage" },
    { icon: HeartHandshake, hex: "#262D37", title: "نظام إدارة القبول", description: "حجوزات العروض التوضيحية، وملاحظات المعلمين، والمتابعات، وخط تحويل يحوّل العملاء المحتملين إلى عائلات مسجَّلة.", category: "Manage" },
    { icon: Wallet, hex: "#F97316", title: "الفوترة والمدفوعات", description: "اشتراكات، وفواتير تلقائية، وتوجيه عبر بوابتي دفع، وإيقاف تلقائي للرسوم مع استعادة فورية.", category: "Manage" },
    { icon: BarChart3, hex: "#262D37", title: "التحليلات والتقارير", description: "درجات التفاعل، واتجاهات الحضور، وأداء المعلمين، ومؤشرات أداء العمل — كلها في لوحة تحكم مباشرة واحدة.", category: "Measure" },
    { icon: Sparkles, hex: "#F97316", title: "التحفيز باللعب", description: "اختبارات مباشرة، ونجوم، وأوسمة، ومحطات إنجاز، ولوحات صدارة تجعل كل حصة شيئًا ينتظره الأطفال.", category: "Teach" },
    { icon: MessageSquare, hex: "#262D37", title: "إشعارات مدمجة", description: "تذكيرات عبر البريد الإلكتروني والرسائل القصيرة وواتساب، وتأكيدات الحجز، وتنبيهات الدفع — لا أحد يفوّت حصة.", category: "Manage" },
  ],
};

const CATEGORY_KEYS = ["All", "Create", "Manage", "Teach", "Measure"] as const;
type CategoryFilter = (typeof CATEGORY_KEYS)[number];
const CATEGORY_LABEL: Record<Lang, Record<CategoryFilter, string>> = {
  en: { All: "All", Create: "Create", Manage: "Manage", Teach: "Teach", Measure: "Measure" },
  ar: { All: "الكل", Create: "إنشاء", Manage: "إدارة", Teach: "تدريس", Measure: "قياس" },
};

interface PainPoint {
  icon: LucideIcon;
  label: string;
  pain: string;
  fix: string;
}

const PAIN_POINTS: Record<Lang, PainPoint[]> = {
  en: [
    { icon: Wallet, label: "Billing", pain: "Fee reminders lost in a WhatsApp thread, and a child quietly drops out of class.", fix: "Automatic invoices and dual-gateway billing — with instant fee-suspension and restoration the moment a parent pays." },
    { icon: HeartHandshake, label: "Admissions", pain: "A demo booking sits in someone's inbox until the family gives up and goes elsewhere.", fix: "An admissions pipeline that tracks every booking from first call to enrolled family." },
    { icon: BarChart3, label: "Attendance", pain: "You find out a class had three no-shows a week later — if at all.", fix: "Live attendance and engagement scores, the moment a session ends." },
    { icon: Layers, label: "Systems", pain: "Teaching happens on one app, billing on another, admissions on a third.", fix: "One login. One role-based system. Every piece already connected." },
  ],
  ar: [
    { icon: Wallet, label: "الفوترة", pain: "تضيع تذكيرات الرسوم في محادثة واتساب، وينسحب الطفل من الحصة بهدوء.", fix: "فواتير تلقائية وفوترة عبر بوابتي دفع — مع إيقاف واستعادة الوصول فور دفع ولي الأمر." },
    { icon: HeartHandshake, label: "القبول", pain: "يبقى حجز العرض التوضيحي في صندوق بريد أحدهم حتى تيأس العائلة وتذهب لمكان آخر.", fix: "خط سير للقبول يتابع كل حجز من أول اتصال حتى تسجيل العائلة." },
    { icon: BarChart3, label: "الحضور", pain: "تكتشف بعد أسبوع أن ثلاثة طلاب تغيّبوا عن الحصة — إن اكتشفت ذلك أصلًا.", fix: "حضور وتفاعل فوريان يظهران بمجرد انتهاء الحصة." },
    { icon: Layers, label: "الأنظمة", pain: "يتم التدريس على تطبيق، والفوترة على آخر، والقبول على ثالث.", fix: "تسجيل دخول واحد. نظام واحد قائم على الأدوار. كل جزء متصل بالفعل." },
  ],
};

/** The pain → fix pairs as a zig-zag tree: cards alternate either side of a central spine,
 *  and a glowing marker rides down the spine as the visitor scrolls, filling it behind
 *  itself. The spine is centered, and the alternation is plain flex justification, so the
 *  whole thing mirrors under RTL with no overrides. Below lg it collapses to a single
 *  stacked column with no spine. */
function PainTree({ items }: { items: PainPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = (window.innerHeight * 0.55 - rect.top) / rect.height;
      setProgress(Math.min(1, Math.max(0, p)));
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={ref} className="relative mx-auto mt-[clamp(48px,6vw,88px)] max-w-[1117px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[#D9E1F0] lg:block">
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: `${progress * 100}%`, background: "linear-gradient(180deg, #7C5CFC, #F53BA6 55%, #F97316)" }}
        />
        <div
          className="absolute left-1/2 flex h-[95px] w-[95px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#F97316]/10"
          style={{ top: `${progress * 100}%` }}
        >
          <span className="flex h-[67px] w-[67px] items-center justify-center rounded-full bg-[#F97316]/20">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft">
              <img src="/logo-icon.png" alt="" className="h-7 w-7 object-contain" />
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:gap-14">
        {items.map((p, i) => (
          <div key={p.pain} className={cn("flex", i % 2 === 0 ? "lg:justify-end" : "lg:justify-start")}>
            <Reveal delayMs={80} className="w-full lg:w-[43%]">
              <div className="bg-white p-8 shadow-[0_64px_104px_0_rgba(0,0,0,0.05)] sm:p-10">
                <div className="flex items-center gap-2.5">
                  <p.icon className="h-5 w-5 text-[#EA580C]" />
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#6B7280]">{p.label}</span>
                </div>
                <div className="mt-5 flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#B8BEC9]" />
                  <p className="text-base leading-snug text-[#5B6472]">{p.pain}</p>
                </div>
                <div className="mt-5 flex items-start gap-3 border-t border-[#D9E1F0] pt-5">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#EA580C]" />
                  <h3 className="font-display text-xl font-extrabold leading-snug tracking-[-0.02em] text-[#111] rtl:tracking-normal">{p.fix}</h3>
                </div>
              </div>
            </Reveal>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ClientLogo {
  name: string;
  logo: string;
}

/** Real academies already teaching on the platform — short list today, structured to grow as
    more come on board rather than a one-off, hard-to-extend layout. No invented names/counts. */
const CLIENTS: ClientLogo[] = [{ name: "The Reader Nest", logo: "/clients/thereader.png" }];

const STATS: Record<Lang, { value: string; label: string; icon: LucideIcon }[]> = {
  en: [
    { value: "8", label: "Role-based portals", icon: Layers },
    { value: "100%", label: "Real-time classroom", icon: Video },
    { value: "15-day", label: "Recording access window", icon: Clock },
    { value: "24/7", label: "Automated fee & reminder engine", icon: RefreshCw },
  ],
  ar: [
    { value: "8", label: "بوابات حسب الدور", icon: Layers },
    { value: "100%", label: "فصل دراسي فوري", icon: Video },
    { value: "15 يومًا", label: "نافذة الوصول للتسجيلات", icon: Clock },
    { value: "24/7", label: "محرك رسوم وتذكيرات آلي", icon: RefreshCw },
  ],
};

interface IntegrationItem {
  icon: LucideIcon;
  name: string;
  description: string;
}

const INTEGRATIONS: Record<Lang, IntegrationItem[]> = {
  en: [
    { icon: Video, name: "Jitsi", description: "Live video classroom" },
    { icon: CreditCard, name: "Razorpay", description: "Payment gateway" },
    { icon: Wallet, name: "Cashfree", description: "Payment gateway" },
    { icon: Mail, name: "Email", description: "Reminders & confirmations" },
    { icon: MessageSquare, name: "WhatsApp", description: "Reminders & confirmations" },
    { icon: Phone, name: "SMS", description: "Reminders & confirmations" },
  ],
  ar: [
    { icon: Video, name: "Jitsi", description: "فصل دراسي بفيديو مباشر" },
    { icon: CreditCard, name: "Razorpay", description: "بوابة دفع" },
    { icon: Wallet, name: "Cashfree", description: "بوابة دفع" },
    { icon: Mail, name: "البريد الإلكتروني", description: "تذكيرات وتأكيدات" },
    { icon: MessageSquare, name: "واتساب", description: "تذكيرات وتأكيدات" },
    { icon: Phone, name: "الرسائل القصيرة", description: "تذكيرات وتأكيدات" },
  ],
};

interface SolutionAudience {
  icon: LucideIcon;
  title: string;
  description: string;
  chips: string[];
  ctaLabel: string;
  ctaTo: string;
  /** True for a card pointing off-site to a sibling product's own site/app, rendered as a
   *  plain new-tab link instead of an in-app <Link> route. */
  external?: boolean;
}

/** Real, evidenced sub-segments of the product's actual audience — tutoring/coaching academies — not generic corporate-L&D or MOOC-creator verticals the product has no evidence of fitting. */
const SOLUTIONS: Record<Lang, SolutionAudience[]> = {
  en: [
    {
      icon: Target,
      title: "Single-subject academies",
      description: "Running one core subject — phonics, maths, coding — and need every demo, batch and fee followed up without adding admin headcount.",
      chips: ["Smart Scheduling", "Admissions CRM"],
      ctaLabel: "See the Admission Portal",
      ctaTo: "/portal-select",
    },
    {
      icon: Building2,
      title: "Multi-branch coaching institutes",
      description: "Coordinating several batches, teachers and branches, where fee collection and attendance need to be visible in one place, not five.",
      chips: ["Billing & Payments", "Analytics & Reports"],
      ctaLabel: "See the Management Dashboard",
      ctaTo: "/portal-select",
    },
    {
      icon: Users,
      title: "Independent tutors & small teaching teams",
      description: "Growing past spreadsheets and personal WhatsApp groups, without wanting to stitch together five separate tools to get there.",
      chips: ["Live Classroom", "One login, every role"],
      ctaLabel: "Explore Portals",
      ctaTo: "/portal-select",
    },
    {
      icon: Megaphone,
      title: "Influencers & personal-brand coaches",
      description: "Built an audience on social media or a personal following, and now converting that reach through a single online master class — with scheduling, billing and follow-up handled in one place instead of DMs and spreadsheets.",
      chips: ["Live Classroom", "Billing & Payments"],
      ctaLabel: "See how it works",
      ctaTo: "/get-started?for=coach",
    },
    {
      icon: Compass,
      title: "Online counselors & mentors",
      description: "Running recurring 1:1 or small-group career, life or wellness sessions, and need bookings, video calls, reminders and billing in one place instead of a calendar link, a separate payment app and a spreadsheet of clients.",
      chips: ["Booking & Billing", "Live Video Sessions"],
      ctaLabel: "Visit Meet to Mentor",
      // Sub-product, separate codebase/deploy from this one — see Docs/requirements/
      // online-counselors-mentors.md. TODO: this is a placeholder until Meet to Mentor is
      // actually deployed somewhere reachable — do not ship this link to production before
      // then, it will 404.
      ctaTo: "https://mentor.meettomanage.cloud",
      external: true,
    },
  ],
  ar: [
    {
      icon: Target,
      title: "أكاديميات المادة الواحدة",
      description: "تُدرّس مادة أساسية واحدة — الصوتيات أو الرياضيات أو البرمجة — وتحتاج متابعة كل عرض توضيحي ودفعة ورسوم دون زيادة عدد الموظفين الإداريين.",
      chips: ["الجدولة الذكية", "نظام إدارة القبول"],
      ctaLabel: "شاهد بوابة القبول",
      ctaTo: "/portal-select",
    },
    {
      icon: Building2,
      title: "معاهد التدريب متعددة الفروع",
      description: "تنسّق عدة دفعات ومعلمين وفروع، حيث يجب أن تكون تحصيل الرسوم والحضور مرئيَين في مكان واحد، لا خمسة.",
      chips: ["الفوترة والمدفوعات", "التحليلات والتقارير"],
      ctaLabel: "شاهد لوحة تحكم الإدارة",
      ctaTo: "/portal-select",
    },
    {
      icon: Users,
      title: "المعلمون المستقلون والفرق التعليمية الصغيرة",
      description: "يتجاوزون جداول البيانات ومجموعات واتساب الشخصية، دون الرغبة في تجميع خمس أدوات منفصلة للوصول لذلك.",
      chips: ["الفصل الدراسي المباشر", "تسجيل دخول واحد لكل الأدوار"],
      ctaLabel: "استكشف البوابات",
      ctaTo: "/portal-select",
    },
    {
      icon: Megaphone,
      title: "المؤثرون ومدربو العلامة الشخصية",
      description: "بنوا جمهورًا على وسائل التواصل الاجتماعي أو متابعين شخصيين، ويحوّلون الآن هذا الوصول عبر كلاس ماستر إلكتروني واحد — مع جدولة وفوترة ومتابعة في مكان واحد بدلًا من الرسائل المباشرة وجداول البيانات.",
      chips: ["الفصل الدراسي المباشر", "الفوترة والمدفوعات"],
      ctaLabel: "شاهد كيف يعمل",
      ctaTo: "/get-started?for=coach",
    },
    {
      icon: Compass,
      title: "المستشارون والموجّهون عبر الإنترنت",
      description: "يديرون جلسات فردية أو جماعية صغيرة متكررة في مجالات المسار المهني أو الحياة أو الرفاهية، ويحتاجون الحجوزات ومكالمات الفيديو والتذكيرات والفوترة في مكان واحد بدلًا من رابط تقويم، وتطبيق دفع منفصل، وجدول بيانات للعملاء.",
      chips: ["الحجز والفوترة", "جلسات فيديو مباشرة"],
      ctaLabel: "زيارة Meet to Mentor",
      ctaTo: "https://mentor.meettomanage.cloud",
      external: true,
    },
  ],
};

interface SecurityItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Every line here is a verified architectural fact (permission-gated portals, dual gateway, per-request status re-check) — no compliance badges, since none are held. */
const SECURITY_ITEMS: Record<Lang, SecurityItem[]> = {
  en: [
    { icon: ShieldCheck, title: "Role-based access, everywhere", description: "Eight distinct portals, each gated by permission — a teacher can't see billing, and a parent can't see admin tools." },
    { icon: Lock, title: "Session-based sign-in", description: "A deactivated account loses access on its very next request — not once its token happens to expire." },
    { icon: RefreshCw, title: "Automatic fee safeguards", description: "Access can suspend the moment a payment is overdue, and restore itself the instant a family pays — no manual follow-up either way." },
    { icon: CreditCard, title: "Two independent payment routes", description: "Payments route through Razorpay or Cashfree, so fee collection isn't dependent on a single gateway." },
  ],
  ar: [
    { icon: ShieldCheck, title: "وصول قائم على الأدوار، في كل مكان", description: "ثماني بوابات مستقلة، كل منها مقيّدة بالصلاحيات — لا يمكن للمعلم رؤية الفوترة، ولا يمكن لولي الأمر رؤية أدوات الإدارة." },
    { icon: Lock, title: "تسجيل دخول قائم على الجلسة", description: "يفقد الحساب المُعطَّل الوصول في طلبه التالي مباشرة — وليس فقط عند انتهاء صلاحية رمزه المميز." },
    { icon: RefreshCw, title: "ضمانات رسوم تلقائية", description: "يمكن إيقاف الوصول فور تأخر الدفع، ويُستعاد تلقائيًا فور دفع العائلة — بلا متابعة يدوية في الحالتين." },
    { icon: CreditCard, title: "مساران مستقلان للدفع", description: "تمر المدفوعات عبر Razorpay أو Cashfree، بحيث لا يعتمد تحصيل الرسوم على بوابة واحدة." },
  ],
};

const FAQS: Record<Lang, { icon: LucideIcon; q: string; a: string }[]> = {
  en: [
    { icon: Video, q: "Is this just another video-call tool?", a: "No — the live classroom is one part of it. Scheduling, admissions, billing and reporting all live in the same system, so a session connects straight to attendance, invoices and reports instead of sitting in its own app." },
    { icon: Clock, q: "How long can a family access a class recording?", a: "Recordings stay available for a 15-day window after each session, from the same portal the family already uses to check schedules and pay fees." },
    { icon: RefreshCw, q: "What happens when a fee payment is late?", a: "Invoices generate automatically and a family's access can suspend automatically when a payment is overdue — then restore instantly the moment they pay, no manual follow-up needed." },
    { icon: Lock, q: "Do teachers, parents and admins all use the same login screen?", a: "Yes. One sign-in, then each of the 8 role-based portals — admin, teacher, parent, student and more — shows only what that person needs, gated by permission, not just by role." },
    { icon: CreditCard, q: "How is a payment actually collected — and is it secure?", a: "Payments route through Razorpay or Cashfree, whichever your academy has configured, so collection isn't dependent on a single gateway going down." },
    { icon: Sparkles, q: "How do I see it before committing to anything?", a: "Book a free demo class. No payment details required — we match you with a teacher and send the join link by email." },
  ],
  ar: [
    { icon: Video, q: "هل هذه مجرد أداة اتصال مرئي أخرى؟", a: "لا — الفصل الدراسي المباشر جزء واحد فقط منها. الجدولة والقبول والفوترة والتقارير كلها تعيش في نفس النظام، بحيث ترتبط الحصة مباشرة بالحضور والفواتير والتقارير بدلًا من أن تبقى في تطبيقها الخاص." },
    { icon: Clock, q: "كم من الوقت يمكن للعائلة الوصول لتسجيل الحصة؟", a: "تبقى التسجيلات متاحة لمدة 15 يومًا بعد كل حصة، من نفس البوابة التي تستخدمها العائلة بالفعل للاطلاع على الجداول ودفع الرسوم." },
    { icon: RefreshCw, q: "ماذا يحدث عند تأخر دفع الرسوم؟", a: "تُنشأ الفواتير تلقائيًا، ويمكن إيقاف وصول العائلة تلقائيًا عند تأخر الدفع — ثم يُستعاد فورًا لحظة الدفع، دون الحاجة لمتابعة يدوية." },
    { icon: Lock, q: "هل يستخدم المعلمون وأولياء الأمور والمشرفون نفس شاشة تسجيل الدخول؟", a: "نعم. تسجيل دخول واحد، ثم تعرض كل بوابة من البوابات الثماني — المشرف والمعلم وولي الأمر والطالب وغيرهم — فقط ما يحتاجه هذا الشخص، مقيّدًا بالصلاحية لا بالدور فقط." },
    { icon: CreditCard, q: "كيف يتم تحصيل الدفعة فعليًا — وهل هي آمنة؟", a: "تمر المدفوعات عبر Razorpay أو Cashfree، أيهما أعدّته أكاديميتك، بحيث لا يعتمد التحصيل على توقف بوابة واحدة." },
    { icon: Sparkles, q: "كيف أشاهد المنتج قبل الالتزام بأي شيء؟", a: "احجز حصة تجريبية مجانية. لا حاجة لبيانات الدفع — سنطابقك مع معلّم ونرسل رابط الانضمام عبر البريد الإلكتروني." },
  ],
};

/** Anchors into this same page — kept to sections that actually exist, so the nav never promises more than the page delivers. */
const NAV_LINKS: Record<Lang, { label: string; href: string }[]> = {
  en: [
    { label: "Product", href: "#product" },
    { label: "Features", href: "#features" },
    { label: "Portals", href: "#portals" },
    { label: "Solutions", href: "#solutions" },
    { label: "Pricing", href: "/pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Blog", href: "/blog" },
  ],
  ar: [
    { label: "المنتج", href: "#product" },
    { label: "الميزات", href: "#features" },
    { label: "البوابات", href: "#portals" },
    { label: "الحلول", href: "#solutions" },
    { label: "الأسعار", href: "/pricing" },
    { label: "الأسئلة الشائعة", href: "#faq" },
    { label: "المدونة", href: "/blog" },
  ],
};

/** Product-showcase rows (3) — text + a real screenshot, alternating rhythm. Kept as one
 *  translated record rather than three separate constants so EN/AR always stay paired. */
const PRODUCT_ROWS: Record<
  Lang,
  { heading: string; body: string; bullets: string[]; screenshot: string; alt: string; mockupFirst?: boolean }[]
> = {
  en: [
    {
      heading: "Batches and attendance, without the spreadsheet",
      body: "See every batch, its teacher and how many students are enrolled — attendance updates the moment a class ends, with no manual entry after the fact.",
      bullets: [
        "Conflict-free scheduling across teachers and time slots",
        "Automatic no-show handling and rescheduling",
        "One roster per batch, visible to every role that needs it",
      ],
      screenshot: "/screenshots/batches.webp",
      alt: "Batches screen in the Meet to Manage admin portal, listing six active batches with teacher, schedule and capacity",
    },
    {
      heading: "Billing that chases itself",
      body: "Invoices generate automatically, and a family's access can pause the moment a payment is overdue — then restore instantly the second they pay. No manual follow-up either way.",
      bullets: [
        "Dual-gateway routing — Razorpay or Cashfree",
        "Instant fee-suspension and restoration",
        "One payment history per family, not per spreadsheet tab",
      ],
      screenshot: "/screenshots/billing.webp",
      alt: "Billing & Finance screen in the Meet to Manage admin portal, showing an invoice table with paid, pending and overdue statuses",
      mockupFirst: true,
    },
    {
      heading: "Know how a class went, the moment it ends",
      body: "Attendance, engagement scores and teacher performance land on one dashboard — not a week later, and not stitched together from three different exports.",
      bullets: [
        "Live attendance & engagement scoring",
        "Teacher performance at a glance",
        "Business KPIs for the whole academy, updated as classes happen",
      ],
      screenshot: "/screenshots/analytics.webp",
      alt: "Admin Dashboard screen in Meet to Manage, showing growth KPIs, a revenue trend chart and a department revenue breakdown",
    },
  ],
  ar: [
    {
      heading: "الدفعات والحضور، بدون جدول بيانات",
      body: "اطّلع على كل دفعة ومعلّمها وعدد الطلاب المسجَّلين فيها — يتحدّث الحضور فور انتهاء الحصة، دون إدخال يدوي لاحقًا.",
      bullets: [
        "جدولة بلا تعارض بين المعلمين والأوقات",
        "معالجة تلقائية للغياب وإعادة الجدولة",
        "قائمة واحدة لكل دفعة، مرئية لكل دور يحتاجها",
      ],
      screenshot: "/screenshots/batches.webp",
      alt: "شاشة الدفعات في لوحة تحكم المشرف بتطبيق Meet to Manage، تعرض ست دفعات نشطة مع المعلم والجدول والسعة",
    },
    {
      heading: "فوترة تتابع نفسها بنفسها",
      body: "تُنشأ الفواتير تلقائيًا، ويمكن إيقاف وصول العائلة فور تأخر الدفع — ثم يُستعاد فورًا لحظة الدفع. بلا متابعة يدوية في الحالتين.",
      bullets: [
        "توجيه عبر بوابتي دفع — Razorpay أو Cashfree",
        "إيقاف واستعادة فوريان للرسوم",
        "سجل دفعات واحد لكل عائلة، لا صفحة جدول بيانات منفصلة",
      ],
      screenshot: "/screenshots/billing.webp",
      alt: "شاشة الفوترة والمالية في لوحة تحكم المشرف بتطبيق Meet to Manage، تعرض جدول فواتير بحالات مدفوعة ومعلّقة ومتأخرة",
      mockupFirst: true,
    },
    {
      heading: "اعرف كيف سارت الحصة، فور انتهائها",
      body: "يصل الحضور ودرجات التفاعل وأداء المعلم إلى لوحة واحدة — ليس بعد أسبوع، وليس مجمّعًا من ثلاثة تصديرات مختلفة.",
      bullets: [
        "حضور وتفاعل فوريان",
        "أداء المعلم بنظرة واحدة",
        "مؤشرات أداء العمل لكامل الأكاديمية، محدَّثة أثناء انعقاد الحصص",
      ],
      screenshot: "/screenshots/analytics.webp",
      alt: "شاشة لوحة تحكم المشرف في Meet to Manage، تعرض مؤشرات نمو ورسمًا بيانيًا لاتجاه الإيرادات وتوزيع الإيرادات حسب القسم",
    },
  ],
};

/** Every string a visitor reads on this page, in both languages. Content arrays with their
 *  own per-item shape (FEATURES, PAIN_POINTS, STATS, INTEGRATIONS, SOLUTIONS, SECURITY_ITEMS,
 *  FAQS, NAV_LINKS, PRODUCT_ROWS) stay as their own Record<Lang, ...> above; this dictionary
 *  covers the rest — headings, one-off paragraphs, button labels. Role names/descriptions in
 *  the Portals section come from lib/roles.ts's ROLE_META, shared with the whole authenticated
 *  app (sidebar, PortalSelect, login role picker) — deliberately left English-only here rather
 *  than forking a core shared data source for one marketing section. */
const T = {
  en: {
    heroEyebrowWords: ["Learning", "Coaching"],
    heroEyebrowPrefix: "",
    heroEyebrowSuffix: "Management & Virtual Classroom Platform",
    heroWords: ["students", "clients"],
    heroWordColors: { clients: "text-[#16A34A]" },
    heroHeadingLead: "Meet your",
    heroMid: "live.",
    heroHeadingManage: "Manage",
    heroHeadingTail: "your academy end to end.",
    heroSub: (brand: string) =>
      `${brand} brings live teaching, scheduling, admissions, billing and reporting into a single, role-based system — so every meeting turns into progress everyone can track.`,
    requestDemo: "Request a Demo",
    explorePortals: "Explore Portals",
    heroTrust: ["No payment details to book a demo", "One login — 8 role-based portals", "Free demo class before you commit"],
    signIn: "Sign In",
    demoShort: "Demo",
    clientsHeading: (brand: string) => `Academies already teaching on ${brand}`,
    statsHeading: "What's already built in",
    watchEyebrow: "Watch",
    watchHeading: "See it replace five apps with one",
    watchSub: (brand: string) => `A quick walkthrough of scheduling, portals and reporting inside ${brand}.`,
    painEyebrow: (brand: string) => `The old way vs. ${brand}`,
    painHeading: "You didn't start an academy to manage five different apps.",
    painSub: (brand: string) => `${brand} replaces the spreadsheet, the WhatsApp group and the sticky notes — one system, already talking to itself.`,
    productEyebrow: "Product",
    productHeading: "Everything you need to run learning, in one place",
    productSub: (brand: string) => `A closer look at how ${brand} presents batches, billing and performance — the same building blocks every portal uses.`,
    productCaption: "Real screens from the Meet to Manage admin portal, shown with seed/demo data — not a real customer's.",
    platformEyebrow: "Platform",
    featuresHeading: "Everything a growing academy needs to meet, teach and manage",
    featuresSub: (brand: string) => `From the first demo class to monthly billing, ${brand} covers the entire journey — for admins, teachers, parents and students alike.`,
    portalsBadge: "One login, every role",
    portalsHeading: "A dedicated portal for every person in your academy",
    portalsSub: "Eight role-based portals, each showing exactly what that person needs — nothing more, nothing less.",
    explore: "Explore",
    solutionsEyebrow: "Who it's for",
    solutionsHeading: "Built for how tutoring and coaching academies actually run",
    solutionsSub: "Whether you teach one subject out of a single classroom or coordinate several branches and teachers, the same system scales with you.",
    securityEyebrow: "Security & integrations",
    securityHeading: "Real access control, built in from day one",
    securitySub: "Every portal only shows what that role is allowed to see — and live video, payments and reminders already run through the same system, not a marketplace of add-ons.",
    securityNote: "We don't yet publish formal compliance certifications — happy to walk through our specific security setup on a call.",
    faqEyebrow: "FAQ",
    faqHeading: "Questions academies ask before switching",
    ctaHeading: "Your next class, your next invoice, your next admission — one login away.",
    ctaSub: (brand: string) => `See ${brand} running an academy before you decide anything — no payment details required.`,
    alreadyHaveAccount: "Already have an account? Sign in",
    readyHeadingLead: "Ready to run your academy from",
    readyHeadingAccent: "one login?",
    readyDemoTitle: "See it running an academy",
    readyPortalsTitle: "Walk through all 8 portals",
    readyTalkTitle: "Talk to our team",
    previous: "Previous",
    next: "Next",
    footerTagline: "Live teaching, scheduling, admissions and billing — one role-based system for your whole academy.",
    contact: "Contact",
    whatsappUs: "WhatsApp us",
    platform: "Platform",
    getStarted: "Get started",
    resources: "Resources",
    blog: "Blog",
    privacyPolicy: "Privacy Policy",
    rights: (year: number, brand: string) => `© ${year} ${brand}. All rights reserved.`,
    homeAria: "Meet to Manage home",
  },
  ar: {
    heroEyebrowWords: ["التعلّم", "التدريب"],
    heroEyebrowPrefix: "منصة إدارة",
    heroEyebrowSuffix: "والفصول الدراسية الافتراضية",
    heroWords: ["طلابك", "عملاءك"],
    heroWordColors: { "عملاءك": "text-[#16A34A]" },
    heroHeadingLead: "تواصل مع",
    heroMid: "",
    heroHeadingManage: "وأدِر",
    heroHeadingTail: "أكاديميتك من الألف إلى الياء.",
    heroSub: (brand: string) =>
      `توفّر ${brand} التدريس المباشر والجدولة والقبول والفوترة والتقارير في نظام واحد قائم على الأدوار — بحيث تتحوّل كل جلسة إلى تقدّم يمكن للجميع متابعته.`,
    requestDemo: "اطلب عرضًا توضيحيًا",
    explorePortals: "استكشف البوابات",
    heroTrust: ["لا حاجة لبيانات الدفع لحجز عرض توضيحي", "تسجيل دخول واحد — 8 بوابات حسب الدور", "حصة تجريبية مجانية قبل الالتزام"],
    signIn: "تسجيل الدخول",
    demoShort: "عرض",
    clientsHeading: (brand: string) => `أكاديميات تُدرّس بالفعل على ${brand}`,
    statsHeading: "ما هو مدمج بالفعل",
    watchEyebrow: "شاهد",
    watchHeading: "شاهد كيف يستبدل خمسة تطبيقات بواحد",
    watchSub: (brand: string) => `جولة سريعة على الجدولة والبوابات والتقارير داخل ${brand}.`,
    painEyebrow: (brand: string) => `الطريقة القديمة مقابل ${brand}`,
    painHeading: "لم تبدأ أكاديميتك لتُدير خمسة تطبيقات مختلفة.",
    painSub: (brand: string) => `تحلّ ${brand} محل جدول البيانات ومجموعة واتساب والملاحظات اللاصقة — نظام واحد يتواصل مع نفسه بالفعل.`,
    productEyebrow: "المنتج",
    productHeading: "كل ما تحتاجه لإدارة التعلّم، في مكان واحد",
    productSub: (brand: string) => `نظرة أقرب على كيفية عرض ${brand} للدفعات والفوترة والأداء — نفس اللبنات التي تستخدمها كل بوابة.`,
    productCaption: "شاشات حقيقية من بوابة المشرف في Meet to Manage، معروضة ببيانات تجريبية أولية — وليست بيانات عميل حقيقي.",
    platformEyebrow: "المنصة",
    featuresHeading: "كل ما تحتاجه أكاديمية نامية للتواصل والتدريس والإدارة",
    featuresSub: (brand: string) => `من أول حصة تجريبية إلى الفوترة الشهرية، تغطي ${brand} الرحلة بأكملها — للمشرفين والمعلمين وأولياء الأمور والطلاب على حد سواء.`,
    portalsBadge: "تسجيل دخول واحد، لكل الأدوار",
    portalsHeading: "بوابة مخصصة لكل شخص في أكاديميتك",
    portalsSub: "ثماني بوابات حسب الدور، تعرض لكل شخص بالضبط ما يحتاجه — لا أكثر ولا أقل.",
    explore: "استكشف",
    solutionsEyebrow: "لمن هذا المنتج",
    solutionsHeading: "مصمم بحسب الطريقة الفعلية لعمل أكاديميات التدريس والتدريب",
    solutionsSub: "سواء كنت تُدرّس مادة واحدة من فصل واحد أو تنسّق بين عدة فروع ومعلمين، فإن النظام نفسه ينمو معك.",
    securityEyebrow: "الأمان والتكاملات",
    securityHeading: "تحكم فعلي في الوصول، مدمج منذ اليوم الأول",
    securitySub: "تعرض كل بوابة فقط ما يُسمح لهذا الدور برؤيته — والفيديو المباشر والمدفوعات والتذكيرات تعمل بالفعل عبر النظام نفسه، وليست سوقًا من الإضافات.",
    securityNote: "لم ننشر بعد شهادات امتثال رسمية — يسعدنا أن نشرح إعدادات الأمان الخاصة بنا في مكالمة.",
    faqEyebrow: "الأسئلة الشائعة",
    faqHeading: "أسئلة تطرحها الأكاديميات قبل التحويل",
    ctaHeading: "حصتك القادمة، وفاتورتك القادمة، وقبولك القادم — على بُعد تسجيل دخول واحد.",
    ctaSub: (brand: string) => `شاهد ${brand} وهي تُدير أكاديمية قبل أن تقرر أي شيء — دون الحاجة لبيانات دفع.`,
    alreadyHaveAccount: "لديك حساب بالفعل؟ سجّل الدخول",
    readyHeadingLead: "هل أنت مستعد لإدارة أكاديميتك من",
    readyHeadingAccent: "تسجيل دخول واحد؟",
    readyDemoTitle: "شاهدها وهي تُدير أكاديمية",
    readyPortalsTitle: "تجوّل في البوابات الثماني",
    readyTalkTitle: "تحدّث مع فريقنا",
    previous: "السابق",
    next: "التالي",
    footerTagline: "تدريس مباشر، وجدولة، وقبول، وفوترة — نظام واحد قائم على الأدوار لأكاديميتك بأكملها.",
    contact: "التواصل",
    whatsappUs: "راسلنا على واتساب",
    platform: "المنصة",
    getStarted: "ابدأ الآن",
    resources: "الموارد",
    blog: "المدونة",
    privacyPolicy: "سياسة الخصوصية",
    rights: (year: number, brand: string) => `© ${year} ${brand}. جميع الحقوق محفوظة.`,
    homeAria: "الصفحة الرئيسية لـ Meet to Manage",
  },
};

export default function MarketingHome() {
  useLightBrandScope();
  const brand = useBrand();
  const [lang] = useLang();
  const t = T[lang];
  const [chatEngaged, setChatEngaged] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");

  const features = FEATURES[lang];
  const visibleFeatures = activeCategory === "All" ? features : features.filter((f) => f.category === activeCategory);

  const featureTrackRef = useRef<HTMLDivElement>(null);
  /** Pages the feature carousel by roughly one viewport of cards. Under RTL the scroll axis
   *  runs the other way, so "next" has to scroll negatively to keep moving forward. */
  function scrollFeatures(direction: 1 | -1) {
    const track = featureTrackRef.current;
    if (!track) return;
    const rtl = getComputedStyle(track).direction === "rtl";
    track.scrollBy({ left: direction * (rtl ? -1 : 1) * track.clientWidth * 0.8, behavior: "smooth" });
  }

  const solutions = SOLUTIONS[lang];
  const [solutionIndex, setSolutionIndex] = useState(0);
  const solution = solutions[solutionIndex];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="home"
        title="Meet to Manage — LMS & Virtual Classroom"
        description="Meet to Manage brings live teaching, scheduling, admissions, billing and reporting into one role-based platform for schools and academies."
        path="/"
      />
      <LaunchBanner lang={lang} />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <img src="/logo-full.png" alt={brand.name} className="h-14 w-auto shrink-0 object-contain mix-blend-multiply sm:h-20" />

          {/* Section anchors — desktop only, and gated on xl (1280px) rather than Tailwind's
              usual lg (1024px): at 1024 the logo + all 7 links + language toggle + Sign In +
              Request a Demo no longer fit max-w-6xl's content width, and the CTA — the whole
              point of the header — got clipped off the right edge with the page forced into
              horizontal scroll (verified on a real 1024x768 viewport, iPad-landscape's exact
              width). Below xl there's only room for the two CTAs (see the mobile-header wrap
              this replaced), so wayfinding there stays limited to scrolling; that's an
              acceptable trade for never cramping the primary action. */}
          <nav aria-label="Page sections" className="hidden items-center gap-6 xl:flex">
            {NAV_LINKS[lang].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-[#5B6472] transition-colors hover:text-[#171B22]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Sign In stays available for returning users, but a fresh visitor's highest-value
              next step is requesting a demo — that CTA now carries the primary (filled) weight
              here and in the hero, matching how the rest of the page's CTAs are prioritized. */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            <Button asChild variant="outline" className="border-[#171B22]/15 px-2.5 text-[#171B22] hover:bg-[#171B22]/5 sm:px-4">
              <Link to="/login">{t.signIn}</Link>
            </Button>
            <Button asChild className="!bg-[#F97316] px-3 !text-[#171B22] hover:!bg-[#EA580C] sm:px-4">
              <Link to="/get-started">
                <span className="sm:hidden">{t.demoShort}</span>
                <span className="hidden sm:inline">{t.requestDemo}</span>
                <ArrowRight className="hidden h-4 w-4 sm:inline rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex justify-center border-t border-black/5 py-1.5 sm:hidden">
          <LanguageToggle />
        </div>
      </header>

      {/* Hero — dark, centered and oversized. The bottom padding is deliberately huge: the
          walkthrough video in the next section pulls itself up into it with a matching
          negative margin, so the frame straddles the dark/white seam. Both values are the same
          clamp() family, so the overlap holds at every width. */}
      <section className="relative overflow-hidden text-white" style={{ background: HERO_BG }}>
        <div className="relative mx-auto max-w-[1280px] px-5 pb-[clamp(160px,25vw,350px)] pt-[clamp(56px,8vw,112px)] text-center">
          <div className="motion-safe:animate-slide-up inline-flex items-center gap-1.5 rounded-[10px] bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-[#F97316]" />
            <span>
              {t.heroEyebrowPrefix} <CyclingWord words={t.heroEyebrowWords} /> {t.heroEyebrowSuffix}
            </span>
          </div>
          <h1
            className="motion-safe:animate-slide-up font-display mx-auto mt-6 max-w-[15ch] text-[clamp(2.5rem,5.3vw,5rem)] font-extrabold leading-[1.08] tracking-[-0.03em] rtl:tracking-normal"
            style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
          >
            {t.heroHeadingLead} <CyclingWord words={t.heroWords} colors={t.heroWordColors} /> {t.heroMid}{" "}
            <span className={GRADIENT_TEXT}>{t.heroHeadingManage}</span> {t.heroHeadingTail}
          </h1>
          <p
            className="motion-safe:animate-slide-up mx-auto mt-5 max-w-2xl text-[clamp(1rem,1.6vw,1.25rem)] leading-relaxed text-white/75"
            style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
          >
            {t.heroSub(brand.name)}
          </p>
          <div
            className="motion-safe:animate-slide-up mx-auto mt-9 flex max-w-xs flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center"
            style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
          >
            <Link to="/get-started" className={CTA_ORANGE}>
              {t.requestDemo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
            <Link to="/portal-select" className={CTA_GHOST}>
              {t.explorePortals}
            </Link>
          </div>

          {/* Real, verifiable trust indicators only — every phrase here restates language
              already used on the dedicated /demo and /get-started flows, not a generic
              "no credit card" line this product's signup doesn't actually have. */}
          <div
            className="motion-safe:animate-slide-up mt-7 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6"
            style={{ animationDelay: "280ms", animationFillMode: "backwards" }}
          >
            {t.heroTrust.map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#F97316]" /> {item}
              </span>
            ))}
          </div>

          {/* Suggestion pills — the page's own FAQ questions, not invented prompts: each one
              jumps to that answer and opens it, so the pill always delivers what it asks. */}
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {FAQS[lang].slice(0, 4).map((item, i) => (
              <a
                key={item.q}
                href={`#faq-${i}`}
                onClick={() => setOpenFaq(i)}
                className="rounded-[10px] bg-white/[0.08] px-4 py-3 text-xs text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
              >
                {item.q}
              </a>
            ))}
          </div>

          <h2 className="font-display mx-auto mt-[clamp(40px,5vw,80px)] max-w-3xl text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-tight tracking-[-0.02em] text-[#FDFDFD] rtl:tracking-normal">
            {t.watchHeading}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">{t.watchSub(brand.name)}</p>
        </div>
      </section>

      {/* Watch — a real screen-recorded walkthrough (landscape, product footage), lifted into
          the hero above it. No background on this section: the negative margin collapses
          through to the section itself, so an opaque one would paint over the hero's bottom
          edge and hide the very overlap it exists for. */}
      <section className="relative">
        <div className="mx-auto max-w-[1100px] px-5">
          <div
            className="relative z-10 -mt-[clamp(100px,22vw,300px)] rounded-[22px] p-[2px] shadow-[0_40px_90px_-30px_rgba(13,16,36,0.55)]"
            style={{ background: ACCENT_GRADIENT }}
          >
            <ExplainerVideo />
          </div>
        </div>
      </section>

      {/* Built-in facts + clients — no fabricated customer counts exist for this product
          beyond the real clients listed, so this states verifiable platform facts rather than
          an invented "Trusted by 1,000+ academies" claim. The portrait reel that used to be
          the hero visual lives here now, beside the numbers it illustrates. */}
      <section className="bg-white py-[clamp(72px,8vw,120px)]">
        <div className="mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-14 px-5 lg:grid-cols-[1fr_300px] lg:gap-20">
          <div>
            <Reveal>
              <h2 className={cn(H2, "text-start")}>{t.statsHeading}</h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 border-s border-t border-[#D9E1F0]">
              {STATS[lang].map((s, i) => (
                <Reveal key={s.label} delayMs={i * 80} className="border-b border-e border-[#D9E1F0] p-6 sm:p-8">
                  <s.icon className="h-5 w-5 text-[#EA580C]" />
                  <p className="font-display mt-4 text-[clamp(2rem,3.4vw,3rem)] font-extrabold leading-none tracking-[-0.03em] text-[#111] rtl:tracking-normal">
                    {s.value}
                  </p>
                  <p className="mt-2 text-sm leading-snug text-[#5B6472]">{s.label}</p>
                </Reveal>
              ))}
            </div>

            {/* Grows as more academies come on board; each logo is circle-cropped onto a white
                background for a consistent look regardless of the source file's own canvas. */}
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6B7280]">{t.clientsHeading(brand.name)}</p>
              {CLIENTS.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <img
                    src={c.logo}
                    alt={`${c.name} logo`}
                    loading="lazy"
                    className="h-12 w-12 rounded-full bg-white object-cover ring-1 ring-black/10"
                  />
                  <span className="text-sm font-bold text-[#111]">{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          <Reveal className="relative mx-auto w-full max-w-[300px]">
            {/* Inset (not overlapping above/left of the card via a negative offset) so it's
                structurally clamped inside the card's own bounds, regardless of any transient
                layout shift that might otherwise nudge a negatively-offset badge out of it. */}
            <div className="motion-safe:animate-float absolute left-2 top-2 z-10 flex h-11 w-11 -rotate-6 items-center justify-center rounded-full bg-white p-2 shadow-pop ring-1 ring-black/10 rtl:left-auto rtl:right-2 rtl:rotate-6">
              <img src="/logo-icon.png" alt="" className="h-full w-full object-contain" />
            </div>
            <HeroReel />
          </Reveal>
        </div>
      </section>

      {/* Features — a carousel of the same 8 features, still filterable by customer outcome
          (Create / Manage / Teach / Measure) rather than by technical module. */}
      <section id="features" className="scroll-mt-20 bg-white text-center">
        <div className="mx-auto max-w-[1280px] border-y border-[#D9E1F0] px-5 py-[clamp(80px,8vw,120px)]">
          <Reveal className="mx-auto max-w-[835px]">
            <p className={EYEBROW}>{t.platformEyebrow}</p>
            <h2 className={cn(H2, "mt-4")}>{t.featuresHeading}</h2>
            <p className={cn(LEAD, "mt-5")}>{t.featuresSub(brand.name)}</p>
          </Reveal>

          <div role="tablist" aria-label="Filter features by outcome" className="mt-9 flex flex-wrap justify-center gap-2">
            {CATEGORY_KEYS.map((cat) => {
              const count = cat === "All" ? features.length : features.filter((f) => f.category === cat).length;
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-[10px] px-4 py-2.5 text-xs font-semibold transition-colors",
                    active ? "bg-[#111] text-white" : "bg-[#EAEEF4] text-[#333] hover:bg-[#D9E1F0]"
                  )}
                >
                  {CATEGORY_LABEL[lang][cat]} <span className={cn(active ? "text-white/70" : "text-[#5B6472]")}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-12 flex items-center justify-center gap-4 sm:gap-6">
            <button type="button" onClick={() => scrollFeatures(-1)} aria-label={t.previous} className={cn(ROUND_ARROW, "hidden sm:flex")}>
              <ChevronLeft className="h-[18px] w-[18px] rtl:-scale-x-100" />
            </button>
            <div
              ref={featureTrackRef}
              className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {visibleFeatures.map((f, i) => (
                <div
                  key={f.title}
                  className="flex w-[264px] shrink-0 snap-start flex-col border border-[#D9E1F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                >
                  <div className="relative flex h-44 items-center justify-center overflow-hidden bg-[#0D1024]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-24 h-48"
                      style={{
                        background: `radial-gradient(closest-side, ${i % 2 === 0 ? "rgba(249,115,22,0.55)" : "rgba(124,92,252,0.6)"}, transparent)`,
                      }}
                    />
                    <span className="absolute start-4 top-4 text-[10px] font-bold uppercase tracking-[0.08em] text-white/50">
                      {CATEGORY_LABEL[lang][f.category]}
                    </span>
                    <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20">
                      <f.icon className="h-9 w-9" strokeWidth={1.6} />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-6">
                    <h3 className="font-display text-lg font-extrabold leading-snug tracking-[-0.02em] text-[#111] rtl:tracking-normal">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => scrollFeatures(1)} aria-label={t.next} className={cn(ROUND_ARROW, "hidden sm:flex")}>
              <ChevronRight className="h-[18px] w-[18px] rtl:-scale-x-100" />
            </button>
          </div>

          <div className="mt-5 flex justify-center gap-3 sm:hidden">
            <button type="button" onClick={() => scrollFeatures(-1)} aria-label={t.previous} className={cn(ROUND_ARROW, "h-12 w-12")}>
              <ChevronLeft className="h-[18px] w-[18px] rtl:-scale-x-100" />
            </button>
            <button type="button" onClick={() => scrollFeatures(1)} aria-label={t.next} className={cn(ROUND_ARROW, "h-12 w-12")}>
              <ChevronRight className="h-[18px] w-[18px] rtl:-scale-x-100" />
            </button>
          </div>

          <Link to="/get-started" className={cn(CTA_DARK, "mt-10 sm:mt-12")}>
            {t.requestDemo}
          </Link>
        </div>
      </section>

      {/* Pain points → solutions, as a zig-zag tree down a central spine. */}
      <section className="bg-[#F8F9FB] py-[clamp(80px,8vw,120px)]">
        <div className="mx-auto max-w-[1280px] px-5">
          <Reveal className="mx-auto max-w-[760px] text-center">
            <p className={EYEBROW}>{t.painEyebrow(brand.name)}</p>
            <h2 className={cn(H2, "mt-4")}>{t.painHeading}</h2>
            <p className={cn(LEAD, "mt-5")}>{t.painSub(brand.name)}</p>
          </Reveal>
          <PainTree items={PAIN_POINTS[lang]} />
        </div>
      </section>

      {/* Product showcase — real screens from the admin portal in demo mode (seed data, not a
          real customer's), stated plainly beneath them rather than left ambiguous. Row rhythm
          (text/screenshot alternating sides) is driven by `mockupFirst` via `order-*`; under
          RTL, CSS Grid's own auto-placement already mirrors normal-flow rows. */}
      <section id="product" className="scroll-mt-20 bg-white py-[clamp(80px,8vw,120px)]">
        <div className="mx-auto max-w-[1160px] px-5">
          <Reveal className="mx-auto max-w-[760px] text-center">
            <p className={EYEBROW}>{t.productEyebrow}</p>
            <h2 className={cn(H2, "mt-4")}>{t.productHeading}</h2>
            <p className={cn(LEAD, "mt-5")}>{t.productSub(brand.name)}</p>
          </Reveal>

          <div className="mt-[clamp(48px,6vw,88px)] flex flex-col gap-[clamp(56px,7vw,104px)]">
            {PRODUCT_ROWS[lang].map((row) => (
              <Reveal key={row.heading}>
                <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[5fr_6fr] lg:gap-16">
                  <div className={row.mockupFirst ? "lg:order-2" : undefined}>
                    <h3 className="font-display text-[clamp(1.5rem,2.4vw,2.125rem)] font-extrabold leading-tight tracking-[-0.02em] text-[#111] rtl:tracking-normal">
                      {row.heading}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-[#333] sm:text-lg">{row.body}</p>
                    <ul className="mt-6 flex flex-col gap-3 border-t border-[#D9E1F0] pt-6">
                      {row.bullets.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-[#111] sm:text-base">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#EA580C]" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={row.mockupFirst ? "lg:order-1" : undefined}>
                    <Screenshot src={row.screenshot} alt={row.alt} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mt-14 text-center text-xs text-[#6B7280]">{t.productCaption}</p>
        </div>
      </section>

      {/* Portals — role names/descriptions come from lib/roles.ts's ROLE_META (shared app-wide),
          left in English by design; only this section's own header/badge/link text translates. */}
      <section id="portals" className="scroll-mt-20 bg-[#F8F9FB] py-[clamp(80px,8vw,120px)]">
        <div className="mx-auto max-w-[1160px] px-5">
          <Reveal className="mx-auto max-w-[760px] text-center">
            <p className={cn(EYEBROW, "inline-flex items-center gap-1.5")}>
              <ShieldCheck className="h-3.5 w-3.5" /> {t.portalsBadge}
            </p>
            <h2 className={cn(H2, "mt-4")}>{t.portalsHeading}</h2>
            <p className={cn(LEAD, "mt-5")}>{t.portalsSub}</p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_ORDER.map((r, i) => {
              const meta = ROLE_META[r];
              return (
                <Reveal key={r} delayMs={(i % 4) * 80}>
                  <Link
                    to="/portal-select"
                    className="group flex h-full gap-4 border border-[#D9E1F0] bg-white p-5 sm:flex-col sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_48px_-16px_rgba(13,16,36,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
                  >
                    {/* meta.hex ties each card to that role's own color identity across the
                        app (sidebar, PortalSelect, login role picker) instead of a flat
                        one-off navy, so a returning user recognizes "their" portal by color. */}
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center text-white" style={{ backgroundColor: meta.hex }}>
                      <meta.icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[#111] rtl:tracking-normal">{meta.label}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#5B6472]">{meta.description}</p>
                    </div>
                    {/* The whole card is the link; below sm it's a compact row and this label
                        is dropped so eight portals don't turn into eight screens of scroll. */}
                    <span className={cn(ARROW_LINK, "mt-auto hidden sm:inline-flex")}>
                      {t.explore} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solutions — real, evidenced sub-segments of the product's actual audience (tutoring
          and coaching academies), not generic corporate-L&D or MOOC-creator verticals with no
          evidence in this codebase. Presented one at a time in a white card on a dark band. */}
      <section id="solutions" className="scroll-mt-20 py-[clamp(60px,8vw,120px)]" style={{ background: DARK_BAND_BG }}>
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="mx-auto flex max-w-[1160px] flex-wrap gap-x-16 gap-y-10 bg-white px-[clamp(20px,5.3vw,80px)] py-[clamp(40px,4.4vw,60px)]">
            <div className="w-full lg:max-w-[400px]">
              <p className={EYEBROW}>{t.solutionsEyebrow}</p>
              <h2 className="font-display mt-4 text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-[1.12] tracking-[-0.03em] text-[#111] rtl:tracking-normal">
                {t.solutionsHeading}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#5B6472]">{t.solutionsSub}</p>
              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSolutionIndex((i) => (i - 1 + solutions.length) % solutions.length)}
                  aria-label={t.previous}
                  className={cn(ROUND_ARROW, "h-12 w-12 border-0")}
                >
                  <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" />
                </button>
                <button
                  type="button"
                  onClick={() => setSolutionIndex((i) => (i + 1) % solutions.length)}
                  aria-label={t.next}
                  className={cn(ROUND_ARROW, "h-12 w-12 border-0")}
                >
                  <ChevronRight className="h-5 w-5 rtl:-scale-x-100" />
                </button>
                <span className="ms-2 text-sm font-semibold tabular-nums text-[#6B7280]">
                  {solutionIndex + 1} / {solutions.length}
                </span>
              </div>
            </div>

            <div key={solution.title} aria-live="polite" className="motion-safe:animate-fade-in min-w-0 flex-1 basis-[300px]">
              <span className="flex h-12 w-12 items-center justify-center bg-[#111] text-white">
                <solution.icon className="h-6 w-6" />
              </span>
              <h3 className="font-display mt-6 text-[clamp(1.25rem,2vw,1.6875rem)] font-extrabold leading-snug tracking-[-0.02em] text-[#111] rtl:tracking-normal">
                {solution.title}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-[#333] sm:text-lg">{solution.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {solution.chips.map((chip) => (
                  <span key={chip} className="rounded-[10px] bg-[#EAEEF4] px-3 py-2 text-xs font-semibold text-[#333]">
                    {chip}
                  </span>
                ))}
              </div>
              {solution.external ? (
                <a href={solution.ctaTo} target="_blank" rel="noopener noreferrer" className={cn(ARROW_LINK, "mt-8")}>
                  {solution.ctaLabel} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </a>
              ) : (
                <Link to={solution.ctaTo} className={cn(ARROW_LINK, "mt-8")}>
                  {solution.ctaLabel} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Security & integrations in one section — verified architectural facts only for
          security (no ISO/SOC2/GDPR claims, said plainly below rather than left ambiguous);
          the real, fixed set of channels this product ships with today for integrations, not
          an open marketplace. */}
      <section id="integrations" className="scroll-mt-20 bg-white py-[clamp(80px,8vw,120px)]">
        <div className="mx-auto max-w-[1160px] px-5">
          <Reveal className="mx-auto max-w-[760px] text-center">
            <p className={EYEBROW}>{t.securityEyebrow}</p>
            <h2 className={cn(H2, "mt-4")}>{t.securityHeading}</h2>
            <p className={cn(LEAD, "mt-5")}>{t.securitySub}</p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SECURITY_ITEMS[lang].map((item, i) => (
              <Reveal key={item.title} delayMs={(i % 2) * 80}>
                <div className="flex h-full gap-5 border border-[#D9E1F0] bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,0.05)] sm:p-9">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#0D1024] text-[#F97316]">
                    <item.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-extrabold tracking-[-0.02em] text-[#111] rtl:tracking-normal">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5B6472] sm:text-base">{item.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-xl text-center text-xs text-[#6B7280]">{t.securityNote}</p>

          <div className="mt-12 grid grid-cols-2 border-s border-t border-[#D9E1F0] sm:grid-cols-3 lg:grid-cols-6">
            {INTEGRATIONS[lang].map((integration) => (
              <div key={integration.name} className="flex flex-col items-center gap-3 border-b border-e border-[#D9E1F0] px-4 py-7 text-center">
                <integration.icon className="h-6 w-6 text-[#EA580C]" />
                <div>
                  <p className="text-sm font-bold text-[#111]">{integration.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-[#5B6472]">{integration.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — one answer open at a time; the hero's suggestion pills open theirs directly. */}
      <section id="faq" className="scroll-mt-20 py-[clamp(80px,9.3vw,140px)]" style={{ background: FAQ_BG }}>
        <div className="mx-auto max-w-[870px] px-5">
          <Reveal className="text-center">
            <p className={EYEBROW}>{t.faqEyebrow}</p>
            <h2 className={cn(H2, "mx-auto mt-4 max-w-[650px]")}>{t.faqHeading}</h2>
          </Reveal>

          <div className="mt-[clamp(40px,4.8vw,72px)] flex flex-col gap-3">
            {FAQS[lang].map((item, i) => (
              <details
                key={item.q}
                id={`faq-${i}`}
                open={openFaq === i}
                onToggle={(e) => {
                  const isOpen = e.currentTarget.open;
                  setOpenFaq((prev) => (isOpen ? i : prev === i ? null : prev));
                }}
                className="group scroll-mt-28 rounded-[15px] border border-white bg-white/30 transition-colors open:outline open:outline-2 open:outline-offset-2 open:outline-[#F97316] hover:bg-white/50"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5 px-[clamp(20px,2.5vw,32px)] py-[clamp(16px,2vw,25px)] text-[clamp(1rem,1.4vw,1.25rem)] font-semibold leading-snug text-black marker:content-none [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span aria-hidden="true" className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111]">
                    <span className="absolute h-0.5 w-3 bg-white" />
                    <span className="absolute h-3 w-0.5 bg-white transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
                  </span>
                </summary>
                <p className="px-[clamp(20px,2.5vw,32px)] pb-[clamp(16px,2vw,25px)] pe-[clamp(40px,6vw,72px)] text-[clamp(0.9375rem,1.2vw,1.125rem)] leading-relaxed text-[#333]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Next steps — the page's real conversion paths side by side: an academy owner
          requesting a platform demo, a look around the portals, or a direct line to the team. */}
      <section className="overflow-hidden pb-5 pt-[clamp(80px,8.8vw,120px)]" style={{ background: READY_BG }}>
        <div className="mx-auto max-w-[1280px] px-5 text-center">
          <Reveal>
            <h2 className={cn(H2, "mx-auto max-w-[650px]")}>
              {t.readyHeadingLead} <span className={GRADIENT_TEXT}>{t.readyHeadingAccent}</span>
            </h2>
          </Reveal>
          <Reveal delayMs={100}>
            <div className="mx-auto mt-[clamp(50px,5.3vw,80px)] flex max-w-[1160px] flex-col items-stretch border border-[#D9E1F0] bg-white px-[clamp(15px,2vw,25px)] py-[clamp(40px,4vw,60px)] shadow-[0_8px_40px_0_rgba(0,0,0,0.08)] md:flex-row">
              <div className="flex-1 px-[clamp(20px,2vw,30px)]">
                <CalendarCheck2 className="mx-auto h-9 w-9 text-[#EA580C]" strokeWidth={1.6} />
                <h3 className="font-display my-5 text-[clamp(1.25rem,1.6vw,1.5rem)] font-extrabold tracking-[-0.02em] text-[#111] rtl:tracking-normal">{t.readyDemoTitle}</h3>
                <Link to="/get-started" className={ARROW_LINK}>
                  {t.requestDemo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              </div>
              <span aria-hidden="true" className="my-9 h-px bg-[#D9E1F0] md:my-0 md:h-auto md:w-px" />
              <div className="flex-1 px-[clamp(20px,2vw,30px)]">
                <Layers className="mx-auto h-9 w-9 text-[#EA580C]" strokeWidth={1.6} />
                <h3 className="font-display my-5 text-[clamp(1.25rem,1.6vw,1.5rem)] font-extrabold tracking-[-0.02em] text-[#111] rtl:tracking-normal">{t.readyPortalsTitle}</h3>
                <Link to="/portal-select" className={ARROW_LINK}>
                  {t.explorePortals} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              </div>
              <span aria-hidden="true" className="my-9 h-px bg-[#D9E1F0] md:my-0 md:h-auto md:w-px" />
              <div className="flex-1 px-[clamp(20px,2vw,30px)]">
                <Mail className="mx-auto h-9 w-9 text-[#EA580C]" strokeWidth={1.6} />
                <h3 className="font-display my-5 text-[clamp(1.25rem,1.6vw,1.5rem)] font-extrabold tracking-[-0.02em] text-[#111] rtl:tracking-normal">{t.readyTalkTitle}</h3>
                <a href="mailto:info@infinityuniquers.com" className={cn(ARROW_LINK, "normal-case")}>
                  info@infinityuniquers.com
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing band. Sign-in stays reachable as a quiet text link for returning users,
          without competing for weight against the lead-gen action. */}
      <section className="mt-[clamp(60px,6vw,100px)]" style={{ background: DARK_BAND_BG }}>
        <Reveal className="mx-auto max-w-[1160px] px-5 py-[clamp(60px,8vw,120px)] text-center">
          <h2 className={cn(H2, "mx-auto max-w-[900px] !text-white")}>{t.ctaHeading}</h2>
          <p className="mx-auto mt-4 max-w-[801px] text-lg leading-[1.8] text-white/80">{t.ctaSub(brand.name)}</p>
          <Link to="/get-started" className={cn(CTA_ORANGE, "mt-[clamp(30px,3.3vw,50px)]")}>
            {t.requestDemo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
          <div>
            <Link to="/login" className="mt-3 inline-block py-3 text-xs font-semibold text-white/70 hover:text-white">
              {t.alreadyHaveAccount}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer — every link below points at a real route or in-page section (no Terms/
          social links, since those don't exist yet; inventing the URLs would just trade a
          sparse footer for a broken one). Privacy Policy sits in the bottom bar next to the
          copyright line rather than its own column — it's the only legal link so far. */}
      <footer className="border-t border-black/10 bg-[#F5F6F9] pb-8 pt-14">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Logo imgClassName="h-12 w-12" wordmarkClassName="mix-blend-multiply" />
            <p className="mt-4 max-w-[22ch] text-sm leading-relaxed text-[#5B6472]">{t.footerTagline}</p>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.06em] text-[#5B6472]">{t.contact}</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a
                  href="mailto:info@infinityuniquers.com"
                  className="group flex items-center gap-2.5 text-sm font-medium text-[#5B6472] hover:text-[#EA580C]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#0D1024] text-[#F97316] transition-colors group-hover:bg-[#262D37]">
                    <Mail className="h-4 w-4" />
                  </span>
                  info@infinityuniquers.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+919344773231"
                  className="group flex items-center gap-2.5 text-sm font-medium text-[#5B6472] hover:text-[#EA580C]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#0D1024] text-[#F97316] transition-colors group-hover:bg-[#262D37]">
                    <Phone className="h-4 w-4" />
                  </span>
                  +91 93447 73231
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/919344773231"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 text-sm font-medium text-[#5B6472] hover:text-[#EA580C]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#0D1024] text-[#F97316] transition-colors group-hover:bg-[#262D37]">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  {t.whatsappUs}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#5B6472]">{t.platform}</p>
            <ul className="mt-4 flex flex-col gap-3">
              {NAV_LINKS[lang].slice(0, 5).map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#5B6472]">{t.getStarted}</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link to="/get-started" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  {t.requestDemo}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  {t.signIn}
                </Link>
              </li>
              <li>
                <Link to="/portal-select" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  {t.explorePortals}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#5B6472]">{t.resources}</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link to="/blog" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  {t.blog}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-black/10 px-6 pt-6">
          <p className="text-xs font-medium text-[#5B6472]">{t.rights(new Date().getFullYear(), brand.name)}</p>
          <Link to="/policy" className="py-3 text-xs font-medium text-[#5B6472] hover:text-[#EA580C]">
            {t.privacyPolicy}
          </Link>
        </div>
      </footer>

      <ChatWidget lang={lang} onOpen={() => setChatEngaged(true)} />
      <DemoPopup lang={lang} suppressed={chatEngaged} />
    </div>
  );
}
