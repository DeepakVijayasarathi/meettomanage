/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory stand-in for lib-jitsi-meet, used by the native engine's tests and the visual
 * harness. Mirrors the real library's event names and call shapes; tests drive the "server"
 * side by emitting conference events directly.
 */
import type { JitsiMeetJSGlobal } from "./libJitsi";

export const EVENTS = {
  connection: {
    CONNECTION_ESTABLISHED: "connection.connectionEstablished",
    CONNECTION_FAILED: "connection.connectionFailed",
    CONNECTION_DISCONNECTED: "connection.connectionDisconnected",
  },
  conference: {
    CONFERENCE_JOINED: "conference.joined",
    CONFERENCE_FAILED: "conference.failed",
    CONFERENCE_LEFT: "conference.left",
    USER_JOINED: "conference.userJoined",
    USER_LEFT: "conference.userLeft",
    DISPLAY_NAME_CHANGED: "conference.displayNameChanged",
    TRACK_ADDED: "conference.trackAdded",
    TRACK_REMOVED: "conference.trackRemoved",
    TRACK_MUTE_CHANGED: "conference.trackMuteChanged",
    DOMINANT_SPEAKER_CHANGED: "conference.dominantSpeaker",
    USER_ROLE_CHANGED: "conference.roleChanged",
    PARTICIPANT_PROPERTY_CHANGED: "conference.participant_property_changed",
    LOBBY_USER_JOINED: "conference.lobby.userJoined",
    LOBBY_USER_LEFT: "conference.lobby.userLeft",
    MEMBERS_ONLY_CHANGED: "conference.membersOnlyChanged",
    RECORDER_STATE_CHANGED: "conference.recorderStateChanged",
    CONNECTION_INTERRUPTED: "conference.connectionInterrupted",
    CONNECTION_RESTORED: "conference.connectionRestored",
    KICKED: "conference.kicked",
    MESSAGE_RECEIVED: "conference.messageReceived",
  },
  track: { LOCAL_TRACK_STOPPED: "track.stopped" },
};

export const ERRORS = {
  connection: { PASSWORD_REQUIRED: "connection.passwordRequired", OTHER_ERROR: "connection.otherError" },
  conference: {
    MEMBERS_ONLY_ERROR: "conference.connectionError.membersOnly",
    CONFERENCE_ACCESS_DENIED: "conference.connectionError.accessDenied",
    AUTHENTICATION_REQUIRED: "conference.authenticationRequired",
    NOT_ALLOWED_ERROR: "conference.connectionError.notAllowed",
  },
};

let trackSeq = 0;

export class FakeTrack {
  muted = false;
  stopped = false;
  attached: HTMLMediaElement[] = [];
  private handlers = new Map<string, ((...a: any[]) => void)[]>();
  readonly sourceName: string;
  constructor(
    private type: "audio" | "video",
    private participantId: string,
    private local: boolean,
    private videoType: "camera" | "desktop" = "camera",
    public stream: MediaStream | null = null
  ) {
    this.sourceName = `${participantId}-${type[0]}${trackSeq++}`;
  }
  getType() { return this.type; }
  getVideoType() { return this.type === "video" ? this.videoType : undefined; }
  getParticipantId() { return this.participantId; }
  getSourceName() { return this.sourceName; }
  isLocal() { return this.local; }
  isMuted() { return this.muted; }
  setParticipantId(id: string) { this.participantId = id; }
  attach(el: HTMLMediaElement) {
    this.attached.push(el);
    if (this.stream && "srcObject" in el) el.srcObject = this.stream;
  }
  detach(el: HTMLMediaElement) { this.attached = this.attached.filter((e) => e !== el); }
  async mute() { this.muted = true; this.conference?.emit(EVENTS.conference.TRACK_MUTE_CHANGED, this); }
  async unmute() { this.muted = false; this.conference?.emit(EVENTS.conference.TRACK_MUTE_CHANGED, this); }
  async dispose() { this.stopped = true; }
  addEventListener(e: string, h: (...a: any[]) => void) { this.handlers.set(e, [...(this.handlers.get(e) ?? []), h]); }
  removeEventListener(e: string, h: (...a: any[]) => void) { this.handlers.set(e, (this.handlers.get(e) ?? []).filter((x) => x !== h)); }
  fire(e: string, ...a: any[]) { this.handlers.get(e)?.forEach((h) => h(...a)); }
  conference: FakeConference | null = null;
}

export class FakeParticipant {
  props: Record<string, unknown> = {};
  constructor(public id: string, public name: string, public role = "participant", public tracks: FakeTrack[] = []) {}
  getId() { return this.id; }
  getDisplayName() { return this.name; }
  getRole() { return this.role; }
  isModerator() { return this.role === "moderator"; }
  getProperty(n: string) { return this.props[n]; }
  getTracks() { return this.tracks; }
}

export class FakeConference {
  calls: [string, ...unknown[]][] = [];
  handlers = new Map<string, ((...a: any[]) => void)[]>();
  participants = new Map<string, FakeParticipant>();
  localTracks: FakeTrack[] = [];
  moderator = false;
  membersOnly = false;
  myId = "local1";
  constructor(public room: string, public options: Record<string, unknown>, private fake: FakeLib) {}
  on(e: string, h: (...a: any[]) => void) { this.handlers.set(e, [...(this.handlers.get(e) ?? []), h]); }
  emit(e: string, ...a: any[]) { this.handlers.get(e)?.forEach((h) => h(...a)); }
  join() {
    this.calls.push(["join"]);
    queueMicrotask(() => {
      if (this.fake.joinBehavior === "membersOnly") this.emit(EVENTS.conference.CONFERENCE_FAILED, ERRORS.conference.MEMBERS_ONLY_ERROR);
      else if (this.fake.joinBehavior === "authFail") this.emit(EVENTS.conference.CONFERENCE_FAILED, ERRORS.conference.AUTHENTICATION_REQUIRED);
      else this.emit(EVENTS.conference.CONFERENCE_JOINED);
    });
  }
  async leave() { this.calls.push(["leave"]); }
  myUserId() { return this.myId; }
  isModerator() { return this.moderator; }
  isMembersOnly() { return this.membersOnly; }
  getParticipants() { return [...this.participants.values()]; }
  getParticipantById(id: string) { return this.participants.get(id); }
  async addTrack(t: FakeTrack) {
    this.calls.push(["addTrack", t.getType(), t.getVideoType()]);
    t.conference = this;
    t.setParticipantId(this.myId);
    this.localTracks.push(t);
  }
  async removeTrack(t: FakeTrack) { this.calls.push(["removeTrack", t.getType()]); this.localTracks = this.localTracks.filter((x) => x !== t); }
  async replaceTrack(a: FakeTrack | null, b: FakeTrack | null) { this.calls.push(["replaceTrack", a?.getType(), b?.getVideoType()]); }
  setDisplayName(n: string) { this.calls.push(["setDisplayName", n]); }
  setLocalParticipantProperty(n: string, v: string) { this.calls.push(["setLocalParticipantProperty", n, v]); }
  muteParticipant(id: string, type?: string) { this.calls.push(["muteParticipant", id, type]); }
  kickParticipant(id: string) { this.calls.push(["kickParticipant", id]); }
  async enableLobby() { this.calls.push(["enableLobby"]); this.membersOnly = true; }
  async disableLobby() { this.calls.push(["disableLobby"]); this.membersOnly = false; }
  async joinLobby(name: string) { this.calls.push(["joinLobby", name]); }
  lobbyApproveAccess(id: string) { this.calls.push(["lobbyApproveAccess", id]); }
  lobbyDenyAccess(id: string) { this.calls.push(["lobbyDenyAccess", id]); }
  async startRecording(o: { mode: string }) {
    this.calls.push(["startRecording", o.mode]);
    if (this.fake.recordingRejects) throw new Error(this.fake.recordingRejects);
    return { getID: () => "rec1", getStatus: () => "pending", getError: () => undefined };
  }
  async stopRecording(id: string) { this.calls.push(["stopRecording", id]); }
  sendTextMessage(t: string) { this.calls.push(["sendTextMessage", t]); }
  setReceiverConstraints(c: Record<string, unknown>) { this.calls.push(["setReceiverConstraints", c]); }

  // ---- helpers for tests: simulate the server ----
  remoteJoin(id: string, name: string, opts: { camera?: boolean; mic?: boolean; role?: string } = {}) {
    const tracks: FakeTrack[] = [];
    if (opts.mic !== false) tracks.push(new FakeTrack("audio", id, false, "camera", this.fake.makeStream?.("audio", name) ?? null));
    if (opts.camera !== false) tracks.push(new FakeTrack("video", id, false, "camera", this.fake.makeStream?.("video", name) ?? null));
    const p = new FakeParticipant(id, name, opts.role, tracks);
    this.participants.set(id, p);
    this.emit(EVENTS.conference.USER_JOINED, id, p);
    tracks.forEach((t) => this.emit(EVENTS.conference.TRACK_ADDED, t));
    return p;
  }
  remoteShare(id: string) {
    const t = new FakeTrack("video", id, false, "desktop", this.fake.makeStream?.("desktop", id) ?? null);
    this.participants.get(id)?.tracks.push(t);
    this.emit(EVENTS.conference.TRACK_ADDED, t);
    return t;
  }
  remoteLeave(id: string) {
    this.participants.delete(id);
    this.emit(EVENTS.conference.USER_LEFT, id);
  }
}

export class FakeConnection {
  listeners = new Map<string, ((...a: any[]) => void)[]>();
  constructor(public appId: string | null, public token: string | null | undefined, public options: Record<string, unknown>, private fake: FakeLib) {
    fake.lastConnection = this;
  }
  addEventListener(e: string, h: (...a: any[]) => void) { this.listeners.set(e, [...(this.listeners.get(e) ?? []), h]); }
  connect() {
    queueMicrotask(() => {
      if (this.fake.connectError) this.listeners.get(EVENTS.connection.CONNECTION_FAILED)?.forEach((h) => h(this.fake.connectError));
      else this.listeners.get(EVENTS.connection.CONNECTION_ESTABLISHED)?.forEach((h) => h());
    });
  }
  disconnect() { this.fake.disconnected = true; }
  initJitsiConference(room: string, options: Record<string, unknown>) {
    const c = new FakeConference(room, options, this.fake);
    c.moderator = this.fake.moderator;
    this.fake.lastConference = c;
    return c;
  }
}

export interface FakeLib extends JitsiMeetJSGlobal {
  lastConnection: FakeConnection | null;
  lastConference: FakeConference | null;
  joinBehavior: "join" | "membersOnly" | "authFail";
  connectError: string | null;
  recordingRejects: string | null;
  moderator: boolean;
  disconnected: boolean;
  /** Denied device kinds, to simulate a blocked camera/mic. */
  deny: ("audio" | "video")[];
  makeStream?: (kind: "audio" | "video" | "desktop", label: string) => MediaStream | null;
}

export function createFakeLib(overrides: Partial<FakeLib> = {}): FakeLib {
  const fake = {
    lastConnection: null,
    lastConference: null,
    joinBehavior: "join",
    connectError: null,
    recordingRejects: null,
    moderator: false,
    disconnected: false,
    deny: [],
    events: EVENTS,
    errors: ERRORS,
    constants: { recording: { mode: { FILE: "file", STREAM: "stream" } } },
    init() {},
    async createLocalTracks(opts: Record<string, unknown>) {
      const devices = (opts.devices as string[]) ?? [];
      if (devices.some((d) => (fake.deny as string[]).includes(d))) throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
      return devices.map((d) =>
        d === "desktop"
          ? new FakeTrack("video", "local", true, "desktop", fake.makeStream?.("desktop", "You") ?? null)
          : new FakeTrack(d as "audio" | "video", "local", true, "camera", fake.makeStream?.(d as "audio" | "video", "You") ?? null)
      );
    },
    ...overrides,
  } as unknown as FakeLib;
  (fake as any).JitsiConnection = function (appId: string | null, token: string | null | undefined, options: Record<string, unknown>) {
    return new FakeConnection(appId, token, options, fake);
  };
  return fake;
}
