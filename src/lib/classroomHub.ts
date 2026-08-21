import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { apiEnabled, getAccessToken } from "@/lib/api";

/** One roster row as broadcast by the hub. */
export interface HubParticipant {
  connectionId: string;
  name: string;
  role: "teacher" | "student";
  handRaised: boolean;
}

export interface HubLeaderboardEntry {
  name: string;
  stars: number;
}

export interface ClassroomHubEvents {
  roster: (participants: HubParticipant[]) => void;
  board: (opJson: string) => void;
  chat: (author: string, text: string) => void;
  quizStarted: (questionIndex: number) => void;
  quizEnded: () => void;
  quizAnswer: (name: string, questionIndex: number, selectedIndex: number, correct: boolean) => void;
  leaderboard: (entries: HubLeaderboardEntry[]) => void;
  celebrate: (message: string | null) => void;
  boardAccess: (allowed: boolean) => void;
}

/**
 * "connected" — live sync is up. "reconnecting" — SignalR is mid-retry after a
 * drop (whiteboard/quiz ops sent during this window are silently lost, since
 * `send()` no-ops while disconnected). "disconnected" — no live sync at all,
 * either never connected or reconnection gave up.
 */
export type ClassroomHubState = "connected" | "reconnecting" | "disconnected";

/**
 * Turns a raw SignalR/negotiate error into a short, teacher-facing reason instead
 * of the generic "Working locally" badge that used to hide "you don't have access
 * to this session" behind the same wording as an actual network outage. HubException
 * messages thrown from JoinSession (see ClassroomHub.cs) come through verbatim, so
 * those are shown as-is; everything else is a transport/auth failure, bucketed by
 * what SignalR's own error text says.
 */
function describeHubError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("You do not have access to this session")) return "You don't have access to this session.";
  if (message.includes("Invalid session id")) return "This session's id looks wrong — live sync can't attach to it.";
  if (message.includes("Unauthorized") || message.includes("Status code '401'")) return "Your session token was rejected — try signing in again.";
  if (message.includes("Failed to fetch") || message.includes("Failed to complete negotiation")) return "Couldn't reach the live-sync server.";
  return message;
}

/**
 * Live-classroom hub client: joins the session group and exposes typed send/on
 * wrappers over the SignalR connection. All sends are safe no-ops while
 * disconnected so a hub outage never breaks the class (Jitsi carries the call).
 */
export class ClassroomHubClient {
  private connection: HubConnection | null = null;
  private disposed = false;
  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async connect(
    displayName: string,
    handlers: Partial<ClassroomHubEvents>,
    onStateChange?: (state: ClassroomHubState, detail?: string) => void
  ): Promise<boolean> {
    if (!apiEnabled()) return false;
    const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

    const connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/classroom`, {
        accessTokenFactory: () => getAccessToken() ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    if (handlers.roster) connection.on("Roster", handlers.roster);
    if (handlers.board) connection.on("Board", handlers.board);
    if (handlers.chat) connection.on("Chat", handlers.chat);
    if (handlers.quizStarted) connection.on("QuizStarted", handlers.quizStarted);
    if (handlers.quizEnded) connection.on("QuizEnded", handlers.quizEnded);
    if (handlers.quizAnswer) connection.on("QuizAnswer", handlers.quizAnswer);
    if (handlers.leaderboard) connection.on("Leaderboard", handlers.leaderboard);
    if (handlers.celebrate) connection.on("Celebrate", handlers.celebrate);
    if (handlers.boardAccess) connection.on("BoardAccess", handlers.boardAccess);

    // SignalR's own retry loop — surface it so the UI can stop pretending sync
    // is healthy the instant it isn't, instead of only knowing "connected" once
    // at startup and never again.
    connection.onreconnecting((err) => {
      if (err) console.warn("Classroom hub reconnecting after a drop:", err);
      onStateChange?.("reconnecting");
    });
    connection.onclose((err) => {
      if (err) console.error("Classroom hub connection closed:", err);
      onStateChange?.("disconnected", err ? describeHubError(err) : undefined);
    });

    // Re-join the session group after an automatic reconnect (new connection id).
    connection.onreconnected(() => {
      connection.invoke("JoinSession", this.sessionId, displayName).catch(() => undefined);
      onStateChange?.("connected");
    });

    // Exposed immediately (before start()/JoinSession even resolve), not only on success.
    // React StrictMode (dev) mounts, cleans up and remounts every component once — the
    // cleanup's disconnect() can fire while this connect() is still mid-flight. If
    // `this.connection` stayed unset until after a successful join, that early disconnect()
    // found nothing to stop, so the first (StrictMode-discarded) connection kept connecting
    // and joined the room anyway, orphaned — leaving a duplicate "ghost" participant beside
    // the real one until the server's own connection-timeout eventually cleaned it up.
    this.connection = connection;

    try {
      await connection.start();
      if (this.disposed) {
        await connection.stop().catch(() => undefined);
        return false;
      }
      await connection.invoke("JoinSession", this.sessionId, displayName);
      if (this.disposed) {
        // Joined after disconnect() already ran and moved on — leave immediately
        // rather than linger in the roster as a duplicate of a later connection.
        await connection.invoke("LeaveSession", this.sessionId).catch(() => undefined);
        await connection.stop().catch(() => undefined);
        return false;
      }
      onStateChange?.("connected");
      return true;
    } catch (err) {
      // Hub unavailable — the classroom still works, just without real-time sync.
      // Logged (not swallowed): the only way to tell "WebSocket blocked by a
      // proxy", "negotiate timed out", "401 from a stale token" and "hub simply
      // down" apart is this exact error — silence made every one of those look
      // identical from the UI's "disconnected" state alone.
      console.error("Classroom hub connection failed:", err);
      onStateChange?.("disconnected", describeHubError(err));
      return false;
    }
  }

  get connected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  private send(method: string, ...args: unknown[]): void {
    if (!this.connected) return;
    this.connection!.invoke(method, this.sessionId, ...args).catch(() => undefined);
  }

  sendBoard(opJson: string): void {
    this.send("SendBoard", opJson);
  }

  sendChat(text: string): void {
    this.send("SendChat", text);
  }

  startQuiz(questionIndex: number): void {
    this.send("StartQuiz", questionIndex);
  }

  endQuiz(): void {
    this.send("EndQuiz");
  }

  answerQuiz(questionIndex: number, selectedIndex: number, correct: boolean): void {
    this.send("AnswerQuiz", questionIndex, selectedIndex, correct);
  }

  /** Live-leaderboard bump for a whiteboard mini-game completion (see postAward for the durable half). */
  awardStar(): void {
    this.send("AwardStar");
  }

  celebrate(message?: string): void {
    this.send("Celebrate", message ?? null);
  }

  raiseHand(raised: boolean): void {
    this.send("RaiseHand", raised);
  }

  setBoardAccess(connectionId: string, allowed: boolean): void {
    this.send("SetBoardAccess", connectionId, allowed);
  }

  async disconnect(): Promise<void> {
    this.disposed = true;
    const connection = this.connection;
    this.connection = null;
    if (!connection) return;
    try {
      await connection.invoke("LeaveSession", this.sessionId);
    } catch {
      /* already gone */
    }
    await connection.stop().catch(() => undefined);
  }
}
