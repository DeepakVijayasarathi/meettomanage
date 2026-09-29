import { apiFetch } from "@/lib/api";

export type IntegrationCategory = "Email" | "Messaging" | "PaymentGateway" | "VideoConferencing" | "Other";

export interface ApiIntegration {
  id: string;
  key: string;
  name: string;
  category: IntegrationCategory;
  description: string | null;
  isEnabled: boolean;
  config: Record<string, string | null>;
  isSystem: boolean;
}

export interface SaveIntegrationRequest {
  key: string;
  name: string;
  category: IntegrationCategory;
  description: string | null;
  isEnabled: boolean;
  config: Record<string, string | null>;
}

export async function listIntegrations(): Promise<ApiIntegration[]> {
  return apiFetch<ApiIntegration[]>("/api/integrations");
}

export async function createIntegration(request: SaveIntegrationRequest): Promise<ApiIntegration> {
  return apiFetch<ApiIntegration>("/api/integrations", { method: "POST", body: JSON.stringify(request) });
}

export async function updateIntegration(id: string, request: SaveIntegrationRequest): Promise<ApiIntegration> {
  return apiFetch<ApiIntegration>(`/api/integrations/${id}`, { method: "PUT", body: JSON.stringify(request) });
}

export async function deleteIntegration(id: string): Promise<void> {
  await apiFetch<void>(`/api/integrations/${id}`, { method: "DELETE" });
}

/** Sends a real test email; `message` says exactly what's wrong when delivery isn't working. */
export async function sendTestEmail(to: string): Promise<{ ok: boolean; message: string }> {
  return apiFetch<{ ok: boolean; message: string }>("/api/integrations/email/test", {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}
