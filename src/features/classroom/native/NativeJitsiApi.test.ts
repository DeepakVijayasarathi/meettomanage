import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeJitsiApi } from "./NativeJitsiApi";
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
    expect(conf.calls.find((c) => c[0] === "setLocalParticipantProperty")?.[1]).toBe("raisedHand");
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
