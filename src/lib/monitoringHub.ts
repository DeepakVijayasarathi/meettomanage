import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { apiEnabled, getAccessToken } from "@/lib/api";
import type { ApiMonitoringSummary } from "@/api/monitoring";

/** "connected" — live push is up, polling can stop. "reconnecting"/"disconnected" — the page should fall back to its own poll until this recovers. */
export type MonitoringHubState = "connected" | "reconnecting" | "disconnected";

/**
 * Read-only counterpart to ClassroomHubClient: subscribes to MonitoringHub's periodic
 * "MonitoringUpdate" broadcast (see MonitoringBroadcastService) instead of the page polling
 * GET /api/monitoring/summary on its own timer. There's nothing to send — every method here
 * is about receiving. Callers should still keep a polling fallback for while this reports
 * "disconnected" (a proxy blocking WebSockets, the hub down, etc.) so the page never goes
 * silently stale.
 */
export class MonitoringHubClient {
  private connection: HubConnection | null = null;
  private disposed = false;

  async connect(onUpdate: (summary: ApiMonitoringSummary) => void, onStateChange?: (state: MonitoringHubState) => void): Promise<boolean> {
    if (!apiEnabled()) return false;
    const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

    const connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/monitoring`, { accessTokenFactory: () => getAccessToken() ?? "" })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("MonitoringUpdate", onUpdate);
    connection.onreconnecting((err) => {
      if (err) console.warn("Monitoring hub reconnecting after a drop:", err);
      onStateChange?.("reconnecting");
    });
    connection.onreconnected(() => onStateChange?.("connected"));
    connection.onclose((err) => {
      if (err) console.error("Monitoring hub connection closed:", err);
      onStateChange?.("disconnected");
    });

    // Exposed before start() resolves, matching ClassroomHubClient — see its own comment
    // on why (React StrictMode's mount/cleanup/remount can otherwise orphan a connection).
    this.connection = connection;

    try {
      await connection.start();
      if (this.disposed) {
        await connection.stop().catch(() => undefined);
        return false;
      }
      onStateChange?.("connected");
      return true;
    } catch (err) {
      // Hub unavailable — the page still works via its own poll, just without push updates.
      console.error("Monitoring hub connection failed:", err);
      onStateChange?.("disconnected");
      return false;
    }
  }

  get connected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  async disconnect(): Promise<void> {
    this.disposed = true;
    const connection = this.connection;
    this.connection = null;
    if (!connection) return;
    await connection.stop().catch(() => undefined);
  }
}
