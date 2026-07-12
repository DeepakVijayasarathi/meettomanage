import { apiEnabled, apiFetch } from "@/lib/api";

export type EngagementType =
  | "QuizAttempt"
  | "QuizCorrect"
  | "ActivityClick"
  | "ActivityCompleted"
  | "WhiteboardInteraction"
  | "HandRaise"
  | "AttentionPing";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fire-and-forget engagement signal from the live classroom. No-ops in demo
 * mode or when the classroom was opened with a mock (non-GUID) session id,
 * and never throws — tracking must not disturb the class.
 */
export function postEngagement(
  sessionId: string | undefined,
  participantName: string,
  type: EngagementType,
  value = 1
): void {
  if (!apiEnabled() || !sessionId || !GUID_RE.test(sessionId)) return;
  apiFetch<void>(`/api/sessions/${sessionId}/engagement`, {
    method: "POST",
    body: JSON.stringify({ events: [{ participantName, type, value }] }),
  }).catch(() => undefined);
}
