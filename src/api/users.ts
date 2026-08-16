import { apiFetch } from "@/lib/api";
import type { AppUser, Child } from "@/types";
import { toFrontendRole, toFrontendStatus, type ApiRole, type ApiUser, type PagedResult } from "./types";

/** A students-directory row: the mock Child shape plus resolved parent/course names from the API. */
export type StudentRow = Child & { parentName?: string; courseName?: string; rmNotes?: string };

// Stable colour per user so avatars don't change between visits
const AVATAR_COLORS = ["#5B93E0", "#F08A1D", "#8B5CF6", "#17A9C9", "#23A455", "#EC4899", "#EAB308", "#F53BA6"];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export interface ApiStudent {
  id: string;
  parentProfileId: string;
  fullName: string;
  age: number | null;
  academicLevel: string | null;
  parentName: string;
  courseName: string | null;
  rmNotes: string | null;
  isActive: boolean;
}

/** RM special enrolment notes on a child profile. */
export async function updateStudentNotes(childId: string, notes: string): Promise<void> {
  await apiFetch<void>(`/api/users/students/${childId}/notes`, {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
}

/** Admin students directory (real enrolled children). Attendance/fee show neutral defaults until those subsystems populate. */
export async function listStudents(): Promise<StudentRow[]> {
  const students = await apiFetch<ApiStudent[]>("/api/users/students");
  return students.map((s) => ({
    id: s.id,
    parentId: s.parentProfileId,
    name: s.fullName,
    age: s.age ?? 0,
    grade: s.academicLevel ?? "",
    avatarColor: avatarColorFor(s.id),
    courseId: "",
    batchId: "",
    classesCompleted: 0,
    classesRemaining: 0,
    attendancePercent: 0,
    feeStatus: "paid",
    enrollmentComplete: s.isActive,
    parentName: s.parentName,
    courseName: s.courseName ?? undefined,
    rmNotes: s.rmNotes ?? undefined,
  }));
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
    roleDefinitionId: user.roleDefinitionId ?? undefined,
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

/** Regenerates the account's temp PIN and (re)sends the onboarding welcome message over the chosen channel. */
export async function resendCredentials(userId: string, channel: "Email" | "WhatsApp" | "Sms"): Promise<void> {
  await apiFetch<void>(`/api/users/${userId}/resend-credentials`, {
    method: "POST",
    body: JSON.stringify({ channel }),
  });
}

export async function updateUser(
  id: string,
  request: { firstName: string; lastName: string; phone?: string; department?: "Phonics" | "Maths" }
): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export interface CredentialChannels {
  email: boolean;
  whatsApp: boolean;
  sms: boolean;
}

/** Which credential-delivery channels are enabled in Settings → Integrations (drives which Send buttons show). */
export async function getCredentialChannels(): Promise<CredentialChannels> {
  return apiFetch<CredentialChannels>("/api/users/credential-channels");
}

/**
 * Regenerates the account's PIN and hands it back directly instead of sending it anywhere —
 * for an admin to read out or write down when no delivery channel currently reaches this
 * person. Unlike resendCredentials, this doesn't depend on Email/WhatsApp/SMS being enabled.
 */
export async function resetPin(userId: string): Promise<string> {
  const result = await apiFetch<{ temporaryPin: string }>(`/api/users/${userId}/reset-pin`, { method: "POST" });
  return result.temporaryPin;
}

/** Soft-deletes the account; excluded from all lists afterwards and its email becomes reusable. */
export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/api/users/${id}`, { method: "DELETE" });
}

/** Converts the account to a different base type (swaps Parent/Teacher profile as needed). */
export async function changeUserRole(id: string, role: ApiRole): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/users/${id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export async function createUser(request: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: ApiRole;
  department?: "Phonics" | "Maths";
  /** Role preset to assign immediately; only valid when role is "SubAdmin". */
  roleDefinitionId?: string;
}): Promise<ApiUser> {
  return apiFetch<ApiUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
