import { AlertTriangle, CalendarX, Clock, Lock, VideoOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** What to tell someone whose join to a live class was refused, by the backend's own reason. */
export interface BlockedClassCopy {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Whether "Try again" makes sense (a class that hasn't opened yet or a flaky connection) or would just repeat the same answer. */
  canRetry: boolean;
}

export function describeBlockedClass(message: string, status?: number | null): BlockedClassCopy {
  if (status === 404) {
    return {
      icon: CalendarX,
      title: "We couldn't find this class",
      body: "The link may be old, or the class may have been cancelled or rescheduled. Open your schedule to find the current one.",
      canRetry: false,
    };
  }
  if (/hasn't opened|not opened|not open yet/i.test(message)) {
    return {
      icon: Clock,
      title: "This class hasn't opened yet",
      body: "You can join a few minutes before the start time. Come back then and tap Try again.",
      canRetry: true,
    };
  }
  if (/already ended|has ended/i.test(message)) {
    return {
      icon: VideoOff,
      title: "This class has ended",
      body: "It's over, so it can't be joined any more. If it was recorded, the replay appears under Recordings after a little while.",
      canRetry: false,
    };
  }
  if (status === 403 || /do not have access|not have access/i.test(message)) {
    return {
      icon: Lock,
      title: "This class isn't on your account",
      body: "Please sign in with the account that is enrolled in this class. If you think this is a mistake, contact the academy team.",
      canRetry: false,
    };
  }
  if (/no meeting room/i.test(message)) {
    return {
      icon: Clock,
      title: "This class isn't ready yet",
      body: "The classroom for this session hasn't been set up. Please try again in a few minutes.",
      canRetry: true,
    };
  }
  return {
    icon: AlertTriangle,
    title: "We couldn't connect you to the class",
    body: message || "Something went wrong while opening the classroom. Please check your connection and try again.",
    canRetry: true,
  };
}
