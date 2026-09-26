import type { ClassSession } from "@/types";
import { localToUtcIso } from "@/lib/datetime";

/** How long after its scheduled end a class that was auto-marked No-Show can still be joined. */
const NO_SHOW_JOIN_GRACE_MINUTES = 30;

/**
 * Whether staff (Admin, Coordinator, RM) can drop into this class right now. Upcoming/live
 * classes always; a class the system auto-marked No-Show too while its scheduled time is still
 * running — reported live: a coordinator couldn't join a class that was actually going on
 * (people had come in late / by a direct link, so no attendance had been recorded), because
 * the Join button hid the moment the status flipped to No-Show.
 */
export function staffCanJoin(session: ClassSession, now: Date = new Date()): boolean {
  if (!session.meetingRoomId) return false;
  if (session.status === "scheduled" || session.status === "demo") return true;
  if (session.status !== "noshow") return false;
  const start = new Date(localToUtcIso(session.date, session.startTime));
  const end = new Date(start.getTime() + (session.duration + NO_SHOW_JOIN_GRACE_MINUTES) * 60_000);
  return now >= start && now <= end;
}
