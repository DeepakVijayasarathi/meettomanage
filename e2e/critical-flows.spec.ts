import { expect, test, type Page, type Route } from "@playwright/test";

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const API_REQUEST = /^https?:\/\/[^/]+\/(?:t\/[a-z0-9-]+\/)?api\//;

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.error(`[browser error] ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") console.error(`[browser console] ${message.text()}`);
  });
});

async function defaultApi(page: Page) {
  await page.route(API_REQUEST, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/api/settings/public")) return json(route, []);
    if (path.endsWith("/api/store/departments")) return json(route, []);
    if (path.endsWith("/api/platform/public/status")) return json(route, { services: [], incidents: [] });
    return json(route, []);
  });
}

test("tenant login scopes the request and stores the resolved tenant", async ({ page }) => {
  let loginPath = "";
  await page.route(API_REQUEST, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/api/settings/public")) return json(route, []);
    if (path.endsWith("/api/auth/login")) {
      loginPath = path;
      return json(route, {
        tenantCode: "academy-one",
        accessToken: "e2e-token",
        expiresAtUtc: "2099-01-01T00:00:00Z",
        user: {
          id: "parent-1", email: "parent@academy.test", firstName: "Priya", lastName: "Rao",
          fullName: "Priya Rao", phone: null, role: "Parent", status: "Active",
          timeZoneId: "Asia/Calcutta", departmentId: null, departmentName: null,
          roleDefinitionId: null, createdAtUtc: "2026-01-01T00:00:00Z", lastLoginAtUtc: null,
        },
        permissions: [], defaultRoute: "/parent",
      });
    }
    return json(route, []);
  });

  await page.goto("/t/academy-one/login");
  await page.getByLabel("Email or Mobile Number").fill("parent@academy.test");
  await page.getByLabel("PIN", { exact: true }).fill("1234");
  await page.getByRole("button", { name: /Sign In/i }).click();

  await expect(page).toHaveURL(/\/t\/academy-one\/parent$/);
  expect(loginPath).toBe("/t/academy-one/api/auth/login");
  expect(await page.evaluate(() => localStorage.getItem("trn.tenantCode"))).toBe("academy-one");
});

test("a remembered tenant session cannot render inside another tenant portal", async ({ page }) => {
  await defaultApi(page);
  await page.addInitScript(() => {
    localStorage.setItem("trn.tenantCode", "academy-one");
    localStorage.setItem("trn.role", "parent");
    localStorage.setItem("trn.accessToken", "tenant-one-token");
    localStorage.setItem("trn.homePath", "/parent");
  });

  await page.goto("/t/academy-two/parent");
  await expect(page).toHaveURL(/\/t\/academy-two\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("trn.accessToken"))).toBeNull();
});

test("visitor books a real available demo slot", async ({ page }) => {
  const slot = new Date(Date.now() + 3 * 86_400_000);
  slot.setHours(10, 30, 0, 0);
  const day = slot.toISOString().slice(0, 10);
  let booking: Record<string, unknown> | null = null;

  await page.route(API_REQUEST, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/api/settings/public") || path.endsWith("/api/store/departments")) return json(route, []);
    if (path.endsWith("/api/store/demo-availability")) return json(route, [{ startAtUtc: slot.toISOString(), endAtUtc: new Date(slot.getTime() + 1_800_000).toISOString() }]);
    if (path.endsWith("/api/store/demo-bookings")) {
      booking = route.request().postDataJSON();
      return json(route, { id: "demo-1", scheduledStartAtUtc: slot.toISOString(), scheduledEndAtUtc: new Date(slot.getTime() + 1_800_000).toISOString() });
    }
    return json(route, []);
  });

  await page.goto("/demo");
  await page.getByLabel("Your name").fill("Priya Kapoor");
  await page.getByLabel("Email", { exact: true }).fill("priya@example.test");
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByLabel("Child's name").fill("Aarav");
  await page.locator("#demoDate").fill(day);
  await page.getByRole("group", { name: "Available times" }).getByRole("button").click();
  await page.getByRole("button", { name: "Book Demo" }).click();

  await expect(page.getByRole("heading", { name: "Demo booked!" })).toBeVisible();
  expect(booking).toMatchObject({ parentName: "Priya Kapoor", parentPhone: "9876543210", childName: "Aarav" });
});

test("payment cannot start before terms acceptance", async ({ page }) => {
  let startBody: unknown;
  await page.route(API_REQUEST, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/api/settings/public")) return json(route, []);
    if (path.endsWith("/api/public/admission-payments/secure-token/start")) {
      startBody = route.request().postDataJSON();
      return json(route, { url: "/status" });
    }
    if (path.endsWith("/api/public/admission-payments/secure-token")) return json(route, {
      parentName: "Priya", childName: "Aarav", courseName: "Phonics", currency: "INR",
      amount: 2500, amountPaid: 0, isPaid: false, termsRequired: true, termsText: "Cancellation policy",
    });
    return json(route, []);
  });

  await page.goto("/pay/secure-token");
  const pay = page.getByRole("button", { name: "Pay now" });
  await expect(pay).toBeDisabled();
  await page.getByRole("checkbox", { name: /accepted the Terms/i }).click();
  await expect(pay).toBeEnabled();
  await pay.click();
  await expect.poll(() => startBody).toEqual({ termsAccepted: true });
});
