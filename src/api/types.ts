import type { Role, UserStatus } from "@/types";

/** Backend role names (UserRole enum serialized as strings). */
export type ApiRole = "Admin" | "SubAdmin" | "AdmissionTeam" | "Teacher" | "Parent";

export type ApiUserStatus = "Active" | "Suspended" | "Inactive";

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  role: ApiRole;
  status: ApiUserStatus;
  timeZoneId: string;
  department: "Phonics" | "Maths" | null;
  /** Assigned role (preset) id; only meaningful for Sub Admin accounts. */
  roleDefinitionId: string | null;
  createdAtUtc: string;
  lastLoginAtUtc: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: ApiUser;
  permissions: string[];
  /** Route to navigate to right after login — the user's role default, or their portal home. */
  defaultRoute: string;
}

const ROLE_FROM_API: Record<ApiRole, Role> = {
  Admin: "admin",
  SubAdmin: "subadmin",
  AdmissionTeam: "admission",
  Teacher: "teacher",
  Parent: "parent",
};

export function toFrontendRole(role: ApiRole): Role {
  return ROLE_FROM_API[role];
}

export function toFrontendStatus(status: ApiUserStatus): UserStatus {
  return status.toLowerCase() as UserStatus;
}
