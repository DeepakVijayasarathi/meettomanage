import { apiFetch, downloadFile } from "@/lib/api";

export type AssignmentKind = "Homework" | "Test";
export type SubmissionStatus = "Pending" | "Submitted" | "Graded" | "Excused";

export interface ApiAssignment {
  id: string;
  batchId: string;
  batchName: string;
  courseName: string | null;
  teacherName: string | null;
  kind: AssignmentKind;
  title: string;
  instructions: string | null;
  topic: string | null;
  attachmentFileName: string | null;
  dueAtUtc: string | null;
  maxMarks: number | null;
  resultsReleasedAtUtc: string | null;
  createdAtUtc: string;
  studentCount: number;
  submittedCount: number;
  gradedCount: number;
  averageMarks: number | null;
}

export interface ApiSubmission {
  id: string;
  childId: string;
  childName: string;
  status: SubmissionStatus;
  answerText: string | null;
  attachmentFileName: string | null;
  submittedAtUtc: string | null;
  isLate: boolean;
  marks: number | null;
  feedback: string | null;
  gradedAtUtc: string | null;
}

export interface ApiAssignmentDetail extends ApiAssignment {
  submissions: ApiSubmission[];
}

export interface ApiFamilyAssignment {
  assignmentId: string;
  submissionId: string;
  childId: string;
  childName: string;
  batchName: string;
  courseName: string | null;
  teacherName: string | null;
  kind: AssignmentKind;
  title: string;
  instructions: string | null;
  topic: string | null;
  attachmentFileName: string | null;
  dueAtUtc: string | null;
  maxMarks: number | null;
  status: SubmissionStatus;
  answerText: string | null;
  submissionFileName: string | null;
  submittedAtUtc: string | null;
  isOverdue: boolean;
  marks: number | null;
  feedback: string | null;
  resultsReleased: boolean;
  classAverage: number | null;
  canSubmit: boolean;
}

export interface ApiAssignableBatch {
  id: string;
  name: string;
  courseName: string | null;
  studentCount: number;
}

export interface SaveAssignmentInput {
  batchId: string;
  kind: AssignmentKind;
  title: string;
  instructions?: string;
  topic?: string;
  dueAtUtc?: string | null;
  maxMarks?: number | null;
  file?: File | null;
}

function toForm(input: SaveAssignmentInput): FormData {
  const form = new FormData();
  form.append("batchId", input.batchId);
  form.append("kind", input.kind);
  form.append("title", input.title);
  if (input.instructions?.trim()) form.append("instructions", input.instructions.trim());
  if (input.topic?.trim()) form.append("topic", input.topic.trim());
  if (input.dueAtUtc) form.append("dueAtUtc", input.dueAtUtc);
  if (input.maxMarks != null) form.append("maxMarks", String(input.maxMarks));
  if (input.file) form.append("file", input.file);
  return form;
}

// Teachers and staff
export const listAssignableBatches = () => apiFetch<ApiAssignableBatch[]>("/api/assignments/batches");
export const listAssignments = (batchId?: string) =>
  apiFetch<ApiAssignment[]>(`/api/assignments${batchId ? `?batchId=${encodeURIComponent(batchId)}` : ""}`);
export const getAssignment = (id: string) => apiFetch<ApiAssignmentDetail>(`/api/assignments/${id}`);
export const createAssignment = (input: SaveAssignmentInput) =>
  apiFetch<ApiAssignmentDetail>("/api/assignments", { method: "POST", body: toForm(input) });
export const updateAssignment = (id: string, input: SaveAssignmentInput) =>
  apiFetch<ApiAssignmentDetail>(`/api/assignments/${id}`, { method: "PUT", body: toForm(input) });
export const deleteAssignment = (id: string) => apiFetch<void>(`/api/assignments/${id}`, { method: "DELETE" });
export const gradeSubmission = (submissionId: string, body: { marks?: number | null; feedback?: string | null; excused?: boolean }) =>
  apiFetch<ApiSubmission>(`/api/assignments/submissions/${submissionId}/grade`, { method: "POST", body: JSON.stringify(body) });
export const releaseResults = (id: string) =>
  apiFetch<ApiAssignmentDetail>(`/api/assignments/${id}/release-results`, { method: "POST" });
export const downloadAssignmentAttachment = (a: { id: string; attachmentFileName: string | null }) =>
  downloadFile(`/api/assignments/${a.id}/attachment`, a.attachmentFileName ?? "worksheet");
export const downloadSubmissionFile = (s: ApiSubmission) =>
  downloadFile(`/api/assignments/submissions/${s.id}/file`, s.attachmentFileName ?? "submission");

// Families
export const listMyAssignments = (childId?: string) =>
  apiFetch<ApiFamilyAssignment[]>(`/api/assignments/mine${childId ? `?childId=${encodeURIComponent(childId)}` : ""}`);
export function submitAssignment(submissionId: string, answerText: string, file?: File | null) {
  const form = new FormData();
  if (answerText.trim()) form.append("answerText", answerText.trim());
  if (file) form.append("file", file);
  return apiFetch<ApiFamilyAssignment>(`/api/assignments/mine/${submissionId}/submit`, { method: "POST", body: form });
}
export const downloadMyWorksheet = (a: ApiFamilyAssignment) =>
  downloadFile(`/api/assignments/mine/${a.submissionId}/attachment`, a.attachmentFileName ?? "worksheet");
export const downloadMySubmission = (a: ApiFamilyAssignment) =>
  downloadFile(`/api/assignments/mine/${a.submissionId}/file`, a.submissionFileName ?? "submission");
