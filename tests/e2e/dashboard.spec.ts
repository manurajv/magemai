import { expect, test, type Page } from "@playwright/test";
import { ensureVerifiedUser, seedMembership, seedPlatformSettings } from "./emulator-user";

const password = "emupass-not-for-live";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.evaluate(() => localStorage.removeItem("magemai.activeBusinessId"));
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("the switcher changes the active business", async ({ page }, testInfo) => {
  const email = `switch.${testInfo.project.name}@example.test`;
  const uid = await ensureVerifiedUser(email, password, "Switcher");
  const older = `alpha-${testInfo.project.name}`;
  const newer = `beta-${testInfo.project.name}`;
  await seedMembership({
    uid,
    email,
    businessId: older,
    name: "Alpha Studio",
    slug: older,
    createdAtMs: Date.UTC(2026, 0, 1),
  });
  await seedMembership({
    uid,
    email,
    businessId: newer,
    name: "Beta Studio",
    slug: newer,
    createdAtMs: Date.UTC(2026, 1, 1),
  });
  await page.goto("/login");
  await page.evaluate((id) => localStorage.setItem("magemai.activeBusinessId", id), older);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("active-business-name")).toHaveText("Alpha Studio");
  await page.getByTestId("business-switcher").click();
  await page.getByRole("menuitem", { name: "Beta Studio, Owner" }).click();
  await expect(page.getByTestId("active-business-name")).toHaveText("Beta Studio");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("magemai.activeBusinessId")))
    .toBe(newer);
  await expect(page.getByText("Alpha Studio")).toHaveCount(0);
});

test("staff can read the profile and cannot open settings", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Role checks run once on desktop.");
  await seedPlatformSettings();
  const email = "staff.dashboard@example.test";
  const uid = await ensureVerifiedUser(email, password, "Staff");
  await seedMembership({
    uid,
    email,
    businessId: "staff-studio",
    name: "Staff Studio",
    slug: "staff-studio",
    role: "staff",
  });
  await signIn(page, email);
  await expect(page.getByTestId("active-business-name")).toHaveText("Staff Studio");
  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Settings unavailable" })).toBeVisible();
  await page.goto("/admin/profile");
  await expect(page.getByLabel("Business name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save profile" })).toHaveCount(0);
});

test("a suspended business stays visible and cannot be edited", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Suspension checks run once on desktop.");
  await seedPlatformSettings();
  const email = "suspended.dashboard@example.test";
  const uid = await ensureVerifiedUser(email, password, "Owner");
  await seedMembership({
    uid,
    email,
    businessId: "suspended-studio",
    name: "Suspended Studio",
    slug: "suspended-studio",
    status: "suspended",
  });
  await signIn(page, email);
  await expect(page.getByText("Editing is turned off.")).toBeVisible();
  await page.getByRole("link", { name: "Business profile" }).click();
  await expect(page.getByLabel("Business name")).toBeDisabled();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByLabel("Notification email")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save settings" })).toHaveCount(0);
});

test("an owner saves the business profile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Profile save runs once on desktop.");
  test.setTimeout(90_000);
  await seedPlatformSettings();
  const email = "profile.dashboard@example.test";
  const uid = await ensureVerifiedUser(email, password, "Owner");
  await seedMembership({
    uid,
    email,
    businessId: "profile-studio",
    name: "Profile Studio",
    slug: "profile-studio",
  });
  await signIn(page, email);
  await page.getByRole("link", { name: "Business profile" }).click();
  await expect(page.getByLabel("Business name")).toHaveValue("Profile Studio");
  await page.getByLabel("Business name").fill("Profile Studio Updated");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Business profile saved.");
  await page.goto("/admin");
  await expect(page.getByTestId("active-business-name")).toHaveText("Profile Studio Updated");
});
