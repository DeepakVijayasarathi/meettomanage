import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A quiet browser window around a real product screenshot: hairline border, three muted dots and
 *  a soft layered shadow. Decorative chrome is hidden from assistive tech. */
export function BrowserFrame({ children, className, url = "meettomanage.cloud/admin" }: { children: ReactNode; className?: string; url?: string }) {
  return (
    <div className={cn("overflow-hidden border border-[#E7D6C5] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.06),0_24px_48px_-24px_rgba(28,25,23,0.28),0_60px_100px_-50px_rgba(28,25,23,0.25)]", className)}>
      <div aria-hidden="true" className="flex items-center gap-2 border-b border-[#EFE3D7] bg-[#FFFBF7] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB]" />
        <span className="ms-3 truncate bg-white px-3 py-1 text-[11px] font-medium text-[#6B6560] ring-1 ring-[#EFE3D7]">{url}</span>
      </div>
      {children}
    </div>
  );
}
