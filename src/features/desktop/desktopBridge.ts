/** Types for `window.desktop`, which only exists inside the Electron desktop app (desktop/preload-site.cjs). */
export interface ClaudeStatus {
  cliFound: boolean;
  cliPath?: string;
  loggedIn: boolean;
  email?: string;
  orgName?: string;
  authMethod?: string;
  subscriptionType?: string;
  error?: string;
}

export interface ClaudeUsageEntry {
  at: number;
  sessionId?: string;
  models: string[];
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  durationMs: number;
  turns: number;
  isError: boolean;
}

export interface ClaudeLimit {
  status: string;
  resetsAt?: number;
  utilization?: number;
  seen: number;
}

export interface ClaudeUsage {
  entries: ClaudeUsageEntry[];
  limits: Record<string, ClaudeLimit>;
}

/** Events streamed from the Claude CLI (`--output-format stream-json`) plus the app's own `done`/`error`. */
export interface AiEvent {
  type: string;
  session_id?: string;
  event?: { delta?: { type?: string; text?: string } };
  message?: string | { content?: Array<{ type: string; name?: string }> };
  is_error?: boolean;
  result?: string;
  code?: number;
  stderr?: string;
}

export interface AiAskPayload {
  prompt: string;
  sessionId: string | null;
  allowEdits: boolean;
  allowLiveWrites: boolean;
  allowCreate: boolean;
  /** "" = the CLI default. */
  model: "" | "sonnet" | "opus" | "haiku";
}

export interface DesktopBridge {
  isDesktop: true;
  /** True when the app was started in read-only demo mode against a client API. */
  demo: boolean;
  apiHost: string | null;
  ai: {
    status(): Promise<{ found: boolean; path: string | null; cwd: string; apiBase: string; signedInAs: string | null }>;
    ask(payload: AiAskPayload): void;
    stop(): void;
    setLiveToken(token: string | null, user?: string): Promise<void>;
    onEvent(cb: (event: AiEvent) => void): () => void;
  };
  claude: {
    status(): Promise<ClaudeStatus>;
    login(): Promise<{ ok: boolean; message: string }>;
    logout(): Promise<{ ok: boolean; message: string }>;
    usage(): Promise<ClaudeUsage>;
    clearUsage(): Promise<void>;
  };
}

export function getDesktop(): DesktopBridge | null {
  return (window as Window & { desktop?: DesktopBridge }).desktop ?? null;
}

/** Fence languages the AI Workspace renders as components (see desktop/rich-output.md). */
export const RICH_LANGS = ["chart", "table", "classplan", "quiz"] as const;
export type RichLang = (typeof RICH_LANGS)[number];
