import { apiFetch } from "@/lib/api";

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
  /** The signed-in member's own account id — doubles as this room's ClassroomHub
   *  `sessionId` (see ClassroomHub.JoinSession's isPersonalRoomOwner check), so
   *  PersonalMeetingRoom.tsx can hand it to JitsiLive to get the Interactive panel. */
  ownerId: string;
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

/**
 * A short, shareable redirect to the same room getMyMeetingRoom builds — the long form
 * (domain/room?jwt=<huge signed token>) reads as broken/suspicious pasted into WhatsApp or
 * email. Mints a fresh one per call (backend: 6h expiry, matching the token it wraps).
 */
export async function getMyMeetingRoomShortLink(): Promise<{ url: string; expiresAtUtc: string }> {
  return apiFetch<{ url: string; expiresAtUtc: string }>("/api/users/me/meeting-room/short-link");
}

export interface PersonalRoomGuestJoin {
  room: string;
  domain: string;
  /** Null when Jitsi token verification isn't configured on this deployment yet. */
  token: string | null;
  /** Authenticates this guest's own ClassroomHub connection (see CreateGuestClassroomHubToken)
   *  — passed to JitsiLive as `hubToken`, same as a class Guest Link's own hubToken. */
  hubToken: string;
  ownerId: string;
  ownerName: string;
}

/**
 * Backs the public /join/personal/:ownerId page (PersonalRoomGuestJoin.tsx) that a fresh
 * Personal Meeting Room invite link now opens — no login, the owner's account id in the URL is
 * the only credential, same trust model the old direct-to-Jitsi redirect already used.
 */
export async function getPersonalRoomGuestJoin(ownerId: string): Promise<PersonalRoomGuestJoin> {
  return apiFetch<PersonalRoomGuestJoin>(`/api/users/${ownerId}/meeting-room/guest-join`);
}

