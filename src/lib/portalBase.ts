import { useLocation } from "react-router-dom";

/**
 * The current portal's URL prefix (e.g. "/management"), derived from the actual mounted
 * route rather than the page's own literal home. The Subadmin/Coordinator/Admission/
 * Management portals share one pool of reusable pages (see App.tsx) — a page like
 * DemoScheduling.tsx has no fixed "home" any more, so any internal link it builds (to
 * itself or a sibling page) has to resolve against wherever it's actually mounted, not a
 * hardcoded "/admission/...". Passing a literal `role` prop down (as AppShell already
 * does) isn't a substitute: that prop reflects which AppShell was used to wrap the route,
 * not necessarily the segment the user is actually looking at.
 */
export function usePortalBase(): string {
  const { pathname } = useLocation();
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment ? `/${segment}` : "";
}
