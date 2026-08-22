import { apiFetch } from "@/lib/api";
import type { PagedResult } from "./types";
import type { Invoice } from "@/types";

export type ApiInvoiceStatus = "Pending" | "PartiallyPaid" | "Paid" | "Overdue" | "Cancelled";
export type ApiBillingType = "Subscription" | "SessionBased" | "OneTime";
export type ApiBillingCycle = "Monthly" | "Quarterly" | "Yearly" | "OneTime";
export type ApiPaymentMethod = "Card" | "Upi" | "NetBanking" | "Wallet" | "Other" | "Cash";

export interface ApiInvoice {
  id: string;
  invoiceNumber: string;
  parentProfileId: string;
  childId: string | null;
  /** Resolved child display name; null when the invoice has no child linked. */
  childName: string | null;
  courseId: string | null;
  /** Resolved course name — direct via courseId when set, else via the invoice's subscription/plan. */
  courseName: string | null;
  /** Resolved display name for the invoicing parent — the account holder, not the child. */
  parentName: string | null;
  parentEmail: string | null;
  departmentId: string;
  departmentName: string;
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
  Cancelled: "cancelled",
};

export function toFrontendInvoice(invoice: ApiInvoice): Invoice {
  return {
    id: invoice.invoiceNumber,
    apiId: invoice.id,
    parentId: invoice.parentProfileId,
    childName: invoice.childName ?? "—",
    department: invoice.departmentName,
    amount: invoice.amount,
    amountPaid: invoice.amountPaid,
    status: INVOICE_STATUS_FROM_API[invoice.status],
    issuedOn: invoice.issuedAtUtc.slice(0, 10),
    dueOn: invoice.dueDate,
    courseName: invoice.courseName ?? "—",
    parentName: invoice.parentName ?? "—",
  };
}

/**
 * The largest page GET /api/invoices will hand back (BillingService clamps to this).
 * Invoices are the one billing table that grows forever — one row per subscription
 * cycle — so the endpoint is paged. The screens that render it filter, sort and total
 * client-side over one array, so they ask for a full page of this size and keep
 * DataTable's own pagination rather than driving the server page from the table.
 */
export const INVOICE_PAGE_SIZE = 200;

export async function listInvoices(filter?: {
  status?: ApiInvoiceStatus;
  parentProfileId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<ApiInvoice>> {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.parentProfileId) params.set("parentProfileId", filter.parentProfileId);
  params.set("page", String(filter?.page ?? 1));
  params.set("pageSize", String(filter?.pageSize ?? INVOICE_PAGE_SIZE));
  return apiFetch<PagedResult<ApiInvoice>>(`/api/invoices?${params}`);
}

/** What a screen holds after one invoice fetch, in both demo and API mode. */
export interface InvoiceRows<T> {
  rows: T[];
  /** Every invoice matching the filter server-side, not just the ones in `rows`. */
  totalCount: number;
}

/**
 * Fetches one page and maps it into the row shape a screen renders. `totalCount` comes
 * back alongside so a screen can tell the user its client-side totals cover only the
 * newest page — silently reporting money figures over a truncated table would be worse
 * than the unpaged read this replaced.
 */
export async function listInvoiceRows<T>(
  map: (invoice: ApiInvoice) => T,
  filter?: { status?: ApiInvoiceStatus; parentProfileId?: string }
): Promise<InvoiceRows<T>> {
  const page = await listInvoices(filter);
  return { rows: page.items.map(map), totalCount: page.totalCount };
}

export async function createInvoice(input: {
  parentProfileId: string;
  childId?: string;
  subscriptionId?: string;
  departmentId: string;
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

export type ApiSubscriptionStatus = "Active" | "Paused" | "Cancelled" | "Expired";

export interface ApiSubscription {
  id: string;
  parentProfileId: string;
  childId: string;
  childName: string;
  packagePlanId: string;
  planName: string;
  status: ApiSubscriptionStatus;
  startDate: string;
  nextBillingAtUtc: string | null;
  cancelledAtUtc: string | null;
}

/** Renewal tracking: filter by status to see lapsed vs renewed subscriptions. */
export async function listSubscriptions(status?: ApiSubscriptionStatus): Promise<ApiSubscription[]> {
  return apiFetch<ApiSubscription[]>(`/api/subscriptions${status ? `?status=${status}` : ""}`);
}

/** Attaches a child to a plan; the hourly billing job invoices it from the start date. */
export async function createSubscription(input: {
  parentProfileId: string;
  childId: string;
  packagePlanId: string;
  /** yyyy-MM-dd */
  startDate: string;
}): Promise<ApiSubscription> {
  return apiFetch<ApiSubscription>("/api/subscriptions", { method: "POST", body: JSON.stringify(input) });
}

export async function renewSubscription(id: string): Promise<ApiSubscription> {
  return apiFetch<ApiSubscription>(`/api/subscriptions/${id}/renew`, { method: "POST" });
}

export async function cancelSubscription(id: string): Promise<ApiSubscription> {
  return apiFetch<ApiSubscription>(`/api/subscriptions/${id}/cancel`, { method: "POST" });
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
  departmentId: string;
  departmentName: string;
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

/** Admin edit of a department account's gateway wiring (name/provider/ref/active). */
export async function updatePaymentAccount(
  id: string,
  input: { name: string; gatewayProvider: string; gatewayAccountRef: string; isActive: boolean }
): Promise<ApiPaymentAccount> {
  return apiFetch<ApiPaymentAccount>(`/api/payment-accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Pins a parent's payments to a specific department account (parent user id). */
export async function setPaymentMapping(parentUserId: string, paymentAccountId: string): Promise<void> {
  await apiFetch<void>("/api/payment-accounts/mapping", {
    method: "PUT",
    body: JSON.stringify({ parentUserId, paymentAccountId }),
  });
}

/** A parent's pending "pay by cash" declaration, awaiting staff confirmation at the centre. */
export interface ApiCashIntent {
  transactionId: string;
  invoiceId: string;
  invoiceNumber: string;
  parentName: string;
  amount: number;
  currency: string;
  reference: string;
  requestedAtUtc: string;
}

/** Pending cash intents for Billing → Pending Cash Confirmations (Admin, Sub Admin, Admission Team). */
export async function listCashIntents(): Promise<ApiCashIntent[]> {
  return apiFetch<ApiCashIntent[]>("/api/invoices/cash-intents");
}

/** Confirms the cash was collected; omit amount to accept the parent's declared amount as-is. */
export async function confirmCashIntent(transactionId: string, amount?: number): Promise<ApiCashIntent> {
  return apiFetch<ApiCashIntent>(`/api/invoices/cash-intents/${transactionId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

/** Rejects a cash intent (parent never showed up / paid another way). */
export async function rejectCashIntent(transactionId: string, reason?: string): Promise<void> {
  await apiFetch<void>(`/api/invoices/cash-intents/${transactionId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/** One successful payment on an invoice — the unit a refund is requested against. */
export interface ApiPaymentTransaction {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  paidAtUtc: string | null;
  receiptNumber: string | null;
  /** Already requested/processed against this transaction (rejected refunds don't count). */
  alreadyRefunded: number;
}

export async function listInvoiceTransactions(invoiceId: string): Promise<ApiPaymentTransaction[]> {
  return apiFetch<ApiPaymentTransaction[]>(`/api/invoices/${invoiceId}/transactions`);
}

export type ApiRefundStatus = "Requested" | "Approved" | "Rejected" | "Processed";

export interface ApiRefund {
  id: string;
  paymentTransactionId: string;
  invoiceNumber: string | null;
  amount: number;
  reason: string;
  status: ApiRefundStatus;
  processedAtUtc: string | null;
  gatewayRefundId: string | null;
}

/** Every refund request, newest first — Requested ones are the review queue. */
export async function listRefunds(): Promise<ApiRefund[]> {
  return apiFetch<ApiRefund[]>("/api/invoices/refunds");
}

export async function requestRefund(input: {
  paymentTransactionId: string;
  amount: number;
  reason: string;
}): Promise<ApiRefund> {
  return apiFetch<ApiRefund>("/api/invoices/refunds", { method: "POST", body: JSON.stringify(input) });
}

/** Approve disburses through the original gateway (or is a no-op record for cash); reject just closes the request. */
export async function reviewRefund(id: string, approve: boolean): Promise<ApiRefund> {
  return apiFetch<ApiRefund>(`/api/invoices/refunds/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ approve }),
  });
}
