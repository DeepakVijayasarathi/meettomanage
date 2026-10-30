import { apiFetch } from "@/lib/api";

export type ApiPlatformDemoRequestStatus = "New" | "Contacted" | "Converted" | "Closed";

export interface ApiPlatformDemoRequest {
  id: string;
  fullName: string;
  workEmail: string;
  phone: string;
  academyName: string;
  message: string | null;
  status: ApiPlatformDemoRequestStatus;
  createdAtUtc: string;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  landingPath?: string | null;
  assignedTo?: string | null;
  nextFollowUpAtUtc?: string | null;
  lastContactedAtUtc?: string | null;
  internalNotes?: string | null;
  leadScore?: number;
  leadTemperature?: "Hot" | "Warm" | "Cold";
  isDuplicate?: boolean;
  assignedToUserId?: string | null;
  archivedAtUtc?: string | null;
}

/**
 * Public — no login required. A prospective academy owner asking to see the Meet to
 * Manage platform itself, distinct from the parent-facing "book a free demo class"
 * (see api/store.ts's bookStoreDemo).
 */
export async function requestPlatformDemo(input: {
  fullName: string;
  workEmail: string;
  phone: string;
  academyName: string;
  message?: string;
  visitorId?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  landingPath?: string;
}): Promise<ApiPlatformDemoRequest> {
  return apiFetch<ApiPlatformDemoRequest>("/api/marketing/demo-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Admin — the follow-up queue for platform-demo requests. */
export async function listPlatformDemoRequests(status?: ApiPlatformDemoRequestStatus): Promise<ApiPlatformDemoRequest[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch<ApiPlatformDemoRequest[]>(`/api/marketing/demo-requests${query}`);
}

export async function updatePlatformDemoRequestStatus(
  id: string,
  status: ApiPlatformDemoRequestStatus
): Promise<ApiPlatformDemoRequest> {
  return apiFetch<ApiPlatformDemoRequest>(`/api/marketing/demo-requests/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function deletePlatformDemoRequest(id: string): Promise<void> {
  await apiFetch<void>(`/api/marketing/demo-requests/${id}`, { method: "DELETE" });
}

export async function updatePlatformDemoRequest(id: string, input: { status?: ApiPlatformDemoRequestStatus; assignedTo?: string; assignedToUserId?: string; nextFollowUpAtUtc?: string; internalNotes?: string }): Promise<ApiPlatformDemoRequest> {
  return apiFetch<ApiPlatformDemoRequest>(`/api/marketing/demo-requests/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export interface ApiMarketingLeadActivity { id: string; type: string; detail: string; createdAtUtc: string }
export interface ApiMarketingLeadDetail { lead: ApiPlatformDemoRequest; activity: ApiMarketingLeadActivity[] }
export interface ApiPaged<T> { items: T[]; totalCount: number; page: number; pageSize: number }
export async function listPlatformDemoRequestsPaged(input: { page: number; pageSize?: number; search?: string; status?: ApiPlatformDemoRequestStatus; overdueOnly?: boolean; archivedOnly?: boolean }): Promise<ApiPaged<ApiPlatformDemoRequest>> {
  const q = new URLSearchParams({ page: String(input.page), pageSize: String(input.pageSize ?? 25) });
  if (input.search) q.set("search", input.search); if (input.status) q.set("status", input.status);
  if (input.overdueOnly) q.set("overdueOnly", "true"); if (input.archivedOnly) q.set("archivedOnly", "true");
  return apiFetch<ApiPaged<ApiPlatformDemoRequest>>(`/api/marketing/demo-requests/paged?${q}`);
}
export const getMarketingLead = (id: string) => apiFetch<ApiMarketingLeadDetail>(`/api/marketing/demo-requests/${id}`);
export const getMarketingLeadRecommendation = (id: string) => apiFetch<{ summary: string; nextAction: string; suggestedChannel: string; suggestedMessage: string; aiPowered: boolean }>(`/api/marketing/demo-requests/${id}/recommendation`);
export async function bulkUpdateMarketingLeads(input: { ids: string[]; status?: ApiPlatformDemoRequestStatus; nextFollowUpAtUtc?: string; archive?: boolean }): Promise<void> { await apiFetch("/api/marketing/demo-requests/bulk", { method: "POST", body: JSON.stringify(input) }); }
export async function restoreMarketingLead(id: string): Promise<void> { await apiFetch(`/api/marketing/demo-requests/${id}/restore`, { method: "POST" }); }

export interface ApiMarketingCampaignBudget { id: string; campaign: string; spend: number; currency: string; wonRevenue: number | null; startDate: string; endDate: string; leads: number; converted: number; costPerLead: number | null; costPerAcquisition: number | null; returnOnAdSpend: number | null }
export const listMarketingCampaignBudgets = () => apiFetch<ApiMarketingCampaignBudget[]>("/api/marketing/demo-requests/campaigns");
export const saveMarketingCampaignBudget = (input: Partial<ApiMarketingCampaignBudget>) => apiFetch<ApiMarketingCampaignBudget>("/api/marketing/demo-requests/campaigns", { method: "PUT", body: JSON.stringify(input) });
export interface ApiMarketingReportSetting { enabled: boolean; frequency: "Daily" | "Weekly"; recipientEmail: string; retentionDays: number; lastSentAtUtc: string | null }
export const getMarketingReportSettings = () => apiFetch<ApiMarketingReportSetting>("/api/marketing/demo-requests/settings");
export const saveMarketingReportSettings = (input: ApiMarketingReportSetting) => apiFetch<ApiMarketingReportSetting>("/api/marketing/demo-requests/settings", { method: "PUT", body: JSON.stringify(input) });

// --- Sales chat ---

/** One message in the homepage chat. `failed` marks a locally shown error, never sent. */
export interface SalesChatTurn {
  role: "user" | "assistant";
  text: string;
  failed?: boolean;
}

/**
 * Public — no login required. The homepage chat assistant (Hetzner AI, called server-side so the
 * key never reaches the browser). Sends the conversation so far; the backend accepts at most
 * 20 turns and must start with the visitor, so older turns are trimmed from the front.
 * `bookedName` is set when the assistant booked a platform demo during this turn.
 */
export async function askSalesAssistant(conversation: SalesChatTurn[], attribution?: { visitorId?: string; source?: string; medium?: string; campaign?: string; landingPath?: string }): Promise<{ reply: string; bookedName: string | null }> {
  // A failed turn leaves two visitor messages back to back; merge same-role runs so the
  // conversation still alternates visitor/assistant the way the model expects.
  const merged: { role: SalesChatTurn["role"]; text: string }[] = [];
  for (const { role, text } of conversation.filter((m) => !m.failed)) {
    const last = merged[merged.length - 1];
    if (last?.role === role) last.text = `${last.text}
${text}`.slice(-1000);
    else merged.push({ role, text });
  }
  let messages = merged.slice(-20);
  while (messages.length > 0 && messages[0].role !== "user") messages = messages.slice(1);
  const res = await apiFetch<{ reply: string; bookedName?: string | null }>("/api/marketing/chat", {
    method: "POST",
    body: JSON.stringify({ messages, attribution }),
  });
  return { reply: res.reply, bookedName: res.bookedName ?? null };
}

export async function translateMarketingText(texts: string[], targetLanguage: string): Promise<string[]> {
  const response = await apiFetch<{ translations: string[] }>("/api/marketing/translate", {
    method: "POST",
    body: JSON.stringify({ texts, targetLanguage }),
  });
  return response.translations;
}

// --- Blog ---

export interface ApiBlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  readMinutes: number;
  publishedAtUtc: string;
}

export interface ApiBlogPostDetail {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  readMinutes: number;
  publishedAtUtc: string;
}

/** Admin view — every post, published or not. */
export interface ApiBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  readMinutes: number;
  isPublished: boolean;
  /** For a "Scheduled" post, when it goes live. */
  publishedAtUtc: string | null;
  status: "Draft" | "Scheduled" | "Published";
  createdAtUtc: string;
}

/** Public — no login required. */
export async function listBlogPosts(): Promise<ApiBlogPostSummary[]> {
  return apiFetch<ApiBlogPostSummary[]>("/api/blog");
}

/** Public — no login required. */
export async function getBlogPost(slug: string): Promise<ApiBlogPostDetail> {
  return apiFetch<ApiBlogPostDetail>(`/api/blog/${slug}`);
}

/** Admin — full CRUD. */
export async function listBlogPostsAdmin(): Promise<ApiBlogPost[]> {
  return apiFetch<ApiBlogPost[]>("/api/blog/admin");
}

export async function getBlogPostAdmin(id: string): Promise<ApiBlogPost> {
  return apiFetch<ApiBlogPost>(`/api/blog/admin/${id}`);
}

export async function createBlogPost(input: {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  isPublished: boolean;
  /** Future = scheduled (hidden from /blog until then); omit = publish now. */
  publishAtUtc?: string;
}): Promise<ApiBlogPost> {
  return apiFetch<ApiBlogPost>("/api/blog/admin", { method: "POST", body: JSON.stringify(input) });
}

export async function updateBlogPost(
  id: string,
  input: { title: string; slug: string; excerpt: string; content: string; isPublished: boolean; publishAtUtc?: string }
): Promise<ApiBlogPost> {
  return apiFetch<ApiBlogPost>(`/api/blog/admin/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteBlogPost(id: string): Promise<void> {
  await apiFetch<void>(`/api/blog/admin/${id}`, { method: "DELETE" });
}

export interface ApiNamedCount {
  name: string;
  count: number;
}

export interface ApiMarketingTotals {
  pageViews: number;
  visitors: number;
  chatsStarted: number;
  demoRequests: number;
  chatBookings: number;
  conversionRate: number;
  pagesPerVisitor: number;
  chatStartRate: number;
  demoPipelineConversionRate: number;
}

export interface ApiMarketingDashboard {
  days: number;
  startDate: string;
  endDate: string;
  totals: ApiMarketingTotals;
  previous: ApiMarketingTotals;
  daily: { date: string; pageViews: number; visitors: number; demoRequests: number; chatsStarted: number; conversionRate: number; pagesPerVisitor: number }[];
  topPages: ApiNamedCount[];
  topBlogPosts: ApiNamedCount[];
  sources: ApiNamedCount[];
  campaigns: ApiNamedCount[];
  mediums: ApiNamedCount[];
  countries: ApiNamedCount[];
  devices: ApiNamedCount[];
  demoRequestsByStatus: ApiNamedCount[];
  sourceQuality: ApiMarketingPerformance[];
  campaignPerformance: ApiMarketingPerformance[];
  landingPagePerformance: ApiMarketingPerformance[];
}

export interface ApiMarketingPerformance { name: string; visitors: number; leads: number; converted: number; leadConversionRate: number; conversionRate: number }

/** Marketing console only — first-party analytics for the last `days` days, in the browser's own calendar days. */
export async function getMarketingDashboard(days: number): Promise<ApiMarketingDashboard> {
  const tzOffsetMinutes = -new Date().getTimezoneOffset();
  return apiFetch<ApiMarketingDashboard>(`/api/marketing/analytics?days=${days}&tzOffsetMinutes=${tzOffsetMinutes}`);
}

export interface ApiMarketingInsights {
  summary: string;
  observations: string[];
  nextActions: string[];
  aiPowered: boolean;
  generatedAtUtc: string;
}

export async function getMarketingInsights(days: number): Promise<ApiMarketingInsights> {
  const tzOffsetMinutes = -new Date().getTimezoneOffset();
  return apiFetch<ApiMarketingInsights>(`/api/marketing/analytics/insights?days=${days}&tzOffsetMinutes=${tzOffsetMinutes}`);
}
