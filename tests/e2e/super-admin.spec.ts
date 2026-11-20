import { expect, test, type Page } from "@playwright/test";
import {
  ensureVerifiedUser,
  grantPlatformAdmin,
  revokePlatformRegistry,
  seedMembership,
  seedPlatformSettings,
} from "./emulator-user";

const password = "emupass-not-for-live";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.evaluate(() => localStorage.removeItem("magemai.activeBusinessId"));
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toHaveCount(0);
}

test("a normal user who opens platform admin sees 403", async ({ page }, testInfo) => {
  const email = `plain.${testInfo.project.name}@example.test`;
  const uid = await ensureVerifiedUser(email, password, "Plain");
  await seedMembership({
    uid,
    email,
    businessId: `plain-${testInfo.project.name}`,
    name: "Plain Studio",
    slug: `plain-${testInfo.project.name}`,
  });
  await signIn(page, email);
  await page.goto("/super-admin");
  await expect(page.getByTestId("platform-denied")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Platform access denied" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Users" })).toHaveCount(0);
});

test("a super-admin suspends a business and the owner sees the banner", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Platform actions run once on desktop.");
  test.setTimeout(90_000);
  await seedPlatformSettings();
  const ownerEmail = "owner.platform@example.test";
  const ownerId = await ensureVerifiedUser(ownerEmail, password, "Owner");
  await seedMembership({
    uid: ownerId,
    email: ownerEmail,
    businessId: "platform-studio",
    name: "Platform Studio",
    slug: "platform-studio",
  });
  const adminEmail = "admin.platform@example.test";
  const adminId = await ensureVerifiedUser(adminEmail, password, "Admin");
  await grantPlatformAdmin(adminId, adminEmail);

  await signIn(page, adminEmail);
  await page.goto("/super-admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("cell", { name: ownerEmail })).toBeVisible();
  await page.goto("/super-admin/businesses");
  await expect(page.getByRole("heading", { name: "Businesses" })).toBeVisible();
  const studio = page.getByRole("row", { name: /Platform Studio/ });
  await expect(studio).toBeVisible();
  await studio.getByRole("button", { name: "Suspend" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("status")).toContainText("Suspended the business.");
  await page.goto("/super-admin/audit-logs");
  await expect(page.getByRole("cell", { name: "Suspended the business." })).toBeVisible();
  await page.goto("/super-admin/settings");
  await expect(page.getByRole("heading", { name: "Platform settings" })).toBeVisible();
  await expect(page.getByText("Asia/Colombo")).toBeVisible();

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signIn(page, ownerEmail);
  await expect(page.getByText("Editing is turned off.")).toBeVisible();
  await page.getByRole("link", { name: "Business profile" }).click();
  await expect(page.getByLabel("Business name")).toBeDisabled();
});

test("a session from before the grant can check again", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The token refresh runs once on desktop.");
  const email = "late.grant@example.test";
  const uid = await ensureVerifiedUser(email, password, "Late");
  await seedMembership({
    uid,
    email,
    businessId: "late-studio",
    name: "Late Studio",
    slug: "late-studio",
  });
  await signIn(page, email);
  await page.goto("/super-admin");
  await expect(page.getByRole("heading", { name: "Platform access denied" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check again" })).toBeVisible();
  await expect(page.getByText(/sign out and sign back in/i)).toBeVisible();
  await grantPlatformAdmin(uid, email);
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(page.getByRole("heading", { name: "Platform" })).toBeVisible();
});

test("a revoked registry denies the user list while the token still has the claim", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Stale-token check runs once on desktop.");
  const email = "stale.platform@example.test";
  const uid = await ensureVerifiedUser(email, password, "Stale");
  await grantPlatformAdmin(uid, email);
  await signIn(page, email);
  await page.goto("/super-admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await revokePlatformRegistry(uid);
  await page.reload();
  await expect(page.getByTestId("platform-denied")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Platform access denied" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Users" })).toHaveCount(0);
});
