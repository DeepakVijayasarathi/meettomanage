import { describe, expect, it } from "vitest";
import { classHoursLabel, timeOptionsFor } from "./schedulePreference";
import { describePreferredSlot, weeklySlotIn } from "./familyTime";

// Fixed-offset zones (no daylight saving) so the expectations hold on any date.
describe("class time choices", () => {
  it("offers every 15 minutes: group 4-8 PM, individual 10 AM-10 PM (India time)", () => {
    const group = timeOptionsFor("Group");
    expect(group[0].label).toBe("4:00 PM");
    expect(group[1].label).toBe("4:15 PM");
    expect(group.at(-1)?.label).toBe("8:00 PM");
    expect(classHoursLabel("Individual")).toBe("10:00 AM – 10:00 PM");
  });

  it("shows a family abroad the same class hours in their own clock", () => {
    // Dubai is 1h30 behind India: 4:00-8:00 PM IST is 2:30-6:30 PM there.
    expect(classHoursLabel("Group", "Asia/Dubai")).toBe("2:30 PM – 6:30 PM");
    expect(timeOptionsFor("Group", "Asia/Dubai")[0].value).toBe("14:30");
  });

  it("keeps India-time families on the plain list", () => {
    expect(timeOptionsFor("Group", "Asia/Kolkata")).toEqual(timeOptionsFor("Group"));
  });
});

describe("preferred slot shown to staff", () => {
  it("converts a family's weekly slot to India time, including across midnight", () => {
    expect(weeklySlotIn("Tue", "18:00", "Asia/Dubai", "Asia/Kolkata")).toEqual({ day: "Tue", time: "19:30" });
    // Phoenix is 12h30 behind India: Mon noon there is Tue 12:30 AM in India.
    expect(weeklySlotIn("Mon", "12:00", "America/Phoenix", "Asia/Kolkata")).toEqual({ day: "Tue", time: "00:30" });
  });

  it("labels both times for staff, and only the one for India-time families", () => {
    expect(describePreferredSlot("Tue", "18:00", "Asia/Dubai")).toBe("Tue 6:00 PM Dubai (Tue 7:30 PM IST)");
    expect(describePreferredSlot("Tue", "16:15", "Asia/Kolkata")).toBe("Tue 4:15 PM");
    expect(describePreferredSlot("Tue", "16:15", null)).toBe("Tue 4:15 PM");
  });
});
