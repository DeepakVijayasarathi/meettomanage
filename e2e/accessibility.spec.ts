import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const API_REQUEST = /^https?:\/\/[^/]+\/(?:t\/[a-z0-9-]+\/)?api\//;

for (const path of ["/", "/login", "/demo"]) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.route(API_REQUEST, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.goto(path);
    await page.locator("#root").waitFor({ state: "attached" });
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const severe = result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    expect(severe, severe.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`).join("\n")).toEqual([]);
  });
}
