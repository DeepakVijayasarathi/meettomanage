/**
 * Builds a URL to the raw hosted Jitsi web client for links opened directly in a new tab
 * (not the embedded classroom, which passes the same information to the Jitsi IFrame API's
 * own `jwt`/`userInfo`/`configOverwrite` options instead — see JitsiLive.tsx). The IFrame
 * API path is the only place that was suppressing Jitsi's own prejoin name prompt; a link
 * opened this way needs the same config carried via URL hash params instead, or Jitsi stops
 * to ask the caller to type their name before joining.
 *
 * `displayName` is only worth passing (and prejoin only worth skipping) when the caller's
 * own identity is known and it's really them joining right now — never bake a name into a
 * link meant to be shared with someone else, since whoever actually opens it may not be
 * that person.
 */
export function buildJitsiJoinUrl(domain: string, room: string, token?: string | null, displayName?: string): string {
  const hashParts = [
    token ? `jwt=${token}` : null,
    displayName ? "config.prejoinConfig.enabled=false" : null,
    displayName ? `userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName))}` : null,
  ].filter((part): part is string => part !== null);
  return `https://${domain}/${room}${hashParts.length ? `#${hashParts.join("&")}` : ""}`;
}
