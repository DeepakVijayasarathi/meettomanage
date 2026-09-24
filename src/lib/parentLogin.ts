/**
 * Parents with no email sign in with their mobile number. Behind the scenes their account (and
 * their demo bookings) carry an internal login key on this reserved domain -- mirrors the
 * backend's ParentLogin. It must never be shown or sent anywhere as if it were a real address.
 */
const NO_EMAIL_DOMAIN = "@no-email.invalid";

export function isNoEmail(email: string | null | undefined): boolean {
  return !email || email.trim().toLowerCase().endsWith(NO_EMAIL_DOMAIN);
}

/** A real email as-is; the internal key (or nothing) becomes "" so inputs start blank. */
export function realEmail(email: string | null | undefined): string {
  return isNoEmail(email) ? "" : email!.trim();
}

/** For display: the email, or a plain note that this parent is on WhatsApp only. */
export function displayEmail(email: string | null | undefined): string {
  return isNoEmail(email) ? "No email (WhatsApp)" : email!.trim();
}
