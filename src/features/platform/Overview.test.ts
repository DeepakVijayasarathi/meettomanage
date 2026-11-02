import { describe, expect, it } from "vitest";
import { needsAttention, recentSignups } from "./overviewAttention";
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
  it("flags closed academies, stalled signups and failed e-mails", () => {
    const usage = { activeStudents: 0, staffCount: 1, storageMb: 0, sessionMinutesMonth: 0, sessionsMonth: 0, recordingsMonth: 0, date: "2026-11-01" };
    const items = needsAttention(
      [row({ tenantId: "c", tenantName: "Gone Co", status: "Cancelled" }), row({ tenantId: "n", tenantName: "Quiet Co", usage }), row({ tenantId: "y", tenantName: "Fresh Co", usage })],
      now,
      [{ id: "n", createdAtUtc: "2026-10-25T00:00:00Z" }, { id: "y", createdAtUtc: "2026-10-31T00:00:00Z" }],
      [{ id: "r", tenantName: "X", tenantCode: "x", ruleKey: "trial_started", cycleKey: "c", channel: "email", recipient: "a@b.c", status: "Failed", attempts: 3, error: "Resend refused", createdAtUtc: "2026-10-31T00:00:00Z", sentAtUtc: null }],
    );
    const titles = items.map(i => i.title);
    expect(titles[0]).toBe("1 billing e-mail failed to send this week");
    expect(titles).toContain("Gone Co is closed");
    expect(titles).toContain("Quiet Co hasn't started yet");
    expect(titles).not.toContain("Fresh Co hasn't started yet"); // only 1 day old
  });
  it("lists academies that signed up in the last 7 days, newest first", () => {
    const list = recentSignups([{ id: "old", createdAtUtc: "2026-10-01T00:00:00Z" }, { id: "a", createdAtUtc: "2026-10-30T00:00:00Z" }, { id: "b", createdAtUtc: "2026-11-01T08:00:00Z" }], now);
    expect(list.map(t => t.id)).toEqual(["b", "a"]);
  });
  it("follows the Rules for the trial window and the 'not started' age", () => {
    const usage = { activeStudents: 0, staffCount: 1, storageMb: 0, sessionMinutesMonth: 0, sessionsMonth: 0, recordingsMonth: 0, date: "2026-11-01" };
    const rows = [row({ tenantId: "t", tenantName: "Trial Co", status: "Trialing", trialEndsAtUtc: "2026-11-11T12:00:00Z" }), row({ tenantId: "q", tenantName: "Quiet Co", usage })];
    const tenants = [{ id: "q", createdAtUtc: "2026-10-29T00:00:00Z" }];
    // defaults (7-day window, 3 days to start): trial 10 days out isn't flagged, Quiet Co (3 days) is
    expect(needsAttention(rows, now, tenants).map((i) => i.title)).toEqual(["Quiet Co hasn't started yet"]);
    // wider window, more patience
    expect(needsAttention(rows, now, tenants, [], { trialEndingWindowDays: 14, notStartedAfterDays: 5 }).map((i) => i.title)).toEqual(["Trial Co's trial ends in 10 days"]);
  });
});
