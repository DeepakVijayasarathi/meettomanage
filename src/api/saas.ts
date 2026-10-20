import { apiFetch, downloadFile } from "@/lib/api";
import { platformRequest } from "@/api/platform";

/** Platform billing (SaaS) types and calls. Platform-operator calls use the operator token; tenant calls use the client session. */

export type SaasStatus = "Trialing" | "Active" | "PastDue" | "Suspended" | "Expired" | "Cancelled";
export type BillingInterval = "Month" | "Year";

export interface EntitlementDef { key: string; label: string; type: "Bool" | "Number"; unit: string }
export interface PlanPriceView { id: string; billingInterval: BillingInterval; currency: string; amount: number; isActive: boolean; gatewayPlanRef?: string | null }
export interface PlanView {
  id: string; code: string; name: string; description: string | null; isPublic: boolean; isActive: boolean;
  trialDays: number; sortOrder: number; subscribers: number;
  prices: PlanPriceView[]; entitlements: { key: string; value: number }[];
}
export interface PlanInput {
  code: string; name: string; description: string | null; isPublic: boolean; isActive: boolean; trialDays: number; sortOrder: number;
  prices: { id?: string; billingInterval: BillingInterval; currency: string; amount: number; isActive: boolean; gatewayPlanRef?: string | null }[];
  entitlements: { key: string; value: number }[];
}

export interface SubscriptionRow {
  tenantId: string; tenantCode: string; tenantName: string; tenantStatus: string; id: string;
  planCode: string; planName: string; status: SaasStatus;
  price: { amount: number; currency: string; interval: BillingInterval } | null;
  trialEndsAtUtc: string | null; currentPeriodEndUtc: string | null; graceEndsAtUtc: string | null;
  cancelAtPeriodEnd: boolean; suspendedByBilling: boolean; mrr: number;
  usage: { activeStudents: number; staffCount: number; storageMb: number; sessionMinutesMonth: number; date: string } | null;
  openInvoices: number; openAmount: number;
}

export interface SubscriptionDetail {
  tenantId: string; tenantName: string; tenantCode: string; tenantStatus: string; planCode: string; planName: string; status: SaasStatus;
  trialEndsAtUtc: string | null; currentPeriodEndUtc: string | null; graceEndsAtUtc: string | null; cancelAtPeriodEnd: boolean;
  events: { eventType: string; detail: string | null; actor: string; createdAtUtc: string }[];
  overrides: { key: string; value: number; expiresAtUtc: string | null; reason: string | null }[];
  effective: Record<string, number>;
  profile: { legalName: string | null; billingEmail: string | null; billingPhone: string | null; gstin: string | null; address: string | null; state: string | null } | null;
}

export interface InvoiceRow {
  id: string; invoiceNumber: string; status: "Open" | "Paid" | "Void"; subtotal: number; taxAmount: number; total: number; currency: string;
  issuedAtUtc: string; dueAtUtc: string; paidAtUtc: string | null; periodStartUtc: string; periodEndUtc: string; paymentUrl: string | null;
  tenantId?: string; tenantName?: string; tenantCode?: string; overdue?: boolean;
}

export interface RevenueSummary {
  mrr: number; arr: number; payingTenants: number; arpa: number; trialing: number; pastDue: number; suspended: number; expired: number; cancelled: number;
  newPaid30d: number; churned30d: number; churnRatePercent: number; trialConversionPercent: number; failedPayments30d: number;
  collected30d: number; overdueAmount: number; planDistribution: { plan: string; count: number }[];
}

export interface ReminderLogRow {
  id: string; tenantName: string; tenantCode: string; ruleKey: string; cycleKey: string; channel: string; recipient: string | null;
  status: "Pending" | "Sent" | "Failed" | "Skipped"; attempts: number; error: string | null; createdAtUtc: string; sentAtUtc: string | null;
}
export interface EmailTemplateRow { key: string; title: string; subject: string; body: string; isActive: boolean }
export interface BillingSettings { gateway: string; smtpConfigured: boolean; signupEnabled: boolean; graceDays: number; taxRatePercent: number }
export interface PlanChangeResult { outcome: "invoice" | "scheduled" | "applied"; invoiceId: string | null; paymentUrl: string | null; message: string }

// ---------------------------------------------------------------- platform operator

export const saasPlatform = {
  catalog: (token: string) => platformRequest<EntitlementDef[]>("/entitlement-catalog", token),
  plans: (token: string) => platformRequest<PlanView[]>("/plans", token),
  createPlan: (token: string, body: PlanInput) => platformRequest<PlanView>("/plans", token, "POST", body),
  updatePlan: (token: string, id: string, body: PlanInput) => platformRequest<PlanView>(`/plans/${id}`, token, "PUT", body),
  subscriptions: (token: string, status?: string) => platformRequest<SubscriptionRow[]>(`/subscriptions${status ? `?status=${status}` : ""}`, token),
  subscription: (token: string, tenantId: string) => platformRequest<SubscriptionDetail>(`/tenants/${tenantId}/subscription`, token),
  assign: (token: string, tenantId: string, body: { mode: "trial" | "complimentary" | "invoice"; planCode?: string; planPriceId?: string; trialDays?: number }) =>
    platformRequest<PlanChangeResult>(`/tenants/${tenantId}/subscription/assign`, token, "POST", body),
  extendTrial: (token: string, tenantId: string, days: number) => platformRequest<void>(`/tenants/${tenantId}/subscription/extend-trial`, token, "POST", { days }),
  cancel: (token: string, tenantId: string, immediate: boolean) => platformRequest<void>(`/tenants/${tenantId}/subscription/cancel`, token, "POST", { immediate }),
  resume: (token: string, tenantId: string) => platformRequest<PlanChangeResult>(`/tenants/${tenantId}/subscription/resume`, token, "POST"),
  setOverrides: (token: string, tenantId: string, body: { key: string; value: number; expiresAtUtc?: string | null; reason?: string | null }[]) =>
    platformRequest<void>(`/tenants/${tenantId}/entitlement-overrides`, token, "PUT", body),
  invoices: (token: string, status?: string) => platformRequest<InvoiceRow[]>(`/invoices${status ? `?status=${status}` : ""}`, token),
  markPaid: (token: string, id: string, reference?: string) => platformRequest<void>(`/invoices/${id}/mark-paid`, token, "POST", { reference }),
  voidInvoice: (token: string, id: string) => platformRequest<void>(`/invoices/${id}/void`, token, "POST"),
  paymentLink: (token: string, id: string) => platformRequest<{ paymentUrl: string | null }>(`/invoices/${id}/payment-link`, token, "POST"),
  revenue: (token: string) => platformRequest<RevenueSummary>("/revenue", token),
  reminders: (token: string) => platformRequest<ReminderLogRow[]>("/reminders", token),
  templates: (token: string) => platformRequest<EmailTemplateRow[]>("/email-templates", token),
  saveTemplate: (token: string, key: string, body: { subject: string; body: string; isActive: boolean }) =>
    platformRequest<void>(`/email-templates/${key}`, token, "PUT", body),
  runCycle: (token: string) => platformRequest<{ billingRan: boolean; usageRan: boolean }>("/billing/run-cycle", token, "POST"),
  settings: (token: string) => platformRequest<BillingSettings>("/billing/settings", token),
};

/** Fetches a platform PDF with the operator token and opens it in a new tab. */
export async function openPlatformInvoicePdf(token: string, id: string): Promise<void> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const response = await fetch(`${base}/api/platform/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("The invoice PDF could not be loaded.");
  window.open(URL.createObjectURL(await response.blob()), "_blank", "noopener");
}

// ---------------------------------------------------------------- tenant administrator

export interface TenantSaasStatus {
  managed: boolean;
  planCode?: string; planName?: string; status?: SaasStatus;
  price?: { amount: number; currency: string; interval: BillingInterval } | null;
  planPriceId?: string | null; trialEndsAtUtc?: string | null; currentPeriodEndUtc?: string | null; graceEndsAtUtc?: string | null;
  cancelAtPeriodEnd?: boolean;
  pendingPlan?: { name: string; amount: number; interval: BillingInterval } | null;
  banner?: { level: "info" | "warning" | "danger"; message: string } | null;
  limits?: { key: string; label: string; unit: string; used: number; limit: number; percent: number }[];
  features?: { key: string; label: string; enabled: boolean }[];
  openInvoices?: { id: string; invoiceNumber: string; total: number; currency: string; dueAtUtc: string; paymentUrl: string | null }[];
  taxRatePercent?: number;
}
export interface TenantPlan { id: string; code: string; name: string; description: string | null; prices: { id: string; billingInterval: BillingInterval; currency: string; amount: number }[]; entitlements: { key: string; value: number }[] }
export interface BillingProfile { legalName: string | null; billingEmail: string | null; billingPhone: string | null; gstin: string | null; address: string | null; state: string | null }

export const saasTenant = {
  status: () => apiFetch<TenantSaasStatus>("/saas-billing/status"),
  banner: () => apiFetch<{ banner: TenantSaasStatus["banner"] }>("/saas-billing/banner"),
  plans: () => apiFetch<TenantPlan[]>("/saas-billing/plans"),
  changePlan: (planPriceId: string) => apiFetch<PlanChangeResult>("/saas-billing/change-plan", { method: "POST", body: JSON.stringify({ planPriceId }) }),
  cancel: () => apiFetch<void>("/saas-billing/cancel", { method: "POST", body: JSON.stringify({}) }),
  resume: () => apiFetch<PlanChangeResult>("/saas-billing/resume", { method: "POST" }),
  invoices: () => apiFetch<InvoiceRow[]>("/saas-billing/invoices"),
  payLink: (id: string) => apiFetch<{ paymentUrl: string | null }>(`/saas-billing/invoices/${id}/pay-link`, { method: "POST" }),
  downloadInvoice: (id: string, number: string) => downloadFile(`/saas-billing/invoices/${id}/pdf`, `${number}.pdf`),
  profile: () => apiFetch<BillingProfile>("/saas-billing/profile"),
  saveProfile: (body: BillingProfile) => apiFetch<void>("/saas-billing/profile", { method: "PUT", body: JSON.stringify(body) }),
};

// ---------------------------------------------------------------- public (signup)

export interface PublicPlan { id: string; code: string; name: string; description: string | null; trialDays: number; prices: { id: string; billingInterval: BillingInterval; currency: string; amount: number }[]; entitlements: { key: string; value: number }[] }

const publicBase = () => (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "") + "/api/platform/public";

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(publicBase() + path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(problem.detail || "The request could not be completed.");
  }
  return await response.json() as T;
}

export const saasPublic = {
  settings: () => publicRequest<{ enabled: boolean; trialDays: number; platformName: string }>("/signup/settings"),
  plans: () => publicRequest<PublicPlan[]>("/plans"),
  checkCode: (code: string) => publicRequest<{ available: boolean; reason: string | null }>(`/signup/check-code?code=${encodeURIComponent(code)}`),
  signup: (body: { organizationName: string; code: string; adminEmail: string; adminPin: string; acceptTerms: boolean }) =>
    publicRequest<{ tenantCode: string; loginPath: string }>("/signup", { method: "POST", body: JSON.stringify(body) }),
};

export function formatMoney(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
}
export function formatDay(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}
