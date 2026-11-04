import { describe, expect, it } from "vitest";
import { toNotificationItem, type ApiNotification } from "./notifications";

const base: ApiNotification = {
  id: "n1", type: "General", templateKey: null, channel: "InApp", subject: "New homework: Sheet 3", body: "Asha has new homework.",
  isRead: false, createdAtUtc: new Date().toISOString(), readAtUtc: null, bulkEmailRecipientId: null, hasReplied: false,
} as ApiNotification;

describe("notification click-through", () => {
  it("sends parents to the page named by the backend target", () => {
    expect(toNotificationItem({ ...base, type: "Homework", targetType: "homework" }, "parent").route).toBe("/parent/homework");
    expect(toNotificationItem({ ...base, targetType: "ticket" }, "parent").route).toBe("/parent/support");
  });

  it("falls back to the template and type routes when there is no target", () => {
    expect(toNotificationItem({ ...base, templateKey: "batch-assignment" }, "parent").route).toBe("/parent/schedule");
    expect(toNotificationItem({ ...base, type: "PaymentReminder" }, "parent").route).toBe("/parent/billing");
  });
});
