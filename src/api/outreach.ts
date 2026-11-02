import { apiFetch } from "@/lib/api";

/** Cold e-mail outreach for the marketing console (/api/marketing/outreach). */

export type ProspectStatus = "New" | "Contacted" | "Replied" | "Interested" | "NotInterested" | "Unsubscribed" | "Bounced";
export type CampaignStatus = "Draft" | "Active" | "Paused" | "Completed";

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
  notReadyReason: string | null;
  from: string;
  replyTo: string | null;
  dailyLimit: number;
  sentToday: number;
  sendingHours: string;
  prospects: { status: ProspectStatus; count: number }[];
}

export interface Prospect {
  id: string; email: string; firstName: string | null; academyName: string | null; city: string | null; phone: string | null;
  source: string | null; notes: string | null; status: ProspectStatus; lastContactedAtUtc: string | null; createdAtUtc: string;
}

export interface ProspectInput { email: string; firstName?: string | null; academyName?: string | null; city?: string | null; phone?: string | null; source?: string | null; notes?: string | null }

export interface ImportResult { added: number; skipped: { email: string; reason: string }[] }

export interface CampaignStep { order: number; delayDays: number; subject: string; body: string }

export interface Campaign {
  id: string; name: string; status: CampaignStatus; createdAtUtc: string; steps: CampaignStep[];
  enrolled: number; scheduled: number; completed: number; stopped: number; sent: number; failed: number;
}

export interface CampaignInput { name: string; steps: { delayDays: number; subject: string; body: string }[] }

const base = "/api/marketing/outreach";
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const outreachApi = {
  summary: () => apiFetch<OutreachSummary>(`${base}/summary`),
  setDailyLimit: (dailyLimit: number) => apiFetch<void>(`${base}/settings`, json("PUT", { dailyLimit })),
  prospects: (q: { status?: ProspectStatus | ""; search?: string; page?: number }) => {
    const p = new URLSearchParams({ page: String(q.page ?? 1), pageSize: "50" });
    if (q.status) p.set("status", q.status);
    if (q.search?.trim()) p.set("search", q.search.trim());
    return apiFetch<{ total: number; page: number; pageSize: number; items: Prospect[] }>(`${base}/prospects?${p}`);
  },
  addProspect: (input: ProspectInput) => apiFetch<ImportResult>(`${base}/prospects`, json("POST", input)),
  importProspects: (rows: ProspectInput[], source?: string) => apiFetch<ImportResult>(`${base}/prospects/import`, json("POST", { rows, source: source || null })),
  updateProspect: (id: string, patch: { status?: ProspectStatus; notes?: string }) => apiFetch<void>(`${base}/prospects/${id}`, json("PUT", patch)),
  deleteProspect: (id: string) => apiFetch<void>(`${base}/prospects/${id}`, json("DELETE")),
  campaigns: () => apiFetch<Campaign[]>(`${base}/campaigns`),
  createCampaign: (input: CampaignInput) => apiFetch<{ id: string }>(`${base}/campaigns`, json("POST", input)),
  updateCampaign: (id: string, input: CampaignInput) => apiFetch<void>(`${base}/campaigns/${id}`, json("PUT", input)),
  enroll: (id: string, prospectIds: string[] = []) => apiFetch<{ enrolled: number }>(`${base}/campaigns/${id}/enroll`, json("POST", { prospectIds })),
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
      firstName: pick(r, index.firstName), academyName: pick(r, index.academyName), city: pick(r, index.city),
      phone: pick(r, index.phone), source: pick(r, index.source), notes: pick(r, index.notes),
    }))
    .filter((r) => r.email);
  return { rows, missingEmailColumn: false };
}
