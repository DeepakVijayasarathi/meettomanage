/**
 * Loads lib-jitsi-meet and the deployment's own config.js straight from the Jitsi server, so the
 * client library always matches the server version (no npm pin to drift out of sync with
 * Prosody/Jicofo/JVB upgrades).
 *
 * Only the slice of the library this app uses is typed here — names follow lib-jitsi-meet's
 * public API (JitsiMeetJS.events.*, JitsiConference, JitsiLocalTrack).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface JitsiTrack {
  getType(): "audio" | "video";
  getVideoType?(): "camera" | "desktop" | undefined;
  getParticipantId(): string;
  getSourceName?(): string;
  isLocal(): boolean;
  isMuted(): boolean;
  attach(el: HTMLMediaElement): void;
  detach(el: HTMLMediaElement): void;
  mute?(): Promise<void>;
  unmute?(): Promise<void>;
  dispose?(): Promise<void>;
  addEventListener(event: string, handler: (...args: any[]) => void): void;
  removeEventListener?(event: string, handler: (...args: any[]) => void): void;
}

export interface JitsiParticipant {
  getId(): string;
  getDisplayName(): string | undefined;
  getRole(): string;
  isModerator(): boolean;
  getProperty(name: string): unknown;
  getTracks(): JitsiTrack[];
}

export interface JitsiRecordingSession {
  getID(): string;
  getStatus(): "on" | "off" | "pending" | string;
  getError(): string | undefined;
  getMode?(): string;
}

export interface JitsiConference {
  on(event: string, handler: (...args: any[]) => void): void;
  addEventListener?(event: string, handler: (...args: any[]) => void): void;
  join(password?: string): void;
  leave(): Promise<void>;
  myUserId(): string;
  isModerator(): boolean;
  getParticipants(): JitsiParticipant[];
  getParticipantById(id: string): JitsiParticipant | undefined;
  addTrack(track: JitsiTrack): Promise<void>;
  removeTrack(track: JitsiTrack): Promise<void>;
  replaceTrack(oldTrack: JitsiTrack | null, newTrack: JitsiTrack | null): Promise<void>;
  setDisplayName(name: string): void;
  setLocalParticipantProperty(name: string, value: string): void;
  muteParticipant(id: string, mediaType?: "audio" | "video"): void;
  kickParticipant(id: string, reason?: string): void;
  isMembersOnly?(): boolean;
  enableLobby?(): Promise<void>;
  disableLobby?(): Promise<void>;
  joinLobby?(displayName: string, email?: string): Promise<void>;
  lobbyApproveAccess?(id: string): void;
  lobbyDenyAccess?(id: string): void;
  startRecording(options: { mode: string }): Promise<JitsiRecordingSession>;
  stopRecording(sessionId: string): Promise<void>;
  sendTextMessage?(text: string): void;
  sendMessage?(text: string, to?: string): void;
  setReceiverConstraints?(constraints: Record<string, unknown>): void;
  setSenderVideoConstraint?(height: number): Promise<void>;
}

export interface JitsiConnection {
  addEventListener(event: string, handler: (...args: any[]) => void): void;
  removeEventListener?(event: string, handler: (...args: any[]) => void): void;
  connect(options?: Record<string, unknown>): void;
  disconnect(): Promise<void> | void;
  initJitsiConference(room: string, options: Record<string, unknown>): JitsiConference;
}

export interface JitsiMeetJSGlobal {
  init(options: Record<string, unknown>): void;
  setLogLevel?(level: unknown): void;
  logLevels?: Record<string, unknown>;
  JitsiConnection: new (appId: string | null, token: string | null | undefined, options: Record<string, unknown>) => JitsiConnection;
  createLocalTracks(options: Record<string, unknown>): Promise<JitsiTrack[]>;
  events: {
    connection: Record<string, string>;
    conference: Record<string, string>;
    track: Record<string, string>;
  };
  errors: {
    connection: Record<string, string>;
    conference: Record<string, string>;
  };
  constants?: { recording?: { mode?: Record<string, string> } };
}

/** Subset of the deployment's config.js (`var config = {...}`) the connection needs. */
export interface JitsiDeploymentConfig {
  hosts?: { domain?: string; muc?: string; anonymousdomain?: string };
  websocket?: string;
  bosh?: string;
  websocketKeepAliveUrl?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    JitsiMeetJS?: JitsiMeetJSGlobal;
    config?: JitsiDeploymentConfig;
  }
}

const loads = new Map<string, Promise<void>>();

function loadScript(src: string, timeoutMs = 20_000): Promise<void> {
  let promise = loads.get(src);
  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error(`Timed out loading ${src}`));
      }, timeoutMs);
      script.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error(`Could not load ${src}`));
      };
      document.head.appendChild(script);
    }).catch((err) => {
      // A failed attempt must not poison later retries (same lesson as loadJitsiScript).
      loads.delete(src);
      throw err;
    });
    loads.set(src, promise);
  }
  return promise;
}

export async function loadLibJitsiMeet(domain: string): Promise<{ lib: JitsiMeetJSGlobal; config: JitsiDeploymentConfig }> {
  // config.js first: it defines `var config`, which lib-jitsi-meet's init reads from.
  if (!window.config) await loadScript(`https://${domain}/config.js`);
  if (!window.JitsiMeetJS) await loadScript(`https://${domain}/libs/lib-jitsi-meet.min.js`);
  if (!window.JitsiMeetJS) throw new Error("The video library didn't load.");
  return { lib: window.JitsiMeetJS, config: window.config ?? {} };
}

/** wss://host/xmpp-websocket?room=... (or the BOSH endpoint), absolute and room-scoped. */
export function serviceUrlFor(domain: string, config: JitsiDeploymentConfig, room: string): string {
  const raw = config.websocket || config.bosh || `wss://${domain}/xmpp-websocket`;
  // config.js often uses protocol-relative URLs ("//host/http-bind").
  const absolute = raw.startsWith("//") ? `${config.websocket ? "wss:" : "https:"}${raw}` : raw;
  const sep = absolute.includes("?") ? "&" : "?";
  return `${absolute}${sep}room=${encodeURIComponent(room)}`;
}
