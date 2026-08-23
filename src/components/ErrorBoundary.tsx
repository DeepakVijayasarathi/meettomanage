import { Component, type ErrorInfo, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// One-shot guard against a reload loop: if the auto-reload below doesn't actually fix
// things (a real bug, not a stale-chunk mismatch), the second error must show the normal
// fallback UI instead of reloading forever. Session-scoped (not a component field) since a
// full page reload is exactly what a stale-chunk recovery does — any component state
// would be wiped along with it.
export const RELOAD_GUARD_KEY = "trn.errorBoundaryReloaded";

// Vite/webpack's own wording for "the JS chunk this route needs isn't at the URL the
// currently-loaded index.html expects" — the single most common way a production SPA
// crashes blank: a deploy replaced the hashed asset files while this tab still had the
// previous index.html open, and the next lazy-loaded route reaches for a file that's
// gone. A full reload fetches the new index.html (with the new, correct hashes) and
// silently fixes it for the overwhelming majority of cases — no need to show an error
// at all for something this routine.
function isStaleChunkError(error: Error): boolean {
  const message = error.message || "";
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    /Loading (chunk|CSS chunk) \S+ failed/.test(message)
  );
}

/**
 * The app previously had no error boundary anywhere: an uncaught error during render —
 * including a stale JS chunk after a deploy, since nearly every route is lazy-loaded —
 * unmounted the entire React tree with nothing left on screen. No error, no fallback,
 * just a blank white page and no way back short of the user guessing to hit reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);

    if (isStaleChunkError(error)) {
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
      } catch {
        /* sessionStorage unavailable (private mode, etc.) — fall through to the fallback UI */
      }
      if (!alreadyReloaded) {
        try {
          sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
        } catch {
          /* best-effort guard only */
        }
        window.location.reload();
        return;
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <Logo showWordmark={false} imgClassName="h-12 w-12" />
        <div className="flex max-w-sm flex-col gap-2">
          <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This page hit an unexpected error. Reloading usually fixes it — if it keeps happening, let us know what
            you were doing when it appeared.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    );
  }
}
