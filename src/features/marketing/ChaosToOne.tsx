import { useEffect, useRef, useState } from "react";
import { Check, Receipt, RotateCcw, type LucideIcon } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { H2, LEAD } from "./styles";

const EYEBROW = "text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C] rtl:tracking-normal";

interface Tool {
  key: string;
  label: Record<Lang, string>;
  /** The tool's own mark from /public/tool-logos, tinted with its brand colour; null → icon. */
  logo: string | null;
  color: string;
  icon?: LucideIcon;
  /** The red "needs attention" bubble — the chaos made visible. */
  badge: string;
  /** Resting spot while loose, as a percent of the cluster, plus a tilt. */
  at: { l: number; t: number; r: number };
}

const TOOLS: Tool[] = [
  { key: "chat", label: { en: "WhatsApp groups", ar: "مجموعات واتساب" }, logo: "/tool-logos/whatsapp.svg", color: "#25D366", badge: "99+", at: { l: 18, t: 22, r: -8 } },
  { key: "video", label: { en: "Video links", ar: "روابط الفيديو" }, logo: "/tool-logos/zoom.svg", color: "#0B5CFF", badge: "!", at: { l: 52, t: 14, r: 7 } },
  { key: "sheet", label: { en: "Excel sheets", ar: "جداول إكسل" }, logo: "/tool-logos/microsoftexcel.svg", color: "#217346", badge: "7", at: { l: 84, t: 30, r: -5 } },
  { key: "receipt", label: { en: "Paper receipts", ar: "إيصالات ورقية" }, logo: null, color: "#6B7280", icon: Receipt, badge: "?", at: { l: 24, t: 74, r: 6 } },
  { key: "form", label: { en: "Enquiry forms", ar: "نماذج الاستفسار" }, logo: "/tool-logos/googleforms.svg", color: "#7248B9", badge: "12", at: { l: 56, t: 80, r: -7 } },
  { key: "note", label: { en: "Sticky notes", ar: "ملاحظات لاصقة" }, logo: "/tool-logos/googlekeep.svg", color: "#FFBB00", badge: "3", at: { l: 86, t: 70, r: 8 } },
];

const T = {
  en: {
    eyebrow: "The problem we solve",
    heading: "Academies don't fail at teaching. They drown in admin.",
    sub: (brand: string) => `Fees chased on WhatsApp, enquiries lost in inboxes, parents asking for updates. ${brand} puts it all in one system.`,
    checks: ["Fees collect themselves", "No enquiry goes cold", "Parents stay in the loop", "Teachers paid on real attendance"],
    allIn: "All in one login",
    before: "6 tools · 6 logins · endless follow-ups",
    after: "1 system · 1 login · nothing slips",
    replay: "Replay",
    stageLabel: "Animation: six scattered tools merge into one system that handles fees, enquiries, parent updates and teacher payouts",
  },
  ar: {
    eyebrow: "المشكلة التي نحلّها",
    heading: "الأكاديميات لا تفشل في التدريس، بل تغرق في العمل الإداري.",
    sub: (brand: string) => `رسوم تُطارَد عبر واتساب، واستفسارات تضيع في البريد، وأولياء أمور يطلبون التحديثات. تجمع ${brand} كل ذلك في نظام واحد.`,
    checks: ["الرسوم تُحصَّل تلقائيًا", "لا استفسار يضيع", "أولياء الأمور على اطلاع", "مستحقات المعلمين من الحضور الفعلي"],
    allIn: "كل شيء بتسجيل دخول واحد",
    before: "6 أدوات · 6 تسجيلات دخول · متابعات لا تنتهي",
    after: "نظام واحد · تسجيل دخول واحد · لا شيء يفوتك",
    replay: "أعد التشغيل",
    stageLabel: "رسم متحرك: ست أدوات متفرقة تندمج في نظام واحد يتولى الرسوم والاستفسارات وتحديثات أولياء الأمور ومستحقات المعلمين",
  },
};

/** Keyframes only register when the visitor hasn't asked for reduced motion; with it on, the
 *  stage jumps straight to the merged state (see `start`). */
const KEYFRAMES = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes m2m-drift { 0%,100% { transform: translate(0,0) } 25% { transform: translate(4px,-7px) } 50% { transform: translate(-4px,-2px) } 75% { transform: translate(-5px,5px) } }
  @keyframes m2m-ping { 0%,100% { transform: scale(1) } 50% { transform: scale(1.25) } }
  @keyframes m2m-dash { to { stroke-dashoffset: -14 } }
  @keyframes m2m-glow { 0%,100% { box-shadow: 0 20px 60px -20px rgba(234,88,12,.28) } 50% { box-shadow: 0 24px 80px -14px rgba(234,88,12,.4) } }
  .m2m-drift { animation: m2m-drift 5s ease-in-out infinite }
  .m2m-ping { animation: m2m-ping 1.6s ease-in-out infinite }
  .m2m-flow { stroke-dasharray: 6 8; animation: m2m-dash .8s linear infinite }
  .m2m-glow { animation: m2m-glow 3s ease-in-out infinite }
}
`;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Tints one monochrome SVG with a tool's brand colour through a CSS mask. */
function ToolMark({ tool }: { tool: Tool }) {
  if (!tool.logo) {
    const Icon = tool.icon!;
    return <Icon className="h-7 w-7" style={{ color: tool.color }} />;
  }
  return (
    <span
      aria-hidden="true"
      className="block h-7 w-7"
      style={{ backgroundColor: tool.color, WebkitMask: `url(${tool.logo}) center / contain no-repeat`, mask: `url(${tool.logo}) center / contain no-repeat` }}
    />
  );
}

/** Six loose tools (real logos, each with a red badge) jitter on the left. On scroll they stream
 *  one by one into the Meet to Manage card on the right, which lights up and ticks off what
 *  it now handles. Pure CSS transitions: no animation library, and static under reduced motion. */
export function ChaosToOne({ lang, brandName }: { lang: Lang; brandName: string }) {
  const t = T[lang];
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const [merged, setMerged] = useState(false);
  const timer = useRef(0);

  function start() {
    window.clearTimeout(timer.current);
    if (reducedMotion()) {
      setMerged(true);
      return;
    }
    timer.current = window.setTimeout(() => setMerged(true), 600);
  }

  useEffect(() => {
    if (inView) start();
    return () => window.clearTimeout(timer.current);
  }, [inView]);

  function replay() {
    setMerged(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMerged(true), 900);
  }

  return (
    <section className="bg-white py-[clamp(64px,7vw,104px)]">
      <style>{KEYFRAMES}</style>
      <div className="mx-auto max-w-[1040px] px-5">
        <div className="mx-auto max-w-[720px] text-center">
          <p className={EYEBROW}>{t.eyebrow}</p>
          <h2 className={cn(H2, "mt-4")}>{t.heading}</h2>
          <p className={cn(LEAD, "mt-5")}>{t.sub(brandName)}</p>
        </div>

        <div
          ref={ref}
          role="img"
          aria-label={t.stageLabel}
          className="relative mt-12 h-[380px] overflow-hidden border border-[#EFE3D7] bg-[#FFFBF7] md:h-[310px]"
        >
          {/* The mess: six real tools, each with a red badge, drifting loose. On merge they all
              collapse toward the centre, one after another. */}
          {TOOLS.map((tool, i) => (
            <div
              key={tool.key}
              className="absolute z-10 motion-safe:transition-[left,top,transform,opacity] motion-safe:duration-1000 motion-safe:ease-in"
              style={{
                left: merged ? "50%" : `${tool.at.l}%`,
                top: merged ? "50%" : `${tool.at.t}%`,
                transform: `translate(-50%, -50%) rotate(${merged ? 180 : tool.at.r}deg) scale(${merged ? 0.15 : 1})`,
                opacity: merged ? 0 : 1,
                transitionDelay: merged ? `${i * 90}ms` : "0ms",
              }}
            >
              <div
                className={cn("relative flex w-[86px] flex-col items-center gap-1.5 border border-[#D9E1F0] bg-white px-1.5 py-2.5 text-center shadow-md sm:w-[100px]", !merged && "m2m-drift")}
                style={{ animationDelay: `${i * 380}ms`, animationDuration: `${4.2 + (i % 3) * 0.7}s` }}
              >
                <ToolMark tool={tool} />
                <span className="text-[10px] font-semibold leading-tight text-[#111]">{tool.label[lang]}</span>
                <span aria-hidden="true" className="m2m-ping absolute -end-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B91C1C] px-1 text-[10px] font-bold text-white">
                  {tool.badge}
                </span>
              </div>
            </div>
          ))}

          {/* The one system: pops out of the spot the tools collapsed into. */}
          <div
            className={cn(
              "absolute left-1/2 top-1/2 z-20 w-[calc(100%-32px)] max-w-[540px] border bg-white p-6 text-center motion-safe:transition-[transform,opacity] motion-safe:duration-700 motion-safe:ease-out",
              merged ? "m2m-glow border-[#F97316]/50" : "pointer-events-none border-[#D9E1F0]"
            )}
            style={{
              transform: `translate(-50%, -50%) scale(${merged ? 1 : 0.5})`,
              opacity: merged ? 1 : 0,
              transitionDelay: merged ? "650ms" : "0ms",
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <img src="/logo-icon-128.webp" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
              <div className="text-start">
                <p className="font-display text-lg font-extrabold leading-tight text-[#111]">{brandName}</p>
                <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#16A34A] rtl:tracking-normal">{t.allIn}</p>
              </div>
            </div>
            <ul className="mt-5 grid grid-cols-1 gap-2.5 text-start sm:grid-cols-2">
              {t.checks.map((c, i) => (
                <li
                  key={c}
                  className={cn("flex items-center gap-2.5 text-sm font-semibold text-[#111] motion-safe:transition-all motion-safe:duration-500", merged ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}
                  style={{ transitionDelay: merged ? `${1100 + i * 140}ms` : "0ms" }}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-[1040px] items-center justify-between gap-3">
          <p aria-live="polite" className={cn("text-sm font-bold motion-safe:transition-colors motion-safe:duration-700", merged ? "text-[#C2410C]" : "text-[#5B6472]")}>
            {merged ? t.after : t.before}
          </p>
          <button
            type="button"
            onClick={replay}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase text-[#5B6472] hover:text-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t.replay}
          </button>
        </div>
      </div>
    </section>
  );
}
