import { apiFetch } from "@/lib/api";

export type ParentFeedbackKind = "Demo" | "CourseCompletion";

/** Something the signed-in parent still owes a rating for -- drives the popup. */
export interface ApiPendingParentFeedback {
  kind: ParentFeedbackKind;
  demoBookingId: string | null;
  batchId: string | null;
  childId: string | null;
  childName: string;
  courseName: string | null;
  endedAtUtc: string;
}

export interface ApiParentFeedback {
  id: string;
  kind: ParentFeedbackKind;
  parentName: string;
  parentEmail: string;
  childName: string;
  subject: string | null;
  rating: number;
  comment: string | null;
  submittedAtUtc: string;
}

export async function getPendingParentFeedback(): Promise<ApiPendingParentFeedback[]> {
  return apiFetch<ApiPendingParentFeedback[]>("/api/parent-feedback/pending");
}

export async function submitParentFeedback(
  pending: ApiPendingParentFeedback,
  rating: number,
  comment: string
): Promise<void> {
  await apiFetch<void>("/api/parent-feedback", {
    method: "POST",
    body: JSON.stringify({
      kind: pending.kind,
      demoBookingId: pending.demoBookingId,
      batchId: pending.batchId,
      childId: pending.childId,
      rating,
      comment: comment.trim() || null,
    }),
  });
}

/** Admin / Admission report: everything parents have submitted, newest first. */
export async function listParentFeedback(kind?: ParentFeedbackKind): Promise<ApiParentFeedback[]> {
  return apiFetch<ApiParentFeedback[]>(`/api/parent-feedback${kind ? `?kind=${kind}` : ""}`);
}
