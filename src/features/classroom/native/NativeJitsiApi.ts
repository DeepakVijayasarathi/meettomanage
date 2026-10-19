/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  loadLibJitsiMeet,
  serviceUrlFor,
  type JitsiConference,
  type JitsiConnection,
  type JitsiDeploymentConfig,
  type JitsiMeetJSGlobal,
  type JitsiParticipant,
  type JitsiRecordingSession,
  type JitsiTrack,
} from "./libJitsi";

/**
 * The classroom's own video engine, built on lib-jitsi-meet instead of Jitsi's embedded iframe.
 *
 * It deliberately speaks the same surface as `JitsiMeetExternalAPI` — `executeCommand(...)`,
 * `addListener(event, ...)` with the same event names and payloads, `getParticipantsInfo()`,
 * `isVideoMuted()`, `dispose()` — so every behaviour JitsiLive.tsx has built up around the
 * iframe (recording retries, lobby defaults, staff auto-admit, reconnect budgets, engagement
 * tracking, share-layout rules) runs unchanged on top of it. What changes is rendering: instead
 * of Jitsi drawing the room inside an iframe, `store` exposes participants and tracks for our
 * own React tiles (NativeStage.tsx).
 */

export interface NativeParticipant {
  id: string;
  name: string;
  role: string;
  isLocal: boolean;
  audioMuted: boolean;
  videoMuted: boolean;
  handRaised: boolean;
  audioTrack?: JitsiTrack;
  videoTrack?: JitsiTrack;
  desktopTrack?: JitsiTrack;
}

export interface NativeChatMessage {
  id: string;
  from: string;
  name: string;
  text: string;
  at: number;
  self: boolean;
}

export type NativePhase = "connecting" | "lobby" | "joined" | "ended" | "failed";

export interface NativeState {
  phase: NativePhase;
  localId: string | null;
  /** Local participant first, then everyone else in join order. */
  participants: NativeParticipant[];
  dominantId: string | null;
  pinnedId: string | null;
  tileView: boolean;
  knocking: { id: string; name: string }[];
  membersOnly: boolean;
  isModerator: boolean;
  recording: boolean;
  messages: NativeChatMessage[];
  /** Why the local camera/mic couldn't be opened, if they couldn't. */
  deviceError: string | null;
}

type Listener = (payload: any) => void;

export interface NativeJitsiOptions {
  roomName: string;
  jwt?: string;
  userInfo?: { displayName?: string };
  configOverwrite?: {
    startWithAudioMuted?: boolean;
    constraints?: Record<string, unknown>;
    audioQuality?: Record<string, unknown>;
    desktopSharingFrameRate?: { min?: number; max?: number };
    lobby?: { autoKnock?: boolean };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

let libInitialised = false;

export class NativeJitsiApi {
  readonly engine = "native" as const;
  private listeners = new Map<string, Set<Listener>>();
  private subscribers = new Set<() => void>();
  private state: NativeState = {
    phase: "connecting",
    localId: null,
    participants: [],
    dominantId: null,
    pinnedId: null,
    tileView: true,
    knocking: [],
    membersOnly: false,
    isModerator: false,
    recording: false,
    messages: [],
    deviceError: null,
  };

  private lib!: JitsiMeetJSGlobal;
  private deploymentConfig: JitsiDeploymentConfig = {};
  private connection: JitsiConnection | null = null;
  private conference: JitsiConference | null = null;
  private localAudio: JitsiTrack | null = null;
  private localVideo: JitsiTrack | null = null;
  private localDesktop: JitsiTrack | null = null;
  private recordingSessionId: string | null = null;
  private sharingIds: string[] = [];
  private disposed = false;
  private joined = false;
  private tracksReady: Promise<void> = Promise.resolve();
  private displayName: string;

  private constructor(private domain: string, private options: NativeJitsiOptions) {
    this.displayName = options.userInfo?.displayName ?? "Guest";
  }

  /**
   * Loads the library and starts opening camera/mic. Call `join()` once every listener is
   * attached — connecting here could report a fast failure (or even the join) before anyone listens.
   */
  static async create(domain: string, options: NativeJitsiOptions): Promise<NativeJitsiApi> {
    const api = new NativeJitsiApi(domain, options);
    await api.start();
    return api;
  }

  // ---- External-API-compatible surface -------------------------------------------------

  addListener(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  removeListener(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
  }

  executeCommand(command: string, ...args: unknown[]) {
    if (this.disposed) return;
    switch (command) {
      case "toggleAudio":
        void this.toggleLocal("audio");
        break;
      case "toggleVideo":
        void this.toggleLocal("video");
        break;
      case "toggleShareScreen":
        void (this.localDesktop ? this.stopScreenShare() : this.startScreenShare());
        break;
      case "toggleRaiseHand":
        this.setRaisedHand(!this.local()?.handRaised);
        break;
      case "toggleLobby":
        void this.setLobby(Boolean(args[0]));
        break;
      case "answerKnockingParticipant":
        this.answerKnock(String(args[0]), Boolean(args[1]));
        break;
      case "kickParticipant":
        this.conference?.kickParticipant(String(args[0]));
        break;
      case "muteEveryone":
        for (const p of this.remotes()) this.conference?.muteParticipant(p.id, (args[0] as "audio" | "video") ?? "audio");
        break;
      case "muteRemoteParticipant":
        this.conference?.muteParticipant(String(args[0]), (args[1] as "audio" | "video") ?? "audio");
        break;
      case "startRecording":
        this.startRecording();
        break;
      case "stopRecording":
        if (this.recordingSessionId) this.conference?.stopRecording(this.recordingSessionId).catch(() => undefined);
        break;
      case "pinParticipant":
        this.setPinned((args[0] as string | null) ?? null);
        break;
      case "setTileView":
        this.update({ tileView: Boolean(args[0]) });
        this.emit("tileViewChanged", { enabled: Boolean(args[0]) });
        break;
      case "displayName":
        this.displayName = String(args[0] ?? this.displayName);
        this.conference?.setDisplayName(this.displayName);
        this.patchParticipant(this.state.localId, { name: this.displayName });
        break;
      case "hangup":
        this.emit("readyToClose", {});
        break;
      // The iframe build's noise filter and virtual backgrounds are jitsi-meet app features,
      // not part of lib-jitsi-meet; the browser's own noise suppression stays on (constraints).
      case "setNoiseSuppressionEnabled":
      case "setVirtualBackground":
        break;
      default:
        break;
    }
  }

  getParticipantsInfo() {
    return this.remotes().map((p) => ({ participantId: p.id, displayName: p.name }));
  }

  /** Answers immediately while the engine is alive — JitsiLive uses it as a heartbeat. */
  isVideoMuted(): Promise<boolean> {
    return Promise.resolve(!this.localVideo || this.localVideo.isMuted());
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const t of [this.localAudio, this.localVideo, this.localDesktop]) t?.dispose?.().catch(() => undefined);
    this.conference?.leave().catch(() => undefined);
    Promise.resolve(this.connection?.disconnect()).catch(() => undefined);
    this.listeners.clear();
    this.subscribers.clear();
  }

  // ---- Store for the React view ---------------------------------------------------------

  subscribe = (fn: () => void) => {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  };

  getSnapshot = (): NativeState => this.state;

  sendChatMessage(text: string) {
    const body = text.trim();
    if (!body || !this.conference) return;
    if (this.conference.sendTextMessage) this.conference.sendTextMessage(body);
    else this.conference.sendMessage?.(body);
    this.update({
      messages: [
        ...this.state.messages,
        { id: `${Date.now()}-${Math.random()}`, from: this.state.localId ?? "me", name: this.displayName, text: body, at: Date.now(), self: true },
      ],
    });
  }

  // ---- Internals --------------------------------------------------------------------------

  private emit(event: string, payload: unknown) {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[classroom] listener for ${event} failed`, err);
      }
    });
  }

  private update(patch: Partial<NativeState>) {
    this.state = { ...this.state, ...patch };
    this.subscribers.forEach((fn) => fn());
  }

  private local() {
    return this.state.participants.find((p) => p.isLocal);
  }

  private remotes() {
    return this.state.participants.filter((p) => !p.isLocal);
  }

  private patchParticipant(id: string | null | undefined, patch: Partial<NativeParticipant>) {
    if (!id) return;
    this.update({ participants: this.state.participants.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }

  private upsertParticipant(id: string, base: Partial<NativeParticipant>) {
    const existing = this.state.participants.find((p) => p.id === id);
    if (existing) {
      this.patchParticipant(id, base);
      return;
    }
    const p: NativeParticipant = {
      id,
      name: "Student",
      role: "participant",
      isLocal: false,
      audioMuted: true,
      videoMuted: true,
      handRaised: false,
      ...base,
    };
    const participants = p.isLocal ? [p, ...this.state.participants] : [...this.state.participants, p];
    this.update({ participants });
  }

  private async start() {
    const { lib, config } = await loadLibJitsiMeet(this.domain);
    this.lib = lib;
    this.deploymentConfig = config;
    if (!libInitialised) {
      lib.init({ ...config, disableAudioLevels: false });
      if (lib.setLogLevel && lib.logLevels?.ERROR) lib.setLogLevel(lib.logLevels.ERROR);
      libInitialised = true;
    }
    if (this.disposed) return;
    // Open camera/mic now, so they're ready by the time the connection is.
    this.tracksReady = this.createLocalTracks();
  }

  /** Connects and joins the room. Safe to call once; later calls are ignored. */
  join() {
    if (this.joined || this.disposed) return;
    this.joined = true;
    const lib = this.lib;
    const config = this.deploymentConfig;
    const tracksReady = this.tracksReady;
    const hosts = config.hosts ?? { domain: this.domain, muc: `conference.${this.domain}` };
    const connection = new lib.JitsiConnection(null, this.options.jwt ?? null, {
      ...config,
      hosts,
      serviceUrl: serviceUrlFor(this.domain, config, this.options.roomName),
    });
    this.connection = connection;
    const ev = lib.events.connection;

    connection.addEventListener(ev.CONNECTION_ESTABLISHED, () => {
      void tracksReady.then(() => this.joinConference());
    });
    connection.addEventListener(ev.CONNECTION_FAILED, (error: string) => {
      if (this.disposed) return;
      this.update({ phase: "failed" });
      // Token rejections go through the same bounded retry as the iframe's
      // conference.authenticationRequired; anything else is a dropped connection.
      if (error === lib.errors.connection.PASSWORD_REQUIRED || error === "connection.passwordRequired") {
        this.emit("conferenceFailed", { error: "conference.authenticationRequired" });
      } else {
        this.emit("connectionFailed", { error });
      }
    });
    connection.connect();
  }

  private async createLocalTracks() {
    const cfg = this.options.configOverwrite ?? {};
    const attempts: string[][] = [["audio", "video"], ["audio"], ["video"]];
    for (const devices of attempts) {
      try {
        const tracks = await this.lib.createLocalTracks({ devices, constraints: cfg.constraints });
        for (const t of tracks) {
          if (t.getType() === "audio") this.localAudio = t;
          else this.localVideo = t;
        }
        if (this.localAudio && cfg.startWithAudioMuted) await this.localAudio.mute?.();
        if (devices.length < 2) {
          this.update({ deviceError: devices[0] === "audio" ? "Your camera couldn't be opened — you're joining with audio only." : "Your microphone couldn't be opened." });
        }
        return;
      } catch {
        /* try the next, smaller set of devices */
      }
    }
    this.update({ deviceError: "Your camera and microphone couldn't be opened. Others can't see or hear you." });
  }

  private joinConference() {
    if (this.disposed || !this.connection) return;
    const cfg = this.options.configOverwrite ?? {};
    const conf = this.connection.initJitsiConference(this.options.roomName.toLowerCase(), {
      ...this.deploymentConfig,
      p2p: { enabled: false },
      ...(cfg.audioQuality ? { audioQuality: cfg.audioQuality } : {}),
    });
    this.conference = conf;
    this.wireConference(conf);
    for (const t of [this.localAudio, this.localVideo]) if (t) void conf.addTrack(t).catch(() => undefined);
    conf.setDisplayName(this.displayName);
    conf.join();
  }

  private wireConference(conf: JitsiConference) {
    const E = this.lib.events.conference;
    const Err = this.lib.errors.conference;

    conf.on(E.CONFERENCE_JOINED, () => {
      const id = conf.myUserId();
      this.upsertParticipant(id, {
        isLocal: true,
        name: this.displayName,
        role: conf.isModerator() ? "moderator" : "participant",
        audioTrack: this.localAudio ?? undefined,
        videoTrack: this.localVideo ?? undefined,
        audioMuted: !this.localAudio || this.localAudio.isMuted(),
        videoMuted: !this.localVideo || this.localVideo.isMuted(),
      });
      // Anyone already in the room before we joined.
      for (const p of conf.getParticipants()) this.addRemote(p);
      this.update({ phase: "joined", localId: id, isModerator: conf.isModerator(), membersOnly: Boolean(conf.isMembersOnly?.()) });
      this.emit("videoConferenceJoined", { id });
      this.emit("audioMuteStatusChanged", { muted: !this.localAudio || this.localAudio.isMuted() });
      this.emit("videoMuteStatusChanged", { muted: !this.localVideo || this.localVideo.isMuted() });
      if (conf.isModerator()) this.emit("participantRoleChanged", { id, role: "moderator" });
      this.updateReceiverConstraints();
    });

    conf.on(E.CONFERENCE_FAILED, (code: string) => {
      if (this.disposed) return;
      if (code === Err.MEMBERS_ONLY_ERROR || code === "conference.connectionError.membersOnly") {
        // Waiting room: knock automatically (lobby.autoKnock) and wait to be admitted.
        this.update({ phase: "lobby" });
        if (this.options.configOverwrite?.lobby?.autoKnock !== false) conf.joinLobby?.(this.displayName).catch(() => undefined);
        return;
      }
      if (code === Err.CONFERENCE_ACCESS_DENIED || code === "conference.connectionError.accessDenied") {
        this.update({ phase: "ended" });
        this.emit("conferenceFailed", { error: "conference.connectionError.accessDenied" });
        return;
      }
      this.update({ phase: "failed" });
      const authLike = code === Err.AUTHENTICATION_REQUIRED || code === Err.NOT_ALLOWED_ERROR;
      this.emit("conferenceFailed", { error: authLike ? "conference.authenticationRequired" : code });
    });

    conf.on(E.CONFERENCE_LEFT, () => this.emit("videoConferenceLeft", {}));

    conf.on(E.USER_JOINED, (id: string, user: JitsiParticipant) => this.addRemote(user, id));

    conf.on(E.USER_LEFT, (id: string) => {
      this.update({
        participants: this.state.participants.filter((p) => p.id !== id),
        dominantId: this.state.dominantId === id ? null : this.state.dominantId,
      });
      this.emit("participantLeft", { id });
      if (this.state.pinnedId === id) this.setPinned(null);
      this.recomputeSharing();
    });

    conf.on(E.DISPLAY_NAME_CHANGED, (id: string, name: string) => this.patchParticipant(id, { name: name?.trim() || "Student" }));

    conf.on(E.TRACK_ADDED, (track: JitsiTrack) => {
      if (track.isLocal()) return;
      const id = track.getParticipantId();
      this.upsertParticipant(id, this.trackPatch(track, false));
      this.recomputeSharing();
      this.updateReceiverConstraints();
    });

    conf.on(E.TRACK_REMOVED, (track: JitsiTrack) => {
      if (track.isLocal()) return;
      this.patchParticipant(track.getParticipantId(), this.trackPatch(track, true));
      this.recomputeSharing();
    });

    conf.on(E.TRACK_MUTE_CHANGED, (track: JitsiTrack) => {
      const muted = track.isMuted();
      if (track.isLocal()) {
        if (track.getType() === "audio") {
          this.patchParticipant(this.state.localId, { audioMuted: muted });
          this.emit("audioMuteStatusChanged", { muted });
        } else if (track.getVideoType?.() !== "desktop") {
          this.patchParticipant(this.state.localId, { videoMuted: muted });
          this.emit("videoMuteStatusChanged", { muted });
        }
        return;
      }
      const isAudio = track.getType() === "audio";
      if (isAudio) this.patchParticipant(track.getParticipantId(), { audioMuted: muted });
      else if (track.getVideoType?.() !== "desktop") this.patchParticipant(track.getParticipantId(), { videoMuted: muted });
      else {
        // Jitsi ends a screen share by muting its source on viewers' side (and unmutes it if the
        // same person presents again) rather than removing the track — verified on a live server.
        this.patchParticipant(track.getParticipantId(), { desktopTrack: muted ? undefined : track });
        this.recomputeSharing();
      }
    });

    conf.on(E.DOMINANT_SPEAKER_CHANGED, (id: string) => {
      this.update({ dominantId: id });
      this.emit("dominantSpeakerChanged", { id });
    });

    conf.on(E.USER_ROLE_CHANGED, (id: string, role: string) => {
      this.patchParticipant(id, { role });
      if (id === this.state.localId) this.update({ isModerator: role === "moderator" });
      this.emit("participantRoleChanged", { id, role });
    });

    conf.on(E.PARTICIPANT_PROPERTY_CHANGED, (participant: JitsiParticipant, name: string, _old: unknown, value: unknown) => {
      if (name !== "raisedHand") return;
      const id = participant.getId();
      const handRaised = Boolean(value) && value !== "false";
      this.patchParticipant(id, { handRaised });
      this.emit("raiseHandUpdated", { id, handRaised });
    });

    if (E.LOBBY_USER_JOINED) {
      conf.on(E.LOBBY_USER_JOINED, (id: string, name: string) => {
        if (this.state.knocking.some((k) => k.id === id)) return;
        const knock = { id, name: name || "Guest" };
        this.update({ knocking: [...this.state.knocking, knock] });
        this.emit("knockingParticipant", { participant: knock });
      });
    }
    if (E.LOBBY_USER_LEFT) {
      conf.on(E.LOBBY_USER_LEFT, (id: string) => this.update({ knocking: this.state.knocking.filter((k) => k.id !== id) }));
    }
    if (E.MEMBERS_ONLY_CHANGED) {
      conf.on(E.MEMBERS_ONLY_CHANGED, (enabled: boolean) => this.update({ membersOnly: Boolean(enabled) }));
    }

    conf.on(E.RECORDER_STATE_CHANGED, (session: JitsiRecordingSession) => {
      if (session.getMode?.() === "stream") return;
      const status = session.getStatus();
      if (status === "pending") return;
      const on = status === "on";
      this.recordingSessionId = on ? session.getID() : null;
      this.update({ recording: on });
      this.emit("recordingStatusChanged", { on, error: session.getError() });
    });

    conf.on(E.CONNECTION_INTERRUPTED, () => this.emit("connectionInterrupted", {}));
    conf.on(E.CONNECTION_RESTORED, () => this.emit("connectionRestored", {}));

    conf.on(E.KICKED, () => {
      // The teacher's "End the class" removes everyone (see completeAndLeave).
      this.update({ phase: "ended" });
      this.emit("readyToClose", {});
    });

    conf.on(E.MESSAGE_RECEIVED, (id: string, text: string, ts?: number) => {
      if (id === this.state.localId) return;
      const name = this.state.participants.find((p) => p.id === id)?.name ?? "Someone";
      this.update({
        messages: [...this.state.messages, { id: `${id}-${ts ?? Date.now()}-${Math.random()}`, from: id, name, text, at: Date.now(), self: false }],
      });
    });
  }

  private addRemote(user: JitsiParticipant, idArg?: string) {
    const id = idArg ?? user.getId();
    if (id === this.state.localId) return;
    const known = this.state.participants.some((p) => p.id === id);
    const patch: Partial<NativeParticipant> = {
      name: user.getDisplayName()?.trim() || "Student",
      role: user.getRole?.() ?? "participant",
      handRaised: Boolean(user.getProperty?.("raisedHand")),
    };
    for (const t of user.getTracks?.() ?? []) Object.assign(patch, this.trackPatch(t, false));
    this.upsertParticipant(id, patch);
    if (!known) this.emit("participantJoined", { id, displayName: patch.name });
    this.recomputeSharing();
  }

  private trackPatch(track: JitsiTrack, removed: boolean): Partial<NativeParticipant> {
    if (track.getType() === "audio") return removed ? { audioTrack: undefined, audioMuted: true } : { audioTrack: track, audioMuted: track.isMuted() };
    // A muted desktop source is a share that has stopped (see TRACK_MUTE_CHANGED).
    if (track.getVideoType?.() === "desktop") return { desktopTrack: removed || track.isMuted() ? undefined : track };
    return removed ? { videoTrack: undefined, videoMuted: true } : { videoTrack: track, videoMuted: track.isMuted() };
  }

  /** Mirrors the iframe's contentSharingParticipantsChanged. */
  private recomputeSharing() {
    const ids = this.state.participants.filter((p) => p.desktopTrack).map((p) => p.id);
    if (ids.join(",") === this.sharingIds.join(",")) return;
    this.sharingIds = ids;
    this.emit("contentSharingParticipantsChanged", { data: ids });
    this.updateReceiverConstraints();
  }

  private async toggleLocal(kind: "audio" | "video") {
    let track = kind === "audio" ? this.localAudio : this.localVideo;
    if (!track) {
      // No device on join (blocked or missing) — try again now the user has asked.
      try {
        const [created] = await this.lib.createLocalTracks({ devices: [kind], constraints: this.options.configOverwrite?.constraints });
        track = created;
        if (kind === "audio") this.localAudio = created;
        else this.localVideo = created;
        await this.conference?.addTrack(created);
        this.patchParticipant(this.state.localId, kind === "audio" ? { audioTrack: created, audioMuted: false } : { videoTrack: created, videoMuted: false });
        this.emit(kind === "audio" ? "audioMuteStatusChanged" : "videoMuteStatusChanged", { muted: false });
        this.update({ deviceError: null });
      } catch {
        this.update({ deviceError: kind === "audio" ? "Your microphone couldn't be opened — check the browser's site permissions." : "Your camera couldn't be opened — check the browser's site permissions." });
      }
      return;
    }
    const nowMuted = !track.isMuted();
    await (nowMuted ? track.mute?.() : track.unmute?.());
    // TRACK_MUTE_CHANGED normally reports this; patch directly too in case it doesn't fire.
    this.patchParticipant(this.state.localId, kind === "audio" ? { audioMuted: nowMuted } : { videoMuted: nowMuted });
  }

  private async startScreenShare() {
    const fps = this.options.configOverwrite?.desktopSharingFrameRate;
    let desktop: JitsiTrack;
    try {
      const tracks = await this.lib.createLocalTracks({ devices: ["desktop"], desktopSharingFrameRate: fps });
      desktop = tracks.find((t) => t.getType() === "video") ?? tracks[0];
    } catch {
      // Cancelled picker or OS permission off — JitsiLive's share hint covers the latter.
      return;
    }
    if (!desktop || this.disposed) return;
    this.localDesktop = desktop;
    desktop.addEventListener(this.lib.events.track.LOCAL_TRACK_STOPPED, () => void this.stopScreenShare());
    try {
      // Multi-stream (current Jitsi): the share is a second video source beside the camera.
      await this.conference?.addTrack(desktop);
    } catch {
      // Older single-stream servers: the share replaces the camera while it runs.
      await this.conference?.replaceTrack(this.localVideo, desktop).catch(() => undefined);
    }
    this.patchParticipant(this.state.localId, { desktopTrack: desktop });
    this.recomputeSharing();
    this.emit("screenSharingStatusChanged", { on: true });
  }

  private async stopScreenShare() {
    const desktop = this.localDesktop;
    if (!desktop) return;
    this.localDesktop = null;
    try {
      await this.conference?.removeTrack(desktop);
    } catch {
      await this.conference?.replaceTrack(desktop, this.localVideo).catch(() => undefined);
    }
    await desktop.dispose?.().catch(() => undefined);
    this.patchParticipant(this.state.localId, { desktopTrack: undefined });
    this.recomputeSharing();
    this.emit("screenSharingStatusChanged", { on: false });
  }

  private setRaisedHand(raised: boolean) {
    this.conference?.setLocalParticipantProperty("raisedHand", raised ? String(Date.now()) : "");
    this.patchParticipant(this.state.localId, { handRaised: raised });
    this.emit("raiseHandUpdated", { id: this.state.localId, handRaised: raised });
  }

  private async setLobby(enabled: boolean) {
    try {
      await (enabled ? this.conference?.enableLobby?.() : this.conference?.disableLobby?.());
      this.update({ membersOnly: enabled });
    } catch {
      /* not moderator yet — JitsiLive retries once the role lands */
    }
  }

  private answerKnock(id: string, approve: boolean) {
    if (approve) this.conference?.lobbyApproveAccess?.(id);
    else this.conference?.lobbyDenyAccess?.(id);
    this.update({ knocking: this.state.knocking.filter((k) => k.id !== id) });
  }

  private startRecording() {
    const mode = this.lib.constants?.recording?.mode?.FILE ?? "file";
    this.conference
      ?.startRecording({ mode })
      .then((session) => {
        this.recordingSessionId = session?.getID?.() ?? this.recordingSessionId;
      })
      .catch((err: unknown) => {
        // Same shape as the iframe's rejection: off + reason, which arms JitsiLive's watchdog retry.
        this.emit("recordingStatusChanged", { on: false, error: err instanceof Error ? err.message : String(err ?? "recording-failed") });
      });
  }

  private setPinned(id: string | null) {
    this.update({ pinnedId: id });
    this.emit("pinnedEndpointChanged", { id });
    this.updateReceiverConstraints();
  }

  /** Ask the bridge for HD only for what's on the main stage; the grid gets small layers. */
  private updateReceiverConstraints() {
    const conf = this.conference;
    if (!conf?.setReceiverConstraints) return;
    const stageIds = new Set([this.state.pinnedId, ...this.sharingIds].filter(Boolean) as string[]);
    const onStageSources: string[] = [];
    const constraints: Record<string, { maxHeight: number }> = {};
    for (const p of this.remotes()) {
      for (const t of [p.videoTrack, p.desktopTrack]) {
        const source = t?.getSourceName?.();
        if (!source) continue;
        const onStage = stageIds.has(p.id) && (t === p.desktopTrack || !p.desktopTrack);
        constraints[source] = { maxHeight: onStage ? 720 : 360 };
        if (onStage) onStageSources.push(source);
      }
    }
    try {
      conf.setReceiverConstraints({ lastN: -1, defaultConstraints: { maxHeight: 360 }, constraints, onStageSources });
    } catch {
      /* older bridge without source-name constraints */
    }
  }
}
