import { formatDay, formatMoney, type ReminderLogRow, type SubscriptionRow } from "@/api/saas";

export type Attention = { key: string; tone: "warn" | "bad" | "info"; title: string; detail: string; to: string; action: string };

/** Signup date per academy (from the tenant list). */
export type TenantAge = { id: string; createdAtUtc?: string | null };

const DAY = 86_400_000;
/** A new academy that has added no students and run no classes this long after signing up is worth a call. */
export const NOT_STARTED_AFTER_DAYS = 3;

const order: Record<Attention["tone"], number> = { bad: 0, warn: 1, info: 2 };

/**
 * What an operator should look at today: payment problems, trials ending, unpaid invoices, academies that closed
 * themselves (data waiting to be deleted), signups that never got started, and billing e-mail that failed to send.
 */
export function needsAttention(rows: SubscriptionRow[], now = Date.now(), tenants: TenantAge[] = [], reminders: ReminderLogRow[] = []): Attention[] {
  const created = new Map(tenants.map(t => [t.id, t.createdAtUtc ? new Date(t.createdAtUtc).getTime() : null]));
  const items: Attention[] = [];
  for (const s of rows) {
    if (s.status === "PastDue")
      items.push({ key: `${s.tenantId}:pastdue`, tone: "bad", title: `${s.tenantName} has an overdue payment`, detail: `Grace until ${formatDay(s.graceEndsAtUtc)}`, to: "/platform/subscriptions", action: "Open billing" });
    else if (s.status === "Suspended" || s.suspendedByBilling)
      items.push({ key: `${s.tenantId}:suspended`, tone: "bad", title: `${s.tenantName} is suspended`, detail: "Billing suspended this workspace", to: "/platform/subscriptions", action: "Open billing" });
    else if (s.status === "Cancelled")
      items.push({ key: `${s.tenantId}:closed`, tone: "info", title: `${s.tenantName} is closed`, detail: "Its data is kept. Delete the workspace in Tenant management once your retention period has passed.", to: "/platform/tenants", action: "Tenant management" });
    if (s.status === "Trialing" && s.trialEndsAtUtc) {
      const days = Math.ceil((new Date(s.trialEndsAtUtc).getTime() - now) / DAY);
      if (days <= 7) items.push({ key: `${s.tenantId}:trial`, tone: "warn", title: `${s.tenantName}'s trial ends ${days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}`, detail: `Ends ${formatDay(s.trialEndsAtUtc)}; then it moves to Free`, to: "/platform/subscriptions", action: "Extend or assign" });
    }
    if (s.openInvoices > 0)
      items.push({ key: `${s.tenantId}:invoice`, tone: "warn", title: `${s.tenantName} has ${s.openInvoices} unpaid invoice${s.openInvoices === 1 ? "" : "s"}`, detail: formatMoney(s.openAmount), to: "/platform/subscriptions", action: "See invoices" });
    // Signed up, then nothing: no students and no classes this month, a few days in. Paid or legacy academies are left alone.
    const signedUp = created.get(s.tenantId);
    if (signedUp && (s.planCode === "free" || s.status === "Trialing") && s.usage && s.usage.activeStudents === 0 && s.usage.sessionsMonth === 0) {
      const age = Math.floor((now - signedUp) / DAY);
      if (age >= NOT_STARTED_AFTER_DAYS)
        items.push({ key: `${s.tenantId}:notstarted`, tone: "info", title: `${s.tenantName} hasn't started yet`, detail: `Signed up ${age} days ago; no students or classes so far (as of ${formatDay(s.usage.date)}). A quick call often helps.`, to: `/platform/operations?tenant=${s.tenantId}`, action: "Open operations" });
    }
  }
  const failed = reminders.filter(r => r.status === "Failed" && now - new Date(r.createdAtUtc).getTime() <= 7 * DAY);
  if (failed.length > 0)
    items.push({ key: "emails:failed", tone: "bad", title: `${failed.length} billing e-mail${failed.length === 1 ? "" : "s"} failed to send this week`, detail: failed[0].error ? `Latest: ${failed[0].error.slice(0, 120)}` : "Check the delivery log for the reason.", to: "/platform/reminders", action: "Delivery log" });
  return items.sort((a, b) => order[a.tone] - order[b.tone]);
}

/** Academies that signed up within the last <paramref name="days"/> days, newest first. */
export function recentSignups<T extends TenantAge>(tenants: T[], now = Date.now(), days = 7): T[] {
  return tenants
    .filter(t => t.createdAtUtc && now - new Date(t.createdAtUtc).getTime() <= days * DAY)
    .sort((a, b) => new Date(b.createdAtUtc!).getTime() - new Date(a.createdAtUtc!).getTime());
}
