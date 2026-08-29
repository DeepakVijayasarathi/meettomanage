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
