import { afterEach, describe, expect, it } from "vitest";
import { authStorage, beginViewAsStorage, clearAuthStorage, getViewAs, prefStorage } from "@/lib/authStorage";

describe("view-as tab storage", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("keeps the parent session in this tab only and never touches the RM's own login", () => {
    localStorage.setItem("trn.remember", "true");
    localStorage.setItem("trn.accessToken", "rm-token");
    localStorage.setItem("trn.role", "subadmin");
    sessionStorage.setItem("trn.accessToken", "copied-from-opener");

    beginViewAsStorage({ parentName: "Rhea Kapoor", expiresAtUtc: new Date(Date.now() + 60_000).toISOString() });
    expect(sessionStorage.getItem("trn.accessToken")).toBeNull(); // opener's copy wiped
    expect(authStorage()).toBe(sessionStorage);
    expect(prefStorage()).toBe(sessionStorage);
    authStorage().setItem("trn.accessToken", "view-as-token");

    clearAuthStorage();

    expect(getViewAs()).toBeNull();
    expect(sessionStorage.getItem("trn.accessToken")).toBeNull();
    expect(localStorage.getItem("trn.accessToken")).toBe("rm-token");
    expect(localStorage.getItem("trn.role")).toBe("subadmin");
  });

  it("is a normal tab when no view-as session is marked", () => {
    localStorage.setItem("trn.remember", "true");
    expect(getViewAs()).toBeNull();
    expect(authStorage()).toBe(localStorage);
    expect(prefStorage()).toBe(localStorage);
  });
});
