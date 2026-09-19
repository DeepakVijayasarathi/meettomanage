import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/state/session";
import { getMyAccount, updateMyAccount } from "@/api/account";
import { apiEnabled } from "@/lib/api";
import { cn } from "@/lib/utils";

const DISMISS_KEY_PREFIX = "trn.tzMismatchDismissed:";

// A handful of IANA zone ids are old colonial-era names still kept as backward-compatible
// aliases (tzdata never renames a zone, only adds a link to it) -- "Asia/Kolkata" is the
// modern id, but some older seed data / integrations still store "Asia/Calcutta". Shown to
// families, not developers, so the modern city name is what belongs on screen here.
const LEGACY_CITY_NAMES: Record<string, string> = {
  Calcutta: "Kolkata",
  Bombay: "Mumbai",
  Madras: "Chennai",
};

/** Friendly label for an IANA zone, e.g. "America/New_York" -> "New York (GMT-4)" --
 *  falls back to the raw zone id if Intl can't resolve an offset for it. */
function labelForZone(zone: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    const rawCity = zone.split("/").pop()?.replace(/_/g, " ");
    const city = rawCity ? (LEGACY_CITY_NAMES[rawCity] ?? rawCity) : undefined;
    return city && offset ? `${city} (${offset})` : zone;
  } catch {
    return zone;
  }
}

/**
 * Real gap: every account defaults to Asia/Kolkata (User.TimeZoneId's own server default),
 * and nothing ever prompts a parent/teacher actually outside India to change it -- Account ->
 * Profile has a timezone picker, but a family who never opens it just sees every class time
 * as if it were IST, with no label telling them it might not be their own. This compares the
 * browser's own detected zone (Intl, not a guess) against the account's stored one on load and
 * offers a one-click switch if they disagree.
 *
 * Dismissible per detected (stored, browser) pair, not permanently -- if the account's stored
 * zone or the browser's own zone later change, it's worth asking again rather than staying
 * silent forever because of one old dismissal.
 *
 * Styled as its own elevated notification card (icon badge, clear headline/body split, a
 * corner close button) rather than a flat colored strip -- the first version crammed an icon,
 * two sentences and two buttons onto one cramped line with no visual hierarchy, which read as
 * a raw form-validation error rather than a friendly one-off nudge.
 */
export function TimezoneMismatchBanner() {
  const { timeZoneId, setTimeZoneId } = useSession();
  const [detectedZone, setDetectedZone] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiEnabled()) return;
    let zone: string;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zone || zone === timeZoneId) {
      setDetectedZone(null);
      return;
    }
    setDetectedZone(zone);
    setDismissed(localStorage.getItem(`${DISMISS_KEY_PREFIX}${timeZoneId}:${zone}`) === "1");
  }, [timeZoneId]);

  if (!detectedZone || dismissed) return null;

  function dismiss() {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${timeZoneId}:${detectedZone}`, "1");
    setDismissed(true);
  }

  async function applyDetected() {
    if (!detectedZone) return;
    setApplying(true);
    setError(null);
    try {
      // updateMyAccount is a full profile PUT (firstName/lastName required), not a partial
      // patch -- fetch the current record first so this only ever touches timeZoneId, never
      // silently blanking the name/phone the account already has.
      const current = await getMyAccount();
      const updated = await updateMyAccount({
        firstName: current.firstName,
        lastName: current.lastName,
        phone: current.phone ?? undefined,
        timeZoneId: detectedZone,
      });
      setTimeZoneId(updated.timeZoneId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't switch your timezone — try Account settings instead.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div
      role="status"
      className="relative mb-5 flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 pr-10 shadow-sm sm:flex-row sm:items-start sm:gap-4"
    >
      <button
        type="button"
        onClick={dismiss}
        disabled={applying}
        aria-label="Dismiss"
        title="Dismiss"
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-4 ring-primary/5">
        <Clock className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Class times may be showing in the wrong timezone</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          You're currently set to <span className="font-medium text-foreground">{labelForZone(timeZoneId)}</span>, but your
          device looks like it's in <span className="font-medium text-foreground">{labelForZone(detectedZone)}</span>.
        </p>
        {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={applyDetected} disabled={applying} className="gap-1.5">
            {applying ? "Switching…" : `Switch to ${labelForZone(detectedZone).split(" (")[0]}`}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={dismiss}
            disabled={applying}
            className={cn("text-muted-foreground hover:text-foreground")}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
