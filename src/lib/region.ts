import type { BillingInterval, PublicPlan } from "@/api/saas";

export type MarketCurrency = "INR" | "USD";

/** Approximate INR per USD, used only when a plan has no USD price configured in billing. */
export const INR_PER_USD = 85;

const INDIA_TIME_ZONES = ["Asia/Kolkata", "Asia/Calcutta"];

/** India gets INR; everywhere else gets USD. Detected from the browser time zone (no network call or consent prompt). */
export function detectMarketCurrency(): MarketCurrency {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) return INDIA_TIME_ZONES.includes(zone) ? "INR" : "USD";
  } catch {
    /* fall through to the locale check */
  }
  return typeof navigator !== "undefined" && /-IN$/i.test(navigator.language) ? "INR" : "USD";
}

/** The plan's price in the visitor's currency. A configured price always wins; USD is otherwise derived from INR. */
export function planPrice(plan: PublicPlan, interval: BillingInterval, currency: MarketCurrency): { amount: number; currency: MarketCurrency } | undefined {
  const exact = plan.prices.find((p) => p.billingInterval === interval && p.currency === currency);
  if (exact) return { amount: exact.amount, currency };
  if (currency === "USD") {
    const inr = plan.prices.find((p) => p.billingInterval === interval && p.currency === "INR");
    if (inr) return { amount: Math.round(inr.amount / INR_PER_USD), currency };
  }
  return undefined;
}

export function formatMarketPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
}
