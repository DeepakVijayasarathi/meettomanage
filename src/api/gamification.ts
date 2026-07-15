import { apiEnabled, apiFetch } from "@/lib/api";

export type AwardKind = "Star" | "Badge" | "Milestone";

export interface ApiLeaderboardEntry {
  participantName: string;
  stars: number;
  badges: string[];
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fire-and-forget award persistence from the live classroom (stars auto-create
 * milestones server-side). Never throws — gamification must not disturb the class.
 */
export function postAward(
  sessionId: string | undefined,
  participantName: string,
  kind: AwardKind = "Star",
  points = 1,
  label?: string
): void {
  if (!apiEnabled() || !sessionId || !GUID_RE.test(sessionId)) return;
  apiFetch<void>("/api/gamification/awards", {
    method: "POST",
    body: JSON.stringify({ sessionId, participantName, kind, points, label }),
  }).catch(() => undefined);
}

/** Persisted leaderboard — session-scoped when a sessionId is given, all-time otherwise. */
export async function getLeaderboard(sessionId?: string, top = 10): Promise<ApiLeaderboardEntry[]> {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  params.set("top", String(top));
  return apiFetch<ApiLeaderboardEntry[]>(`/api/gamification/leaderboard?${params}`);
}
