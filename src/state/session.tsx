import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "@/types";
import { CHILDREN } from "@/data/children";

interface SessionState {
  role: Role | null;
  setRole: (role: Role | null) => void;
  logout: () => void;
  activeChildId: string;
  setActiveChildId: (id: string) => void;
  enrolledChildIds: string[];
  markEnrollmentComplete: (childId: string) => void;
  userName: string;
}

const SessionContext = createContext<SessionState | null>(null);

const ROLE_KEY = "trn.role";
const CHILD_KEY = "trn.activeChildId";
const ENROLLED_KEY = "trn.enrolledChildIds";

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

  useEffect(() => {
    if (role) localStorage.setItem(ROLE_KEY, role);
    else localStorage.removeItem(ROLE_KEY);
  }, [role]);

  useEffect(() => {
    localStorage.setItem(CHILD_KEY, activeChildId);
  }, [activeChildId]);

  useEffect(() => {
    localStorage.setItem(ENROLLED_KEY, JSON.stringify(enrolledChildIds));
  }, [enrolledChildIds]);

  const value = useMemo<SessionState>(
    () => ({
      role,
      setRole: setRoleState,
      logout: () => setRoleState(null),
      activeChildId,
      setActiveChildId: setActiveChildIdState,
      enrolledChildIds,
      markEnrollmentComplete: (childId: string) =>
        setEnrolledChildIds((prev) => (prev.includes(childId) ? prev : [...prev, childId])),
      userName: role ? NAME_BY_ROLE[role] : "Guest",
    }),
    [role, activeChildId, enrolledChildIds]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
