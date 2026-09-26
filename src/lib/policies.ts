import { useEffect, useState } from "react";
import { apiEnabled } from "@/lib/api";
import { getPublicSettings, toSettingsMap } from "@/api/settings";

/** Admin-tunable admission / class policies, read from the anonymous public settings. */
export interface Policies {
  /** Link to the full Terms & Conditions document (Settings -> Notifications). */
  termsUrl: string | null;
  /** Inline Terms & Conditions text shown before a payment. */
  termsText: string | null;
  /** A parent may cancel a class until this many minutes before it starts. */
  cancelCutoffMinutes: number;
}

export const DEFAULT_CANCEL_CUTOFF_MINUTES = 60;

export const POLICY_KEYS = {
  termsUrl: "admission.termsUrl",
  termsText: "admission.termsText",
  cancelCutoffMinutes: "parent.cancelCutoffMinutes",
} as const;

const DEFAULTS: Policies = { termsUrl: null, termsText: null, cancelCutoffMinutes: DEFAULT_CANCEL_CUTOFF_MINUTES };

let cached: Policies | null = null;
let inflight: Promise<Policies> | null = null;

function load(): Promise<Policies> {
  inflight ??= getPublicSettings()
    .then((list) => {
      const map = toSettingsMap(list);
      const cutoff = Number(map[POLICY_KEYS.cancelCutoffMinutes]);
      cached = {
        termsUrl: map[POLICY_KEYS.termsUrl]?.trim() || null,
        termsText: map[POLICY_KEYS.termsText]?.trim() || null,
        cancelCutoffMinutes:
          map[POLICY_KEYS.cancelCutoffMinutes] != null && Number.isFinite(cutoff) && cutoff >= 0 ? cutoff : DEFAULT_CANCEL_CUTOFF_MINUTES,
      };
      return cached;
    })
    .catch(() => {
      // A failed read must never block paying or cancelling: fall back to the documented defaults
      // (the server enforces the real cut-off regardless of what the screen believes).
      inflight = null;
      return DEFAULTS;
    });
  return inflight;
}

export function usePolicies(): Policies {
  const [policies, setPolicies] = useState<Policies>(cached ?? DEFAULTS);
  useEffect(() => {
    if (!apiEnabled() || cached) return;
    let cancelled = false;
    load().then((p) => !cancelled && setPolicies(p));
    return () => {
      cancelled = true;
    };
  }, []);
  return policies;
}
