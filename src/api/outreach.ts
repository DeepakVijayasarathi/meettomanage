import { apiFetch } from "@/lib/api";

/** Cold e-mail outreach for the marketing console (/api/marketing/outreach). */

export type ProspectStatus = "New" | "Contacted" | "Replied" | "Interested" | "NotInterested" | "Unsubscribed" | "Bounced";
export type CampaignStatus = "Draft" | "Active" | "Paused" | "Completed";
export type PipelineStage = "New" | "Qualified" | "Contacted" | "Replied" | "DemoBooked" | "Trial" | "Negotiation" | "Won" | "Lost";

export const PROSPECT_STATUSES: { value: ProspectStatus; label: string }[] = [
  { value: "New", label: "New" },
  { value: "Contacted", label: "Contacted" },
  { value: "Replied", label: "Replied" },
  { value: "Interested", label: "Interested" },
  { value: "NotInterested", label: "Not interested" },
  { value: "Unsubscribed", label: "Unsubscribed" },
  { value: "Bounced", label: "Bounced" },
];

export interface OutreachSummary {
  ready: boolean;
  replySyncReady: boolean;
  imapSyncReady: boolean;
  notReadyReason: string | null;
  from: string;
  replyTo: string | null;
  dailyLimit: number;
  sentToday: number;
  sendingHours: string;
  prospects: { status: ProspectStatus; count: number }[];
}

/** Every cold e-mail setting (saved in the console, else the server's configuration, else defaults). */
export interface OutreachSettings {
  fromName: string; fromAddress: string; replyTo: string | null; dailyLimit: number;
  windowStartHour: number; windowEndHour: number; timeZoneId: string;
  footerText: string; companyLine: string; minFollowUpDays: number; maxFailuresPerStep: number;
  emailEnabled: boolean; campaignSendingEnabled: boolean; manualEmailEnabled: boolean;
  replySendingEnabled: boolean; replySyncEnabled: boolean;
  aiEnabled: boolean; aiLeadQualification: boolean; aiMessageDrafting: boolean;
  aiCampaignGeneration: boolean; aiReplyAssistant: boolean; aiInsights: boolean;
}

export interface Prospect {
  id: string; email: string; firstName: string | null; academyName: string | null; city: string | null; region: string | null; phone: string | null;
  source: string | null; notes: string | null; status: ProspectStatus; lastContactedAtUtc: string | null; createdAtUtc: string;
  leadScore: number; scoreReason: string | null; pipelineStage: PipelineStage; assignedTo: string | null; nextActionAtUtc: string | null;
}

export interface ProspectInput { email: string; firstName?: string | null; academyName?: string | null; city?: string | null; region?: string | null; phone?: string | null; source?: string | null; notes?: string | null }

export interface RegionCount { region: string; count: number }
export interface RegionPerformance { region: string; total: number; newCount: number; contacted: number; replied: number; interested: number; bounced: number }
export interface OutreachReply { id: string; email: string; firstName: string | null; academyName: string | null; city: string | null; region: string | null; status: ProspectStatus; lastContactedAtUtc: string | null; repliedAtUtc: string }
export interface OutreachAnalytics { totals: { total: number; contacted: number; replied: number; interested: number; bounced: number }; regions: RegionPerformance[]; pipeline: { stage: PipelineStage; count: number }[]; overdueTasks: { id: string; prospectId: string; title: string; assignedTo: string | null; dueAtUtc: string; email: string; academyName: string | null; region: string | null }[]; recentReplies: OutreachReply[] }
export interface OutreachAiInsights { summary: string; observations: string[]; nextActions: string[]; aiPowered: boolean; generatedAtUtc: string }
export interface ProspectDetail { prospect: Prospect; activities: { id: string; type: string; subject: string | null; detail: string | null; createdBy: string | null; createdAtUtc: string }[]; tasks: { id: string; title: string; assignedTo: string | null; dueAtUtc: string; completedAtUtc: string | null }[] }
export interface RecipientFilter { region?: string | null; minScore?: number | null; stages?: PipelineStage[]; excludeContactedDays?: number }
export interface TodayItem { id: string; email: string; firstName: string | null; academyName: string | null; region: string | null; leadScore: number; pipelineStage: PipelineStage; scoreReason?: string | null; nextActionAtUtc?: string | null }
export interface TodayDashboard { hotLeads: TodayItem[]; replies: TodayItem[]; tasks: { id: string; prospectId: string; title: string; assignedTo: string | null; dueAtUtc: string; email: string; academyName: string | null; region: string | null }[]; generatedAtUtc: string }
export type ReplyIntent = "Interested" | "Pricing" | "DemoRequest" | "Question" | "Objection" | "NotInterested" | "Unsubscribe" | "AutoReply";
export interface ReplyItem { id: string; prospectId: string; subject: string | null; detail: string | null; createdAtUtc: string; email: string; firstName: string | null; academyName: string | null; region: string | null; status: ProspectStatus; pipelineStage: PipelineStage; intent: ReplyIntent; urgency: "High" | "Normal" | "Low"; handled: boolean; ageHours: number; responseHours: number | null }
export interface ReplyInbox { total: number; needsResponse: number; overdue: number; interested: number; averageResponseHours: number | null; items: ReplyItem[] }
export interface ReplySyncStatus { configured: boolean; isRunning: boolean; lastAttemptAtUtc: string | null; lastSuccessAtUtc: string | null; lastError: string | null; messagesChecked: number; repliesImported: number; duplicatesSkipped: number; unmatchedSkipped: number; failedMessages: number; healthy: boolean; alert: string | null }
export interface ReplySyncRun { id: string; trigger: "Automatic" | "Manual"; status: "Running" | "Succeeded" | "Partial" | "Failed"; startedAtUtc: string; completedAtUtc: string | null; messagesChecked: number; repliesImported: number; duplicatesSkipped: number; unmatchedSkipped: number; failedMessages: number; error: string | null }
export interface UnmatchedReply { id: string; from: string; subject: string | null; body: string; threadReferences: string | null; receivedAtUtc: string }
export interface ReplyAnalysis { intent: ReplyIntent; sentiment: "Positive" | "Neutral" | "Negative"; urgency: "High" | "Normal" | "Low"; summary: string; nextAction: string; suggestedReply: string; aiPowered: boolean }
export interface ReplyThreadMessage { id: string; direction: "Inbound" | "Outbound"; subject: string | null; detail: string | null; createdAtUtc: string; createdBy: string | null }

export interface ImportResult { added: number; restored: number; skipped: { email: string; reason: string }[] }

export interface CampaignStep { order: number; delayDays: number; subject: string; body: string }

export interface Campaign {
  id: string; name: string; status: CampaignStatus; createdAtUtc: string; steps: CampaignStep[];
  enrolled: number; scheduled: number; completed: number; stopped: number; sent: number; failed: number;
}

export interface CampaignInput { name: string; steps: { delayDays: number; subject: string; body: string }[] }
export interface CampaignAiBrief { audience: string; region?: string | null; goal: string; offer?: string | null; tone: "Warm" | "Professional" | "Direct" }
export interface CampaignAiDraft extends CampaignInput { strategy: string; aiPowered: boolean }
export interface GrowthDashboard {
  generatedAtUtc: string;
  forecast: { averageCustomerValue: number; expectedWins: number; weightedRevenue: number; currency: string };
  sourcePerformance: { source: string; leads: number; contacted: number; replies: number; demos: number; won: number }[];
  segments: { segment: string; leads: number; qualified: number; replies: number }[];
  objections: { name: string; count: number }[];
  deliverability: { healthy: number; bounced: number; unsubscribed: number; incompleteProfiles: number };
  dormant: { id: string; email: string; academyName: string | null; region: string | null; leadScore: number; inactiveSinceUtc: string }[];
  recommendedActions: string[];
}
export interface OutreachHistory {
  totals: { attempts: number; sent: number; failed: number; replies: number };
  alerts: { level: "Error" | "Warning"; title: string; detail: string }[];
  items: { id: string; prospectId: string; type: "CampaignEmail" | "ManualEmail" | "ReplySent" | "ReplyReceived"; occurredAtUtc: string; email: string; academyName: string | null; region: string | null; subject: string | null; detail: string | null; status: "Sent" | "Failed" | "Received"; canRetry: boolean }[];
}

const base = "/api/marketing/outreach";
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const outreachApi = {
  summary: () => apiFetch<OutreachSummary>(`${base}/summary`),
  settings: () => apiFetch<OutreachSettings>(`${base}/settings`),
  saveSettings: (settings: OutreachSettings) => apiFetch<OutreachSettings>(`${base}/settings`, json("PUT", settings)),
  prospects: (q: { status?: ProspectStatus | ""; search?: string; region?: string; page?: number }) => {
    const p = new URLSearchParams({ page: String(q.page ?? 1), pageSize: "50" });
    if (q.status) p.set("status", q.status);
    if (q.search?.trim()) p.set("search", q.search.trim());
    if (q.region?.trim()) p.set("region", q.region.trim());
    return apiFetch<{ total: number; page: number; pageSize: number; items: Prospect[] }>(`${base}/prospects?${p}`);
  },
  addProspect: (input: ProspectInput) => apiFetch<ImportResult>(`${base}/prospects`, json("POST", input)),
  importProspects: (rows: ProspectInput[], source?: string) => apiFetch<ImportResult>(`${base}/prospects/import`, json("POST", { rows, source: source || null })),
  updateProspect: (id: string, patch: { status?: ProspectStatus; pipelineStage?: PipelineStage; notes?: string; assignedTo?: string; nextActionAtUtc?: string }) => apiFetch<void>(`${base}/prospects/${id}`, json("PUT", patch)),
  prospectDetail: (id: string) => apiFetch<ProspectDetail>(`${base}/prospects/${id}`),
  addNote: (id: string, detail: string) => apiFetch<void>(`${base}/prospects/${id}/notes`, json("POST", { detail })),
  addTask: (id: string, title: string, dueAtUtc: string, assignedTo?: string) => apiFetch<void>(`${base}/prospects/${id}/tasks`, json("POST", { title, dueAtUtc, assignedTo: assignedTo || null })),
  completeTask: (id: string) => apiFetch<void>(`${base}/tasks/${id}/complete`, json("POST")),
  rescore: (id: string) => apiFetch<{ leadScore: number; scoreReason: string }>(`${base}/prospects/${id}/rescore`, json("POST")),
  deleteProspect: (id: string) => apiFetch<void>(`${base}/prospects/${id}`, json("DELETE")),
  bulkDeleteProspects: (prospectIds: string[]) => apiFetch<{ deleted: number }>(`${base}/prospects/bulk-delete`, json("POST", { prospectIds })),
  regions: () => apiFetch<RegionCount[]>(`${base}/regions`),
  analytics: () => apiFetch<OutreachAnalytics>(`${base}/analytics`),
  analyticsInsights: () => apiFetch<OutreachAiInsights>(`${base}/analytics/insights`),
  growth: () => apiFetch<GrowthDashboard>(`${base}/growth`),
  growthAiPlan: () => apiFetch<OutreachAiInsights>(`${base}/growth/ai-plan`),
  history: () => apiFetch<OutreachHistory>(`${base}/history`),
  retrySend: (id: string) => apiFetch<void>(`${base}/history/${id}/retry`, json("POST")),
  reactivate: (prospectIds: string[]) => apiFetch<{ queued: number }>(`${base}/growth/reactivate`, json("POST", { prospectIds })),
  today: () => apiFetch<TodayDashboard>(`${base}/today`),
  replies: () => apiFetch<ReplyInbox>(`${base}/replies`),
  replySyncStatus: () => apiFetch<ReplySyncStatus>(`${base}/replies/sync-status`),
  syncRepliesNow: () => apiFetch<ReplySyncStatus>(`${base}/replies/sync-now`, json("POST")),
  testReplyConnection: () => apiFetch<{ success: boolean; message: string }>(`${base}/replies/test-connection`, json("POST")),
  replySyncHistory: () => apiFetch<ReplySyncRun[]>(`${base}/replies/sync-history`),
  unmatchedReplies: () => apiFetch<UnmatchedReply[]>(`${base}/replies/unmatched`),
  linkUnmatchedReply: (id: string, prospectId: string) => apiFetch<void>(`${base}/replies/unmatched/${id}/link`, json("POST", { prospectId })),
  dismissUnmatchedReply: (id: string) => apiFetch<void>(`${base}/replies/unmatched/${id}`, json("DELETE")),
  analyzeReply: (id: string) => apiFetch<ReplyAnalysis>(`${base}/replies/${id}/analyze`, json("POST")),
  markReplyHandled: (id: string) => apiFetch<void>(`${base}/replies/${id}/handled`, json("POST")),
  replyThread: (id: string) => apiFetch<ReplyThreadMessage[]>(`${base}/replies/${id}/thread`),
  sendReply: (id: string, subject: string, body: string) => apiFetch<void>(`${base}/replies/${id}/send`, json("POST", { subject, body })),
  draftMessage: (id: string, purpose: "first-contact" | "reply") => apiFetch<{ message: string }>(`${base}/prospects/${id}/draft`, json("POST", { purpose })),
  sendProspectMessage: (id: string, purpose: "first-contact" | "reply", subject: string, body: string) => apiFetch<void>(`${base}/prospects/${id}/send`, json("POST", { purpose, subject, body })),
  campaigns: () => apiFetch<Campaign[]>(`${base}/campaigns`),
  draftCampaign: (brief: CampaignAiBrief) => apiFetch<CampaignAiDraft>(`${base}/campaigns/ai-draft`, json("POST", brief)),
  createCampaign: (input: CampaignInput) => apiFetch<{ id: string }>(`${base}/campaigns`, json("POST", input)),
  updateCampaign: (id: string, input: CampaignInput) => apiFetch<void>(`${base}/campaigns/${id}`, json("PUT", input)),
  enroll: (id: string, prospectIds: string[] = [], filter: RecipientFilter = {}) => apiFetch<{ enrolled: number }>(`${base}/campaigns/${id}/enroll`, json("POST", { prospectIds, ...filter })),
  previewRecipients: (id: string, filter: RecipientFilter) => apiFetch<{ count: number; sample: { id: string; email: string; academyName: string | null; region: string | null; leadScore: number }[]; excludedOverlap: number; excludedRecent: number; cooldownDays: number }>(`${base}/campaigns/${id}/preview`, json("POST", { prospectIds: [], ...filter })),
  setStatus: (id: string, status: "Active" | "Paused") => apiFetch<void>(`${base}/campaigns/${id}/status`, json("POST", { status })),
  test: (id: string, email: string, step = 1) => apiFetch<void>(`${base}/campaigns/${id}/test`, json("POST", { email, step })),
  deleteCampaign: (id: string) => apiFetch<void>(`${base}/campaigns/${id}`, json("DELETE")),
};

/** Splits CSV text into rows, honouring quoted fields (with "" escapes and commas or line breaks inside quotes). */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<keyof Omit<ProspectInput, "notes"> | "notes", string[]> = {
  email: ["email", "e-mail", "email address", "mail"],
  firstName: ["first name", "firstname", "name", "contact", "contact name", "owner"],
  academyName: ["academy", "academy name", "centre", "center", "institute", "school", "company", "business"],
  city: ["city", "location", "town"],
  region: ["region", "area", "territory", "market"],
  phone: ["phone", "mobile", "phone number", "whatsapp"],
  source: ["source"],
  notes: ["notes", "note", "comments"],
};

/**
 * Turns pasted or uploaded CSV into prospects. The first row must be a header; columns are matched by name
 * (e.g. "Email", "First name", "Academy", "City", "Phone", "Source"), in any order. Rows without an e-mail are dropped.
 */
export function prospectsFromCsv(text: string): { rows: ProspectInput[]; missingEmailColumn: boolean } {
  // Excel's "CSV UTF-8" starts with a byte order mark (U+FEFF); drop it so the first header still matches.
  const [header, ...data] = parseCsvRows(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  if (!header) return { rows: [], missingEmailColumn: false };
  const names = header.map((h) => h.trim().toLowerCase());
  const col = (key: keyof typeof HEADER_ALIASES) => names.findIndex((n) => HEADER_ALIASES[key].includes(n));
  const index = Object.fromEntries((Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]).map((k) => [k, col(k)])) as Record<keyof typeof HEADER_ALIASES, number>;
  if (index.email < 0) return { rows: [], missingEmailColumn: true };
  const pick = (r: string[], i: number) => (i >= 0 ? r[i]?.trim() || null : null);
  const rows = data
    .map((r) => ({
      email: (pick(r, index.email) ?? "").toLowerCase(),
      firstName: pick(r, index.firstName), academyName: pick(r, index.academyName), city: pick(r, index.city), region: pick(r, index.region),
      phone: pick(r, index.phone), source: pick(r, index.source), notes: pick(r, index.notes),
    }))
    .filter((r) => r.email);
  return { rows, missingEmailColumn: false };
}
