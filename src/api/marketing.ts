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

// --- Sales chat ---

/** One message in the homepage chat. `failed` marks a locally shown error, never sent. */
export interface SalesChatTurn {
  role: "user" | "assistant";
  text: string;
  failed?: boolean;
}

/**
 * Public — no login required. The homepage chat assistant (Gemini, called server-side so the
 * key never reaches the browser). Sends the conversation so far; the backend accepts at most
 * 20 turns and must start with the visitor, so older turns are trimmed from the front.
 * `bookedName` is set when the assistant booked a platform demo during this turn.
 */
export async function askSalesAssistant(conversation: SalesChatTurn[]): Promise<{ reply: string; bookedName: string | null }> {
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
    body: JSON.stringify({ messages }),
  });
  return { reply: res.reply, bookedName: res.bookedName ?? null };
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
  publishedAtUtc: string | null;
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
}): Promise<ApiBlogPost> {
  return apiFetch<ApiBlogPost>("/api/blog/admin", { method: "POST", body: JSON.stringify(input) });
}

export async function updateBlogPost(
  id: string,
  input: { title: string; slug: string; excerpt: string; content: string; isPublished: boolean }
): Promise<ApiBlogPost> {
  return apiFetch<ApiBlogPost>(`/api/blog/admin/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteBlogPost(id: string): Promise<void> {
  await apiFetch<void>(`/api/blog/admin/${id}`, { method: "DELETE" });
}
