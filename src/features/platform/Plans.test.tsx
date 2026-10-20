import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Plans from "./Plans";
import { formatMoney } from "@/api/saas";
import { describeLimit } from "./saasUi";

const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

const catalog = [
  { key: "max_students", label: "Active students", type: "Number", unit: "students" },
  { key: "feature_white_label", label: "White-label branding", type: "Bool", unit: "" },
];
const plan = {
  id: "p1", code: "starter", name: "Starter", description: "For one academy.", isPublic: true, isActive: true, trialDays: 0, sortOrder: 1, subscribers: 3,
  prices: [{ id: "pr1", billingInterval: "Month", currency: "INR", amount: 2999, isActive: true }],
  entitlements: [{ key: "max_students", value: 100 }, { key: "feature_white_label", value: 1 }],
};

describe("platform plans", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); sessionStorage.setItem("mtm.platformToken", "platform-token"); });

  it("lists plans with price, limits and subscriber count from the operator API", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).endsWith("/entitlement-catalog") ? response(catalog) : response([plan]));
    render(<MemoryRouter><Plans /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Starter" })).toBeTruthy();
    expect(screen.getByText(/₹2,999\/mo/)).toBeTruthy();
    expect(screen.getByText("3 subscribers")).toBeTruthy();
    expect(screen.getByText(/White-label branding/)).toBeTruthy();
  });

  it("saves an edited price through PUT with the operator token", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).endsWith("/entitlement-catalog")) return response(catalog);
      if (init?.method === "PUT") return response(plan);
      return response([plan]);
    });
    render(<MemoryRouter><Plans /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /Edit/ }));
    fireEvent.change(await screen.findByLabelText(/Monthly price/), { target: { value: "3499" } });
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/platform/plans/p1"),
      expect.objectContaining({ method: "PUT", headers: expect.objectContaining({ Authorization: "Bearer platform-token" }) })));
    const put = fetch.mock.calls.find(c => c[1]?.method === "PUT")!;
    const body = JSON.parse(String(put[1]?.body));
    expect(body.prices[0]).toMatchObject({ id: "pr1", amount: 3499, billingInterval: "Month" });
    expect(body.entitlements).toContainEqual({ key: "max_students", value: 100 });
  });
});

describe("billing formatting", () => {
  it("formats rupees and limits", () => {
    expect(formatMoney(2999)).toBe("₹2,999");
    expect(formatMoney(3538.82)).toBe("₹3,538.82");
    expect(describeLimit(-1, "students")).toBe("Unlimited");
    expect(describeLimit(20480, "MB")).toBe("20 GB");
    expect(describeLimit(100, "students")).toBe("100 students");
  });
});
