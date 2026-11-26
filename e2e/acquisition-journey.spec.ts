import { expect, test } from "@playwright/test";

test("campaign landing to demo confirmation preserves attribution and WhatsApp fallback", async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;

  // This is a browser journey test, not a production lead: isolate analytics and CRM writes.
  await page.route("**/marketing/track", route => route.fulfill({ status: 204 }));
  await page.route("**/marketing/demo-requests", async route => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000001",
        fullName: submitted.fullName,
        workEmail: submitted.workEmail,
        phone: submitted.phone,
        academyName: submitted.academyName,
        message: null,
        status: "New",
        createdAtUtc: new Date().toISOString(),
      }),
    });
  });

  await page.goto("/get-started?utm_source=linkedin&utm_medium=paid-social&utm_campaign=academy-owners");
  const whatsApp = page.getByRole("link", { name: /prefer whatsapp/i });
  await expect(whatsApp).toHaveAttribute("href", /^https:\/\/wa\.me\/919344773231/);

  await page.getByLabel(/your name/i).fill("Journey Test");
  await page.getByLabel(/email or whatsapp number/i).fill("journey@example.test");
  await page.getByRole("button", { name: /book my free 30-minute demo/i }).click();

  await expect(page.getByRole("heading", { name: /thank/i })).toBeVisible();
  expect(submitted).toMatchObject({
    fullName: "Journey Test",
    workEmail: "journey@example.test",
    source: "linkedin",
    medium: "paid-social",
    campaign: "academy-owners",
    landingPath: "/get-started",
  });
  expect(String(submitted?.visitorId)).toMatch(/^[A-Za-z0-9-]{8,64}$/);
});
