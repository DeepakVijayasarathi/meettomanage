import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Info } from "lucide-react";
import { apiEnabled } from "@/lib/api";
import { saasTenant, type TenantSaasStatus } from "@/api/saas";

/**
 * Admin-portal strip for the client's own platform subscription: trial days left, an overdue invoice,
 * or a scheduled cancellation. Renders nothing when nothing needs attention, the tenant is not on a billing
 * plan, or the request fails (a billing hiccup must never get in the way of teaching).
 */
export function SubscriptionBanner() {
  const [banner, setBanner] = useState<TenantSaasStatus["banner"]>(null);

  useEffect(() => {
    if (!apiEnabled()) return;
    let active = true;
    void saasTenant.banner().then((r) => { if (active) setBanner(r.banner ?? null); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (!banner) return null;
  const danger = banner.level === "danger";
  const Icon = danger ? AlertTriangle : Info;
  return (
    <div role="status" className={`mb-4 flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm ${danger ? "border-destructive/30 bg-destructive/10 text-destructive" : banner.level === "warning" ? "border-warning/40 bg-warning/15" : "border-primary/20 bg-primary/5"}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{banner.message}</span>
      <Link to="/admin/subscription" className="font-semibold underline-offset-4 hover:underline">Manage subscription</Link>
    </div>
  );
}
