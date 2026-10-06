import { describe, expect, it } from "vitest";
import type { MonitoringAlert } from "@/types";
import { isNetworkAlert, splitNetworkAlerts } from "./networkAlerts";

function alert(name: string, activeSince = "2026-09-24T14:00:00Z", person?: string): MonitoringAlert {
  return { name, severity: "warning", summary: name, description: "", state: "firing", activeSince, instance: null, person };
}

describe("networkAlerts", () => {
  it("treats only call-quality alerts as network alerts", () => {
    expect(isNetworkAlert(alert("PoorConnection"))).toBe(true);
    expect(isNetworkAlert(alert("VideoServerPacketLoss"))).toBe(true);
    expect(isNetworkAlert(alert("HighCpuLoad"))).toBe(false);
    expect(isNetworkAlert(alert("HighMemoryUsage"))).toBe(false);
  });

  it("splits people from system-wide alerts, oldest person first, and drops server alerts", () => {
    const { people, systemWide } = splitNetworkAlerts([
      alert("PoorConnection", "2026-09-24T14:10:00Z", "Jewel"),
      alert("HighCpuLoad"),
      alert("ManyPeoplePoorConnection"),
      alert("PoorConnection", "2026-09-24T14:05:00Z", "Frederique"),
    ]);
    expect(people.map((a) => a.person)).toEqual(["Frederique", "Jewel"]);
    expect(systemWide.map((a) => a.name)).toEqual(["ManyPeoplePoorConnection"]);
  });
});
