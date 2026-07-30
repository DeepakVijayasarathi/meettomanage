import { Suspense, useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

function InlineRouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}

/**
 * Re-triggers a fade/slide-in on every route change (keyed by pathname) and
 * resets scroll position, since <Outlet> swaps content instantly otherwise.
 * Also carries its own Suspense boundary so a not-yet-loaded lazy route chunk
 * shows a small inline loader here instead of the app-wide fallback tearing
 * down the sidebar/topbar around it.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div key={pathname} className="animate-page-in">
      <Suspense fallback={<InlineRouteFallback />}>{children}</Suspense>
    </div>
  );
}
