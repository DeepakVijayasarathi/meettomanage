import { apiFetch } from "@/lib/api";
import type { NotificationItem } from "@/types";

/** Backend NotificationType enum names. */
type ApiNotificationType =
  | "BookingConfirmation"
  | "SessionReminder"
  | "NoShowAlert"
  | "DelayedSessionAlert"
  | "PaymentReminder"
  | "PaymentReceived"
  | "FeeSuspension"
  | "LeaveStatusUpdate"
  | "AttendanceUpdate"
  | "PerformanceSummary"
  | "PayoutStatement"
  | "General";

export interface ApiNotification {
  id: string;
  type: ApiNotificationType;
  channel: string;
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAtUtc: string;
  readAtUtc: string | null;
}

export interface ApiNotificationFeed {
  unreadCount: number;
  items: ApiNotification[];
}

// Maps each backend notification type onto the bell's four visual tones.
const TONE_BY_TYPE: Record<ApiNotificationType, NotificationItem["type"]> = {
  BookingConfirmation: "success",
  PaymentReceived: "success",
  SessionReminder: "info",
  AttendanceUpdate: "info",
  PerformanceSummary: "info",
  PayoutStatement: "info",
  LeaveStatusUpdate: "info",
  General: "info",
  PaymentReminder: "warning",
  DelayedSessionAlert: "warning",
  NoShowAlert: "danger",
  FeeSuspension: "danger",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.round(hr / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function toNotificationItem(n: ApiNotification): NotificationItem {
  return {
    id: n.id,
    title: n.subject || "Notification",
    // The body is the full message; keep it as the description line.
    description: n.body,
    time: relativeTime(n.createdAtUtc),
    read: n.isRead,
    type: TONE_BY_TYPE[n.type] ?? "info",
  };
}

export async function getMyNotifications(take = 30): Promise<ApiNotificationFeed> {
  return apiFetch<ApiNotificationFeed>(`/api/notifications/mine?take=${take}`);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch<void>(`/api/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<void>("/api/notifications/read-all", { method: "POST" });
}
