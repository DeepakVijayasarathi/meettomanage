export interface TenantEmailMapping {
  key: string;
  tenantCode: string;
}

const STORAGE_KEY = "mtm.tenantEmailMappings";

export function readTenantEmailMappings(): TenantEmailMapping[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is TenantEmailMapping =>
      !!item && typeof item === "object" &&
      typeof (item as TenantEmailMapping).key === "string" &&
      typeof (item as TenantEmailMapping).tenantCode === "string");
  } catch {
    return [];
  }
}

export function saveTenantEmailMappings(mappings: TenantEmailMapping[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}

export function tenantEmailMappingRecord(): Record<string, string> {
  return Object.fromEntries(readTenantEmailMappings().map(item => [item.key.toLowerCase(), item.tenantCode]));
}
