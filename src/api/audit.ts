import { apiFetch } from "@/lib/api";

export interface ApiAuditLog {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  changesJson: string | null;
  createdAtUtc: string;
}

export interface AuditLogPage {
  items: ApiAuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Paged, newest-first audit trail for the Audit Log screen. Callers with platform-wide
 * Settings:View (or Admin) see every actor's actions; everyone else — e.g. a Sub-Admin —
 * is automatically scoped to their own actions only.
 */
export async function listAuditLogs(params?: {
  entityName?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditLogPage> {
  const q = new URLSearchParams();
  if (params?.entityName) q.set("entityName", params.entityName);
  if (params?.action) q.set("action", params.action);
  q.set("page", String(params?.page ?? 1));
  q.set("pageSize", String(params?.pageSize ?? 25));
  return apiFetch<AuditLogPage>(`/api/audit-logs?${q}`);
}
