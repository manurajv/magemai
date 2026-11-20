import { expect, test, type Page } from "@playwright/test";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const stamp = Date.now();
const email = `e2e+${stamp}@e2e.magemai.test`;
const displayName = `E2E ${stamp}`;
const password = `E2e-live-${stamp}-pass`;

function liveAdmin() {
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Unset the emulator hosts before npm run test:e2e:live.");
  }
  const app =
    getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: "magemai" });
  return { auth: getAuth(app), db: getFirestore(app) };
}

async function fillBusiness(page: Page, name: string, slug: string) {
  await page.goto("/business/register");
  await expect(page.getByRole("heading", { name: "Create a business" })).toBeVisible();
  const yourName = page.getByLabel("Your name");
  if (await yourName.isVisible()) await yourName.fill(displayName);
  const businessName = page.getByLabel("Business name");
  await businessName.fill(name);
  await businessName.blur();
  const address = page.getByLabel("Magemai booking link");
  await expect(address).not.toHaveValue("");
  await expect(page.getByText("This is not your own website.")).toBeVisible();
  await address.fill(slug);
  await expect(address).toHaveValue(slug);
  await expect(page.getByText(`https://magemai.web.app/business/${slug}`)).toBeVisible();
  await address.blur();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Contact email").fill(email);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Address line 1").fill("1 Galle Road");
  await page.getByRole("textbox", { name: "City", exact: true }).fill("Colombo");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Create business" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("creates a synthetic business on the live project", async ({ page }) => {
  const admin = liveAdmin();
  const settings = await admin.db.doc("platformSettings/global").get();
  if (!settings.exists) {
    throw new Error("Run npm run seed:platform-settings before npm run test:e2e:live.");
  }
  await page.goto("/register");
  await page.getByLabel("Your name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  const user = await admin.auth.getUserByEmail(email);
  expect(user.displayName?.startsWith("E2E ")).toBe(true);
  await admin.auth.updateUser(user.uid, { emailVerified: true });
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await fillBusiness(page, `${displayName} Studio`, `e2e-${stamp}`);
  const active = await page.evaluate(() => localStorage.getItem("magemai.activeBusinessId"));
  expect(active).toBeTruthy();
});
