import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AiUsage from "./AiUsage";
import { AiAllowancePanel } from "@/features/admin/ChatbotAdmin";
import { formatTokens, recentMonths, type PlatformAiUsage } from "@/api/saas";

const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

const usage: PlatformAiUsage = {
  month: "2026-11", tenantTotalTokens: 125_000, removedTenantTokens: 0,
  marketing: { requests: 40, usedTokens: 9_000, features: [{ feature: "site-chat", requests: 40, promptTokens: 7_000, completionTokens: 2_000, totalTokens: 9_000 }] },
  tenants: [
    { tenantId: "a", code: "bright", name: "Bright Abacus", status: "Active", plan: "Pro", requests: 300, usedTokens: 100_000, limit: 100_000, percentUsed: 100,
      features: [{ feature: "mito", requests: 300, promptTokens: 80_000, completionTokens: 20_000, totalTokens: 100_000 }] },
    { tenantId: "b", code: "newbie", name: "Newbie Phonics", status: "Active", plan: "Free", requests: 10, usedTokens: 25_000, limit: null, percentUsed: null, features: [] },
  ],
};

describe("platform AI usage", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); sessionStorage.setItem("mtm.platformToken", "platform-token"); });

  it("lists the last twelve months, newest first, across a year boundary", () => {
    const months = recentMonths(new Date(Date.UTC(2026, 1, 15)));
    expect(months).toHaveLength(12);
    expect(months.slice(0, 3)).toEqual(["2026-02", "2026-01", "2025-12"]);
  });

  it("shows each academy against its allowance and the marketing site on its own", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => response(usage));
    render(<MemoryRouter><AiUsage /></MemoryRouter>);

    expect(await screen.findByText("Bright Abacus")).toBeInTheDocument();
    expect(String(fetch.mock.calls.find(([url]) => String(url).includes("/api/platform/ai-usage"))?.[0])).toContain("month=");
    expect(screen.getByText("100k of 100k")).toBeInTheDocument();
    expect(screen.getByText("Unlimited (no plan limit set)")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Marketing site" })).toBeInTheDocument();
    expect(screen.getByText(/never charged to an academy/)).toBeInTheDocument();
  });

  it("formats token counts compactly", () => {
    expect([formatTokens(950), formatTokens(1_500), formatTokens(25_000), formatTokens(2_500_000)]).toEqual(["950", "1.5k", "25k", "2.5M"]);
  });
});

describe("academy AI allowance", () => {
  it("warns when this month's allowance is used up", () => {
    render(<AiAllowancePanel onRefresh={() => {}} usage={{ month: "2026-11", usedTokens: 50_000, limit: 50_000, remaining: 0, exhausted: true, features: [{ feature: "mito", requests: 12, totalTokens: 50_000 }] }} />);
    expect(screen.getByText(/allowance is used up/)).toBeInTheDocument();
    expect(screen.getByText(/Mito \(students\)/)).toBeInTheDocument();
  });

  it("says so when the plan has no AI limit", () => {
    render(<AiAllowancePanel onRefresh={() => {}} usage={{ month: "2026-11", usedTokens: 1_200, limit: null, remaining: null, exhausted: false, features: [] }} />);
    expect(screen.getByText(/no monthly AI limit/)).toBeInTheDocument();
  });
});
