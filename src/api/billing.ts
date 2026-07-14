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

export interface ApiFeeSuspension {
  id: string;
  parentProfileId: string;
  parentName: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  reason: string | null;
  status: "Active" | "Lifted";
  suspendedAtUtc: string;
  liftedAtUtc: string | null;
  autoRestored: boolean;
}

export interface ApiPaymentLink {
  invoiceId: string;
  invoiceNumber: string;
  url: string;
  gatewayReference: string;
  amountDue: number;
}

export async function createPaymentLink(invoiceId: string): Promise<ApiPaymentLink> {
  return apiFetch<ApiPaymentLink>(`/api/invoices/${invoiceId}/payment-link`, { method: "POST" });
}

export async function listSuspensions(status?: "Active" | "Lifted"): Promise<ApiFeeSuspension[]> {
  return apiFetch<ApiFeeSuspension[]>(`/api/invoices/suspensions${status ? `?status=${status}` : ""}`);
}

export async function liftSuspension(id: string): Promise<ApiFeeSuspension> {
  return apiFetch<ApiFeeSuspension>(`/api/invoices/suspensions/${id}/lift`, { method: "POST" });
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

export interface ApiPaymentAccountTransaction {
  id: string;
  invoiceNumber: string;
  studentName: string | null;
  amount: number;
  status: string;
  dateUtc: string;
}

export interface ApiPaymentAccount {
  id: string;
  name: string;
  department: "Phonics" | "Maths";
  gatewayProvider: string;
  gatewayAccountRef: string;
  isActive: boolean;
  transactionCount: number;
  totalCollected: number;
  recentTransactions: ApiPaymentAccountTransaction[];
}

/** Department payment accounts with live collection stats, for the Payment Gateway Mapping screen. */
export async function listPaymentAccounts(): Promise<ApiPaymentAccount[]> {
  return apiFetch<ApiPaymentAccount[]>("/api/payment-accounts");
}

/** Pins a parent's payments to a specific department account (parent user id). */
export async function setPaymentMapping(parentUserId: string, paymentAccountId: string): Promise<void> {
  await apiFetch<void>("/api/payment-accounts/mapping", {
    method: "PUT",
    body: JSON.stringify({ parentUserId, paymentAccountId }),
  });
}
