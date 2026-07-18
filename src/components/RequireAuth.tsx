import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "@/types";
import { ROLE_META } from "@/lib/roles";
import { apiEnabled, getAccessToken } from "@/lib/api";
import { useSession } from "@/state/session";

/**
 * Gates a portal behind login. No session role — or a missing API token when a
 * backend is configured — bounces to /login (remembering where the visitor was
 * headed, so Login can return them there). A signed-in user opening another
 * role's portal is sent to their own portal home instead of the login page.
 * `also` lists extra roles allowed in (e.g. parents opening the student preview).
 */
export function RequireAuth({ role, also, children }: { role: Role; also?: Role[]; children: ReactNode }) {
  const { role: sessionRole } = useSession();
  const location = useLocation();

  if (!sessionRole || (apiEnabled() && !getAccessToken())) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (sessionRole !== role && !also?.includes(sessionRole)) {
    return <Navigate to={ROLE_META[sessionRole].homePath} replace />;
  }

  return <>{children}</>;
}
