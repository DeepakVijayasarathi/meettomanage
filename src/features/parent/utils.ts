import { differenceInCalendarDays, differenceInMinutes, format, subDays } from "date-fns";
import type { ClassSession, Resource } from "@/types";
import { SESSIONS } from "@/data/sessions";

/**
 * Fixed "now" for this mock universe (today is 2026-07-09 per the product brief).
 * Keeping it as a constant — rather than `new Date()` — makes the join-window,
 * "upcoming vs past" splits and recording-expiry countdowns deterministic for the demo.
 */
export const MOCK_NOW = new Date("2026-07-09T16:25:00");

export const TODAY_ISO = format(MOCK_NOW, "yyyy-MM-dd");
export const YESTERDAY_ISO = format(subDays(MOCK_NOW, 1), "yyyy-MM-dd");

export function sessionStart(session: ClassSession): Date {
  return new Date(`${session.date}T${session.startTime}:00`);
}

export function minutesUntilStart(session: ClassSession): number {
  return differenceInMinutes(sessionStart(session), MOCK_NOW);
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
  return differenceInCalendarDays(new Date(dateStr), MOCK_NOW);
}

/**
 * Recordings live on the ClassSession (recordingAvailable / recordingExpiresOn), not on the
 * Resource entry itself — find the session a "recording" type Resource corresponds to so we
 * can read its 15-day expiry window.
 */
export function findRecordingSession(resource: Resource): ClassSession | undefined {
  return SESSIONS.find(
    (s) => s.batchId === resource.batchId && s.date === resource.uploadedOn && s.recordingAvailable
  );
}

export function recordingExpiryLabel(session: ClassSession | undefined): { label: string; expired: boolean } {
  if (!session?.recordingExpiresOn) return { label: "Expiry unknown", expired: false };
  const days = daysUntil(session.recordingExpiresOn);
  if (days < 0) return { label: "Expired", expired: true };
  if (days === 0) return { label: "Expires today", expired: false };
  return { label: `Expires in ${days} day${days === 1 ? "" : "s"}`, expired: false };
}
