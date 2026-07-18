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

/** The member's permanent personal meeting room id (Zoom-style), minted on first request. */
export async function getMyMeetingRoom(): Promise<string> {
  const { roomId } = await apiFetch<{ roomId: string }>("/api/users/me/meeting-room");
  return roomId;
}

export function isAccountApiAvailable(): boolean {
  return apiEnabled();
}
