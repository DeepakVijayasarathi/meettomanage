import { apiFetch } from "@/lib/api";
import type { NavSection } from "@/lib/nav";
import {
  Ban,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  Circle,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FolderOpen,
  Gauge,
  History,
  KanbanSquare,
  Landmark,
  Layers,
  LayoutDashboard,
  Link2,
  Mail,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  UserSearch,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Backend PermissionModule names reused by the menu module gate. */
import type { PermissionModuleName } from "@/api/permissions";

export interface ApiMenuItem {
  id: string;
  portal: string;
  section: string | null;
  sectionOrder: number;
  label: string;
  path: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  requiredModule: PermissionModuleName | null;
}

export interface SaveMenuItemRequest {
  portal: string;
  section: string | null;
  sectionOrder: number;
  label: string;
  path: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  requiredModule?: PermissionModuleName | null;
}

/** Lucide icons the menu manager can reference by name; extend as menus grow. */
export const MENU_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  ShieldCheck,
  BookOpen,
  Layers,
  CalendarDays,
  CalendarClock,
  FolderOpen,
  Receipt,
  Landmark,
  Wallet,
  Ban,
  BarChart3,
  Mail,
  ClipboardCheck,
  Settings,
  Video,
  ClipboardList,
  CalendarOff,
  Banknote,
  Bell,
  UserPlus,
  CreditCard,
  History,
  CalendarRange,
  UserSearch,
  Link2,
  KanbanSquare,
  TrendingUp,
  Gauge,
  FileBarChart,
  Sparkles,
};

export function resolveMenuIcon(name: string): LucideIcon {
  return MENU_ICONS[name] ?? Circle;
}

/**
 * The signed-in user's own sidebar — resolved server-side from their account role's
 * portal and filtered by the module grants their assigned role carries. This is the
 * menu the app shell renders so navigation reflects the role assigned to the user.
 */
export async function getMyMenu(): Promise<ApiMenuItem[]> {
  return apiFetch<ApiMenuItem[]>("/api/menus/mine");
}

/** All configured items including inactive, for the admin menu manager. */
export async function listMenuItems(portal?: string): Promise<ApiMenuItem[]> {
  const query = portal ? `?portal=${encodeURIComponent(portal)}` : "";
  return apiFetch<ApiMenuItem[]>(`/api/menus${query}`);
}

export async function createMenuItem(request: SaveMenuItemRequest): Promise<ApiMenuItem> {
  return apiFetch<ApiMenuItem>("/api/menus", { method: "POST", body: JSON.stringify(request) });
}

export async function updateMenuItem(id: string, request: SaveMenuItemRequest): Promise<ApiMenuItem> {
  return apiFetch<ApiMenuItem>(`/api/menus/${id}`, { method: "PUT", body: JSON.stringify(request) });
}

export async function deleteMenuItem(id: string): Promise<void> {
  await apiFetch<void>(`/api/menus/${id}`, { method: "DELETE" });
}

/** Groups the flat DB rows into the NavSection shape the Sidebar renders. */
export function toNavSections(items: ApiMenuItem[]): NavSection[] {
  const sections: NavSection[] = [];
  let current: { key: string; section: NavSection } | null = null;

  for (const item of [...items].sort((a, b) => a.sectionOrder - b.sectionOrder || a.sortOrder - b.sortOrder)) {
    const key = item.section ?? "";
    if (!current || current.key !== key) {
      current = { key, section: { title: item.section ?? undefined, items: [] } };
      sections.push(current.section);
    }
    current.section.items.push({
      label: item.label,
      to: item.path,
      icon: resolveMenuIcon(item.icon),
      // Portal root paths ("/admin") must match exactly or they'd stay highlighted everywhere
      end: !item.section,
    });
  }

  return sections;
}
