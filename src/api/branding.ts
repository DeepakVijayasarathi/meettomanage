import { apiFetch } from "@/lib/api";
import { platformRequest } from "@/api/platform";

/** Logo upload/removal. Tenant calls use the client's own session; operator calls use the platform token. */

export const LOGO_MAX_BYTES = 1_000_000;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

export function checkLogoFile(file: File): string | null {
  if (!/\.(png|jpe?g|webp)$/i.test(file.name)) return "Choose a PNG, JPG or WebP image.";
  if (file.size > LOGO_MAX_BYTES) return "The logo must be 1 MB or smaller.";
  return null;
}

export const tenantLogo = {
  upload: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiFetch<{ logoUrl: string }>("/api/settings/brand-logo", { method: "POST", body });
  },
  remove: () => apiFetch<void>("/api/settings/brand-logo", { method: "DELETE" }),
};

/** Same upload, on behalf of one explicitly selected client (platform console). */
export async function uploadTenantLogoAsOperator(token: string, tenantId: string, file: File): Promise<{ logoUrl: string }> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${base}/api/platform/tenants/${tenantId}/branding/logo`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(problem.detail || "The logo could not be uploaded.");
  }
  return await response.json() as { logoUrl: string };
}

export const removeTenantLogoAsOperator = (token: string, tenantId: string) =>
  platformRequest<void>(`/tenants/${tenantId}/branding/logo`, token, "DELETE");
