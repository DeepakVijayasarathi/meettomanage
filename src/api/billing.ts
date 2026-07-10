import { apiFetch } from "@/lib/api";
import type { Invoice } from "@/types";

export type ApiInvoiceStatus = "Pending" | "PartiallyPaid" | "Paid" | "Overdue" | "Cancelled";
export type ApiBillingType = "Subscription" | "SessionBased" | "OneTime";
export type ApiBillingCycle = "Monthly" | "Quarterly" | "Yearly" | "OneTime";
export type ApiPaymentMethod = "Card" | "Upi" | "NetBanking" | "Wallet" | "Other";

export interface ApiInvoice {
  id: string;
  invoiceNumber: string;
  parentProfileId: string;
  childId: string | null;
  department: "Phonics" | "Maths";
  amount: number;
  amountPaid: number;
  currency: string;
  status: ApiInvoiceStatus;
  dueDate: string;
  issuedAtUtc: string;
  paidAtUtc: string | null;
}

export interface ApiPackagePlan {
  id: string;
  name: string;
  courseId: string | null;
  billingType: ApiBillingType;
  billingCycle: ApiBillingCycle;
  price: number;
  sessionsIncluded: number | null;
  isActive: boolean;
}

const INVOICE_STATUS_FROM_API: Record<ApiInvoiceStatus, Invoice["status"]> = {
  Pending: "pending",
  PartiallyPaid: "partial",
  Paid: "paid",
  Overdue: "overdue",
  // The mock model has no cancelled state; surfaced as pending until the UI grows one
  Cancelled: "pending",
};

export function toFrontendInvoice(invoice: ApiInvoice): Invoice {
  return {
    id: invoice.invoiceNumber,
    parentId: invoice.parentProfileId,
    // Child/course display names need a lookup endpoint; arrives with the dashboard work
    childName: "—",
    department: invoice.department,
    amount: invoice.amount,
    status: INVOICE_STATUS_FROM_API[invoice.status],
    issuedOn: invoice.issuedAtUtc.slice(0, 10),
    dueOn: invoice.dueDate,
    courseName: "—",
  };
}

export async function listInvoices(filter?: {
  status?: ApiInvoiceStatus;
  parentProfileId?: string;
}): Promise<ApiInvoice[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.parentProfileId) params.set("parentProfileId", filter.parentProfileId);
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<ApiInvoice[]>(`/api/invoices${query}`);
}

export async function createInvoice(input: {
  parentProfileId: string;
  childId?: string;
  subscriptionId?: string;
  department: "Phonics" | "Maths";
  amount: number;
  dueDate: string;
}): Promise<ApiInvoice> {
  return apiFetch<ApiInvoice>("/api/invoices", { method: "POST", body: JSON.stringify(input) });
}

export async function recordPayment(
  invoiceId: string,
  input: { amount: number; method?: ApiPaymentMethod; gatewayTransactionId?: string }
): Promise<ApiInvoice> {
  return apiFetch<ApiInvoice>(`/api/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listPackagePlans(): Promise<ApiPackagePlan[]> {
  return apiFetch<ApiPackagePlan[]>("/api/package-plans");
}

export interface SavePackagePlanInput {
  name: string;
  courseId?: string;
  billingType: ApiBillingType;
  billingCycle: ApiBillingCycle;
  price: number;
  sessionsIncluded?: number;
  isActive?: boolean;
}

export async function createPackagePlan(input: SavePackagePlanInput): Promise<ApiPackagePlan> {
  return apiFetch<ApiPackagePlan>("/api/package-plans", { method: "POST", body: JSON.stringify(input) });
}

export async function updatePackagePlan(id: string, input: SavePackagePlanInput): Promise<ApiPackagePlan> {
  return apiFetch<ApiPackagePlan>(`/api/package-plans/${id}`, { method: "PUT", body: JSON.stringify(input) });
}
