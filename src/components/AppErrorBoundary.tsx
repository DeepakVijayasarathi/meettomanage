import { Component, type ErrorInfo, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const CHUNK_LOAD_PATTERN = /failed to fetch dynamically imported module|loading chunk|importing a module script failed/i;

// The app has ~90 lazy-loaded route chunks and no CI/CD — a manual redeploy replaces every
// chunk's content-hashed filename at once. Anyone with the app already open who then
// navigates to a route chunk their tab hasn't fetched yet gets a hard 404 on the old
// filename, which React Router/Suspense has no built-in recovery from: before this boundary
// existed, that crashed straight to a blank white screen with no way back except knowing to
// hard-refresh. Confirmed live during a portal sweep: a transient network blip mid-navigation
// produced the exact same "Unhandled render error" crash. A stale-chunk 404 is one-time-fixed
// by a reload (the browser fetches the current index.html and its current chunk map), so that's
// the only recovery this needs — no retry loop, no error-reporting integration to build.
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isChunkError = CHUNK_LOAD_PATTERN.test(error.message);

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <Logo showWordmark={false} imgClassName="h-12 w-12" />
          <h1 className="text-lg font-semibold text-foreground">
            {isChunkError ? "A new version is available" : "Something went wrong"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isChunkError
              ? "This page was updated since you opened it. Refresh to load the latest version."
              : "This page ran into an unexpected error. Refreshing usually fixes it."}
          </p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    );
  }
}
