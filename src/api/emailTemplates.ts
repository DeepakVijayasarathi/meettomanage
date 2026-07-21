import { apiFetch } from "@/lib/api";

/** Backend NotificationType enum names — matches api/notifications.ts's ApiNotificationType. */
export type EmailTemplateCategory =
  | "BookingConfirmation"
  | "SessionReminder"
  | "NoShowAlert"
  | "DelayedSessionAlert"
  | "PaymentReminder"
  | "PaymentReceived"
  | "FeeSuspension"
  | "LeaveStatusUpdate"
  | "AttendanceUpdate"
  | "PerformanceSummary"
  | "PayoutStatement"
  | "General";

export interface ApiEmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: EmailTemplateCategory;
  subject: string;
  htmlBody: string;
  /** Token names this template's sender supplies, e.g. ["FirstName","Email"] — insertable in the editor. */
  placeholders: string[];
  isActive: boolean;
  isSystem: boolean;
  updatedAtUtc: string | null;
}

export interface SaveEmailTemplateRequest {
  subject: string;
  htmlBody: string;
  isActive: boolean;
}

export interface EmailTemplatePreview {
  subject: string;
  htmlBody: string;
}

export async function listEmailTemplates(): Promise<ApiEmailTemplate[]> {
  return apiFetch<ApiEmailTemplate[]>("/api/email-templates");
}

export async function getEmailTemplate(id: string): Promise<ApiEmailTemplate> {
  return apiFetch<ApiEmailTemplate>(`/api/email-templates/${id}`);
}

export async function updateEmailTemplate(id: string, request: SaveEmailTemplateRequest): Promise<ApiEmailTemplate> {
  return apiFetch<ApiEmailTemplate>(`/api/email-templates/${id}`, { method: "PUT", body: JSON.stringify(request) });
}

export async function previewEmailTemplate(
  id: string,
  sampleTokens: Record<string, string>
): Promise<EmailTemplatePreview> {
  return apiFetch<EmailTemplatePreview>(`/api/email-templates/${id}/preview`, {
    method: "POST",
    body: JSON.stringify({ sampleTokens }),
  });
}
