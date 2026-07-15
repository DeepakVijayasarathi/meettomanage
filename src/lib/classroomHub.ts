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
  quizAnswer: (name: string, questionIndex: number, correct: boolean) => void;
  leaderboard: (entries: HubLeaderboardEntry[]) => void;
  celebrate: (message: string | null) => void;
  boardAccess: (allowed: boolean) => void;
}

/**
 * Live-classroom hub client: joins the session group and exposes typed send/on
 * wrappers over the SignalR connection. All sends are safe no-ops while
 * disconnected so a hub outage never breaks the class (Jitsi carries the call).
 */
export class ClassroomHubClient {
  private connection: HubConnection | null = null;
  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async connect(displayName: string, handlers: Partial<ClassroomHubEvents>): Promise<boolean> {
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

    // Re-join the session group after an automatic reconnect (new connection id).
    connection.onreconnected(() => {
      connection.invoke("JoinSession", this.sessionId, displayName).catch(() => undefined);
    });

    try {
      await connection.start();
      await connection.invoke("JoinSession", this.sessionId, displayName);
      this.connection = connection;
      return true;
    } catch {
      // Hub unavailable — the classroom still works, just without real-time sync.
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

  answerQuiz(questionIndex: number, correct: boolean): void {
    this.send("AnswerQuiz", questionIndex, correct);
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
