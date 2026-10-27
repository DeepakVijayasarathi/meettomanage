import { apiFetch } from "@/lib/api";

export type MitoMode = "general" | "doubt" | "plan" | "review";
export interface MitoChatTurn { role: "user" | "assistant"; text: string }
export interface MitoChatResponse { reply: string; expression: string; suggestedPrompts: string[] }
export interface MitoTodayResponse {
  studentName: string;
  generatedAtUtc: string;
  items: { sessionId: string; title: string; teacherName: string; startsAtUtc: string; endsAtUtc: string; status: string }[];
}
export interface MitoProgressResponse {
  studentName: string;
  academicLevel: string | null;
  classesCompleted: number;
  classesRemaining: number;
  attendancePercent: number | null;
  summary: string;
}

export function askMito(childId: string, messages: MitoChatTurn[], mode: MitoMode): Promise<MitoChatResponse> {
  return apiFetch<MitoChatResponse>("/api/mito/chat", { method: "POST", body: JSON.stringify({ childId, messages, mode }) });
}

export function getMitoToday(childId: string): Promise<MitoTodayResponse> {
  return apiFetch<MitoTodayResponse>(`/api/mito/today?childId=${encodeURIComponent(childId)}`);
}

export function getMitoProgress(childId: string): Promise<MitoProgressResponse> {
  return apiFetch<MitoProgressResponse>(`/api/mito/progress?childId=${encodeURIComponent(childId)}`);
}
