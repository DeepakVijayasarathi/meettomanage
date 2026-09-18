import { apiFetch, downloadFile } from "@/lib/api";
import type { AppUser, Child } from "@/types";
import { toFrontendRole, toFrontendStatus, type ApiRole, type ApiUser, type BulkImportResult, type PagedResult } from "./types";

/** A students-directory row: the mock Child shape plus resolved parent/course names from the API.
 *  `parentId` stays the child's ParentProfileId (the mock-data convention every other screen
 *  already keys off). `parentUserId` is separate — the parent's actual account id (User.Id) —
 *  because the admin Users screen's parents list comes from the Users API and is keyed by that,
 *  not by ParentProfileId; matching a child to its parent row there needs this field. */
export type StudentRow = Child & {
  parentName?: string;
  courseName?: string;
  rmNotes?: string;
  parentUserId?: string;
  /** Sum of this child's Paid invoices. Zero (or undefined, in demo mode) means nothing was
   *  ever collected — deleting them needs no refund warning. */
  paidInvoiceTotal?: number;
};

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
  parentUserId: string;
  fullName: string;
  age: number | null;
  academicLevel: string | null;
  parentName: string;
  courseName: string | null;
  rmNotes: string | null;
  isActive: boolean;
  paidInvoiceTotal: number;
}

/** RM special enrolment notes on a child profile. */
export async function updateStudentNotes(childId: string, notes: string): Promise<void> {
  await apiFetch<void>(`/api/users/students/${childId}/notes`, {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
}

/** Removes a mistaken/test child record. The backend refuses if it still has an active batch enrolment or unpaid invoice. */
/**
 * Removes a mistaken/test child record. Refused if the child has an unpaid invoice, or (unless
 * `withdrawFromBatches` is set) an active batch enrolment -- previously there was no way to
 * discover or clear that blocking enrolment from this same flow: the error named the fix
 * ("withdraw them first") but not where to do it, dead-ending an admin trying to remove a child
 * who'd simply finished their course. Passing `withdrawFromBatches: true` (after the caller
 * gets that exact error and asks the admin to confirm) withdraws every active enrolment and
 * deletes in the same call.
 */
export async function deleteStudent(childId: string, withdrawFromBatches?: boolean): Promise<void> {
  const query = withdrawFromBatches ? "?withdrawFromBatches=true" : "";
  await apiFetch<void>(`/api/users/students/${childId}${query}`, { method: "DELETE" });
}

/** Admin students directory (real enrolled children). Attendance/fee show neutral defaults until those subsystems populate. */
export async function listStudents(): Promise<StudentRow[]> {
  const students = await apiFetch<ApiStudent[]>("/api/users/students");
  return students.map((s) => ({
    id: s.id,
    parentId: s.parentProfileId,
    parentUserId: s.parentUserId,
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
    paidInvoiceTotal: s.paidInvoiceTotal,
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
    department: user.departmentName ?? undefined,
    departmentId: user.departmentId ?? undefined,
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

const MAX_PAGE_SIZE = 100; // server-side hard clamp (UserService.ListAsync) — requesting more just gets clamped back to this

/**
 * Every user of one role, not just the newest 100 -- the admin Users page's search box only
 * ever filters whatever's already been fetched (DataTable has no server-search wiring), so a
 * single `listUsers` call silently made anyone outside the first page permanently unfindable
 * and un-searchable. Confirmed live: a parent whose account predated the ~100 most-recently-
 * created ones (listUsers orders newest-first) had no way to be found in the Parents tab at
 * all, even though the account genuinely existed -- "Add User" correctly refused it as a
 * duplicate, but there was no way to reach it to resend credentials. Students never hit this
 * (listStudents already fetches everyone unconditionally); Parents/Teachers/Admission
 * Team/Sub Admin all did.
 */
export async function listAllUsers(role: ApiRole): Promise<ApiUser[]> {
  const all: ApiUser[] = [];
  let page = 1;
  for (;;) {
    const result = await listUsers({ role, page, pageSize: MAX_PAGE_SIZE });
    all.push(...result.items);
    if (all.length >= result.totalCount || result.items.length === 0) {
      return all;
    }
    page += 1;
  }
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
  request: { firstName: string; lastName: string; email?: string; phone?: string; departmentId?: string }
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

/** One table's worth of what a hard delete would remove — see DataDeletionPreviewDto. */
export interface ApiDataDeletionPreviewItem {
  table: string;
  label: string;
  count: number;
}

export interface ApiDataDeletionPreview {
  targetName: string;
  items: ApiDataDeletionPreviewItem[];
  totalRecords: number;
}

/** Everything a hard delete of this Parent (and every one of their children) would permanently
 *  remove — read-only, for the confirmation popup before {@link hardDeleteParent}. */
export async function getParentHardDeletePreview(id: string): Promise<ApiDataDeletionPreview> {
  return apiFetch<ApiDataDeletionPreview>(`/api/users/${id}/hard-delete-preview`);
}

/** Permanently deletes this Parent account, every one of their children, and every row that's
 *  actually theirs (financial records included) — logged first for future reference, but there
 *  is no undo once this resolves. Call {@link getParentHardDeletePreview} first. */
export async function hardDeleteParent(id: string): Promise<void> {
  await apiFetch<void>(`/api/users/${id}/hard-delete`, { method: "DELETE" });
}

/** Everything a hard delete of this Student would permanently remove — read-only, for the
 *  confirmation popup before {@link hardDeleteStudent}. */
export async function getStudentHardDeletePreview(childId: string): Promise<ApiDataDeletionPreview> {
  return apiFetch<ApiDataDeletionPreview>(`/api/users/students/${childId}/hard-delete-preview`);
}

/** Permanently deletes this Student and every row that's actually theirs — never the parent
 *  account, siblings, batches or class sessions. Logged first for future reference, but there is
 *  no undo once this resolves. Call {@link getStudentHardDeletePreview} first. */
export async function hardDeleteStudent(childId: string): Promise<void> {
  await apiFetch<void>(`/api/users/students/${childId}/hard-delete`, { method: "DELETE" });
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
  departmentId?: string;
  /** Role preset to assign immediately; only valid when role is "SubAdmin". */
  roleDefinitionId?: string;
}): Promise<ApiUser> {
  return apiFetch<ApiUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/** Bulk-create Parent or Teacher accounts from a .csv/.xlsx. Columns: Email, FirstName,
 *  LastName, Phone, DepartmentName (Teacher rows only). */
export async function bulkImportUsers(file: File, role: "Parent" | "Teacher"): Promise<BulkImportResult> {
  const form = new FormData();
  form.set("file", file);
  form.set("role", role);
  return apiFetch<BulkImportResult>("/api/users/bulk-import", { method: "POST", body: form });
}

export async function exportUsers(role: "Parent" | "Teacher"): Promise<void> {
  await downloadFile(`/api/users/export?role=${role}`, `${role.toLowerCase()}s.csv`);
}

/** Bulk-create Students (Child records) from a .csv/.xlsx. Each row's ParentEmail must match
 *  an existing Parent account. Columns: ParentEmail, StudentFullName, DateOfBirth (YYYY-MM-DD, optional), AcademicLevel (optional). */
export async function bulkImportStudents(file: File): Promise<BulkImportResult> {
  const form = new FormData();
  form.set("file", file);
  return apiFetch<BulkImportResult>("/api/users/students/bulk-import", { method: "POST", body: form });
}

export async function exportStudents(): Promise<void> {
  await downloadFile("/api/users/students/export", "students.csv");
}
