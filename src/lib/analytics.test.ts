import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { marketingAttribution } from "./analytics";

describe("marketingAttribution", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function at(search: string) {
    vi.stubGlobal("location", { ...window.location, search, host: "meettomanage.cloud" });
  }

  it("reads and stores campaign tags from the landing URL", () => {
    at("?utm_source=google&utm_medium=cpc&utm_campaign=october-demo");

    expect(marketingAttribution()).toMatchObject({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "october-demo",
    });
  });

  it("retains landing attribution after SPA navigation removes the query string", () => {
    at("?utm_source=linkedin&utm_campaign=academy-owners");
    marketingAttribution();
    at("");

    expect(marketingAttribution()).toMatchObject({
      utmSource: "linkedin",
      utmCampaign: "academy-owners",
    });
  });

  it("does not fail when stored attribution is invalid", () => {
    sessionStorage.setItem("mtm.marketingAttribution", "not-json");
    at("");

    expect(marketingAttribution()).toEqual({});
  });
});
