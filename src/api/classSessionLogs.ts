import { apiFetch } from "@/lib/api";
import type { ApiClassSession } from "@/api/sessions";

export type ClassSessionEventType =
  | "TeacherStarted"
  | "TeacherJoined"
  | "StudentJoined"
  | "StudentRejoined"
  | "DemoParticipantJoined"
  | "TeacherLeftClass"
  | "StudentLeft"
  | "TeacherDisconnected"
  | "StudentDisconnected"
  | "ClassEnded"
  | "TeacherNoShow"
  | "StudentNoShow"
  | "JoinDenied";

export interface ApiClassSessionEventLog {
  id: string;
  classSessionId: string;
  eventType: ClassSessionEventType;
  participantType: "Teacher" | "Student" | null;
  participantName: string | null;
  occurredAtUtc: string;
  isExpected: boolean;
  detail: string | null;
  sessionType: "Regular" | "Demo";
  teacherName: string;
  batchName: string | null;
  scheduledStartAtUtc: string;
}

export interface ClassSessionEventLogPage {
  items: ApiClassSessionEventLog[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ClassSessionLogDashboard {
  liveClasses: ApiClassSession[];
  nextClasses: ApiClassSession[];
  unexpectedEventsToday: number;
  noShowsThisWeek: number;
  statusCounts: Record<string, number>;
}

/** Live/next class status snapshot plus today's rollup counts — the dashboard header. */
export async function getClassSessionLogDashboard(): Promise<ClassSessionLogDashboard> {
  return apiFetch<ClassSessionLogDashboard>("/api/class-session-logs/dashboard");
}

/** Paged, filterable event trail — every join/leave/start/end/no-show/denial, demo or live. */
export async function listClassSessionLogs(params?: {
  fromUtc?: string;
  toUtc?: string;
  sessionId?: string;
  teacherProfileId?: string;
  eventType?: ClassSessionEventType;
  expectedOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ClassSessionEventLogPage> {
  const q = new URLSearchParams();
  if (params?.fromUtc) q.set("fromUtc", params.fromUtc);
  if (params?.toUtc) q.set("toUtc", params.toUtc);
  if (params?.sessionId) q.set("sessionId", params.sessionId);
  if (params?.teacherProfileId) q.set("teacherProfileId", params.teacherProfileId);
  if (params?.eventType) q.set("eventType", params.eventType);
  if (params?.expectedOnly !== undefined) q.set("expectedOnly", String(params.expectedOnly));
  q.set("page", String(params?.page ?? 1));
  q.set("pageSize", String(params?.pageSize ?? 25));
  return apiFetch<ClassSessionEventLogPage>(`/api/class-session-logs?${q}`);
}

/** Full chronological event timeline for one class session — the drill-down row. */
export async function getClassSessionTimeline(sessionId: string): Promise<ApiClassSessionEventLog[]> {
  return apiFetch<ApiClassSessionEventLog[]>(`/api/class-session-logs/session/${sessionId}`);
}
