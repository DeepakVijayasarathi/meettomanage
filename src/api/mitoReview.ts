import { apiFetch } from "@/lib/api";

export interface MitoInsights {
  windowDays: number;
  dailyLimit: number;
  totalRequests: number;
  activeStudents: number;
  studentsAtLimitToday: number;
  openFlags: number;
  byDay: { date: string; requests: number; students: number }[];
  byMode: Record<string, number>;
  topStudents: { childId: string; name: string; requests: number; lastUsed: string }[];
}

export interface MitoFlag {
  id: string;
  childId: string;
  childName: string;
  mode: string;
  question: string;
  answer: string;
  reason: string | null;
  createdAtUtc: string;
  resolvedAtUtc: string | null;
  resolution: string | null;
}

export const getMitoInsights = (days = 30) => apiFetch<MitoInsights>(`/api/mito-review/insights?days=${days}`);
export const listMitoFlags = (open = true) => apiFetch<MitoFlag[]>(`/api/mito-review/flags?open=${open}`);
export const resolveMitoFlag = (id: string, resolution: string) =>
  apiFetch<MitoFlag>(`/api/mito-review/flags/${id}/resolve`, { method: "POST", body: JSON.stringify({ resolution: resolution.trim() || null }) });
