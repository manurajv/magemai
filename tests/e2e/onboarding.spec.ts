import { expect, test, type Page } from "@playwright/test";
import { getFirestore } from "firebase-admin/firestore";
import { ensureVerifiedUser, seedPlatformSettings } from "./emulator-user";

const password = "emupass-not-for-live";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function createBusiness(page: Page, name: string, slug: string) {
  await page.goto("/business/register");
  await expect(page.getByRole("heading", { name: "Create a business" })).toBeVisible();
  const yourName = page.getByLabel("Your name");
  if (await yourName.isVisible()) await yourName.fill("E2E Owner");
  const businessName = page.getByLabel("Business name");
  await businessName.fill(name);
  await businessName.blur();
  const address = page.getByLabel("Web address");
  await expect(address).not.toHaveValue("");
  await address.fill(slug);
  await expect(address).toHaveValue(slug);
  await address.blur();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Contact email").fill("studio@example.test");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Address line 1").fill("1 Galle Road");
  await page.getByRole("textbox", { name: "City", exact: true }).fill("Colombo");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel("Currency")).toHaveValue("LKR");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("No logo selected.")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(slug)).toBeVisible();
  await page.screenshot({ path: "test-results/onboarding-review-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Create business" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("a verified person can create two businesses", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Onboarding runs once on desktop.");
  test.setTimeout(120_000);
  await seedPlatformSettings();
  const email = "onboarding.owner@example.test";
  const uid = await ensureVerifiedUser(email, password, "Member");
  await signIn(page, email);
  await createBusiness(page, "E2E Studio", "e2e-studio");
  const first = await page.evaluate(() => localStorage.getItem("magemai.activeBusinessId"));
  expect(first).toBeTruthy();
  await createBusiness(page, "E2E Studio Two", "e2e-studio-two");
  const second = await page.evaluate(() => localStorage.getItem("magemai.activeBusinessId"));
  expect(second).toBeTruthy();
  expect(second).not.toBe(first);
  const members = await getFirestore()
    .collection("businessMembers")
    .where("userId", "==", uid)
    .get();
  const owned = members.docs.filter((member) => member.get("role") === "owner");
  expect(owned).toHaveLength(2);
});
