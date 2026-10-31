import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackMarketingEvent } from "@/lib/analytics";
import { saasPublic } from "@/api/saas";
import { BTN_PRIMARY } from "./MarketingNav";

export const SALES_WHATSAPP_URL = "https://wa.me/919344773231?text=I%27d%20like%20to%20see%20Meet%20to%20Manage%20for%20my%20coaching%20centre.";

const BTN_SECONDARY = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#D9C9BA] bg-white px-7 py-3.5 text-sm font-bold shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

/** Free-trial length from the platform settings; 0 while loading or when trials are off. */
function useTrialDays() {
  const [days, setDays] = useState(0);
  useEffect(() => {
    let active = true;
    saasPublic.settings()
      .then((s) => { if (active && s.enabled && s.trialDays > 0) setDays(s.trialDays); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return days;
}

/** Calls to action for a solution page: a free trial (only when enabled), a walkthrough and WhatsApp. Stacks on mobile, wraps in a row from sm up. */
export function WalkthroughCta({ className }: { className?: string }) {
  const trialDays = useTrialDays();
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap", className)}>
      {trialDays > 0 && (
        <Link to="/signup" className={cn(BTN_PRIMARY, "justify-center")}>
          Start {trialDays}-day free trial <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      )}
      <Link
        to="/get-started"
        className={trialDays > 0
          ? cn(BTN_SECONDARY, "text-[#C2410C] hover:border-[#F4B98C] hover:bg-[#FFF8F3] focus-visible:outline-[#C2410C]")
          : cn(BTN_PRIMARY, "justify-center")}
      >
        Book a free walkthrough {trialDays === 0 && <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />}
      </Link>
      <a
        href={SALES_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackMarketingEvent("whatsapp_clicked")}
        className={cn(BTN_SECONDARY, "text-[#166534] hover:border-[#86C99A] hover:bg-[#F0FDF4] focus-visible:outline-[#166534]")}
      >
        <MessageSquare className="h-4 w-4" /> Ask on WhatsApp
      </a>
    </div>
  );
}
