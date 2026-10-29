/**
 * Website analytics for the public marketing site only — Google Analytics 4, Google Tag Manager
 * and Meta Pixel, each switched on by pasting its ID into the marketing console's Analytics page
 * (stored as public analytics.* settings; blank = off). Tags load lazily on the first marketing
 * page view (see <Seo>), never on the login or portal screens, and page views are sent
 * explicitly per marketing route rather than by the tags' own history tracking — so a visitor
 * who signs in and moves into a portal isn't reported page-by-page.
 *
 * IDs are format-checked before they go anywhere near a script URL; a malformed value is
 * ignored rather than injected.
 */
import { apiEnabled, apiFetch } from "@/lib/api";
import { getPublicSettings, toSettingsMap } from "@/api/settings";

export const ANALYTICS_KEYS = {
  ga: "analytics.gaMeasurementId",
  gtm: "analytics.gtmContainerId",
  pixel: "analytics.metaPixelId",
} as const;

export const ANALYTICS_ID_PATTERNS = {
  ga: /^G-[A-Z0-9]{4,20}$/,
  gtm: /^GTM-[A-Z0-9]{4,20}$/,
  pixel: /^\d{6,20}$/,
} as const;

type AnalyticsIds = { ga?: string; gtm?: string; pixel?: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
  }
}

let ids: AnalyticsIds = {};
let loaded: Promise<void> | null = null;
let installed = false;

function pick(map: Record<string, string | null>, key: string, pattern: RegExp): string | undefined {
  const value = map[key]?.trim();
  return value && pattern.test(value) ? value : undefined;
}

function load(): Promise<void> {
  if (!loaded) {
    loaded = (async () => {
      if (!apiEnabled()) return;
      try {
        const map = toSettingsMap(await getPublicSettings());
        ids = {
          ga: pick(map, ANALYTICS_KEYS.ga, ANALYTICS_ID_PATTERNS.ga),
          gtm: pick(map, ANALYTICS_KEYS.gtm, ANALYTICS_ID_PATTERNS.gtm),
          pixel: pick(map, ANALYTICS_KEYS.pixel, ANALYTICS_ID_PATTERNS.pixel),
        };
      } catch {
        ids = {};
      }
    })();
  }
  return loaded;
}

function addScript(src: string) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function install() {
  if (installed) return;
  installed = true;

  if (ids.ga || ids.gtm) {
    window.dataLayer = window.dataLayer ?? [];
  }
  if (ids.ga) {
    window.gtag = function gtag() {
      // gtag.js reads the Arguments object itself, not an array copy.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", ids.ga, { send_page_view: false });
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids.ga)}`);
  }
  if (ids.gtm) {
    window.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" });
    addScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(ids.gtm)}`);
  }
  if (ids.pixel) {
    // Meta's standard bootstrap: queue calls until fbevents.js loads and drains them.
    type Fbq = NonNullable<Window["fbq"]> & { queue: unknown[] };
    const fbq: Fbq = Object.assign(
      (...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
      },
      { queue: [] as unknown[] }
    );
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    window.fbq = fbq;
    window._fbq = fbq;
    addScript("https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", ids.pixel);
  }
}

const VISITOR_KEY = "mtm.visitorId";
const ATTRIBUTION_KEY = "mtm.marketingAttribution";

export type MarketingAttribution = {
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export function browserCountry(): string | undefined {
  try {
    const region = new Intl.Locale(navigator.language).region;
    return region?.toUpperCase();
  } catch {
    return navigator.language.match(/[-_]([A-Za-z]{2})\b/)?.[1]?.toUpperCase();
  }
}

/** Random per-browser id for counting unique visitors on the first-party dashboard; identifies no one. */
function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `ephemeral-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * Preserve campaign attribution for the browser tab. SPA navigation removes the landing
 * page's UTM query string, so reading only the current URL made later page views and chat
 * starts look like direct traffic. The stored values are campaign labels only, never form data.
 */
export function marketingAttribution(): MarketingAttribution {
  const params = new URLSearchParams(window.location.search);
  let referrerHost: string | undefined;
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.host !== window.location.host) referrerHost = ref.host;
  } catch {
    /* unparseable referrer -- treat as direct */
  }
  const current: MarketingAttribution = {
    referrerHost,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
  const hasCurrent = Object.values(current).some(Boolean);
  try {
    if (hasCurrent) {
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(current));
      return current;
    }
    const stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) ?? "null") as MarketingAttribution | null;
    if (stored && typeof stored === "object") return stored;
  } catch {
    /* Storage can be unavailable or contain stale invalid JSON; current attribution still works. */
  }
  return current;
}

/** First-party beacon to the marketing console's own dashboard; never blocks or throws. */
function beacon(type: "page_view" | "chat_started", path: string) {
  if (!apiEnabled()) return;
  void apiFetch<void>("/api/marketing/track", {
    method: "POST",
    keepalive: true,
    body: JSON.stringify({ type, path, visitorId: visitorId(), country: browserCountry(), ...marketingAttribution() }),
  }).catch(() => {
    /* analytics must never get in a visitor's way */
  });
}

/** The visitor sent their first message to the sales chat assistant. */
export function trackChatStarted(): void {
  beacon("chat_started", window.location.pathname);
}

/** Called by each public marketing page (via <Seo>) once it renders. */
export async function trackMarketingPageView(path: string, title: string): Promise<void> {
  beacon("page_view", path);
  await load();
  if (!ids.ga && !ids.gtm && !ids.pixel) return;
  install();
  const location = `${window.location.origin}${path}`;
  window.gtag?.("event", "page_view", { page_path: path, page_location: location, page_title: title });
  if (ids.gtm) window.dataLayer?.push({ event: "marketing_page_view", page_path: path, page_title: title });
  window.fbq?.("track", "PageView");
}
