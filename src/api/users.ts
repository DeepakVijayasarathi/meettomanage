import { apiFetch } from "@/lib/api";
import type { AppUser } from "@/types";
import { toFrontendRole, toFrontendStatus, type ApiRole, type ApiUser, type PagedResult } from "./types";

// Stable colour per user so avatars don't change between visits
const AVATAR_COLORS = ["#5B93E0", "#F08A1D", "#8B5CF6", "#17A9C9", "#23A455", "#EC4899", "#EAB308", "#F53BA6"];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function toAppUser(user: ApiUser): AppUser {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    phone: user.phone ?? "—",
    role: toFrontendRole(user.role),
    status: toFrontendStatus(user.status),
    avatarColor: avatarColorFor(user.id),
    joinedOn: user.createdAtUtc.slice(0, 10),
    department: user.department ?? undefined,
  };
}

export async function listUsers(params: {
  role?: ApiRole;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<ApiUser>> {
  const query = new URLSearchParams();
  if (params.role) query.set("role", params.role);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 100));
  return apiFetch<PagedResult<ApiUser>>(`/api/users?${query}`);
}

export async function createUser(request: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: ApiRole;
  department?: "Phonics" | "Maths";
}): Promise<ApiUser> {
  return apiFetch<ApiUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
