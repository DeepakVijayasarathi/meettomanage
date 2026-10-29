import { describe, expect, it } from "vitest";
import { isValidContact } from "./contactValidation";

describe("hero contact validation", () => {
  it.each(["owner@example.com", "+91 98765 43210", "9876543210", "(020) 7946-0958"])("accepts %s", (value) => {
    expect(isValidContact(value)).toBe(true);
  });

  it.each(["owner@", "hello", "123", "+12 abc 4567", "a b@example.com"])("rejects %s", (value) => {
    expect(isValidContact(value)).toBe(false);
  });
});
