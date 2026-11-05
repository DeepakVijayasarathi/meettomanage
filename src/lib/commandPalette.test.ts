import { describe, expect, it } from "vitest";
import { matchScore } from "./commandPalette";

describe("command palette matching", () => {
  it("ranks prefix over word over substring over loose letters", () => {
    expect(matchScore("Homework & Tests", "home")).toBe(100);
    expect(matchScore("Homework & Tests", "tests")).toBe(80);
    expect(matchScore("Payment Gateway Mapping", "gate")).toBe(80);
    expect(matchScore("Certificates", "tif")).toBe(60);
    expect(matchScore("Homework & Tests", "hwt")).toBe(20);
    expect(matchScore("Users", "zzz")).toBe(0);
    expect(matchScore("Users", "  ")).toBe(1);
  });
});
