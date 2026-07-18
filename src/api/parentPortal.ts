import { apiFetch, getAccessToken } from "@/lib/api";
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

export interface ApiParentChild {
  id: string;
  firstName: string;
  lastName: string;
  academicLevel: string | null;
  isActive: boolean;
}

/** The signed-in parent's own children (approved enrollments). */
export async function getParentChildren(): Promise<ApiParentChild[]> {
  return apiFetch<ApiParentChild[]>("/api/parent-portal/children");
}

export interface ApiPaymentMethod {
  key: string;
  name: string;
}

/** Enabled payment-gateway integrations for the Pay Now popup (the UI adds Cash on top). */
export async function getPaymentMethods(): Promise<ApiPaymentMethod[]> {
  return apiFetch<ApiPaymentMethod[]>("/api/parent-portal/payment-methods");
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

/** Downloads the print-ready invoice document with the bearer token and saves it. */
export async function downloadParentInvoice(invoiceId: string, invoiceNumber: string): Promise<void> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = getAccessToken();
  const response = await fetch(`${baseUrl}/api/parent-portal/invoices/${invoiceId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `invoice-${invoiceNumber}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface ParentPaymentResult {
  // "unavailable" = the chosen gateway is turned off or missing keys; message says how to fix it.
  mode: "redirect" | "cash" | "unavailable";
  url: string | null;
  gatewayReference: string | null;
  message: string;
}

/** Pay Now: cash records a pending intent; a gateway key returns a checkout URL. */
export async function payInvoice(invoiceId: string, methodKey: string): Promise<ParentPaymentResult> {
  return apiFetch<ParentPaymentResult>(`/api/parent-portal/invoices/${invoiceId}/pay`, {
    method: "POST",
    body: JSON.stringify({ methodKey }),
  });
}

/**
 * After returning from the gateway checkout, asks the backend to verify the payment
 * directly with the gateway (no webhook needed) and returns the refreshed invoice.
 */
export async function refreshInvoicePayment(invoiceId: string): Promise<ApiInvoice> {
  return apiFetch<ApiInvoice>(`/api/parent-portal/invoices/${invoiceId}/refresh-payment`, {
    method: "POST",
  });
}

/** Admin edits the submitted answers before approval. */
export async function updateEnrollmentForm(id: string, formData: Record<string, unknown>): Promise<ApiEnrollmentForm> {
  return apiFetch<ApiEnrollmentForm>(`/api/enrollment-forms/${id}`, {
    method: "PUT",
    body: JSON.stringify({ formDataJson: JSON.stringify(formData) }),
  });
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
