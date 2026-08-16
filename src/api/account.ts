import { apiEnabled, apiFetch } from "@/lib/api";

export interface MyAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  role: string;
  timeZoneId: string;
}

export async function getMyAccount(): Promise<MyAccount> {
  return apiFetch<MyAccount>("/api/users/me");
}

export async function updateMyAccount(input: {
  firstName: string;
  lastName: string;
  phone?: string;
  timeZoneId?: string;
}): Promise<MyAccount> {
  return apiFetch<MyAccount>("/api/users/me", { method: "PUT", body: JSON.stringify(input) });
}

export interface MyMeetingRoom {
  roomId: string;
  domain: string;
  /** Null when Jitsi token verification isn't configured on this deployment yet. */
  token: string | null;
}

/**
 * The member's permanent personal meeting room (Zoom-style), minted on first request.
 * Includes a signed join token the same way GET /api/sessions/{id}/jitsi-join does for a
 * class session — a token-enforcing Jitsi deployment refuses a room URL that doesn't carry
 * one (see the backend's JitsiLinkBuilder.BuildJoinUrl), so callers must build the URL from
 * this response's domain/token, not just the bare roomId.
 */
export async function getMyMeetingRoom(): Promise<MyMeetingRoom> {
  return apiFetch<MyMeetingRoom>("/api/users/me/meeting-room");
}

/** Mirrors the backend's JitsiLinkBuilder.BuildJoinUrl for links opened directly in a new tab
 *  (not the embedded classroom, which passes the token to the Jitsi IFrame API's own `jwt`
 *  config option instead — see JitsiLive.tsx). */
export function buildPersonalMeetingUrl(room: MyMeetingRoom): string {
  const url = `https://${room.domain}/${room.roomId}`;
  return room.token ? `${url}#jwt=${room.token}` : url;
}

export function isAccountApiAvailable(): boolean {
  return apiEnabled();
}
