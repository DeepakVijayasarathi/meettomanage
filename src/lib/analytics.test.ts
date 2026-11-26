import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserCountry, marketingAttribution } from "./analytics";

describe("marketingAttribution", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
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

  it.each([
    ["?gclid=paid-click", "google", "cpc"],
    ["?fbclid=paid-click", "meta", "paid-social"],
    ["?msclkid=paid-click", "bing", "cpc"],
  ])("classifies paid click identifiers even when UTM tags are missing", (search, source, medium) => {
    at(search);
    expect(marketingAttribution()).toMatchObject({ utmSource: source, utmMedium: medium });
  });

  it("retains first-touch campaign attribution across browser sessions", () => {
    at("?utm_source=linkedin&utm_medium=paid-social&utm_campaign=owners");
    marketingAttribution();
    sessionStorage.clear();
    at("");
    expect(marketingAttribution()).toMatchObject({
      utmSource: "linkedin",
      utmMedium: "paid-social",
      utmCampaign: "owners",
    });
  });

  function stubTimeZone(timeZone: string) {
    // Vitest 5 spies must wrap the real constructor; restore a previous zone spy before
    // installing the next one in the same test.
    vi.restoreAllMocks();
    const real = Intl.DateTimeFormat;
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(((...args: ConstructorParameters<typeof Intl.DateTimeFormat>) => {
      const f = new real(...args);
      const options = f.resolvedOptions();
      f.resolvedOptions = () => ({ ...options, timeZone });
      return f;
    }) as unknown as typeof Intl.DateTimeFormat);
  }

  it("reports the country from the browser's time zone, not its language, without an IP address", () => {
    // An Indian browser set to US English used to be counted as a US visitor.
    vi.stubGlobal("navigator", { ...navigator, language: "en-US" });
    stubTimeZone("Asia/Calcutta");
    expect(browserCountry()).toBe("IN");
    stubTimeZone("Europe/London");
    expect(browserCountry()).toBe("GB");
    vi.restoreAllMocks();
  });

  it("falls back to the language's region when the time zone names no country", () => {
    vi.stubGlobal("navigator", { ...navigator, language: "en-IN" });
    stubTimeZone("UTC");
    expect(browserCountry()).toBe("IN");
    vi.restoreAllMocks();
  });
});
