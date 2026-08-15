import { apiFetch } from "@/lib/api";
import { utcIsoToIstDateTime } from "@/lib/datetime";
import type { ClassSession, SessionStatus } from "@/types";

export interface ApiClassSession {
  id: string;
  batchId: string | null;
  batchName: string | null;
  teacherProfileId: string;
  teacherName: string;
  type: "Regular" | "Demo";
  status:
    | "Scheduled"
    | "InProgress"
    | "Completed"
    | "Cancelled"
    | "Rescheduled"
    | "TeacherNoShow"
    | "StudentNoShow"
    | "CarriedForward";
  scheduledStartAtUtc: string;
  scheduledEndAtUtc: string;
  meetingRoomId: string | null;
  rescheduledFromSessionId: string | null;
  cancellationReason: string | null;
  /** Which of the calling parent's children this session belongs to — populated only by
   * the parent-portal schedule endpoint; empty elsewhere (Admin/Teacher lists) and for
   * demo sessions not yet tied to a specific enrolled child. */
  childIds?: string[];
}

const STATUS_FROM_API: Record<ApiClassSession["status"], SessionStatus> = {
  Scheduled: "scheduled",
  InProgress: "scheduled",
  Completed: "completed",
  Cancelled: "cancelled",
  Rescheduled: "rescheduled",
  TeacherNoShow: "noshow",
  StudentNoShow: "noshow",
  CarriedForward: "scheduled",
};

export function toFrontendSession(session: ApiClassSession): ClassSession {
  const start = new Date(session.scheduledStartAtUtc);
  const end = new Date(session.scheduledEndAtUtc);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  // IST, not the viewing browser's own clock — a viewer whose machine isn't set to IST
  // (a different timezone, or a UTC-clocked test/CI box) would otherwise see class times
  // shifted by whatever their local offset happens to be.
  const ist = utcIsoToIstDateTime(session.scheduledStartAtUtc);

  return {
    id: session.id,
    title: session.batchName ?? (session.type === "Demo" ? "Demo class" : "Class session"),
    batchId: session.batchId ?? undefined,
    teacherId: session.teacherProfileId,
    teacherName: session.teacherName,
    childIds: session.childIds ?? [],
    date: ist.date,
    startTime: ist.time,
    duration: ([30, 45, 60].includes(minutes) ? minutes : 45) as ClassSession["duration"],
    status: session.type === "Demo" && session.status === "Scheduled" ? "demo" : STATUS_FROM_API[session.status],
    type: session.type === "Demo" ? "demo" : "group",
    meetingRoomId: session.meetingRoomId ?? undefined,
  };
}

/** Personal iCalendar feed URL (absolute) for external calendar apps — created server-side on first request. */
export async function getCalendarFeedUrl(): Promise<string> {
  const { url } = await apiFetch<{ url: string }>("/api/sessions/calendar/feed-url");
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  return `${baseUrl}${url}`;
}

export interface ApiSessionRecording {
  id: string;
  classSessionId: string;
  storageUrl: string;
  durationSeconds: number | null;
  expiresAtUtc: string | null;
  createdAtUtc: string;
}

/**
 * Registers a recording against the session (15-day parent window). Auto-called by the
 * live classroom when Jitsi/Jibri hands back a recording link; also exposed as a manual
 * fallback (teacher/admin pastes a URL) for classes recorded outside the automated pipeline.
 */
export async function registerRecording(sessionId: string, storageUrl: string, durationSeconds?: number): Promise<void> {
  await apiFetch(`/api/sessions/${sessionId}/recordings`, {
    method: "POST",
    body: JSON.stringify({ storageUrl, durationSeconds }),
  });
}

/** Recordings already registered against a session (Admin/Teacher only). */
export async function listRecordings(sessionId: string): Promise<ApiSessionRecording[]> {
  return apiFetch<ApiSessionRecording[]>(`/api/sessions/${sessionId}/recordings`);
}

export interface ApiClassroomSettings {
  domain: string;
  autoRecordEnabled: boolean;
}

/**
 * Non-secret Jitsi settings for whoever is about to join a live class. `autoRecordEnabled`
 * is admin-managed via Settings → Integrations → Jitsi Meet ("autoRecord" config field) —
 * on means the classroom auto-starts recording when the host joins, off means recording is
 * left to the manual "Recording" fallback on teacher My Classes (registerRecording above).
 */
export async function getClassroomSettings(): Promise<ApiClassroomSettings> {
  return apiFetch<ApiClassroomSettings>("/api/sessions/classroom-settings");
}

export interface ApiJitsiJoin {
  room: string;
  domain: string;
  /** Null until an admin configures the "jitsi" integration's appId/appSecret. */
  token: string | null;
}

/**
 * Authorizes the caller for this exact session (same check as the classroom SignalR hub:
 * Admin, the assigned teacher, or a parent with a child enrolled in the session's batch)
 * and returns a signed, room-scoped join token when the deployment is configured for one.
 * Call this right before joining rather than trusting a room name carried in route state —
 * defense in depth, and the only source of a usable token.
 */
export async function getJitsiJoin(sessionId: string): Promise<ApiJitsiJoin> {
  return apiFetch<ApiJitsiJoin>(`/api/sessions/${sessionId}/jitsi-join`);
}

/** The signed-in teacher's own sessions in a ±60-day window. */
export async function listMySessions(): Promise<ApiClassSession[]> {
  const from = new Date(Date.now() - 60 * 86400_000).toISOString();
  const to = new Date(Date.now() + 60 * 86400_000).toISOString();
  return apiFetch<ApiClassSession[]>(`/api/sessions/mine?fromUtc=${from}&toUtc=${to}`);
}

/** Admin/coordinator calendar: every session in a ±60-day window. */
export async function listSessions(): Promise<ApiClassSession[]> {
  const from = new Date(Date.now() - 60 * 86400_000).toISOString();
  const to = new Date(Date.now() + 60 * 86400_000).toISOString();
  return apiFetch<ApiClassSession[]>(`/api/sessions?fromUtc=${from}&toUtc=${to}`);
}

/** Schedules one session (regular needs a batch; demo doesn't). */
export async function scheduleSession(input: {
  batchId?: string;
  teacherProfileId: string;
  type: "Regular" | "Demo";
  scheduledStartAtUtc: string;
  scheduledEndAtUtc: string;
}): Promise<ApiClassSession> {
  return apiFetch<ApiClassSession>("/api/sessions", { method: "POST", body: JSON.stringify(input) });
}

export async function rescheduleSession(
  id: string,
  scheduledStartAtUtc: string,
  scheduledEndAtUtc: string
): Promise<ApiClassSession> {
  return apiFetch<ApiClassSession>(`/api/sessions/${id}/reschedule`, {
    method: "POST",
    body: JSON.stringify({ scheduledStartAtUtc, scheduledEndAtUtc }),
  });
}

export async function cancelSession(id: string, reason: string): Promise<ApiClassSession> {
  return apiFetch<ApiClassSession>(`/api/sessions/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
