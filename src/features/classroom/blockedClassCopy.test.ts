import { describe, expect, it } from "vitest";
import { describeBlockedClass } from "./blockedClassCopy";

describe("describeBlockedClass", () => {
  it("explains a class that can't be found without showing the server text", () => {
    const c = describeBlockedClass("ClassSession with id '01a0aaaa-bbbb' was not found.", 404);
    expect(c.title).toMatch(/couldn't find this class/i);
    expect(c.body).not.toMatch(/ClassSession|01a0/);
    expect(c.canRetry).toBe(false);
  });

  it("offers a retry only when trying again can change the answer", () => {
    expect(describeBlockedClass("This class hasn't opened for joining yet.", 400).canRetry).toBe(true);
    expect(describeBlockedClass("This class has already ended.", 400).canRetry).toBe(false);
    expect(describeBlockedClass("You do not have access to this session.", 403).canRetry).toBe(false);
    expect(describeBlockedClass("This session has no meeting room yet.", 400).canRetry).toBe(true);
  });

  it("falls back to the message it was given", () => {
    const c = describeBlockedClass("Some other reason.", 500);
    expect(c.body).toBe("Some other reason.");
    expect(c.canRetry).toBe(true);
  });
});
