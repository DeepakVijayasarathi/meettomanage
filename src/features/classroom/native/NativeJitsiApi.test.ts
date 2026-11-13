import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messageTime, NativeJitsiApi } from "./NativeJitsiApi";
import { createFakeLib, EVENTS, FakeTrack, type FakeLib } from "./fakeLibJitsi";

const flush = () => new Promise((r) => setTimeout(r, 0));

async function start(fake: FakeLib, extra: Record<string, unknown> = {}) {
  window.JitsiMeetJS = fake;
  window.config = { hosts: { domain: "meet.test", muc: "conference.meet.test" }, websocket: "wss://meet.test/xmpp-websocket" };
  const api = await NativeJitsiApi.create("meet.test", {
    roomName: "Phonics-ROOM",
    jwt: "tok",
    userInfo: { displayName: "Karan" },
    configOverwrite: { startWithAudioMuted: false, lobby: { autoKnock: true } },
    ...extra,
  });
  const events: [string, unknown][] = [];
  for (const e of [
    "videoConferenceJoined", "participantJoined", "participantLeft", "audioMuteStatusChanged", "videoMuteStatusChanged",
    "contentSharingParticipantsChanged", "raiseHandUpdated", "participantRoleChanged", "knockingParticipant",
    "recordingStatusChanged", "conferenceFailed", "connectionFailed", "readyToClose", "dominantSpeakerChanged",
    "pinnedEndpointChanged", "screenSharingStatusChanged", "connectionInterrupted", "connectionRestored",
  ]) api.addListener(e, (p) => events.push([e, p]));
  api.join();
  await flush();
  await flush();
  return { api, events, conf: fake.lastConference! };
}

describe("NativeJitsiApi", () => {
  let fake: FakeLib;
  beforeEach(() => {
    fake = createFakeLib();
  });
  afterEach(() => {
    delete window.JitsiMeetJS;
    delete window.config;
  });

  it("connects with the join token to a lower-cased, room-scoped service URL and joins", async () => {
    const { api, events, conf } = await start(fake);
    expect(fake.lastConnection!.token).toBe("tok");
    expect(fake.lastConnection!.options.serviceUrl).toBe("wss://meet.test/xmpp-websocket?room=Phonics-ROOM");
    expect(conf.room).toBe("phonics-room");
    expect(conf.options).toMatchObject({ p2p: { enabled: false } });
    expect(conf.calls.filter((c) => c[0] === "addTrack").map((c) => c[1])).toEqual(["audio", "video"]);
    expect(events.find(([e]) => e === "videoConferenceJoined")?.[1]).toEqual({ id: "local1" });
    expect(api.getSnapshot().phase).toBe("joined");
    expect(api.getSnapshot().participants[0]).toMatchObject({ id: "local1", isLocal: true, name: "Karan", audioMuted: false });
  });

  it("starts muted when asked (students join muted)", async () => {
    const { events } = await start(fake, { configOverwrite: { startWithAudioMuted: true } });
    expect(events).toContainEqual(["audioMuteStatusChanged", { muted: true }]);
  });

  it("reports remote participants, tracks and screen shares like the iframe API", async () => {
    const { api, events, conf } = await start(fake);
    conf.remoteJoin("r1", "Aarav");
    expect(events).toContainEqual(["participantJoined", { id: "r1", displayName: "Aarav" }]);
    expect(api.getParticipantsInfo()).toEqual([{ participantId: "r1", displayName: "Aarav" }]);
    const aarav = api.getSnapshot().participants.find((p) => p.id === "r1")!;
    expect(aarav.audioTrack).toBeDefined();
    expect(aarav.videoTrack).toBeDefined();

    conf.remoteShare("r1");
    expect(events).toContainEqual(["contentSharingParticipantsChanged", { data: ["r1"] }]);

    // Jitsi ends a share by muting the source on the viewer's side, and unmutes it on re-share.
    const share = conf.participants.get("r1")!.tracks.find((t) => t.getVideoType() === "desktop")!;
    share.muted = true;
    conf.emit(EVENTS.conference.TRACK_MUTE_CHANGED, share);
    expect(events.filter(([e]) => e === "contentSharingParticipantsChanged").pop()).toEqual(["contentSharingParticipantsChanged", { data: [] }]);
    expect(api.getSnapshot().participants.find((p) => p.id === "r1")!.desktopTrack).toBeUndefined();
    share.muted = false;
    conf.emit(EVENTS.conference.TRACK_MUTE_CHANGED, share);
    expect(events.filter(([e]) => e === "contentSharingParticipantsChanged").pop()).toEqual(["contentSharingParticipantsChanged", { data: ["r1"] }]);

    conf.remoteLeave("r1");
    // A late track from someone who already left must not bring them back.
    conf.emit(EVENTS.conference.TRACK_ADDED, new FakeTrack("video", "r1", false));
    expect(api.getSnapshot().participants.some((p) => p.id === "r1")).toBe(false);
    expect(events).toContainEqual(["participantLeft", { id: "r1" }]);
    expect(events).toContainEqual(["contentSharingParticipantsChanged", { data: [] }]);
  });

  it("asks HD only for what's on stage", async () => {
    const { api, conf } = await start(fake);
    conf.remoteJoin("r1", "Aarav");
    api.executeCommand("pinParticipant", "r1");
    const last = conf.calls.filter((c) => c[0] === "setReceiverConstraints").pop()![1] as { onStageSources: string[]; constraints: Record<string, { maxHeight: number }> };
    expect(last.onStageSources).toHaveLength(1);
    expect(Object.values(last.constraints)[0].maxHeight).toBe(720);
  });

  it("receives video only for tiles on screen, at the size they're shown", async () => {
    const { api, conf } = await start(fake);
    conf.remoteJoin("r1", "Aarav");
    conf.remoteJoin("r2", "Diya");
    conf.remoteShare("r1");
    api.executeCommand("setVideoQuality", { "r1:screen": 720, r1: 180 });
    const last = conf.calls.filter((c) => c[0] === "setReceiverConstraints").pop()![1] as {
      onStageSources: string[]; constraints: Record<string, { maxHeight: number }>; defaultConstraints: { maxHeight: number };
    };
    const tracks = (id: string) => conf.participants.get(id)!.tracks.filter((t) => t.getType() === "video");
    const [r1Cam, r1Screen] = [tracks("r1").find((t) => t.getVideoType() === "camera")!, tracks("r1").find((t) => t.getVideoType() === "desktop")!];
    expect(last.constraints[r1Screen.getSourceName()].maxHeight).toBe(720);
    expect(last.constraints[r1Cam.getSourceName()].maxHeight).toBe(180);
    // Diya is on another gallery page: no video at all.
    expect(last.constraints[tracks("r2")[0].getSourceName()].maxHeight).toBe(0);
    expect(last.onStageSources).toEqual([r1Screen.getSourceName()]);
  });

  it("switches camera or microphone mid-call without unmuting", async () => {
    const { api, conf } = await start(fake);
    const create = vi.spyOn(fake, "createLocalTracks");
    api.executeCommand("toggleAudio"); // mute
    await flush();
    api.executeCommand("setMicrophoneDevice", "mic-2");
    await flush();
    await flush();
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ devices: ["audio"], micDeviceId: "mic-2" }));
    expect(conf.calls.some((c) => c[0] === "replaceTrack" && c[1] === "audio")).toBe(true);
    const me = api.getSnapshot().participants.find((p) => p.isLocal)!;
    expect(me.audioMuted).toBe(true);
    expect(me.audioTrack!.isMuted()).toBe(true);
    expect(api.getSnapshot().micId).toBe("mic-2");

    api.executeCommand("setCameraDevice", "cam-2");
    await flush();
    await flush();
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ devices: ["video"], cameraDeviceId: "cam-2" }));
    expect(api.getSnapshot().cameraId).toBe("cam-2");

    api.executeCommand("setAudioOutputDevice", "spk-2");
    expect(api.getSnapshot().speakerId).toBe("spk-2");
  });

  it("tracks connection quality in coarse buckets", async () => {
    const { api, conf } = await start(fake);
    conf.remoteJoin("r1", "Aarav");
    conf.emit(EVENTS.connectionQuality.REMOTE_STATS_UPDATED, "r1", { connectionQuality: 12 });
    conf.emit(EVENTS.connectionQuality.LOCAL_STATS_UPDATED, { connectionQuality: 55 });
    const snap = api.getSnapshot();
    expect(snap.participants.find((p) => p.id === "r1")!.quality).toBe("poor");
    expect(snap.participants.find((p) => p.isLocal)!.quality).toBe("fair");
    const before = api.getSnapshot();
    conf.emit(EVENTS.connectionQuality.REMOTE_STATS_UPDATED, "r1", { connectionQuality: 20 });
    expect(api.getSnapshot()).toBe(before); // same bucket: no re-render
  });

  it("holds the connection on a camera/mic check, once per room", async () => {
    const { api, conf } = await start(fake, { roomName: "Prejoin-Room", prejoin: true });
    expect(conf).toBeNull(); // no conference yet
    expect(fake.lastConnection).toBeFalsy();
    expect(api.getSnapshot().phase).toBe("prejoin");
    await flush();
    const preview = api.getSnapshot().preview!;
    expect(preview.videoTrack).toBeDefined();
    expect(preview.audioMuted).toBe(false);

    // Choices made here carry into the call.
    api.executeCommand("toggleVideo");
    await flush();
    expect(api.getSnapshot().preview!.videoMuted).toBe(true);

    api.executeCommand("confirmJoin");
    await flush();
    await flush();
    expect(api.getSnapshot().phase).toBe("joined");
    expect(api.getSnapshot().preview).toBeNull();
    expect(api.getSnapshot().participants.find((p) => p.isLocal)!.videoMuted).toBe(true);
    api.dispose();

    // A reconnect re-creates the engine for the same room: it must not ask again.
    const again = await start(fake, { roomName: "prejoin-room", prejoin: true });
    expect(again.api.getSnapshot().phase).toBe("joined");
  });

  it("reports the microphone level for the meter", async () => {
    const { api } = await start(fake);
    const mic = api.getSnapshot().participants.find((p) => p.isLocal)!.audioTrack as unknown as FakeTrack;
    const levels: number[] = [];
    const stop = api.watchAudioLevel(mic as never, (l) => levels.push(l));
    mic.fire(EVENTS.track.TRACK_AUDIO_LEVEL_CHANGED, 0.4);
    mic.fire(EVENTS.track.TRACK_AUDIO_LEVEL_CHANGED, 7);
    stop();
    mic.fire(EVENTS.track.TRACK_AUDIO_LEVEL_CHANGED, 0.9);
    expect(levels).toEqual([0.4, 1]);
  });

  it("moves to another microphone when the one in use is unplugged", async () => {
    const devices = Object.assign(new EventTarget(), {
      list: [{ kind: "audioinput", deviceId: "usb-headset" }, { kind: "audioinput", deviceId: "built-in" }, { kind: "videoinput", deviceId: "cam" }],
      enumerateDevices: () => Promise.resolve(devices.list),
    });
    Object.defineProperty(navigator, "mediaDevices", { value: devices, configurable: true });
    try {
      const { api, conf } = await start(fake);
      const mic = api.getSnapshot().participants.find((p) => p.isLocal)!.audioTrack as unknown as FakeTrack;
      mic.deviceId = "usb-headset";
      const create = vi.spyOn(fake, "createLocalTracks");
      devices.list = devices.list.filter((d) => d.deviceId !== "usb-headset");
      devices.dispatchEvent(new Event("devicechange"));
      for (let i = 0; i < 4; i++) await flush();
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ devices: ["audio"] }));
      expect(create.mock.calls[0][0]).not.toHaveProperty("micDeviceId");
      expect(conf.calls.some((c) => c[0] === "replaceTrack" && c[1] === "audio")).toBe(true);
      expect(api.getSnapshot().deviceError).toMatch(/microphone was disconnected/);
      expect(mic.stopped).toBe(true);
      api.dispose();
    } finally {
      // @ts-expect-error -- test cleanup of the stub
      delete navigator.mediaDevices;
    }
  });

  it("shows replayed chat history at the time it was sent, in order", async () => {
    const { api, conf } = await start(fake);
    conf.remoteJoin("r1", "Aarav");
    conf.emit(EVENTS.conference.MESSAGE_RECEIVED, "r1", "second", "2026-11-13T05:02:00Z");
    conf.emit(EVENTS.conference.MESSAGE_RECEIVED, "r1", "first", "2026-11-13T05:01:00Z");
    expect(api.getSnapshot().messages.map((m) => m.text)).toEqual(["first", "second"]);
    expect(api.getSnapshot().messages[0].at).toBe(Date.parse("2026-11-13T05:01:00Z"));
    expect(messageTime(undefined)).toBeGreaterThan(Date.now() - 1000);
    expect(messageTime("1731474000000")).toBe(1731474000000);
  });

  it("announces a browser recording the way Jitsi Meet does, and sees others' recordings", async () => {
    const { api, conf } = await start(fake);
    const events: unknown[] = [];
    api.addListener("localRecordingChanged", (e) => events.push(e));
    api.executeCommand("setLocalRecording", true);
    expect(conf.calls).toContainEqual(["setLocalParticipantProperty", "localRecording", "true"]);
    expect(api.getSnapshot().localRecording).toBe(true);
    api.executeCommand("setLocalRecording", false);
    // Jitsi Meet reads any non-empty value as "on", so off must be empty.
    expect(conf.calls).toContainEqual(["setLocalParticipantProperty", "localRecording", ""]);

    const teacher = conf.remoteJoin("t1", "Karan", { role: "moderator" });
    conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, teacher, "localRecording", "", "true");
    expect(api.getSnapshot().participants.find((p) => p.id === "t1")!.recordingLocally).toBe(true);
    conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, teacher, "localRecording", "true", "");
    expect(api.getSnapshot().participants.find((p) => p.id === "t1")!.recordingLocally).toBe(false);
    expect(events).toEqual([{ id: "t1", on: true }, { id: "t1", on: false }]);
  });

  it("knocks automatically when the waiting room is on, then joins when admitted", async () => {
    fake.joinBehavior = "membersOnly";
    const { api, conf, events } = await start(fake);
    expect(api.getSnapshot().phase).toBe("lobby");
    expect(conf.calls).toContainEqual(["joinLobby", "Karan"]);
    conf.emit(EVENTS.conference.CONFERENCE_JOINED);
    expect(api.getSnapshot().phase).toBe("joined");
    expect(events.some(([e]) => e === "videoConferenceJoined")).toBe(true);
  });

  it("maps token rejections to conference.authenticationRequired so JitsiLive's retry budget applies", async () => {
    fake.connectError = "connection.passwordRequired";
    const { events } = await start(fake);
    expect(events).toContainEqual(["conferenceFailed", { error: "conference.authenticationRequired" }]);

    const other = createFakeLib({ connectError: "connection.otherError" });
    const second = await start(other);
    expect(second.events).toContainEqual(["connectionFailed", { error: "connection.otherError" }]);
  });

  it("runs host commands: lobby, admit/deny, mute everyone, kick", async () => {
    fake.moderator = true;
    const { api, conf, events } = await start(fake);
    expect(events).toContainEqual(["participantRoleChanged", { id: "local1", role: "moderator" }]);
    conf.remoteJoin("r1", "Aarav");
    conf.remoteJoin("r2", "Sara");

    api.executeCommand("toggleLobby", true);
    await flush();
    expect(conf.calls).toContainEqual(["enableLobby"]);
    expect(api.getSnapshot().membersOnly).toBe(true);

    conf.emit(EVENTS.conference.LOBBY_USER_JOINED, "k1", "Aarav's Parent");
    expect(events).toContainEqual(["knockingParticipant", { participant: { id: "k1", name: "Aarav's Parent" } }]);
    api.executeCommand("answerKnockingParticipant", "k1", true);
    expect(conf.calls).toContainEqual(["lobbyApproveAccess", "k1"]);
    expect(api.getSnapshot().knocking).toEqual([]);

    api.executeCommand("muteEveryone", "audio");
    expect(conf.calls).toContainEqual(["muteParticipant", "r1", "audio"]);
    expect(conf.calls).toContainEqual(["muteParticipant", "r2", "audio"]);

    api.executeCommand("kickParticipant", "r2");
    expect(conf.calls).toContainEqual(["kickParticipant", "r2"]);
  });

  it("reports recording start, stop and rejection in the iframe's recordingStatusChanged shape", async () => {
    const { api, conf, events } = await start(fake);
    api.executeCommand("startRecording", { mode: "file" });
    await flush();
    expect(conf.calls).toContainEqual(["startRecording", "file"]);
    conf.emit(EVENTS.conference.RECORDER_STATE_CHANGED, { getID: () => "rec1", getStatus: () => "on", getError: () => undefined, getMode: () => "file" });
    expect(events).toContainEqual(["recordingStatusChanged", { on: true, error: undefined }]);
    api.executeCommand("stopRecording");
    expect(conf.calls).toContainEqual(["stopRecording", "rec1"]);

    fake.recordingRejects = "service-unavailable";
    api.executeCommand("startRecording", { mode: "file" });
    await flush();
    await flush();
    expect(events).toContainEqual(["recordingStatusChanged", { on: false, error: "service-unavailable" }]);
  });

  it("toggles the local mic/camera and raises a hand", async () => {
    const { api, conf, events } = await start(fake);
    api.executeCommand("toggleAudio");
    await flush();
    expect(events).toContainEqual(["audioMuteStatusChanged", { muted: true }]);
    expect(api.getSnapshot().participants[0].audioMuted).toBe(true);
    api.executeCommand("toggleVideo");
    await flush();
    expect(events).toContainEqual(["videoMuteStatusChanged", { muted: true }]);
    expect(await api.isVideoMuted()).toBe(true);

    api.executeCommand("toggleRaiseHand");
    expect(conf.calls.find((c) => c[0] === "setLocalParticipantProperty" && c[1] === "raisedHand")).toBeTruthy();
    expect(events).toContainEqual(["raiseHandUpdated", { id: "local1", handRaised: true }]);
  });

  it("shares and stops sharing the screen as a second video source", async () => {
    const { api, conf, events } = await start(fake);
    api.executeCommand("toggleShareScreen");
    await flush();
    await flush();
    expect(conf.calls).toContainEqual(["addTrack", "video", "desktop"]);
    expect(events).toContainEqual(["screenSharingStatusChanged", { on: true }]);
    expect(events).toContainEqual(["contentSharingParticipantsChanged", { data: ["local1"] }]);
    api.executeCommand("toggleShareScreen");
    await flush();
    await flush();
    expect(events).toContainEqual(["screenSharingStatusChanged", { on: false }]);
  });

  it("starts only one share when Present is pressed twice, and swaps the camera beside a share", async () => {
    const { api, conf } = await start(fake);
    api.executeCommand("toggleShareScreen");
    api.executeCommand("toggleShareScreen"); // picker still open
    await flush();
    await flush();
    expect(conf.calls.filter((c) => c[0] === "addTrack" && c[2] === "desktop")).toHaveLength(1);
    // Current servers send the camera beside the share, so a new camera goes out straight away.
    api.executeCommand("setCameraDevice", "cam-2");
    await flush();
    await flush();
    expect(conf.calls.filter((c) => c[0] === "replaceTrack" && c[1] === "video")).toHaveLength(1);
  });

  it("joins with audio only when the camera is blocked, and says so", async () => {
    fake.deny = ["video"];
    const { api, conf } = await start(fake);
    expect(conf.calls.filter((c) => c[0] === "addTrack").map((c) => c[1])).toEqual(["audio"]);
    expect(api.getSnapshot().deviceError).toMatch(/audio only/);
  });

  it("closes the class for a kicked participant and relays chat", async () => {
    const { api, conf, events } = await start(fake);
    conf.remoteJoin("r1", "Aarav");
    conf.emit(EVENTS.conference.MESSAGE_RECEIVED, "r1", "Hello!", 1);
    api.sendChatMessage("Hi Aarav");
    expect(conf.calls).toContainEqual(["sendTextMessage", "Hi Aarav"]);
    expect(api.getSnapshot().messages.map((m) => [m.name, m.text, m.self])).toEqual([
      ["Aarav", "Hello!", false],
      ["Karan", "Hi Aarav", true],
    ]);
    conf.emit(EVENTS.conference.KICKED);
    expect(events).toContainEqual(["readyToClose", {}]);
    expect(api.getSnapshot().phase).toBe("ended");
  });

  it("keeps when each hand went up, so raised hands can be answered in order", async () => {
    const { api, conf } = await start(fake);
    const first = conf.remoteJoin("r1", "Asha");
    const second = conf.remoteJoin("r2", "Ravi");
    conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, second, "raisedHand", "", "1767000000000");
    conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, first, "raisedHand", "", "1766000000000");
    const byId = (id: string) => api.getSnapshot().participants.find((p) => p.id === id)!;
    expect(byId("r1").raisedAt).toBe(1766000000000);
    expect(byId("r2").raisedAt).toBe(1767000000000);
    conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, first, "raisedHand", "1766000000000", "");
    expect(byId("r1").handRaised).toBe(false);
    expect(byId("r1").raisedAt).toBeUndefined();
    // Older clients send "true" instead of a time: treated as raised now.
    conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, first, "raisedHand", "", "true");
    expect(byId("r1").raisedAt).toBeGreaterThan(1767000000000);
  });

  it("reports a dropped connection until it is restored", async () => {
    const { api, conf } = await start(fake);
    expect(api.getSnapshot().reconnecting).toBe(false);
    conf.emit(EVENTS.conference.CONNECTION_INTERRUPTED);
    expect(api.getSnapshot().reconnecting).toBe(true);
    conf.emit(EVENTS.conference.CONNECTION_RESTORED);
    expect(api.getSnapshot().reconnecting).toBe(false);
  });

  it("sends and shows reactions, ignoring anything that isn't a known emoji", async () => {
    const { api, conf } = await start(fake);
    conf.remoteJoin("r1", "Asha");
    api.executeCommand("sendReaction", "👏");
    api.executeCommand("sendReaction", "👏"); // throttled: one a second
    // Jitsi Meet's own format, so students on the embedded page see it too.
    const sent = conf.calls.filter((c) => c[0] === "broadcastEndpointMessage");
    expect(sent).toHaveLength(1);
    expect(sent[0][1]).toMatchObject({ name: "endpoint-reaction", reactions: ["clap"] });
    conf.remoteSignal("r1", { m2m: 1, type: "reaction", emoji: "🎉" });
    conf.remoteSignal("r1", { m2m: 1, type: "reaction", emoji: "<b>hi</b>" });
    conf.remoteSignal("r1", { type: "reaction", emoji: "🎉" }); // not ours
    // From the embedded page: known names only, at most three.
    conf.remoteSignal("r1", { name: "endpoint-reaction", reactions: ["love", "<script>", "boo"], timestamp: 1 });
    expect(api.getSnapshot().reactions.map((r) => [r.from, r.emoji])).toEqual([["local1", "👏"], ["r1", "🎉"], ["r1", "❤️"], ["r1", "🙁"]]);
  });

  it("reads hands from Jitsi's embedded page, which lowers them by setting 0", async () => {
    const { api, conf } = await start(fake);
    const asha = conf.remoteJoin("r1", "Asha");
    const raise = (v: string) => {
      asha.props.raisedHand = v;
      conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, asha, "raisedHand", "", v);
    };
    const hand = () => api.getSnapshot().participants.find((p) => p.id === "r1")!;
    raise("1731400000000");
    expect(hand()).toMatchObject({ handRaised: true, raisedAt: 1731400000000 });
    raise("0");
    expect(hand().handRaised).toBe(false);
    raise("true");
    expect(hand().handRaised).toBe(true);
    raise("false");
    expect(hand().handRaised).toBe(false);
    // Someone already in the room with a lowered hand.
    const late = conf.remoteJoin("r2", "Ravi");
    late.props.raisedHand = "0";
    conf.emit(EVENTS.conference.USER_JOINED, "r2", late);
    expect(api.getSnapshot().participants.find((p) => p.id === "r2")!.handRaised).toBe(false);
  });

  it("lowers hands with Jitsi Meet's own message, and knows who is on this call screen", async () => {
    const teacherFake = createFakeLib({ moderator: true });
    const { api, conf } = await start(teacherFake);
    expect(conf.calls).toContainEqual(["setLocalParticipantProperty", "m2mNative", "1"]);
    const asha = conf.remoteJoin("r1", "Asha");
    asha.props.m2mNative = "1";
    conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, asha, "m2mNative", "", "1");
    conf.remoteJoin("r2", "Ravi");
    const snap = api.getSnapshot().participants;
    expect(snap.find((p) => p.id === "r1")!.nativeClient).toBe(true);
    expect(snap.find((p) => p.id === "r2")!.nativeClient).toBe(false);
    api.executeCommand("lowerHand", "r2");
    api.executeCommand("lowerAllHands");
    expect(conf.calls).toContainEqual(["sendEndpointMessage", "r2", { name: "lower-hand-message" }]);
    expect(conf.calls).toContainEqual(["broadcastEndpointMessage", { name: "lower-hand-message" }]);
  });

  it("obeys class controls only from the teacher", async () => {
    const { api, conf } = await start(fake);
    conf.remoteJoin("student", "Ravi");
    conf.remoteJoin("teacher", "Karan", { role: "moderator" });
    api.executeCommand("toggleRaiseHand");
    api.executeCommand("toggleAudio");
    await flush();
    const me = () => api.getSnapshot().participants.find((p) => p.isLocal)!;
    expect(me().handRaised).toBe(true);
    expect(me().audioMuted).toBe(true);

    // A classmate can't lower my hand, spotlight anyone or ask me to unmute.
    conf.remoteSignal("student", { m2m: 1, type: "lowerAllHands" });
    conf.remoteSignal("student", { m2m: 1, type: "spotlight", id: "student" });
    conf.remoteSignal("student", { m2m: 1, type: "askUnmute", id: "local1" });
    expect(me().handRaised).toBe(true);
    expect(api.getSnapshot().spotlightId).toBeNull();
    expect(api.getSnapshot().unmuteRequestAt).toBeNull();

    // ...nor with Jitsi Meet's own lower-hand message.
    conf.remoteSignal("student", { name: "lower-hand-message" });
    expect(me().handRaised).toBe(true);

    // The teacher can; asking to unmute only shows a prompt and never unmutes.
    conf.remoteSignal("teacher", { name: "lower-hand-message" });
    conf.remoteSignal("teacher", { m2m: 1, type: "spotlight", id: "student" });
    conf.remoteSignal("teacher", { m2m: 1, type: "askUnmute", id: "local1" });
    expect(me().handRaised).toBe(false);
    expect(api.getSnapshot().spotlightId).toBe("student");
    expect(api.getSnapshot().unmuteRequestAt).not.toBeNull();
    expect(me().audioMuted).toBe(true);
    api.executeCommand("toggleAudio");
    await flush();
    expect(api.getSnapshot().unmuteRequestAt).toBeNull();

    // A spotlighted student leaving clears the spotlight.
    conf.remoteLeave("student");
    expect(api.getSnapshot().spotlightId).toBeNull();
  });

  it("lets only a moderator send class controls, and remembers recent speakers", async () => {
    const student = await start(fake);
    student.api.executeCommand("lowerAllHands");
    student.api.executeCommand("setSpotlight", "x");
    expect(student.conf.calls.some((c) => c[0] === "broadcastEndpointMessage" || c[0] === "sendEndpointMessage")).toBe(false);
    student.api.dispose();

    const teacherFake = createFakeLib({ moderator: true });
    const { api, conf } = await start(teacherFake);
    conf.moderator = true;
    conf.emit(EVENTS.conference.USER_ROLE_CHANGED, "local1", "moderator");
    conf.remoteJoin("r1", "Asha");
    api.executeCommand("setSpotlight", "r1");
    api.executeCommand("askToUnmute", "r1");
    expect(api.getSnapshot().spotlightId).toBe("r1");
    expect(conf.calls.filter((c) => c[0] === "broadcastEndpointMessage").map((c) => (c[1] as { type: string }).type)).toEqual(["spotlight", "askUnmute"]);
    conf.emit(EVENTS.conference.DOMINANT_SPEAKER_CHANGED, "r1");
    expect(api.getSnapshot().participants.find((p) => p.id === "r1")?.lastSpokeAt).toBeGreaterThan(0);
  });

  it("disposes tracks, leaves and disconnects", async () => {
    const { api, conf } = await start(fake);
    const spy = vi.fn();
    api.addListener("participantJoined", spy);
    api.dispose();
    expect(conf.calls).toContainEqual(["leave"]);
    expect(fake.disconnected).toBe(true);
    api.executeCommand("toggleAudio");
    conf.remoteJoin("r9", "Late");
    expect(spy).not.toHaveBeenCalled();
  });
});
