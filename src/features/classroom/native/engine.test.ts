import { afterEach, describe, expect, it, vi } from "vitest";
import { classroomEngine, markNativeEngineFailed } from "./engine";

function at(search: string) {
  window.history.replaceState(null, "", `/class${search}`);
}

describe("classroomEngine", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
    at("");
  });

  it("defaults teachers to the native engine and students to the iframe", () => {
    expect(classroomEngine("teacher")).toBe("native");
    expect(classroomEngine("student")).toBe("iframe");
  });

  it("lets a link override and remembers it", () => {
    at("?engine=iframe");
    expect(classroomEngine("teacher")).toBe("iframe");
    at("");
    expect(classroomEngine("teacher")).toBe("iframe");
    at("?engine=native");
    expect(classroomEngine("student")).toBe("native");
  });

  it("honours the deployment kill switch", () => {
    vi.stubEnv("VITE_CLASSROOM_ENGINE", "iframe");
    expect(classroomEngine("teacher")).toBe("iframe");
  });

  it("falls back to the iframe for the rest of the tab after a failed start", () => {
    markNativeEngineFailed();
    expect(classroomEngine("teacher")).toBe("iframe");
    // An explicit ?engine=native (a tester) clears the fallback.
    at("?engine=native");
    expect(classroomEngine("teacher")).toBe("native");
  });
});
