import { HttpTransportType, type IHttpConnectionOptions } from "@microsoft/signalr";

/**
 * Extra SignalR connection options for the classroom and monitoring hubs.
 *
 * By default SignalR tries WebSockets first and falls back on its own. That fallback breaks when
 * the reverse proxy in front of the API does not forward WebSocket upgrade headers (found on the
 * UAT API: the upgrade request comes back as a plain empty 200, the server spends the connection
 * on it, and every fallback then fails with "No Connection with that ID" -- so live sync, the
 * shared board and the roster never connect). Setting VITE_HUB_TRANSPORT=longpolling skips
 * WebSockets and uses long polling, which works through any HTTP proxy. Production leaves it
 * unset and keeps WebSockets. Remove the setting once the proxy passes upgrades through.
 */
export function hubTransportOptions(): Pick<IHttpConnectionOptions, "transport"> {
  const forced = String(import.meta.env.VITE_HUB_TRANSPORT ?? "").toLowerCase();
  if (forced === "longpolling") return { transport: HttpTransportType.LongPolling };
  if (forced === "serversentevents") return { transport: HttpTransportType.ServerSentEvents };
  return {};
}
