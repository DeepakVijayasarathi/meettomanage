import { apiFetch } from "@/lib/api";
import type { ApiInvoice } from "@/api/billing";
import type { ApiClassSession } from "@/api/sessions";
import type { ApiResource } from "@/api/resources";

export interface ApiParentChildSummary {
  childId: string;
  name: string;
  academicLevel: string | null;
  classesCompleted: number;
  classesRemaining: number;
  attendancePercent: number;
  feeStatus: "paid" | "due" | "overdue" | "suspended";
}

export interface ApiParentDashboard {
  parentProfileId: string;
  enrollmentFormCompleted: boolean;
  isSuspended: boolean;
  suspendedInvoiceId: string | null;
  children: ApiParentChildSummary[];
}

export interface ApiEnrollmentForm {
  id: string;
  parentProfileId: string;
  parentName: string;
  parentEmail: string;
  childId: string | null;
  formDataJson: string;
  status: "Pending" | "Submitted" | "Approved" | "Rejected";
  submittedAtUtc: string | null;
  reviewedAtUtc: string | null;
}

export async function getParentDashboard(): Promise<ApiParentDashboard> {
  return apiFetch<ApiParentDashboard>("/api/parent-portal/dashboard");
}

export async function getParentSchedule(fromUtc: string, toUtc: string): Promise<ApiClassSession[]> {
  return apiFetch<ApiClassSession[]>(`/api/parent-portal/schedule?fromUtc=${fromUtc}&toUtc=${toUtc}`);
}

export async function getParentResources(): Promise<ApiResource[]> {
  return apiFetch<ApiResource[]>("/api/parent-portal/resources");
}

export async function getParentInvoices(): Promise<ApiInvoice[]> {
  return apiFetch<ApiInvoice[]>("/api/parent-portal/invoices");
}

/** Mandatory first-login enrollment form (answers as a JSON document). */
export async function submitEnrollmentForm(formData: Record<string, unknown>): Promise<ApiEnrollmentForm> {
  return apiFetch<ApiEnrollmentForm>("/api/enrollment-forms", {
    method: "POST",
    body: JSON.stringify({ formDataJson: JSON.stringify(formData) }),
  });
}

export async function listMyEnrollmentForms(): Promise<ApiEnrollmentForm[]> {
  return apiFetch<ApiEnrollmentForm[]>("/api/enrollment-forms/mine");
}

// Admin review side
export async function listEnrollmentForms(status?: ApiEnrollmentForm["status"]): Promise<ApiEnrollmentForm[]> {
  return apiFetch<ApiEnrollmentForm[]>(`/api/enrollment-forms${status ? `?status=${status}` : ""}`);
}

export async function reviewEnrollmentForm(
  id: string,
  input: { approve: boolean; childFirstName?: string; childLastName?: string; childDateOfBirth?: string }
): Promise<ApiEnrollmentForm> {
  return apiFetch<ApiEnrollmentForm>(`/api/enrollment-forms/${id}/review`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
