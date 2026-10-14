import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { FRESH_RELOAD_GUARD_KEY } from "@/lib/freshReload";

function Bomb({ message }: { message: string }): never {
  throw new Error(message);
}

describe("AppErrorBoundary", () => {
  let replace: ReturnType<typeof vi.fn>;
  const original = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    replace = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...original, href: "https://thereadernest.in/staff/live/f7e8", replace },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { value: original, writable: true });
  });

  it("fetches the current build straight away when an old chunk is missing (iPhone wording)", () => {
    render(
      <AppErrorBoundary>
        <Bomb message="Importing a module script failed." />
      </AppErrorBoundary>
    );
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toMatch(/\/staff\/live\/f7e8\?_fresh=\d+$/);
  });

  it("keeps the new-version screen up after an automatic try, and its Refresh still loads a fresh address", () => {
    sessionStorage.setItem(FRESH_RELOAD_GUARD_KEY, String(Date.now()));
    render(
      <AppErrorBoundary>
        <Bomb message="Failed to fetch dynamically imported module: https://thereadernest.in/assets/Users-B1v2gKl5.js" />
      </AppErrorBoundary>
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("A new version is available")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toMatch(/_fresh=\d+$/);
  });

  it("does not auto-reload for ordinary errors", () => {
    render(
      <AppErrorBoundary>
        <Bomb message="Cannot read properties of undefined" />
      </AppErrorBoundary>
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
