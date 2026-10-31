/**
 * Remembers when the home-page chat greeting popup should stay away. Kept apart from
 * HomeChat (lazy-loaded) so the Get Started form can use it without pulling the chat in.
 */
const CHAT_TEASER_SEEN_KEY = "trn.chatTeaser.seen";
/** Stored instead of a timestamp once the visitor has booked a demo: never show it again. */
const BOOKED = "booked";
/** After the visitor closes (or opens) the greeting popup, it stays away for this long. */
const QUIET_MS = 7 * 24 * 60 * 60 * 1000;

export function teaserRecentlySeen(): boolean {
  try {
    const value = localStorage.getItem(CHAT_TEASER_SEEN_KEY);
    if (value === BOOKED) return true;
    const seenAt = Number(value);
    return seenAt > 0 && Date.now() - seenAt < QUIET_MS;
  } catch {
    return false;
  }
}

/** The visitor closed or opened the popup: quiet for 7 days (a booking stays permanent). */
export function markTeaserSeen() {
  try {
    if (localStorage.getItem(CHAT_TEASER_SEEN_KEY) !== BOOKED) localStorage.setItem(CHAT_TEASER_SEEN_KEY, String(Date.now()));
  } catch {
    /* nothing to persist to */
  }
}

/** True once this browser has booked a demo (chat, form or popup). */
export function demoAlreadyBooked(): boolean {
  try {
    return localStorage.getItem(CHAT_TEASER_SEEN_KEY) === BOOKED;
  } catch {
    return false;
  }
}

/** The visitor booked a demo (chat or form): they're already a lead, so never show it again. */
export function markDemoBooked() {
  try {
    localStorage.setItem(CHAT_TEASER_SEEN_KEY, BOOKED);
  } catch {
    /* nothing to persist to */
  }
}
