import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FRESH_RELOAD_GUARD_KEY,
  freshReloadUrl,
  isChunkLoadError,
  stripFreshReloadParam,
  tryAutoReloadFresh,
} from "./freshReload";

describe("isChunkLoadError", () => {
  it.each([
    "Failed to fetch dynamically imported module: https://thereadernest.in/assets/Users-B1v2gKl5.js",
    "error loading dynamically imported module: https://thereadernest.in/assets/Users-B1v2gKl5.js",
    "Importing a module script failed.",
    "Loading chunk 42 failed.",
    "Loading CSS chunk 7 failed",
    "Unable to preload CSS for /assets/index-By6flohp.css",
  ])("recognises %s", (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it("ignores ordinary errors", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'id')"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("freshReloadUrl", () => {
  it("adds the cache-busting parameter and keeps the rest of the address", () => {
    expect(freshReloadUrl("https://thereadernest.in/staff/live/abc?tab=2#chat", 1700000000000)).toBe(
      "https://thereadernest.in/staff/live/abc?tab=2&_fresh=1700000000000#chat"
    );
  });

  it("replaces an earlier value instead of stacking them", () => {
    expect(freshReloadUrl("https://thereadernest.in/?_fresh=1", 2)).toBe("https://thereadernest.in/?_fresh=2");
  });
});

describe("tryAutoReloadFresh", () => {
  let replace: ReturnType<typeof vi.fn>;
  const original = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    replace = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...original, href: "https://thereadernest.in/admin/users", replace },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { value: original, writable: true });
  });

  it("reloads to a fresh address the first time", () => {
    expect(tryAutoReloadFresh(100_000)).toBe(true);
    expect(replace).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/thereadernest\.in\/admin\/users\?_fresh=\d+$/));
    expect(sessionStorage.getItem(FRESH_RELOAD_GUARD_KEY)).toBe("100000");
  });

  it("does not reload again within a minute, so a broken deploy can't loop", () => {
    sessionStorage.setItem(FRESH_RELOAD_GUARD_KEY, "100000");
    expect(tryAutoReloadFresh(130_000)).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("tries again after the minute has passed", () => {
    sessionStorage.setItem(FRESH_RELOAD_GUARD_KEY, "100000");
    expect(tryAutoReloadFresh(161_000)).toBe(true);
    expect(replace).toHaveBeenCalledTimes(1);
  });
});

describe("stripFreshReloadParam", () => {
  it("removes only the cache-busting parameter from the address bar", () => {
    window.history.replaceState(null, "", "/teacher/classes?week=3&_fresh=123#today");
    stripFreshReloadParam();
    expect(window.location.pathname + window.location.search + window.location.hash).toBe("/teacher/classes?week=3#today");
  });
});
