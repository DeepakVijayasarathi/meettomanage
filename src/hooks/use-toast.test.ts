import { afterEach, describe, expect, it, vi } from "vitest";
import { dismissToast, notePlanLimitMessage, setPlanLimitAction, toast, useToast } from "./use-toast";
import { renderHook } from "@testing-library/react";

const current = () => renderHook(() => useToast()).result.current.toasts;

describe("plan-limit toasts", () => {
  afterEach(() => {
    setPlanLimitAction(null);
    for (const t of current()) dismissToast(t.id);
  });

  it("adds the upgrade button to an error showing a recent 402 message", () => {
    const onClick = vi.fn();
    setPlanLimitAction({ label: "See plans", onClick });
    notePlanLimitMessage("Your Free plan allows up to 3 staff and teacher accounts. Upgrade your plan to add more.");
    toast({ variant: "error", title: "Couldn't create user", description: "Your Free plan allows up to 3 staff and teacher accounts. Upgrade your plan to add more." });
    expect(current().at(-1)?.action?.label).toBe("See plans");
  });

  it("leaves other errors alone", () => {
    setPlanLimitAction({ label: "See plans", onClick: vi.fn() });
    toast({ variant: "error", title: "Couldn't save", description: "Email is already in use." });
    expect(current().at(-1)?.action).toBeUndefined();
  });

  it("does nothing outside the admin portal (no action registered)", () => {
    notePlanLimitMessage("Plan limit reached.");
    toast({ variant: "error", title: "Couldn't save", description: "Plan limit reached." });
    expect(current().at(-1)?.action).toBeUndefined();
  });
});
