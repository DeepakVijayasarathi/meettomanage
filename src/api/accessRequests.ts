import { apiFetch } from "@/lib/api";
import type { PermissionModuleName } from "@/api/permissions";

export type ApiAccessRequestStatus = "Pending" | "Approved" | "Rejected";

export interface ApiAccessRequest {
  id: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedModules: PermissionModuleName[];
  status: ApiAccessRequestStatus;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAtUtc: string | null;
  reviewNote: string | null;
  createdAtUtc: string;
}

/** A Sub Admin asks for modules outside their current grant; deduped server-side against an already-open request. */
export async function submitAccessRequest(requestedModules: PermissionModuleName[]): Promise<ApiAccessRequest> {
  return apiFetch<ApiAccessRequest>("/api/access-requests", {
    method: "POST",
    body: JSON.stringify({ requestedModules }),
  });
}

/** The signed-in Sub Admin's own request history, most recent first. */
export async function listMyAccessRequests(): Promise<ApiAccessRequest[]> {
  return apiFetch<ApiAccessRequest[]>("/api/access-requests/mine");
}

/** Admin view: every Relationship Manager's requests, optionally filtered by status. */
export async function listAccessRequests(status?: ApiAccessRequestStatus): Promise<ApiAccessRequest[]> {
  return apiFetch<ApiAccessRequest[]>(`/api/access-requests${status ? `?status=${status}` : ""}`);
}

/** Approve/reject records the decision and notifies the requester — it does not itself grant the modules. */
export async function reviewAccessRequest(id: string, approve: boolean, reviewNote?: string): Promise<ApiAccessRequest> {
  return apiFetch<ApiAccessRequest>(`/api/access-requests/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ approve, reviewNote }),
  });
}
