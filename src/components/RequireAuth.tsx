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
 *
 * The portal a login belongs to comes from the session homePath (the API's
 * defaultRoute), not just the account role: a Sub Admin assigned the Admission/
 * Coordinator/Management preset homes on that portal and must be let into it.
 */
export function RequireAuth({ role, also, children }: { role: Role; also?: Role[]; children: ReactNode }) {
  const { role: sessionRole, homePath } = useSession();
  const location = useLocation();

  if (!sessionRole || (apiEnabled() && !getAccessToken())) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const home = homePath ?? ROLE_META[sessionRole].homePath;
  const homePortal = home.split("/").filter(Boolean)[0];

  if (sessionRole !== role && homePortal !== role && !also?.includes(sessionRole)) {
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
