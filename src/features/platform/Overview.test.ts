import { describe, expect, it } from "vitest";
import { needsAttention } from "./overviewAttention";
import type { SubscriptionRow } from "@/api/saas";

const now = new Date("2026-11-01T12:00:00Z").getTime();
const row = (patch: Partial<SubscriptionRow>): SubscriptionRow => ({
  tenantId: "t", tenantCode: "a", tenantName: "Acad", tenantStatus: "Active", id: "s", planCode: "free", planName: "Free", status: "Active",
  price: null, trialEndsAtUtc: null, currentPeriodEndUtc: null, graceEndsAtUtc: null, cancelAtPeriodEnd: false, suspendedByBilling: false, mrr: 0,
  usage: null, openInvoices: 0, openAmount: 0, ...patch,
});

describe("needsAttention", () => {
  it("is empty when nothing is wrong", () => {
    expect(needsAttention([row({}), row({ status: "Trialing", trialEndsAtUtc: "2026-11-30T00:00:00Z" })], now)).toEqual([]);
  });
  it("flags overdue first, then trials ending this week and unpaid invoices", () => {
    const items = needsAttention([
      row({ tenantId: "a", tenantName: "Trial Co", status: "Trialing", trialEndsAtUtc: "2026-11-04T12:00:00Z" }),
      row({ tenantId: "b", tenantName: "Late Co", status: "PastDue", graceEndsAtUtc: "2026-11-05T00:00:00Z", openInvoices: 1, openAmount: 3538.82 }),
    ], now);
    expect(items[0].title).toBe("Late Co has an overdue payment");
    expect(items.map(i => i.title)).toContain("Trial Co's trial ends in 3 days");
    expect(items.map(i => i.title)).toContain("Late Co has 1 unpaid invoice");
  });
});
