import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { InlineAlert } from "@/components/InlineAlert";
import { Button } from "@/components/ui/button";
import { useSession } from "@/state/session";
import { getMyAccount, updateMyAccount } from "@/api/account";
import { apiEnabled } from "@/lib/api";

const DISMISS_KEY_PREFIX = "trn.tzMismatchDismissed:";

/** Friendly label for an IANA zone, e.g. "America/New_York" -> "New York (GMT-4)" --
 *  falls back to the raw zone id if Intl can't resolve an offset for it. */
function labelForZone(zone: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    const city = zone.split("/").pop()?.replace(/_/g, " ");
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
    <InlineAlert variant="info" bordered className="mb-4 flex-wrap items-center gap-3 sm:flex-nowrap">
      <Clock className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Class times here are shown in <strong>{labelForZone(timeZoneId)}</strong>, but your device looks like it's in{" "}
        <strong>{labelForZone(detectedZone)}</strong>. Switch so times match where you actually are?
        {error && <span className="mt-1 block text-xs font-normal text-destructive">{error}</span>}
      </span>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" onClick={dismiss} disabled={applying}>
          Not now
        </Button>
        <Button size="sm" onClick={applyDetected} disabled={applying}>
          {applying ? "Switching…" : "Switch"}
        </Button>
      </div>
    </InlineAlert>
  );
}
