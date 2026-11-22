import { useState } from "react";
import { marketingLogoUrl } from "@/api/branding";
import { cn } from "@/lib/utils";

export function MarketingLogo({ className, showName = true }: { className: string; showName?: boolean }) {
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  return <>
    {status !== "unavailable" && <img src={marketingLogoUrl()} alt={showName ? "Meet to Manage" : ""}
      className={cn(className, status !== "ready" && "hidden")}
      onLoad={() => setStatus("ready")} onError={() => setStatus("unavailable")} />}
    {showName && status !== "ready" && <span className="font-display text-lg font-bold text-[#1C1917]">Meet to Manage</span>}
  </>;
}
