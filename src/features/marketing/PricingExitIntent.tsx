import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiEnabled } from "@/lib/api";
import { requestPlatformDemo } from "@/api/marketing";
import { marketingAttribution, marketingVisitorId, trackDemoBooked, trackMarketingEvent } from "@/lib/analytics";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { demoAlreadyBooked, markDemoBooked } from "./chatTeaser";
import { CTA_ORANGE } from "./styles";

const SEEN_KEY = "mtm.pricingExit.seen";
/** After the popup shows once, it stays away for this long. */
const QUIET_MS = 7 * 24 * 60 * 60 * 1000;
/** Don't interrupt someone who only just landed. */
const MIN_DWELL_MS = 8000;

const T = {
  en: {
    title: "Before you go: want a price for your academy?",
    sub: "Tell us where to send it. We'll reply within one business day with the right plan for your student count, and answer any pricing questions.",
    name: "Your name",
    contact: "Email or WhatsApp number",
    contactPlaceholder: "you@academy.com or +91 98765 43210",
    submit: "Send me pricing",
    nameError: "Enter your name.",
    contactError: "Enter an email address or WhatsApp number.",
    submitError: "Couldn't send that. Please try again.",
    whatsapp: "Or ask us on WhatsApp",
    privacy: "We only use this to reply about pricing.",
    thanks: "Thanks, we'll be in touch shortly.",
    demoMode: "Demo mode: no request was actually sent.",
    message: "Pricing page exit popup: wants pricing for their academy.",
    fallbackAcademy: "Pricing page enquiry",
  },
  ar: {
    title: "قبل أن تغادر: هل تريد سعرًا مناسبًا لأكاديميتك؟",
    sub: "أخبرنا أين نرسله. سنرد خلال يوم عمل واحد بالخطة المناسبة لعدد طلابك، ونجيب عن أي أسئلة حول الأسعار.",
    name: "اسمك",
    contact: "البريد الإلكتروني أو رقم واتساب",
    contactPlaceholder: "you@academy.com أو ‎+91 98765 43210",
    submit: "أرسل لي الأسعار",
    nameError: "أدخل اسمك.",
    contactError: "أدخل بريدًا إلكترونيًا أو رقم واتساب.",
    submitError: "تعذّر الإرسال. حاول مرة أخرى.",
    whatsapp: "أو اسألنا عبر واتساب",
    privacy: "نستخدم هذه البيانات فقط للرد بخصوص الأسعار.",
    thanks: "شكرًا، سنتواصل معك قريبًا.",
    demoMode: "وضع العرض التجريبي — لم يُرسل أي طلب فعليًا.",
    message: "Pricing page exit popup: wants pricing for their academy.",
    fallbackAcademy: "Pricing page enquiry",
  },
};

function recentlyShown(): boolean {
  try {
    const at = Number(localStorage.getItem(SEEN_KEY));
    return at > 0 && Date.now() - at < QUIET_MS;
  } catch {
    return false;
  }
}

function markShown() {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* nothing to persist to */
  }
}

/**
 * Exit-intent lead capture for /pricing. On desktop it opens when the pointer leaves through the
 * top of the window (heading for the tab bar or back button); on touch screens, when the visitor
 * flicks back up toward the top after reading at least a third of the page. Shows at most once a
 * week per browser, and never to someone who already booked a demo.
 */
export function PricingExitIntent() {
  const [lang] = useLang();
  const t = T[lang];
  const live = apiEnabled();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (recentlyShown() || demoAlreadyBooked()) return;
    const landedAt = Date.now();

    const fire = () => {
      if (firedRef.current || Date.now() - landedAt < MIN_DWELL_MS || recentlyShown() || demoAlreadyBooked()) return;
      // Don't stack on top of another open dialog (e.g. a menu sheet).
      if (document.querySelector('[role="dialog"]')) return;
      firedRef.current = true;
      markShown();
      setOpen(true);
      trackMarketingEvent("exit_intent_shown");
    };

    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) fire();
    };

    // Touch: a quick upward flick near the top, after having read some of the page.
    let deepest = 0;
    let lastY = window.scrollY;
    let lastAt = performance.now();
    const onScroll = () => {
      const y = window.scrollY;
      const now = performance.now();
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      deepest = Math.max(deepest, y / scrollable);
      const speed = (lastY - y) / Math.max(1, now - lastAt); // px per ms, upward positive
      if (deepest > 0.33 && y < window.innerHeight && speed > 1.5) fire();
      lastY = y;
      lastAt = now;
    };

    const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    if (touch) window.addEventListener("scroll", onScroll, { passive: true });
    else document.addEventListener("mouseout", onMouseOut);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError(t.nameError);
    const value = contact.trim();
    if (!value) return setError(t.contactError);
    if (!live) return setDone(true);

    const isEmail = value.includes("@");
    setSubmitting(true);
    setError(null);
    try {
      const attribution = marketingAttribution();
      await requestPlatformDemo({
        fullName: name.trim(),
        workEmail: isEmail ? value : "",
        phone: isEmail ? "" : value.slice(0, 20),
        academyName: t.fallbackAcademy,
        message: t.message,
        visitorId: marketingVisitorId(),
        source: attribution.utmSource ?? attribution.referrerHost,
        medium: attribution.utmMedium,
        campaign: attribution.utmCampaign,
        landingPath: window.location.pathname,
      });
      markDemoBooked();
      trackMarketingEvent("exit_intent_submitted");
      void trackDemoBooked(window.location.pathname);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  const field = "h-12 w-full !rounded-xl border border-[#EBD9C8] bg-white px-3 text-sm text-[#1C1917] shadow-none placeholder:text-[#8A817A] focus:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/25";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="theme-light-scope max-w-md !rounded-3xl border-[#EFE3D7] bg-white p-7 text-[#1C1917] sm:p-8">
        {done ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3EA] text-[#EA580C]"><CheckCircle2 className="h-7 w-7" /></span>
            <DialogTitle className="font-display text-xl font-extrabold">{t.thanks}</DialogTitle>
            {!live && <DialogDescription className="mt-2 text-sm text-[#57534E]">{t.demoMode}</DialogDescription>}
          </div>
        ) : (
          <>
            <DialogTitle className="font-display pe-6 text-[1.4rem] font-extrabold leading-tight tracking-[-0.02em] rtl:tracking-normal">{t.title}</DialogTitle>
            <DialogDescription className="text-[15px] leading-relaxed text-[#57534E]">{t.sub}</DialogDescription>
            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="exit-name" className="font-semibold">{t.name}</Label>
                <Input id="exit-name" autoComplete="name" className={field} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="exit-contact" className="font-semibold">{t.contact}</Label>
                <Input id="exit-contact" autoComplete="email" className={field} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t.contactPlaceholder} maxLength={256} />
              </div>
              {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
              <button type="submit" disabled={submitting} className={cn(CTA_ORANGE, "h-12 w-full !rounded-2xl normal-case tracking-normal")}>
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : t.submit}
              </button>
              <p className="text-center text-xs text-[#78716C]">{t.privacy}</p>
              <a
                href="https://wa.me/919344773231?text=Hi%2C%20I%27d%20like%20pricing%20for%20my%20academy."
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackMarketingEvent("whatsapp_clicked")}
                className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#166534] underline decoration-[#22C55E]/40 underline-offset-4 hover:decoration-[#166534]"
              >
                <MessageSquare className="h-4 w-4" /> {t.whatsapp}
              </a>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
