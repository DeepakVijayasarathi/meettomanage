import { apiFetch } from "@/lib/api";
import type { NotificationItem, Role } from "@/types";

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
  /** The EmailTemplateSeedData key this was rendered from (e.g. "batch-assignment"),
   *  null for hand-built/bulk emails. See ROUTE_BY_TEMPLATE_KEY below — several
   *  distinct templates share NotificationType.General, so this is what actually
   *  tells apart "the type alone can't route this precisely" cases. */
  templateKey: string | null;
  channel: string;
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAtUtc: string;
  readAtUtc: string | null;
  /** Set when this is one recipient's copy of a Bulk Email — lets the parent
   *  Notifications page offer a reply box under it. */
  bulkEmailRecipientId: string | null;
  /** True once the parent has already replied to this Bulk Email. */
  hasReplied: boolean;
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

/**
 * Where clicking a notification should land, by recipient role and notification
 * type — derived from who each type is actually sent to server-side (see the
 * `_notificationService.SendTemplatedEmailAsync` call sites in AcademicOpsService,
 * BillingService, PayoutService, SessionService, ProgressReportService and
 * SessionReminderBackgroundService). There's no per-notification entity id
 * (session/invoice) carried through the API yet — MetadataJson exists on the
 * backend entity but nothing populates it — so this routes to the general page
 * the notification is about rather than deep-linking the exact record.
 */
const ROUTE_BY_ROLE_AND_TYPE: Partial<Record<Role, Partial<Record<ApiNotificationType, string>>>> = {
  teacher: {
    BookingConfirmation: "/teacher/classes",
    SessionReminder: "/teacher/classes",
    LeaveStatusUpdate: "/teacher/leave",
    PayoutStatement: "/teacher/payout",
    General: "/teacher",
  },
  parent: {
    SessionReminder: "/parent/schedule",
    LeaveStatusUpdate: "/parent/schedule",
    AttendanceUpdate: "/parent/schedule",
    PerformanceSummary: "/parent/schedule",
    PaymentReminder: "/parent/billing",
    PaymentReceived: "/parent/billing",
    FeeSuspension: "/parent/billing",
    General: "/parent",
  },
  admin: {
    NoShowAlert: "/admin/sessions",
    DelayedSessionAlert: "/admin/sessions",
    LeaveStatusUpdate: "/admin/leave",
    PaymentReceived: "/admin/billing",
    General: "/admin",
  },
  subadmin: {
    LeaveStatusUpdate: "/subadmin/reports",
    General: "/subadmin",
  },
};

/**
 * NotificationType is too coarse to route on its own — a third of the actual email
 * templates (see EmailTemplateSeedData.cs) share NotificationType.General despite
 * being about very different things, so every one of those fell back to the
 * type-level "General" route (the recipient's own dashboard) regardless of what
 * they were actually about. TemplateKey is the stable, non-interpolated signal
 * that tells them apart; checked first, ahead of the coarser role+type map.
 * Each template only ever goes to one audience today, so this isn't role-scoped —
 * add a role split here if a template is ever reused across roles.
 */
const ROUTE_BY_TEMPLATE_KEY: Record<string, string> = {
  "batch-assignment": "/parent/schedule",
  "leave-submitted-admin-alert": "/admin/leave",
  "weekly-kpi-digest": "/admin/reports",
  "access-request-submitted-admin-alert": "/admin/permissions",
  "access-request-reviewed": "/subadmin/permissions",
  // "welcome-credentials" / "pin-reset" intentionally unmapped — there's no page
  // more specific than the dashboard for "your account/PIN is ready".
};

/** Resolves the click-through route for one notification, or undefined if there's
 *  nowhere more specific to send the viewer than wherever they already are. */
function routeFor(type: ApiNotificationType, templateKey: string | null, role: Role | null): string | undefined {
  // Goes to both Admin and Admission, whose report pages live under different portals.
  if (templateKey === "parent-feedback-received") return role === "admission" ? "/admission/parent-feedback" : "/admin/parent-feedback";
  if (templateKey && ROUTE_BY_TEMPLATE_KEY[templateKey]) return ROUTE_BY_TEMPLATE_KEY[templateKey];
  if (!role) return undefined;
  return ROUTE_BY_ROLE_AND_TYPE[role]?.[type];
}

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

export function toNotificationItem(n: ApiNotification, role: Role | null = null): NotificationItem {
  return {
    id: n.id,
    title: n.subject || "Notification",
    // The body is the full message; keep it as the description line.
    description: n.body,
    time: relativeTime(n.createdAtUtc),
    read: n.isRead,
    type: TONE_BY_TYPE[n.type] ?? "info",
    route: routeFor(n.type, n.templateKey, role),
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
