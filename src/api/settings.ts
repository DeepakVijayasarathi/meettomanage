import { apiFetch } from "@/lib/api";

export type SettingCategory = "General" | "Branding" | "Notifications" | "Integrations" | "Widgets" | "Seo" | "Analytics";

export interface ApiSetting {
  category: SettingCategory;
  key: string;
  value: string | null;
  isPublic: boolean;
}

export interface UpdateSettingItem {
  key: string;
  value: string | null;
  category?: SettingCategory;
  isPublic?: boolean;
}

/** Anonymous branding settings (brand.*, org.name) for pre-login theming. */
export async function getPublicSettings(): Promise<ApiSetting[]> {
  return apiFetch<ApiSetting[]>("/api/settings/public");
}

export async function getSettings(): Promise<ApiSetting[]> {
  return apiFetch<ApiSetting[]>("/api/settings");
}

/** Bulk upsert; returns the full settings list after saving. */
export async function updateSettings(items: UpdateSettingItem[]): Promise<ApiSetting[]> {
  return apiFetch<ApiSetting[]>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(items),
  });
}

/** Marketing console only (Marketing role): the public site's seo.* and analytics.* settings. */
export async function getMarketingSettings(): Promise<ApiSetting[]> {
  return apiFetch<ApiSetting[]>("/api/marketing/settings");
}

/** Marketing console only. Keys must be seo.* or analytics.*; returns the full marketing list after saving. */
export async function updateMarketingSettings(items: UpdateSettingItem[]): Promise<ApiSetting[]> {
  return apiFetch<ApiSetting[]>("/api/marketing/settings", {
    method: "PUT",
    body: JSON.stringify(items),
  });
}

/** Convenience: settings list → key/value map. */
export function toSettingsMap(settings: ApiSetting[]): Record<string, string | null> {
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}
