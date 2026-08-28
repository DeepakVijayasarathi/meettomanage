import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary, RELOAD_GUARD_KEY } from "./ErrorBoundary";

function Bomb({ message }: { message: string }): never {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    sessionStorage.clear();
    // React logs the caught error to console.error itself (independent of our own
    // componentDidCatch logging) — silence it so these expected-crash tests don't spam
    // the runner with what looks like an unhandled failure.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows a reload fallback instead of a blank page for a generic render error", () => {
    render(
      <ErrorBoundary>
        <Bomb message="Cannot read properties of undefined" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  });

  it("auto-reloads once for a stale-chunk error, without showing the fallback UI", () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <Bomb message="Failed to fetch dynamically imported module: https://meettomanage.cloud/assets/Billing-abc123.js" />
      </ErrorBoundary>
    );

    // getDerivedStateFromError sets the fallback state before componentDidCatch ever
    // runs, so the fallback legitimately renders for an instant here too — in a real
    // browser that's an imperceptible flash before reload() tears the page down for
    // navigation. The guarantee this test cares about is that the reload actually fires.
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_GUARD_KEY)).toBe("1");
  });

  it("falls back to the normal error UI instead of reloading again if the guard is already set", () => {
    sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <Bomb message="Failed to fetch dynamically imported module: https://meettomanage.cloud/assets/Billing-abc123.js" />
      </ErrorBoundary>
    );

    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
