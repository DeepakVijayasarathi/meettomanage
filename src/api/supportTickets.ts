import { apiFetch } from "@/lib/api";
import { getUserTimeZone } from "@/lib/datetime";

export type SupportTicketStatus = "Open" | "InProgress" | "Resolved" | "Closed";
export type SupportTicketCategory = "ClassSchedule" | "Teacher" | "BillingPayment" | "Technical" | "Enrollment" | "Other";

export const TICKET_CATEGORIES: { value: SupportTicketCategory; label: string }[] = [
  { value: "ClassSchedule", label: "Class timing / schedule" },
  { value: "Teacher", label: "Teacher" },
  { value: "BillingPayment", label: "Billing / payment" },
  { value: "Technical", label: "Technical issue (login, live class, app)" },
  { value: "Enrollment", label: "Enrollment" },
  { value: "Other", label: "Something else" },
];

export const TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  Open: "Open",
  InProgress: "In progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

export function ticketCategoryLabel(category: SupportTicketCategory): string {
  return TICKET_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export interface ApiSupportTicketSummary {
  id: string;
  reference: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  parentUserId: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  childId: string | null;
  childName: string | null;
  /** The parent wrote last, so the ticket is waiting on the team. */
  awaitingStaffReply: boolean;
  messageCount: number;
  lastMessagePreview: string | null;
  createdAtUtc: string;
  lastActivityAtUtc: string;
  resolvedAtUtc: string | null;
}

export interface ApiSupportTicketMessage {
  id: string;
  authorName: string;
  isStaff: boolean;
  body: string;
  createdAtUtc: string;
}

export interface ApiSupportTicketDetail extends ApiSupportTicketSummary {
  messages: ApiSupportTicketMessage[];
}

export interface ApiSupportTicketCounts {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  awaitingReply: number;
}

// --- Parent ---

export async function listMySupportTickets(): Promise<ApiSupportTicketSummary[]> {
  return apiFetch<ApiSupportTicketSummary[]>("/api/support-tickets/mine");
}

export async function getMySupportTicket(id: string): Promise<ApiSupportTicketDetail> {
  return apiFetch<ApiSupportTicketDetail>(`/api/support-tickets/mine/${id}`);
}

export async function createSupportTicket(input: {
  category: SupportTicketCategory;
  subject: string;
  message: string;
  childId?: string | null;
}): Promise<ApiSupportTicketDetail> {
  return apiFetch<ApiSupportTicketDetail>("/api/support-tickets/mine", { method: "POST", body: JSON.stringify(input) });
}

export async function replyToMySupportTicket(id: string, message: string): Promise<ApiSupportTicketDetail> {
  return apiFetch<ApiSupportTicketDetail>(`/api/support-tickets/mine/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// --- Staff (Relationship Manager / Admin) ---

export async function listSupportTickets(params?: {
  status?: SupportTicketStatus;
  search?: string;
}): Promise<ApiSupportTicketSummary[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  return apiFetch<ApiSupportTicketSummary[]>(`/api/support-tickets${qs ? `?${qs}` : ""}`);
}

export async function getSupportTicketCounts(): Promise<ApiSupportTicketCounts> {
  return apiFetch<ApiSupportTicketCounts>("/api/support-tickets/counts");
}

export async function getSupportTicket(id: string): Promise<ApiSupportTicketDetail> {
  return apiFetch<ApiSupportTicketDetail>(`/api/support-tickets/${id}`);
}

export async function replyToSupportTicket(id: string, message: string): Promise<ApiSupportTicketDetail> {
  return apiFetch<ApiSupportTicketDetail>(`/api/support-tickets/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function updateSupportTicketStatus(id: string, status: SupportTicketStatus): Promise<ApiSupportTicketDetail> {
  return apiFetch<ApiSupportTicketDetail>(`/api/support-tickets/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/**
 * "23 Sept, 5:49 pm" in the signed-in user's own account timezone rather than the browser's
 * clock — a family abroad and the RM reading the same thread must each see their own local
 * time (formatDate's "datetime" uses the browser zone, which isn't always the account's).
 */
export function formatTicketTime(isoUtc: string): string {
  return new Date(isoUtc).toLocaleString("en-IN", {
    timeZone: getUserTimeZone(),
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
