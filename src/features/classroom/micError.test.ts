import { describe, expect, it } from "vitest";
import { micErrorAction } from "./micError";

describe("micErrorAction", () => {
  it("opens the 'blocked' help for a permission denial", () => {
    expect(micErrorAction("gum.permission_denied")).toEqual({ kind: "blocked" });
  });

  it("says no microphone was found", () => {
    const action = micErrorAction("gum.not_found");
    expect(action.kind).toBe("banner");
    expect(action.kind === "banner" && action.message).toMatch(/No microphone was found/);
  });

  it("falls back to 'mic didn't start' for anything else, including a missing type", () => {
    for (const type of ["gum.general", "gum.constraint_failed", undefined]) {
      const action = micErrorAction(type);
      expect(action.kind === "banner" && action.message).toMatch(/microphone didn't start/);
    }
  });
});
