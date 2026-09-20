import { describe, expect, it } from "vitest";
import { readProblemMessage } from "@/lib/api";

const res = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

describe("readProblemMessage", () => {
  it("turns ASP.NET model-validation output into plain language", async () => {
    const msg = await readProblemMessage(
      res(400, {
        title: "One or more validation errors occurred.",
        errors: { Reason: ["The field Reason must be a string with a maximum length of 1000."] },
      })
    );
    expect(msg).toBe("Reason is too long (maximum 1000 characters).");
  });

  it("rewrites required-field messages", async () => {
    const msg = await readProblemMessage(res(400, { errors: { Reason: ["The Reason field is required."] } }));
    expect(msg).toBe("Reason is required.");
  });

  it("hides JSON binding internals", async () => {
    const msg = await readProblemMessage(
      res(400, { errors: { "$.startAtUtc": ["The JSON value could not be converted to System.DateTime. Path: $.startAtUtc | LineNumber: 0"] } })
    );
    expect(msg).toBe("Start at utc isn't in the right format.");
  });

  it("passes through a business message written for users", async () => {
    const msg = await readProblemMessage(res(400, { title: "Bad Request", detail: "Leave end time must be after the start time." }));
    expect(msg).toBe("Leave end time must be after the start time.");
  });

  it("never shows a server failure's raw text or a bare status", async () => {
    expect(await readProblemMessage(res(500, { detail: "An unexpected error occurred." }))).toMatch(/Something went wrong on our side/);
    expect(await readProblemMessage(res(502))).toMatch(/Something went wrong on our side/);
    expect(await readProblemMessage(res(403))).toBe("You don't have permission to do this.");
    expect(await readProblemMessage(res(404))).toMatch(/couldn't find/);
  });
});
