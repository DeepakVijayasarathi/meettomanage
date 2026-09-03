import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  ChevronDown,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  HeartHandshake,
  Layers,
  Lock,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  PenTool,
  Phone,
  Play,
  RefreshCw,
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
import { cn } from "@/lib/utils";

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
    <div className="relative aspect-[9/16] overflow-hidden rounded-[24px] bg-[#12151C] shadow-pop ring-4 ring-white">
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
    <div className="relative aspect-video overflow-hidden rounded-[24px] bg-[#12151C] shadow-pop ring-4 ring-white">
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
    heading: "Chat with us",
    closeAria: "Close chat",
    sub: "Reach us directly, or request a platform demo.",
    whatsapp: "WhatsApp us",
    email: "Email us",
    demo: "Request a demo",
    toggleAria: (open: boolean) => (open ? "Close chat" : "Chat with us"),
  },
  ar: {
    heading: "تحدث معنا",
    closeAria: "إغلاق الدردشة",
    sub: "تواصل معنا مباشرة، أو اطلب عرضًا توضيحيًا للمنصة.",
    whatsapp: "راسلنا على واتساب",
    email: "راسلنا بالبريد الإلكتروني",
    demo: "اطلب عرضًا توضيحيًا",
    toggleAria: (open: boolean) => (open ? "إغلاق الدردشة" : "تحدث معنا"),
  },
};

/** Floating contact widget — links out (WhatsApp/email/Request a Demo) rather than answering
    questions itself, unlike the FAQ-matching "Ask a Doubt" bot used inside the logged-in
    portals (DoubtChatbot.tsx). This page has no other fixed-position widget to collide with. */
function ChatWidget({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const t = CHAT_T[lang];

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6 rtl:right-auto rtl:left-5 sm:rtl:left-6">
      {open && (
        <div className="w-72 rounded-2xl border border-black/10 bg-white p-5 shadow-pop">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#171B22]">{t.heading}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.closeAria}
              className="text-[#8B93A1] transition-colors hover:text-[#171B22]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[#5B6472]">{t.sub}</p>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="https://wa.me/919344773231"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl border border-black/10 px-3.5 py-2.5 text-sm font-semibold text-[#171B22] transition-colors hover:bg-[#F5F6F9]"
            >
              <MessageSquare className="h-4 w-4 text-[#25D366]" /> {t.whatsapp}
            </a>
            <a
              href="mailto:info@infinityuniquers.com"
              className="flex items-center gap-2.5 rounded-xl border border-black/10 px-3.5 py-2.5 text-sm font-semibold text-[#171B22] transition-colors hover:bg-[#F5F6F9]"
            >
              <Mail className="h-4 w-4 text-[#EA580C]" /> {t.email}
            </a>
            <Link
              to="/get-started"
              className="flex items-center gap-2.5 rounded-xl bg-[#F97316] px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
            >
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /> {t.demo}
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t.toggleAria(open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F97316] text-white shadow-pop transition-transform hover:scale-105"
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
 * a genuinely new visit gets one shot at this again).
 */
function DemoPopup({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const t = DEMO_POPUP_T[lang];

  useEffect(() => {
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

    document.addEventListener("mouseleave", handleMouseLeave);
    const fallbackTimer = window.setTimeout(trigger, 25_000);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

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
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t.closeAria}
          className="absolute right-4 top-4 text-[#8B93A1] transition-colors hover:text-[#171B22] rtl:right-auto rtl:left-4"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF3EA] text-[#EA580C]">
          <Sparkles className="h-5 w-5" />
        </span>
        <h2 className="font-display mt-4 text-xl font-extrabold tracking-tight text-[#171B22]">{t.heading}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">{t.sub}</p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button asChild size="lg" className="w-full !bg-[#F97316] !text-white hover:!bg-[#EA580C]">
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
    <div className="overflow-hidden rounded-2xl border border-black/10 shadow-pop">
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
    footerTagline: "Live teaching, scheduling, admissions and billing — one role-based system for your whole academy.",
    contact: "Contact",
    whatsappUs: "WhatsApp us",
    platform: "Platform",
    getStarted: "Get started",
    resources: "Resources",
    blog: "Blog",
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
    footerTagline: "تدريس مباشر، وجدولة، وقبول، وفوترة — نظام واحد قائم على الأدوار لأكاديميتك بأكملها.",
    contact: "التواصل",
    whatsappUs: "راسلنا على واتساب",
    platform: "المنصة",
    getStarted: "ابدأ الآن",
    resources: "الموارد",
    blog: "المدونة",
    rights: (year: number, brand: string) => `© ${year} ${brand}. جميع الحقوق محفوظة.`,
    homeAria: "الصفحة الرئيسية لـ Meet to Manage",
  },
};

export default function MarketingHome() {
  useLightBrandScope();
  const brand = useBrand();
  const [lang] = useLang();
  const t = T[lang];
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");

  const features = FEATURES[lang];
  const visibleFeatures = activeCategory === "All" ? features : features.filter((f) => f.category === activeCategory);

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="home"
        title="Meet to Manage — LMS & Virtual Classroom"
        description="Meet to Manage brings live teaching, scheduling, admissions, billing and reporting into one role-based platform for schools and academies."
        path="/"
      />
      <LaunchBanner lang={lang} />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <img src="/logo-full.png" alt={brand.name} className="h-14 w-auto shrink-0 object-contain sm:h-20" />

          {/* Section anchors — desktop only. On narrow screens there's only room for the two
              CTAs (see the mobile-header wrap this replaced), so wayfinding there stays limited
              to scrolling; that's an acceptable trade for not cramping the primary actions. */}
          <nav aria-label="Page sections" className="hidden items-center gap-6 lg:flex">
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
            <Button asChild className="!bg-[#F97316] px-3 !text-white hover:!bg-[#EA580C] sm:px-4">
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

      {/* Hero — the faint top-right glow echoes the dark CTA banner's radial glow lower down,
          a quiet visual bookend rather than a one-off decoration. */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full rtl:-left-24 rtl:right-auto"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.10), rgba(249,115,22,0) 70%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-6 py-14 lg:grid-cols-[1.15fr_380px] lg:gap-16 lg:py-24">
          <div>
          <div className="motion-safe:animate-slide-up inline-flex items-center gap-1.5 rounded-full border border-[#FFE1C7] bg-[#FFF3EA] px-3.5 py-1.5 text-xs font-semibold text-[#C2410C]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {t.heroEyebrowPrefix} <CyclingWord words={t.heroEyebrowWords} /> {t.heroEyebrowSuffix}
            </span>
          </div>
          <h1
            className="motion-safe:animate-slide-up font-display mt-5 text-4xl font-extrabold leading-[1.14] tracking-tight sm:text-5xl"
            style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
          >
            {t.heroHeadingLead} <CyclingWord words={t.heroWords} colors={t.heroWordColors} /> {t.heroMid}
            <span className="text-[#EA580C]"> {t.heroHeadingManage}</span> {t.heroHeadingTail}
          </h1>
          <p
            className="motion-safe:animate-slide-up mt-5 max-w-lg text-base leading-relaxed text-[#5B6472]"
            style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
          >
            {t.heroSub(brand.name)}
          </p>
          <div
            className="motion-safe:animate-slide-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
          >
            <Button asChild size="lg" className="!bg-[#F97316] !text-white hover:!bg-[#EA580C]">
              <Link to="/get-started">
                {t.requestDemo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[#171B22]/15 text-[#171B22] hover:bg-[#171B22]/5">
              <Link to="/portal-select">{t.explorePortals}</Link>
            </Button>
          </div>

          {/* Real, verifiable trust indicators only — every phrase here restates language
              already used on the dedicated /demo and /get-started flows, not a generic
              "no credit card" line this product's signup doesn't actually have.
              Stacked (not flex-wrap) at every width: at the hero column's ~500px desktop
              width, wrapping left three items of uneven length two-then-one, creating a
              lopsided row instead of a clean list. */}
          <div
            className="motion-safe:animate-slide-up mt-7 flex flex-col gap-2"
            style={{ animationDelay: "280ms", animationFillMode: "backwards" }}
          >
            {t.heroTrust.map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6472]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#EA580C]" /> {item}
              </span>
            ))}
          </div>
        </div>

        {/* Hero visual: autoplaying 60-second reel, replacing the earlier static mockup. */}
        <div
          className="motion-safe:animate-slide-up relative mx-auto w-full sm:max-w-[300px]"
          style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
        >
          {/* Inset (not overlapping above/left of the card via a negative offset) so it's
              structurally clamped inside the card's own bounds — it can never render behind
              the sticky header, regardless of any transient layout shift (web-font swap,
              browser zoom, etc.) that might otherwise nudge a negatively-offset badge upward. */}
          <div className="motion-safe:animate-float absolute left-2 top-2 z-10 flex h-11 w-11 -rotate-6 items-center justify-center rounded-full bg-white p-2 shadow-pop ring-1 ring-black/10 rtl:left-auto rtl:right-2 rtl:rotate-6">
            <img src="/logo-icon.png" alt="" className="h-full w-full object-contain" />
          </div>
          <HeroReel />
        </div>
        </div>
      </section>

      {/* Clients — real academies already teaching on the platform. Grows as more come on
          board; each logo is circle-cropped onto a white background for a consistent look
          regardless of the source file's own canvas. */}
      <section className="border-t border-black/10 bg-white py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-[0.08em] text-[#8B93A1]">
            {t.clientsHeading(brand.name)}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {CLIENTS.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <img
                  src={c.logo}
                  alt={`${c.name} logo`}
                  loading="lazy"
                  className="h-14 w-14 rounded-full bg-white object-cover ring-1 ring-black/10"
                />
                <span className="text-sm font-bold text-[#171B22]">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof strip — no fabricated customer counts exist for this product beyond the
          real clients above, so this states verifiable platform facts rather than an invented
          "Trusted by 1,000+ academies" claim. */}
      <section className="border-y border-black/10 bg-[#F5F6F9] py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-[0.08em] text-[#8B93A1]">{t.statsHeading}</p>
          <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS[lang].map((s) => (
              <div key={s.label} className="flex flex-col items-center text-center sm:items-start sm:text-start">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-soft">
                  <s.icon className="h-4 w-4" />
                </span>
                <p className="font-display mt-3 text-2xl font-extrabold text-[#171B22]">{s.value}</p>
                <p className="mt-0.5 text-xs font-medium leading-snug text-[#5B6472]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Watch — a real screen-recorded walkthrough (landscape, product footage), distinct
          from the hero's portrait talking-head reel. */}
      <section className="border-t border-black/10 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.watchEyebrow}</p>
              <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.watchHeading}</h2>
              <p className="mt-3 text-sm text-[#5B6472]">{t.watchSub(brand.name)}</p>
            </div>
          </Reveal>

          <Reveal delayMs={100} className="mt-10">
            <ExplainerVideo />
          </Reveal>
        </div>
      </section>

      {/* Pain points → solutions */}
      <section className="border-t border-black/10 bg-[#FBFBFC] py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.painEyebrow(brand.name)}</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
              {t.painHeading}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5B6472] sm:text-lg">{t.painSub(brand.name)}</p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PAIN_POINTS[lang].map((p, i) => (
              <Reveal key={p.pain} delayMs={i * 80} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-6 sm:p-7">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F6F9] text-[#5B6472]">
                      <p.icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide text-[#8B93A1]">{p.label}</span>
                  </div>
                  <div className="mt-4 flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#B8BEC9]" />
                    <p className="text-base leading-snug text-[#5B6472] sm:text-lg">{p.pain}</p>
                  </div>
                  <div className="mt-4 flex items-start gap-3 border-t border-dashed border-black/10 pt-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#EA580C]" />
                    <p className="text-base font-bold leading-snug text-[#171B22] sm:text-lg">{p.fix}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase — the interfaces below are illustrative product views built for
          this page (the same visual language as the hero mockup), not literal screenshots
          or real customer data. That's stated plainly beneath them rather than left ambiguous.
          Row rhythm (text/mockup alternating sides) is driven by `mockupFirst` via `order-*`;
          under RTL, CSS Grid's own auto-placement already mirrors normal-flow rows, so only
          the explicitly-ordered row needs a look once this can be visually checked in Arabic —
          noted, not fixed blind. */}
      <section id="product" className="scroll-mt-20 border-t border-black/10 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.productEyebrow}</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.productHeading}</h2>
            <p className="mt-3 text-sm text-[#5B6472]">{t.productSub(brand.name)}</p>
          </div>

          <div className="mt-16 flex flex-col gap-16 sm:gap-20">
            {PRODUCT_ROWS[lang].map((row) => (
              <Reveal key={row.heading}>
                <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
                  <div className={row.mockupFirst ? "lg:order-2" : undefined}>
                    <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{row.heading}</h3>
                    <p className="mt-3 text-base leading-relaxed text-[#5B6472]">{row.body}</p>
                    <ul className="mt-5 flex flex-col gap-3">
                      {row.bullets.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-[#171B22]">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" /> {item}
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

          <p className="mt-14 text-center text-xs text-[#8B93A1]">{t.productCaption}</p>
        </div>
      </section>

      {/* Feature grid — organized by customer outcome (Create / Manage / Teach / Measure)
          rather than by technical module, with the filter reusing the same 8 features
          instead of duplicating them into a second, redundant section. */}
      <section id="features" className="scroll-mt-20 border-t border-black/10 bg-[#F5F6F9] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.platformEyebrow}</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.featuresHeading}</h2>
            <p className="mt-3 text-sm text-[#5B6472]">{t.featuresSub(brand.name)}</p>
          </div>

          <div role="tablist" aria-label="Filter features by outcome" className="mt-8 flex flex-wrap justify-center gap-2">
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
                    "rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-[#F97316] bg-[#F97316] text-white"
                      : "border-black/10 bg-white text-[#5B6472] hover:border-[#F97316]/40 hover:text-[#171B22]"
                  )}
                >
                  {CATEGORY_LABEL[lang][cat]} <span className={cn(active ? "text-white/70" : "text-[#B8BEC9]")}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleFeatures.map((f, i) => (
              <Reveal key={f.title} delayMs={(i % 4) * 80}>
                <div className="group h-full rounded-2xl border border-black/10 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-pop">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${f.hex}1A`, color: f.hex }}
                  >
                    <f.icon className="h-[22px] w-[22px]" />
                  </span>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-[#B8BEC9]">{CATEGORY_LABEL[lang][f.category]}</p>
                  <h3 className="mt-1 text-sm font-bold text-[#171B22]">{f.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5B6472]">{f.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Portals — role names/descriptions come from lib/roles.ts's ROLE_META (shared app-wide),
          left in English by design; only this section's own header/badge/link text translates. */}
      <section id="portals" className="scroll-mt-20 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEFF3] px-3.5 py-1.5 text-xs font-semibold text-[#262D37]">
              <ShieldCheck className="h-3.5 w-3.5" /> {t.portalsBadge}
            </div>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.portalsHeading}</h2>
            <p className="mt-3 text-sm text-[#5B6472]">{t.portalsSub}</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_ORDER.map((r, i) => {
              const meta = ROLE_META[r];
              return (
                <Reveal key={r} delayMs={(i % 4) * 80}>
                  <Link
                    to="/portal-select"
                    className="group flex h-full flex-col gap-3 rounded-2xl border border-black/10 bg-[#F5F6F9] p-5 transition-all hover:-translate-y-1 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {/* meta.hex ties each card to that role's own color identity across the
                        app (sidebar, PortalSelect, login role picker) instead of a flat
                        one-off navy, so a returning user recognizes "their" portal by color. */}
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: meta.hex }}
                    >
                      <meta.icon className="h-[22px] w-[22px]" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#171B22]">{meta.label}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#5B6472]">{meta.description}</p>
                    </div>
                    <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#EA580C] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      {t.explore} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
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
          evidence in this codebase. */}
      <section id="solutions" className="scroll-mt-20 border-t border-black/10 bg-[#F5F6F9] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.solutionsEyebrow}</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.solutionsHeading}</h2>
            <p className="mt-3 text-sm text-[#5B6472]">{t.solutionsSub}</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS[lang].map((s, i) => (
              <Reveal key={s.title} delayMs={i * 100}>
                <div className="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF3EA] text-[#EA580C]">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-[#171B22]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5B6472]">{s.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.chips.map((chip) => (
                      <span key={chip} className="rounded-full bg-[#F5F6F9] px-2.5 py-1 text-[11px] font-semibold text-[#262D37]">
                        {chip}
                      </span>
                    ))}
                  </div>
                  {s.external ? (
                    <a
                      href={s.ctaTo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex items-center gap-1 text-sm font-semibold text-[#EA580C] hover:text-[#C2410C]"
                    >
                      {s.ctaLabel} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                    </a>
                  ) : (
                    <Link
                      to={s.ctaTo}
                      className="mt-5 flex items-center gap-1 text-sm font-semibold text-[#EA580C] hover:text-[#C2410C]"
                    >
                      {s.ctaLabel} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Security & integrations, merged into one section (was two) — both are short,
          compact-card sections and neither needed its own full section's worth of padding.
          Verified architectural facts only for security (no ISO/SOC2/GDPR claims, said
          plainly below rather than left ambiguous); the real, fixed set of channels this
          product ships with today for integrations, not an open marketplace. */}
      <section id="integrations" className="scroll-mt-20 border-t border-black/10 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.securityEyebrow}</p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.securityHeading}</h2>
            <p className="mt-3 text-sm text-[#5B6472]">{t.securitySub}</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY_ITEMS[lang].map((item, i) => (
              <Reveal key={item.title} delayMs={(i % 4) * 80}>
                <div className="h-full rounded-2xl border border-black/10 bg-[#F5F6F9] p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-soft">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-[#171B22]">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5B6472]">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-xl text-center text-xs text-[#8B93A1]">{t.securityNote}</p>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {INTEGRATIONS[lang].map((integration, i) => (
              <Reveal key={integration.name} delayMs={(i % 6) * 60}>
                <div className="flex h-full flex-col items-center gap-2.5 rounded-2xl border border-black/10 bg-[#F5F6F9] p-5 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF3EA] text-[#EA580C]">
                    <integration.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#171B22]">{integration.name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#5B6472]">{integration.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <p className="text-center text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.faqEyebrow}</p>
            <h2 className="font-display mt-3 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">{t.faqHeading}</h2>
          </Reveal>

          <div className="mt-10 flex flex-col gap-3">
            {FAQS[lang].map((item, i) => (
              <Reveal key={item.q} delayMs={i * 60}>
                <details className="group rounded-2xl border border-black/10 bg-[#F5F6F9] open:shadow-soft">
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 text-sm font-bold text-[#171B22] marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#EA580C] shadow-soft">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">{item.q}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#5B6472] transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 pl-[4.25rem] pr-5 text-sm leading-relaxed text-[#5B6472] rtl:pl-5 rtl:pr-[4.25rem]">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner — the page's two real conversion paths, not a hero repeat: an academy
          owner requesting a platform demo, or a parent booking a class demo. Sign-in stays
          reachable as a quiet text link for returning users, without competing for weight
          against the two lead-gen actions. */}
      <section className="border-t border-black/10 bg-[#F5F6F9] py-16 sm:py-20">
        <Reveal className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-[28px] bg-[#1A1F27] px-8 py-12 text-center shadow-pop sm:px-14">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full rtl:-left-16 rtl:right-auto"
              style={{ background: "radial-gradient(circle, rgba(249,115,22,0.35), rgba(249,115,22,0) 70%)" }}
            />
            <div className="relative">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-soft">
                <img src="/logo-icon.png" alt="" className="h-7 w-7 object-contain" />
              </span>
              <h2 className="font-display mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{t.ctaHeading}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/60">{t.ctaSub(brand.name)}</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="!bg-[#F97316] !text-white hover:!bg-[#EA580C]">
                  <Link to="/get-started">
                    {t.requestDemo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </Button>
              </div>
              <Link to="/login" className="mt-6 inline-block text-xs font-semibold text-white/50 hover:text-white/80">
                {t.alreadyHaveAccount}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer — every link below points at a real route or in-page section (no Privacy/
          Terms/social links, since none of those exist yet; inventing the URLs would just
          trade a sparse footer for a broken one). */}
      <footer className="border-t border-black/10 bg-[#F5F6F9] pb-8 pt-14">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Logo imgClassName="h-12 w-12" />
            <p className="mt-4 max-w-[22ch] text-sm leading-relaxed text-[#5B6472]">{t.footerTagline}</p>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.06em] text-[#8B93A1]">{t.contact}</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a
                  href="mailto:info@infinityuniquers.com"
                  className="group flex items-center gap-2.5 text-sm font-medium text-[#5B6472] hover:text-[#EA580C]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#EA580C] transition-colors group-hover:bg-[#F97316]/15">
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
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#EA580C] transition-colors group-hover:bg-[#F97316]/15">
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
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#EA580C] transition-colors group-hover:bg-[#F97316]/15">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  {t.whatsappUs}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#8B93A1]">{t.platform}</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#8B93A1]">{t.getStarted}</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#8B93A1]">{t.resources}</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link to="/blog" className="text-sm font-medium text-[#5B6472] hover:text-[#EA580C]">
                  {t.blog}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-6xl border-t border-black/10 px-6 pt-6">
          <p className="text-xs font-medium text-[#5B6472]">{t.rights(new Date().getFullYear(), brand.name)}</p>
        </div>
      </footer>

      <ChatWidget lang={lang} />
      <DemoPopup lang={lang} />
    </div>
  );
}
