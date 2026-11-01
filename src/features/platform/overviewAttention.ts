import { formatDay, formatMoney, type SubscriptionRow } from "@/api/saas";

export type Attention = { key: string; tone: "warn" | "bad"; title: string; detail: string; to: string; action: string };

const DAY = 86_400_000;

/** What an operator should look at today, from the subscription list (already loaded for billing anyway). */
export function needsAttention(rows: SubscriptionRow[], now = Date.now()): Attention[] {
  const items: Attention[] = [];
  for (const s of rows) {
    if (s.status === "PastDue")
      items.push({ key: `${s.tenantId}:pastdue`, tone: "bad", title: `${s.tenantName} has an overdue payment`, detail: `Grace until ${formatDay(s.graceEndsAtUtc)}`, to: "/platform/subscriptions", action: "Open billing" });
    else if (s.status === "Suspended" || s.suspendedByBilling)
      items.push({ key: `${s.tenantId}:suspended`, tone: "bad", title: `${s.tenantName} is suspended`, detail: "Billing suspended this workspace", to: "/platform/subscriptions", action: "Open billing" });
    if (s.status === "Trialing" && s.trialEndsAtUtc) {
      const days = Math.ceil((new Date(s.trialEndsAtUtc).getTime() - now) / DAY);
      if (days <= 7) items.push({ key: `${s.tenantId}:trial`, tone: "warn", title: `${s.tenantName}'s trial ends ${days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}`, detail: `Ends ${formatDay(s.trialEndsAtUtc)}; then it moves to Free`, to: "/platform/subscriptions", action: "Extend or assign" });
    }
    if (s.openInvoices > 0)
      items.push({ key: `${s.tenantId}:invoice`, tone: "warn", title: `${s.tenantName} has ${s.openInvoices} unpaid invoice${s.openInvoices === 1 ? "" : "s"}`, detail: formatMoney(s.openAmount), to: "/platform/subscriptions", action: "See invoices" });
  }
  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1));
}
