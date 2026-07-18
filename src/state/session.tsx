import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "@/types";
import { CHILDREN, getChildrenByParent } from "@/data/children";
import { apiEnabled, getAccessToken, setAccessToken } from "@/lib/api";
import { getParentChildren } from "@/api/parentPortal";
import { getCurrentUser } from "@/api/auth";
import { checkPermission, type PermissionAction } from "@/lib/permissions";
import type { PermissionModuleName } from "@/api/permissions";

/** The logged-in parent's children, for the child switcher across parent screens. */
export interface SessionChild {
  id: string;
  name: string;
  enrollmentComplete: boolean;
}

// Demo mode shows one family's roster (the p-1 mock parent), matching the old switcher.
// In API mode the roster starts empty and is filled from the signed-in parent's real
// children — a real login must never see the demo family.
const MOCK_SESSION_CHILDREN: SessionChild[] = apiEnabled()
  ? []
  : getChildrenByParent("p-1").map((c) => ({
      id: c.id,
      name: c.name,
      enrollmentComplete: c.enrollmentComplete,
    }));

interface SessionState {
  role: Role | null;
  setRole: (role: Role | null) => void;
  logout: () => void;
  activeChildId: string;
  setActiveChildId: (id: string) => void;
  enrolledChildIds: string[];
  markEnrollmentComplete: (childId: string) => void;
  /** The logged-in parent's children (real from the API, or mock in demo mode). */
  children: SessionChild[];
  userName: string;
  /** Set from the API user on real login; falls back to demo names otherwise. */
  setUserName: (name: string | null) => void;
  /** "Module:Action" claim strings from login/`/api/auth/me`; empty ([]) for Admin (implicit full access) and in demo mode. */
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
  /** Does the current login have this permission? Admin always true; demo mode always true (nothing to gate against). */
  hasPermission: (module: PermissionModuleName, action: PermissionAction) => boolean;
}

const SessionContext = createContext<SessionState | null>(null);

const ROLE_KEY = "trn.role";
const CHILD_KEY = "trn.activeChildId";
const ENROLLED_KEY = "trn.enrolledChildIds";
const NAME_KEY = "trn.userName";
const PERMISSIONS_KEY = "trn.permissions";

const NAME_BY_ROLE: Record<Role, string> = {
  admin: "Ananya Rao",
  subadmin: "Neha Kulkarni",
  admission: "Priya Menon",
  teacher: "Karan Mehta",
  parent: "Rhea Kapoor",
  student: "Aarav Kapoor",
  coordinator: "Meera Nair",
  management: "Vikram Oberoi",
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => {
    if (typeof window === "undefined") return null;
    return (localStorage.getItem(ROLE_KEY) as Role | null) ?? null;
  });
  const [activeChildId, setActiveChildIdState] = useState<string>(() => {
    if (typeof window === "undefined") return apiEnabled() ? "" : CHILDREN[0].id;
    return localStorage.getItem(CHILD_KEY) ?? (apiEnabled() ? "" : CHILDREN[0].id);
  });
  const [enrolledChildIds, setEnrolledChildIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(ENROLLED_KEY);
    if (raw) return JSON.parse(raw);
    return apiEnabled() ? [] : CHILDREN.filter((c) => c.enrollmentComplete).map((c) => c.id);
  });
  const [apiUserName, setApiUserName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(NAME_KEY);
  });
  const [permissions, setPermissionsState] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  });
  const [childList, setChildList] = useState<SessionChild[]>(MOCK_SESSION_CHILDREN);

  useEffect(() => {
    if (role) localStorage.setItem(ROLE_KEY, role);
    else localStorage.removeItem(ROLE_KEY);
  }, [role]);

  const setPermissions = (next: string[]) => {
    setPermissionsState(next);
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(next));
  };

  // Refresh permissions from the server on load so an admin's mid-session permission
  // change (or an already-open tab) doesn't leave a stale cached grant in effect.
  useEffect(() => {
    if (!apiEnabled() || !role || !getAccessToken()) return;
    let cancelled = false;
    getCurrentUser()
      .then((response) => {
        if (!cancelled) setPermissions(response.permissions);
      })
      .catch(() => {
        /* keep whatever was cached from login */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Load the signed-in parent's real children so the switcher + parent screens
  // reflect their actual family, not the demo roster. Demo mode keeps the mock.
  useEffect(() => {
    if (role !== "parent" || !apiEnabled()) return;
    let cancelled = false;
    getParentChildren()
      .then((list) => {
        if (cancelled) return;
        const mapped: SessionChild[] = list.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`.trim(),
          enrollmentComplete: c.isActive,
        }));
        setChildList(mapped);
        setEnrolledChildIds(mapped.filter((c) => c.enrollmentComplete).map((c) => c.id));
        setActiveChildIdState((prev) => (mapped.some((c) => c.id === prev) ? prev : mapped[0]?.id ?? ""));
      })
      .catch(() => {
        /* keep whatever's loaded */
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    localStorage.setItem(CHILD_KEY, activeChildId);
  }, [activeChildId]);

  useEffect(() => {
    localStorage.setItem(ENROLLED_KEY, JSON.stringify(enrolledChildIds));
  }, [enrolledChildIds]);

  const setUserName = (name: string | null) => {
    setApiUserName(name);
    if (name) localStorage.setItem(NAME_KEY, name);
    else localStorage.removeItem(NAME_KEY);
  };

  const value = useMemo<SessionState>(
    () => ({
      role,
      setRole: setRoleState,
      logout: () => {
        setRoleState(null);
        setUserName(null);
        setPermissions([]);
        setAccessToken(null);
      },
      activeChildId,
      setActiveChildId: setActiveChildIdState,
      enrolledChildIds,
      markEnrollmentComplete: (childId: string) =>
        setEnrolledChildIds((prev) => (prev.includes(childId) ? prev : [...prev, childId])),
      children: childList,
      // Demo persona names are demo-mode only; a real login shows its API name or nothing.
      userName: apiUserName ?? (!apiEnabled() && role ? NAME_BY_ROLE[role] : "Guest"),
      setUserName,
      permissions,
      setPermissions,
      // Demo mode (no API configured) never populates permissions, so ungating everything
      // there keeps existing demo screens working rather than hiding features behind an
      // empty claim set that was never meant to gate anything outside API mode.
      hasPermission: (module, action) =>
        !apiEnabled() || checkPermission(role, permissions, module, action),
    }),
    [role, activeChildId, enrolledChildIds, childList, apiUserName, permissions]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
