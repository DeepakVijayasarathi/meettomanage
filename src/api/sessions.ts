import { apiFetch, getAccessToken, ApiError, readProblemMessage } from "@/lib/api";
import { utcIsoToLocalDateTime } from "@/lib/datetime";
import type { ClassSession, SessionStatus } from "@/types";
import type { PagedResult } from "@/api/types";

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
  parentTimeZones?: string[];
  /** Teacher's class notes, or an auto-generated one from engagement data — set on completion. */
  summary: string | null;
  /** Which of the calling parent's children this session belongs to — populated only by
   * the parent-portal schedule endpoint; empty elsewhere (Admin/Teacher lists) and for
   * demo sessions not yet tied to a specific enrolled child. */
  childIds?: string[];
  /** True when this session has at least one recording that hasn't expired yet. */
  hasRecording: boolean;
  /** When the (most recent, still-active) recording's viewing window ends — null if there's none, or it never expires. */
  recordingExpiresAtUtc: string | null;
  /** DemoBooking's own free-text child name, for a Demo-type session only — there's no Child FK to
   * link to at booking time, so this is the only way to say whose demo a session is. */
  demoChildName: string | null;
  /** Staff views: the batch's active students, or a demo's child. */
  studentNames?: string[];
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
  // The signed-in user's own timezone (getUserTimeZone), not the viewing browser's own
  // clock — a viewer whose machine's clock isn't set to their account's chosen timezone
  // (or a UTC-clocked test/CI box) would otherwise see class times shifted by whatever
  // their local offset happens to be.
  const local = utcIsoToLocalDateTime(session.scheduledStartAtUtc);

  return {
    id: session.id,
    title:
      session.batchName ??
      (session.type === "Demo" ? (session.demoChildName ? `Demo — ${session.demoChildName}` : "Demo class") : "Class session"),
    batchId: session.batchId ?? undefined,
    batchName: session.batchName ?? undefined,
    studentNames: session.studentNames ?? [],
    cancellationReason: session.cancellationReason ?? undefined,
    parentTimeZones: session.parentTimeZones ?? [],
    demoChildName: session.demoChildName ?? undefined,
    teacherId: session.teacherProfileId,
    teacherName: session.teacherName,
    childIds: session.childIds ?? [],
    date: local.date,
    startTime: local.time,
    duration: minutes,
    status: session.type === "Demo" && session.status === "Scheduled" ? "demo" : STATUS_FROM_API[session.status],
    type: session.type === "Demo" ? "demo" : "group",
    recordingAvailable: session.hasRecording,
    recordingExpiresOn: session.recordingExpiresAtUtc ?? undefined,
    meetingRoomId: session.meetingRoomId ?? undefined,
    summary: session.summary ?? undefined,
    noShowParty: session.status === "TeacherNoShow" ? "teacher" : session.status === "StudentNoShow" ? "student" : undefined,
  };
}

/**
 * Marks a session completed — accrues the teacher's payout for it, generates/stores the
 * class summary, and (for a batch session) emails it to parents. This is the *only* thing
 * that ever moves a session out of Scheduled into Completed; nothing does it automatically
 * on a timer. The live classroom (JitsiLive) is the one caller today, firing it when the
 * teacher leaves their own class.
 */
export async function completeSession(sessionId: string, summary?: string): Promise<ApiClassSession> {
  return apiFetch<ApiClassSession>(`/api/sessions/${sessionId}/complete`, {
    method: "POST",
    body: JSON.stringify(summary ? { summary } : {}),
  });
}

/**
 * Teacher feedback: "the report-writing option is also not visible after the session if we
 * do not complete the report immediately." Edits an already-completed session's notes --
 * completeSession itself refuses to run twice, so this is the only way back in once class
 * has ended. Re-emails the updated notes to the batch's parents, same as completing with
 * notes already does.
 */
export async function updateSessionSummary(sessionId: string, summary: string): Promise<ApiClassSession> {
  return apiFetch<ApiClassSession>(`/api/sessions/${sessionId}/summary`, {
    method: "PUT",
    body: JSON.stringify({ summary }),
  });
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

/** One page of the admin-wide Recordings list -- session title/teacher/when already joined
 *  in, no per-session follow-up call needed (see AdminRecordings.tsx for why that mattered). */
export interface ApiRecordingListItem {
  id: string;
  classSessionId: string;
  storageUrl: string;
  durationSeconds: number | null;
  expiresAtUtc: string | null;
  createdAtUtc: string;
  batchName: string | null;
  sessionType: "Regular" | "Demo";
  teacherName: string;
  scheduledStartAtUtc: string;
}

/**
 * Admin-only, paged, every registered recording across every class -- replaces fetching every
 * completed session then calling listRecordings once per session (the "Loading recordings..."
 * page that never seemed to finish once there were enough completed classes). `date` (a plain
 * "YYYY-MM-DD") filters to that one calendar day server-side.
 */
export async function listAllRecordings(page: number, pageSize: number, date?: string): Promise<PagedResult<ApiRecordingListItem>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (date) params.set("date", date);
  return apiFetch<PagedResult<ApiRecordingListItem>>(`/api/sessions/recordings?${params.toString()}`);
}

/**
 * Teacher-only, paged, every registered recording across this teacher's own classes -- same
 * shape and reasoning as listAllRecordings above, scoped instead of institution-wide. Replaces
 * fetching every one of the teacher's completed sessions then calling listRecordings once per
 * session (the identical N+1 pattern the admin page had, just scoped to "my classes" -- only
 * ever a matter of time before it showed the same slowdown as any one teacher's own history grew).
 */
export async function listMyRecordings(page: number, pageSize: number, date?: string): Promise<PagedResult<ApiRecordingListItem>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (date) params.set("date", date);
  return apiFetch<PagedResult<ApiRecordingListItem>>(`/api/sessions/mine/recordings?${params.toString()}`);
}

/**
 * Unregisters a recording (Admin only). Only removes the database row — the underlying
 * file in storage isn't touched, so this stops the recording from showing up anywhere in
 * the app rather than reclaiming storage space.
 */
export async function deleteRecording(sessionId: string, recordingId: string): Promise<void> {
  await apiFetch(`/api/sessions/${sessionId}/recordings/${recordingId}`, { method: "DELETE" });
}

export interface ApiClassroomSettings {
  domain: string;
  autoRecordEnabled: boolean;
  /** Admin-managed via Settings → Integrations → Jitsi Meet ("defaultLobby") — on means the
   *  teacher's own join automatically turns on the waiting room, so a student can't land
   *  straight into an unattended room before the teacher's there. */
  defaultLobbyEnabled: boolean;
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
  /** The session this join is actually for — echoes back whatever id was asked for, UNLESS
   *  that one has since been rescheduled (edited), in which case this is whatever it turned
   *  into. Callers MUST switch to using this id for anything else session-scoped for the rest
   *  of the call (the classroom hub join, engagement posts, complete-session, recording
   *  registration) — see JitsiLive.tsx's own use of it for why. */
  sessionId: string;
  room: string;
  domain: string;
  /** Null until an admin configures the "jitsi" integration's appId/appSecret. */
  token: string | null;
  /** Advisory only — nothing actually cuts the call off at this time (no duration cap on
   *  the self-hosted Jitsi deployment, see Docs/LONG_DURATION_SESSIONS.md). Used to warn
   *  the teacher when the scheduled time is up. */
  scheduledEndAtUtc: string;
  /** True for a Demo-type session — auto-recording is scoped to real, Regular classes only. */
  isDemo: boolean;
  /** Display names of every active Admin/RM/Coordinator/Counselor/Admission/Management user.
   *  Only populated for a teacher/admin caller; the classroom auto-admits a waiting-room knock
   *  from any of these so staff enter without the teacher having to let them in. */
  staffNames?: string[];
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

export interface ApiGuestLinkStudent {
  childId: string;
  childName: string;
  parentName: string;
  parentPhone: string | null;
}

/**
 * The session's batch roster for the "Copy Guest Link" student picker (GuestLinkDialog) — same
 * SessionCalendarManagement:View permission as everything else on this screen, deliberately not
 * CourseBatchManagement:View too, so an account with only session access isn't 403'd just for
 * this popup.
 */
export async function listGuestLinkStudents(sessionId: string): Promise<ApiGuestLinkStudent[]> {
  return apiFetch<ApiGuestLinkStudent[]>(`/api/sessions/${sessionId}/guest-link/students`);
}

/**
 * Mints a shareable Guest Link for this session. Pass `childId` to bind it to one specific,
 * currently-active enrollment (the /guest-join bridge page auto-fills their name, skips
 * prejoin, and marks their attendance on open); omit it for a generic guest link (the opener
 * types their own name, attendance isn't marked automatically). Returns a genuinely short
 * `/m/{slug}` URL (the backend wraps the real, much longer "/guest-join?token=<JWT>" link in a
 * ShortLink) — a raw JWT-bearing URL reads as broken/suspicious pasted into WhatsApp, and can
 * get silently truncated mid-paste, which is exactly the incident that prompted this.
 */
export async function createGuestLink(sessionId: string, childId?: string): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`/api/sessions/${sessionId}/guest-link`, {
    method: "POST",
    body: JSON.stringify({ childId }),
  });
  return url;
}

export interface ApiGuestJoin {
  sessionId: string;
  /** Set only when the link was bound to a student whose enrollment was still active at open time. */
  childId: string | null;
  room: string;
  domain: string;
  token: string | null;
  /** Pre-filled with the enrolled child's name for a student-bound link; "Guest" for a generic one. */
  displayName: string;
  /** True for a student-bound link — the bridge page should skip its own name-entry step
   *  entirely and join straight in with `displayName` already set. */
  skipPrejoin: boolean;
  /** ClassroomHub-only token (passed to JitsiLive's `hubToken` prop, same mechanism the Jibri
   *  recording-observer page already uses) — lets the guest join the real interactive
   *  classroom (whiteboard, quiz, roster, gamification), not a bare Jitsi call. */
  hubToken: string;
}

/**
 * Anonymous: resolves a Guest Link token into a live Jitsi join. Called only from the public
 * /guest-join bridge page (GuestJoin.tsx) — never by a logged-in user, and never carries an
 * auth token even if one happens to be present in this browser. Re-checked against the
 * session's LIVE status on the backend every time, so the same link can 401/400 once the class
 * ends or is marked Completed, even well before whatever the token's own expiry is.
 */
export async function guestJoin(token: string): Promise<ApiGuestJoin> {
  return apiFetch<ApiGuestJoin>("/api/sessions/guest-join", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export interface ApiRecordingObserverJoin {
  sessionId: string;
  room: string;
  domain: string;
  token: string | null;
  hubToken: string | null;
  expiresAtUtc: string;
}

/**
 * Called by RecordingObserver.tsx — the page nginx on the Jitsi server proxies Jibri's own
 * headless-Chrome navigation to instead of the bare Jitsi Meet SPA (see
 * docs/JITSI_ARCHITECTURE.md's recording-observer section). No signed-in caller; the backend
 * authorizes by "is there an InProgress ClassSession for this room right now" instead.
 * Returns undefined (backend 204s) when there's no such session — nothing for Jibri to join.
 */
export async function getRecordingObserverJoin(room: string): Promise<ApiRecordingObserverJoin | undefined> {
  return apiFetch<ApiRecordingObserverJoin | undefined>(`/api/sessions/recordings/observer-join?room=${encodeURIComponent(room)}`);
}

// A freshly-generated batch's whole schedule is created in one shot (GenerateScheduleAsync
// places every one of the course's sessions up front, however far out that runs), but a
// ±60-day fetch window only ever showed whatever fell inside the next/last 60 days. A batch
// meeting once a week for a 36-session course runs ~252 days — comfortably past 60 -- so most
// of a just-created schedule silently never showed up here at all (confirmed live: a 36-session
// batch showed only 26 sessions on the teacher's own My Classes, exactly what a ±60-day window
// clips a several-times-a-week course down to). The forward side is widened well past
// GenerateScheduleAsync's own worst case (a weekly course, ~365 days) instead of another
// arbitrary cap that would just recur for a slightly longer schedule; the backward side stays
// tight since only recent history matters there (attendance/records lookups).
/** [fromUtc, toUtc] covering `backDays` before and `aheadDays` after `around` (default now). */
export function sessionWindow(backDays: number, aheadDays: number, around: Date = new Date()): [string, string] {
  return [
    new Date(around.getTime() - backDays * 86400_000).toISOString(),
    new Date(around.getTime() + aheadDays * 86400_000).toISOString(),
  ];
}

/** The whole calendar month containing `month`, padded a week each side (the grid shows those days). */
export function monthWindow(month: Date): [string, string] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  return [new Date(start.getTime() - 7 * 86400_000).toISOString(), new Date(end.getTime() + 7 * 86400_000).toISOString()];
}

// Reported live as "APIs take 7 seconds": every staff screen (all dashboards, Sessions, both
// calendars) loaded 460 days of the WHOLE academy's classes on each visit -- 4.4 MB, 12-17 s on
// the server -- which also stalled everyone else's requests behind it. Each screen now asks for
// only the dates it shows; these defaults are for callers that don't say.
const MY_SESSIONS_DEFAULT: [number, number] = [45, 120];
const ALL_SESSIONS_DEFAULT: [number, number] = [30, 60];

/** The signed-in teacher's own sessions (default: 45 days back, 120 ahead). */
export async function listMySessions(range?: [string, string]): Promise<ApiClassSession[]> {
  const [from, to] = range ?? sessionWindow(...MY_SESSIONS_DEFAULT);
  return apiFetch<ApiClassSession[]>(`/api/sessions/mine?fromUtc=${from}&toUtc=${to}`);
}

/** Every session in the academy in [from, to] (default: 30 days back, 60 ahead). */
export async function listSessions(range?: [string, string]): Promise<ApiClassSession[]> {
  const [from, to] = range ?? sessionWindow(...ALL_SESSIONS_DEFAULT);
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

/** Edits a session: new date/time (always) plus, optionally, a new teacher and/or batch —
 *  omit either to leave it as-is. Creates a fresh linked calendar entry under the hood (same
 *  as a plain time-only reschedule always has), so history stays traceable either way. */
export async function rescheduleSession(
  id: string,
  scheduledStartAtUtc: string,
  scheduledEndAtUtc: string,
  overrides?: { teacherProfileId?: string; batchId?: string }
): Promise<ApiClassSession> {
  return apiFetch<ApiClassSession>(`/api/sessions/${id}/reschedule`, {
    method: "POST",
    body: JSON.stringify({
      scheduledStartAtUtc,
      scheduledEndAtUtc,
      teacherProfileId: overrides?.teacherProfileId,
      batchId: overrides?.batchId,
    }),
  });
}

export type NoShowParty = "Teacher" | "Student";

/**
 * Records a no-show: accrues the payout waiting-amount/deduction and carries the class
 * forward 7 days (server-side, see SessionService.MarkNoShowAsync). Admin or Teacher only.
 */
export async function markNoShow(id: string, party: NoShowParty, note?: string): Promise<ApiClassSession> {
  return apiFetch<ApiClassSession>(`/api/sessions/${id}/no-show`, {
    method: "POST",
    body: JSON.stringify({ party, note }),
  });
}

export async function cancelSession(id: string, reason: string): Promise<ApiClassSession> {
  return apiFetch<ApiClassSession>(`/api/sessions/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/** Parent cancels their own child's upcoming class — immediate, no admin approval; the teacher is emailed the reason. */
export async function cancelSessionAsParent(id: string, reason: string): Promise<ApiClassSession> {
  return apiFetch<ApiClassSession>(`/api/sessions/${id}/parent-cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export interface ApiSessionPresentation {
  id: string;
  classSessionId: string;
  originalFileName: string;
  createdAtUtc: string;
}

/** Teacher-only: uploads (replacing any prior one) the PDF deck to present live in this class. */
export async function uploadPresentation(sessionId: string, file: File): Promise<ApiSessionPresentation> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ApiSessionPresentation>(`/api/sessions/${sessionId}/presentation`, { method: "POST", body: form });
}

/** Whether a deck has been uploaded for this session yet — null if none. */
export async function getPresentation(sessionId: string): Promise<ApiSessionPresentation | null> {
  return apiFetch<ApiSessionPresentation | null>(`/api/sessions/${sessionId}/presentation`);
}

/**
 * The uploaded deck's raw bytes, for pdf.js's `getDocument({ data })` — fetched with the auth
 * token directly (not through apiFetch, which always expects/parses a JSON body) since this
 * is one binary PDF, not something to route through the JSON request/response pipeline.
 */
export async function fetchPresentationFile(sessionId: string): Promise<ArrayBuffer> {
  const token = getAccessToken();
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/presentation/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readProblemMessage(response));
  }
  return response.arrayBuffer();
}
