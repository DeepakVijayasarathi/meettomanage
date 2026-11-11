import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingTranslationLayer } from "./MarketingTranslationLayer";

const { trackMarketingEvent } = vi.hoisted(() => ({ trackMarketingEvent: vi.fn() }));

vi.mock("@/lib/i18n", () => ({ useMarketingLocale: () => ["en"] }));
vi.mock("@/lib/analytics", () => ({ trackMarketingEvent }));

describe("MarketingTranslationLayer sales CTA tracking", () => {
  beforeEach(() => trackMarketingEvent.mockClear());

  it.each([
    ["/get-started", "sales-intent:demo"],
    ["/get-started?intent=call&from=pricing", "sales-intent:call"],
  ])("tracks %s once", (href, intent) => {
    render(<MarketingTranslationLayer><a href={href} onClick={(event) => event.preventDefault()}>Continue</a></MarketingTranslationLayer>);
    fireEvent.click(screen.getByRole("link"));
    expect(trackMarketingEvent).toHaveBeenCalledOnce();
    expect(trackMarketingEvent).toHaveBeenCalledWith("sales_cta_clicked", window.location.pathname, intent);
  });

  it("ignores unrelated and external links", () => {
    render(<MarketingTranslationLayer><><a href="/pricing" onClick={(event) => event.preventDefault()}>Pricing</a><a href="https://example.com/get-started" onClick={(event) => event.preventDefault()}>External</a></></MarketingTranslationLayer>);
    fireEvent.click(screen.getByText("Pricing"));
    fireEvent.click(screen.getByText("External"));
    expect(trackMarketingEvent).not.toHaveBeenCalled();
  });
});
