import type { MonitoringAlert } from "@/types";

/**
 * Prometheus alerts from the "call-quality-alerts" rule group (alert.rules.yml on the App/API
 * server, fed by network-quality-alert.sh on the Jitsi server). They are about people's
 * connections during live classes, not server health, so they get their own Network Alerts page
 * instead of crowding the Server Monitoring banner.
 */
const NETWORK_ALERT_NAMES = new Set([
  "PoorConnection",
  "ManyPeoplePoorConnection",
  "VideoServerPacketLoss",
  "NetworkCheckStopped",
]);

export function isNetworkAlert(alert: MonitoringAlert): boolean {
  return NETWORK_ALERT_NAMES.has(alert.name);
}

/** Per-person rows (PoorConnection) vs. alerts about the whole video service. */
export function splitNetworkAlerts(alerts: MonitoringAlert[]): {
  people: MonitoringAlert[];
  systemWide: MonitoringAlert[];
} {
  const network = alerts.filter(isNetworkAlert);
  return {
    people: network
      .filter((a) => a.name === "PoorConnection")
      .sort((a, b) => a.activeSince.localeCompare(b.activeSince)),
    systemWide: network.filter((a) => a.name !== "PoorConnection"),
  };
}
