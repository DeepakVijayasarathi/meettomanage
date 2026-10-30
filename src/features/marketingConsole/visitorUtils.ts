import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { ApiMarketingVisitorJourneys, MarketingDateRange } from "@/api/marketing";

/** Shared by the Visitors summary, Journeys and visitor pages. */
export const RANGES = [1, 7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const when = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
export const clock = (iso: string) => new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(iso));
export const DEVICE_ICON = { mobile: Smartphone, tablet: Tablet, desktop: Monitor } as const;

let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string | null | undefined): string {
  if (!code || code === "?") return "Unknown";
  try {
    regionNames ??= new Intl.DisplayNames(undefined, { type: "region" });
    return `${regionNames.of(code) ?? code} (${code})`;
  } catch {
    return code;
  }
}

/** Range (Today / 7 / 30 / 90 / Custom) and country filter state for a visitor page. */
export function useVisitorFilters(initialDays: RangeDays = 7) {
  const [days, setDays] = useState<RangeDays>(initialDays);
  const [custom, setCustom] = useState<MarketingDateRange | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const key = `${custom ? `${custom.from}_${custom.to}` : days}-${country ?? "all"}-${page}`;
  return { days, setDays, custom, setCustom, country, setCountry, page, setPage, key };
}

export const EMPTY_JOURNEYS: ApiMarketingVisitorJourneys = {
  days: 30, startDate: "", endDate: "", totalVisitors: 0, singlePageVisitors: 0, returningVisitors: 0, chatVisitors: 0, bookedVisitors: 0,
  countries: [], entryPages: [], exitPages: [], topJourneys: [], visitsByHour: [], visitors: [], page: 1, pageSize: 25,
};
