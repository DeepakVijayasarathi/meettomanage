import { MessageSquare, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trackMarketingEvent } from "@/lib/analytics";
import { useLang } from "@/lib/i18n";
import { COPY } from "./home/copy";

const WHATSAPP_URL = "https://wa.me/919344773231";

export function FloatingWhatsApp() {
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const whatsappLabel = lang === "ar" ? "واتساب" : "WhatsApp";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const number = "+91 93447 73231";

  return (
    <div className="fixed bottom-6 right-5 z-40" ref={panelRef}>
      {open && (
        <div className="absolute bottom-16 right-0 w-80 rounded-2xl border border-[#E5DCCD] bg-white shadow-[0_16px_40px_-20px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between border-b border-[#EFE3D7] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1C1917]">WhatsApp</p>
                <p className="text-xs text-[#786D60]">{number}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-full border border-[#E5DCCD] bg-white text-[#786D60] transition-colors hover:bg-[#FFF6EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-5">
            <p className="text-sm leading-relaxed text-[#57534E]">
              {lang === "ar"
                ? "تحدث معنا مباشرة على واتساب. سنرد خلال دقائق خلال ساعات العمل."
                : "Chat with us directly on WhatsApp. We reply within minutes during business hours."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hi, I'd like to know more about Meet to Manage for my coaching centre.")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackMarketingEvent("whatsapp_clicked")}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1DA851]"
              >
                <MessageSquare className="h-4 w-4" />
                {lang === "ar" ? "ابدأ المحادثة" : "Start a conversation"}
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(number);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-colors",
                  copied
                    ? "border-[#22804B] bg-[#F0FAF3] text-[#166534]"
                    : "border-[#E5DCCD] bg-white text-[#57534E] hover:border-[#C2410C] hover:bg-[#FFF6EE] hover:text-[#C2410C]"
                )}
              >
                {copied ? "✓" : "📋"}
                {copied ? "Copied!" : lang === "ar" ? "نسخ الرقم" : "Copy number"}
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_4px_16px_rgba(37,211,102,0.4)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    </div>
  );
}
