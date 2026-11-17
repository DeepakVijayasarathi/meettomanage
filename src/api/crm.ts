import { apiFetch } from "@/lib/api";
import type { ApiLeadStage, ApiPlatformDemoRequest } from "@/api/marketing";

export type CrmRole = "Manager" | "Sales" | "Viewer";
export type CrmTaskType = "FollowUp" | "Call" | "Meeting" | "DemoPrep" | "Quote" | "Onboarding" | "Other" | "WhatsApp";
export type CustomerHealth = "Trial" | "New" | "Healthy" | "AtRisk" | "Churned";

export const CRM_ROLE_HELP: Record<CrmRole, string> = {
  Manager: "Everything: all leads and customers, assigning, team, settings and reports.",
  Sales: "Their own leads plus unassigned ones. Can't manage the team or settings.",
  Viewer: "Read-only access to everything.",
};
export const TASK_TYPE_LABEL: Record<CrmTaskType, string> = {
  FollowUp: "Follow-up", Call: "Call", WhatsApp: "WhatsApp", Meeting: "Meeting", DemoPrep: "Demo prep", Quote: "Send quote", Onboarding: "Onboarding", Other: "Other",
};
export const HEALTH_LABEL: Record<CustomerHealth, string> = { Trial: "Trial", New: "New", Healthy: "Healthy", AtRisk: "At risk", Churned: "Churned" };

export interface CrmMe { userId: string | null; name: string; role: CrmRole }
export interface CrmMember { userId: string; name: string; email: string; active: boolean; role: CrmRole; openLeads: number; openTasks: number }
export interface CrmTask {
  id: string; title: string; type: CrmTaskType; dueAtUtc: string; assignedToUserId: string | null; assignedTo: string | null;
  leadId: string | null; leadLabel: string | null; tenantId: string | null; customerName: string | null; notes: string | null;
  completedAtUtc: string | null; outcome: string | null;
  leadPhone?: string | null; leadEmail?: string | null; planKey?: string | null;
}
export interface CrmLeadBrief { id: string; fullName: string; academyName: string; owner: string | null; atUtc: string | null; stage: ApiLeadStage }
export interface CrmToday { overdue: CrmTask[]; today: CrmTask[]; upcoming: CrmTask[]; demosToday: CrmLeadBrief[]; waitingForReply: CrmLeadBrief[]; followUpsDue: CrmLeadBrief[] }
export interface CrmLeadRow { fullName?: string; email?: string; phone?: string; academyName?: string; city?: string; region?: string; segment?: string; website?: string; studentCount?: number; source?: string; notes?: string }
export interface CrmImportResult { created: number; createdIds: string[]; skipped: { row: number; reason: string }[] }
export interface CrmOwnerRow { ownerId: string | null; owner: string; leads: number; contacted: number; medianResponseHours: number | null; demos: number; trials: number; won: number; lost: number; wonMonthlyValue: number; openLeads: number; openPipelineValue: number; overdueTasks: number; tasksDone: number }
export interface CrmReport {
  days: number; owners: CrmOwnerRow[];
  forecast: { stage: ApiLeadStage; label: string; count: number; value: number; probability: number; weighted: number }[];
  weightedPipeline: number; openWithoutValue: number; wonMonthlyValue: number; byMonth: { month: string; deals: number; weighted: number }[];
}
export interface CrmCustomer {
  tenantId: string; name: string; code: string; plan: string | null; status: string | null; monthlyValue: number; students: number | null; sessionsThisMonth: number | null;
  trialEndsAtUtc: string | null; renewsAtUtc: string | null; health: CustomerHealth; healthReasons: string[]; email: string | null; owner: string | null; openTasks: number; joinedAtUtc: string;
}
export interface CrmCustomerDetail {
  customer: CrmCustomer; phone: string | null; legalName: string | null;
  invoices: { number: string; total: number; currency: string; status: string; issuedAtUtc: string; dueAtUtc: string; paidAtUtc: string | null }[];
  usage: { date: string; students: number; staff: number; sessionsThisMonth: number }[];
  leads: CrmLeadBrief[]; notes: { id: string; text: string; author: string | null; atUtc: string }[]; tasks: CrmTask[];
}

const J = (body: unknown) => JSON.stringify(body);

export const getCrmMe = () => apiFetch<CrmMe>("/api/marketing/crm/me");
export const listCrmTeam = () => apiFetch<CrmMember[]>("/api/marketing/crm/team");
export const addCrmMember = (input: { firstName: string; lastName?: string; email: string; phone?: string; pin: string; role: CrmRole }) =>
  apiFetch<CrmMember>("/api/marketing/crm/team", { method: "POST", body: J(input) });
export const updateCrmMember = (userId: string, input: { role?: CrmRole; active?: boolean; pin?: string; reassignTo?: string }) =>
  apiFetch<void>(`/api/marketing/crm/team/${userId}`, { method: "PUT", body: J(input) });

export const getCrmToday = () => apiFetch<CrmToday>(`/api/marketing/crm/today?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`);
export const listCrmTasks = (q: { scope?: "mine" | "all"; status?: "open" | "done" | "all"; leadId?: string; tenantId?: string }) => {
  const p = new URLSearchParams({ scope: q.scope ?? "mine", status: q.status ?? "open" });
  if (q.leadId) p.set("leadId", q.leadId); if (q.tenantId) p.set("tenantId", q.tenantId);
  return apiFetch<CrmTask[]>(`/api/marketing/crm/tasks?${p}`);
};
export type SaveCrmTask = { title: string; type: CrmTaskType; dueAtUtc: string; assignedToUserId?: string | null; leadId?: string | null; tenantId?: string | null; notes?: string };
export const createCrmTask = (input: SaveCrmTask) => apiFetch<CrmTask>("/api/marketing/crm/tasks", { method: "POST", body: J(input) });
export const updateCrmTask = (id: string, input: SaveCrmTask) => apiFetch<CrmTask>(`/api/marketing/crm/tasks/${id}`, { method: "PUT", body: J(input) });
export const completeCrmTask = (id: string, input: { outcome?: string; reopen?: boolean }) => apiFetch<CrmTask>(`/api/marketing/crm/tasks/${id}/complete`, { method: "POST", body: J(input) });
export const deleteCrmTask = (id: string) => apiFetch<void>(`/api/marketing/crm/tasks/${id}`, { method: "DELETE" });

export const createCrmLead = (input: CrmLeadRow & { assignedToUserId?: string | null }) => apiFetch<ApiPlatformDemoRequest>("/api/marketing/crm/leads", { method: "POST", body: J(input) });
export const importCrmLeads = (input: { rows: CrmLeadRow[]; assignedToUserId?: string | null; ownerUserIds?: string[]; followUpPlan?: string; source?: string }) => apiFetch<CrmImportResult>("/api/marketing/crm/leads/import", { method: "POST", body: J(input) });
export const updateCrmDeal = (id: string, input: { expectedPlan?: string | null; expectedMonthlyValue?: number | null; expectedCloseAtUtc?: string | null; studentCount?: number | null; region?: string | null; city?: string | null; segment?: string | null; website?: string | null }) =>
  apiFetch<ApiPlatformDemoRequest>(`/api/marketing/crm/leads/${id}/deal`, { method: "PUT", body: J(input) });
export const logCrmInteraction = (id: string, input: { type: "Call" | "Meeting" | "Email" | "WhatsApp"; outcome: string; detail?: string; nextStepTitle?: string; nextStepDueAtUtc?: string }) =>
  apiFetch<ApiPlatformDemoRequest>(`/api/marketing/crm/leads/${id}/log`, { method: "POST", body: J(input) });

export interface FollowUpPlan { key: string; name: string; description: string; steps: { day: number; type: CrmTaskType; title: string }[]; stopAt: ApiLeadStage[] }
export interface CrmBulkResult { done: number; skipped: string[] }
export const listFollowUpPlans = () => apiFetch<FollowUpPlan[]>("/api/marketing/crm/followup-plans");
export const startFollowUpPlan = (leadId: string, plan: string) => apiFetch<CrmBulkResult>(`/api/marketing/crm/leads/${leadId}/plan`, { method: "POST", body: J({ plan }) });
export const bulkCrmLeads = (input: { leadIds: string[]; ownerUserIds?: string[]; followUpPlan?: string }) => apiFetch<CrmBulkResult>("/api/marketing/crm/leads/bulk", { method: "POST", body: J(input) });

/** wa.me link for an Indian or international number (10 digits get the 91 prefix). */
export function whatsAppUrl(phone: string, text?: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** A ready-to-fill import template with the columns the importer recognises. */
export const LEAD_TEMPLATE_CSV = [
  "Name,Academy,Phone,Email,City,Region,Category,Students,Website,Source,Notes",
  "Asha Rao,Bright Abacus Academy,98765 43210,asha@brightabacus.in,Bengaluru,Karnataka,Abacus,120,https://brightabacus.in,Referral,Runs 6 batches; fees in Excel",
].join("\r\n") + "\r\n";

export const getCrmReport = (days: number) => apiFetch<CrmReport>(`/api/marketing/crm/reports?days=${days}`);
export const listCrmCustomers = (q: { search?: string; health?: CustomerHealth }) => {
  const p = new URLSearchParams(); if (q.search) p.set("search", q.search); if (q.health) p.set("health", q.health);
  return apiFetch<{ available: boolean; items: CrmCustomer[] }>(`/api/marketing/crm/customers?${p}`);
};
export const getCrmCustomer = (tenantId: string) => apiFetch<CrmCustomerDetail>(`/api/marketing/crm/customers/${tenantId}`);
export const addCrmCustomerNote = (tenantId: string, text: string) => apiFetch<CrmCustomerDetail["notes"][number]>(`/api/marketing/crm/customers/${tenantId}/notes`, { method: "POST", body: J({ text }) });

/** Rupees with Indian grouping, no decimals. */
export const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

/**
 * Turns a spreadsheet export (CSV) or cells pasted from a spreadsheet (tab-separated) into rows. Handles quoted fields, commas and line breaks inside quotes, and a
 * byte-order mark; header names are matched loosely (Email / Work email, First name + Last name, Academy /
 * Organisation, Category / Segment ...), so lists exported from other tools import without editing.
 */
export function parseLeadCsv(text: string): { rows: CrmLeadRow[]; mapped: string[]; ignored: string[] } {
  const records: string[][] = [];
  let field = "", row: string[] = [], quoted = false;
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  // Cells copied from Excel or Google Sheets arrive tab-separated.
  const sep = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) records.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) records.push(row);
  if (records.length < 2) return { rows: [], mapped: [], ignored: [] };

  const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");
  const KEYS: Record<string, keyof CrmLeadRow | "firstName" | "lastName"> = {
    email: "email", workemail: "email", emailaddress: "email",
    name: "fullName", fullname: "fullName", contactname: "fullName", contact: "fullName", firstname: "firstName", lastname: "lastName", surname: "lastName",
    phone: "phone", mobile: "phone", phonenumber: "phone", whatsapp: "phone", mobilenumber: "phone",
    academy: "academyName", academyname: "academyName", organisation: "academyName", organization: "academyName", company: "academyName", institute: "academyName", school: "academyName", business: "academyName",
    city: "city", region: "region", state: "region", area: "region",
    category: "segment", segment: "segment", subject: "segment", type: "segment",
    website: "website", url: "website", students: "studentCount", studentcount: "studentCount",
    source: "source", leadsource: "source", notes: "notes", note: "notes", comments: "notes", description: "notes",
  };
  const header = records[0].map((h) => KEYS[norm(h)]);
  const mapped = records[0].filter((_, i) => header[i]);
  const ignored = records[0].filter((h, i) => !header[i] && h.trim() !== "");
  const rows = records.slice(1).map((cells) => {
    const r: CrmLeadRow & { firstName?: string; lastName?: string } = {};
    header.forEach((key, i) => {
      const v = (cells[i] ?? "").trim();
      if (!key || !v) return;
      if (key === "studentCount") { const n = Number(v.replace(/\D/g, "")); if (n > 0) r.studentCount = n; return; }
      (r as Record<string, unknown>)[key] = v;
    });
    if (!r.fullName && (r.firstName || r.lastName)) r.fullName = [r.firstName, r.lastName].filter(Boolean).join(" ");
    // A "Source" column holding a web address is the lead's website, not an attribution label.
    if (r.source && /^https?:\/\//i.test(r.source)) { r.website ??= r.source; delete r.source; }
    delete r.firstName; delete r.lastName;
    return r as CrmLeadRow;
  });
  return { rows, mapped, ignored };
}
