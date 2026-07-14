import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "@/types";
import { CHILDREN, getChildrenByParent } from "@/data/children";
import { apiEnabled, setAccessToken } from "@/lib/api";
import { getParentChildren } from "@/api/parentPortal";

/** The logged-in parent's children, for the child switcher across parent screens. */
export interface SessionChild {
  id: string;
  name: string;
  enrollmentComplete: boolean;
}

// Demo mode shows one family's roster (the p-1 mock parent), matching the old switcher.
const MOCK_SESSION_CHILDREN: SessionChild[] = getChildrenByParent("p-1").map((c) => ({
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
}

const SessionContext = createContext<SessionState | null>(null);

const ROLE_KEY = "trn.role";
const CHILD_KEY = "trn.activeChildId";
const ENROLLED_KEY = "trn.enrolledChildIds";
const NAME_KEY = "trn.userName";

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
    if (typeof window === "undefined") return CHILDREN[0].id;
    return localStorage.getItem(CHILD_KEY) ?? CHILDREN[0].id;
  });
  const [enrolledChildIds, setEnrolledChildIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(ENROLLED_KEY);
    if (raw) return JSON.parse(raw);
    return CHILDREN.filter((c) => c.enrollmentComplete).map((c) => c.id);
  });
  const [apiUserName, setApiUserName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(NAME_KEY);
  });
  const [childList, setChildList] = useState<SessionChild[]>(MOCK_SESSION_CHILDREN);

  useEffect(() => {
    if (role) localStorage.setItem(ROLE_KEY, role);
    else localStorage.removeItem(ROLE_KEY);
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
        setAccessToken(null);
      },
      activeChildId,
      setActiveChildId: setActiveChildIdState,
      enrolledChildIds,
      markEnrollmentComplete: (childId: string) =>
        setEnrolledChildIds((prev) => (prev.includes(childId) ? prev : [...prev, childId])),
      children: childList,
      userName: apiUserName ?? (role ? NAME_BY_ROLE[role] : "Guest"),
      setUserName,
    }),
    [role, activeChildId, enrolledChildIds, childList, apiUserName]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
