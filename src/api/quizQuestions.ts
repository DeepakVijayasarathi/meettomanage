import { apiFetch } from "@/lib/api";

/**
 * Admin-authored live-quiz question bank (GET/POST/PUT/DELETE /api/quiz-questions),
 * scoped by department and optionally narrowed to one course. Replaces what used to be
 * one hardcoded 4-question bank every class shared regardless of subject — see
 * GET /api/quiz-questions/for-session/{sessionId} (quizQuestionsForSession below), which
 * is what the live classroom now actually launches a quiz from.
 */
export interface ApiQuizQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface ApiQuizQuestion {
  id: string;
  departmentId: string;
  departmentName: string;
  courseId: string | null;
  courseName: string | null;
  prompt: string;
  displayOrder: number;
  options: ApiQuizQuestionOption[];
}

export interface QuizQuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface SaveQuizQuestionInput {
  /** Required when courseId is unset — ignored (derived from the course) when it is set. */
  departmentId?: string;
  courseId?: string;
  prompt: string;
  displayOrder?: number;
  options: QuizQuestionOptionInput[];
}

export async function listQuizQuestions(departmentId?: string, courseId?: string): Promise<ApiQuizQuestion[]> {
  const params = new URLSearchParams();
  if (departmentId) params.set("departmentId", departmentId);
  if (courseId) params.set("courseId", courseId);
  const qs = params.toString();
  return apiFetch<ApiQuizQuestion[]>(`/api/quiz-questions${qs ? `?${qs}` : ""}`);
}

export async function createQuizQuestion(input: SaveQuizQuestionInput): Promise<ApiQuizQuestion> {
  return apiFetch<ApiQuizQuestion>("/api/quiz-questions", { method: "POST", body: JSON.stringify(input) });
}

export async function updateQuizQuestion(id: string, input: SaveQuizQuestionInput): Promise<ApiQuizQuestion> {
  return apiFetch<ApiQuizQuestion>(`/api/quiz-questions/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteQuizQuestion(id: string): Promise<void> {
  await apiFetch<void>(`/api/quiz-questions/${id}`, { method: "DELETE" });
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The resolved quiz set for one live class — this course's own questions first, then the
 *  department's shared ones (the only pool a Demo session draws from). */
export async function getQuizQuestionsForSession(sessionId: string | undefined): Promise<ApiQuizQuestion[]> {
  if (!sessionId || !GUID_RE.test(sessionId)) return [];
  return apiFetch<ApiQuizQuestion[]>(`/api/quiz-questions/for-session/${sessionId}`);
}
