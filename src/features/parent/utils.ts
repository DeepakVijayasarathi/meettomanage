import { addDays, differenceInCalendarDays, differenceInMinutes, format, subDays } from "date-fns";
import type { ClassSession, Resource } from "@/types";
import { SESSIONS } from "@/data/sessions";
import { apiEnabled } from "@/lib/api";
import { localToUtcIso } from "@/lib/datetime";

/**
 * Fixed "now" for this mock universe (today is 2026-07-09 per the product brief).
 * Keeping it as a constant — rather than `new Date()` — makes the join-window,
 * "upcoming vs past" splits and recording-expiry countdowns deterministic for the demo.
 */
export const MOCK_NOW = new Date("2026-07-09T16:25:00");

export const TODAY_ISO = format(MOCK_NOW, "yyyy-MM-dd");
export const YESTERDAY_ISO = format(subDays(MOCK_NOW, 1), "yyyy-MM-dd");

/** Real clock against real API sessions; the fixed demo clock against mock data. */
function now(): Date {
  return apiEnabled() ? new Date() : MOCK_NOW;
}

// session.date/startTime are the signed-in user's own timezone's wall-clock values (see
// toFrontendSession) — parse them the same way rather than the browser's own timezone, so
// join-window checks (isJoinable, minutesUntilStart) are correct no matter what
// machine/clock this runs on. Demo mode's mock SESSIONS data uses the same date/time
// shape, so this applies uniformly either way.
export function sessionStart(session: ClassSession): Date {
  return new Date(localToUtcIso(session.date, session.startTime));
}

export function minutesUntilStart(session: ClassSession): number {
  return differenceInMinutes(sessionStart(session), now());
}

const JOINABLE_STATUSES: ClassSession["status"][] = ["scheduled", "demo", "rescheduled"];

/** A class is joinable from 10 minutes before start until its scheduled duration has elapsed. */
export function isJoinable(session: ClassSession): boolean {
  if (!JOINABLE_STATUSES.includes(session.status)) return false;
  const minsUntil = minutesUntilStart(session);
  return minsUntil <= 10 && minsUntil > -session.duration;
}

export function joinHint(session: ClassSession): string {
  const minsUntil = minutesUntilStart(session);
  if (minsUntil > 10) {
    return `Join opens 10 min before start — ${format(sessionStart(session), "d MMM, h:mm a")}`;
  }
  if (minsUntil <= -session.duration) return "This class has ended";
  return "Ready to join";
}

export function compareSessionAsc(a: ClassSession, b: ClassSession): number {
  return sessionStart(a).getTime() - sessionStart(b).getTime();
}

export function compareSessionDesc(a: ClassSession, b: ClassSession): number {
  return sessionStart(b).getTime() - sessionStart(a).getTime();
}

export function daysUntil(dateStr: string): number {
  return differenceInCalendarDays(new Date(dateStr), now());
}

/**
 * Recordings live on the ClassSession (recordingAvailable / recordingExpiresOn), not on the
 * Resource entry itself — find the session a "recording" type Resource corresponds to so we
 * can read its 15-day expiry window.
 */
export function findRecordingSession(resource: Resource): ClassSession | undefined {
  // The mock session lookup is demo-only — a real API resource must never pick up a
  // fabricated expiry from the demo SESSIONS table.
  if (apiEnabled()) return undefined;
  return SESSIONS.find(
    (s) => s.batchId === resource.batchId && s.date === resource.uploadedOn && s.recordingAvailable
  );
}

/** Shared by recordingExpiryLabel (mock ClassSession) and the real Recordings page (real SessionRecording.expiresAtUtc). */
export function expiryLabelFor(expiresOn: string | undefined): { label: string; expired: boolean } {
  if (!expiresOn) return { label: "Expiry unknown", expired: false };
  const days = daysUntil(expiresOn);
  if (days < 0) return { label: "Expired", expired: true };
  if (days === 0) return { label: "Expires today", expired: false };
  return { label: `Expires in ${days} day${days === 1 ? "" : "s"}`, expired: false };
}

export function recordingExpiryLabel(session: ClassSession | undefined): { label: string; expired: boolean } {
  return expiryLabelFor(session?.recordingExpiresOn);
}

/**
 * API mode: recording-type Resources have no dedicated expiry field, but they do
 * carry a real upload date (uploadedOn, from the API's createdAtUtc) — enforce the
 * same "15 days after class" policy the Recordings tab already advertises, rather
 * than showing "Expiry unknown" and letting every recording stay watchable forever.
 */
export function recordingExpiryFromUpload(resource: Resource): { label: string; expired: boolean } {
  if (!resource.uploadedOn) return { label: "Expiry unknown", expired: false };
  const expiresOn = format(addDays(new Date(`${resource.uploadedOn}T00:00:00`), 15), "yyyy-MM-dd");
  return expiryLabelFor(expiresOn);
}
