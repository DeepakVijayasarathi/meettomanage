import type { Role } from "@/types";
import { useSession } from "@/state/session";

/**
 * Class recordings may be DOWNLOADED only by Admin and the Management / Owner (Founder)
 * team — everyone else who can see recordings (RM, Coordinator, IT Admin, teachers,
 * parents) can play them but gets no download option. Every Sub Admin signs in with the
 * same "subadmin" role, so which preset they hold is read from the portal they home on
 * (homePath — the API's RoleDefinition.DefaultRoute): "/management" or "/executive".
 */
export function canDownloadRecordings(role: Role | null, homePath: string | null): boolean {
  if (role === "admin" || role === "management" || role === "executive") return true;
  if (role !== "subadmin" || !homePath) return false;
  return homePath === "/management" || homePath.startsWith("/management/")
    || homePath === "/executive" || homePath.startsWith("/executive/");
}

export function useCanDownloadRecordings(): boolean {
  const { role, homePath } = useSession();
  return canDownloadRecordings(role, homePath);
}
