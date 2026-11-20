import { expect, test, type Page } from "@playwright/test";
import { latestOob, seedPlatformSettings } from "./emulator-user";

const password = "emupass-not-for-live";
const resetPassword = "emupass-reset-ok";

async function shot(page: Page, name: string, project: string) {
  if (project !== "desktop" && project !== "mobile") return;
  await page.screenshot({ path: `test-results/auth-${name}-${project}.png`, fullPage: true });
}

test("register, verify, profile, logout, and password reset", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90_000);
  await seedPlatformSettings();
  const project = testInfo.project.name;
  const email = `e2e.${project}@example.test`;

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await shot(page, "login", project);

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await shot(page, "register", project);
  await page.getByLabel("Your name").fill(`E2E ${project}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await shot(page, "verify-email", project);
  await page.getByRole("button", { name: "Resend email" }).click();
  await expect(page.getByRole("status")).toContainText("new verification message");
  await page.getByRole("button", { name: "I've verified" }).click();
  await expect(page.getByRole("status")).toContainText("not verified yet");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  await page.goto("/business/register");
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await page.goto("/super-admin");
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();

  const verifyCode = await latestOob(request, email, "VERIFY_EMAIL");
  await page.goto(`/auth/action?mode=verifyEmail&oobCode=${verifyCode}`);
  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(page.getByRole("status")).toContainText("Email verified");
  await page.goto("/verify-email");
  const onboarding = page.getByRole("heading", { name: "Create a business" });
  const refresh = page.getByRole("button", { name: "I've verified" });
  await expect(onboarding.or(refresh)).toBeVisible();
  if (await refresh.isVisible()) {
    await refresh.click({ timeout: 5_000 }).catch(() => undefined);
  }
  await expect(onboarding).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
  await page.getByLabel("Display name").fill(`E2E ${project} Updated`);
  await page.getByLabel("Phone").fill("+94771234567");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved.");
  await page.getByLabel("Profile photo").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.getByRole("status")).toContainText("Profile photo saved.");
  await expect(page.getByLabel("Display name")).toHaveValue(`E2E ${project} Updated`);
  await shot(page, "profile", project);

  await page.goto("/admin");
  await page.evaluate(() => localStorage.setItem("magemai.activeBusinessId", "stale-business"));
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("magemai.activeBusinessId")))
    .toBeNull();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Create a business" })).toBeVisible();
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
  await shot(page, "reset-password", project);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("reset message");
  const resetCode = await latestOob(request, email, "PASSWORD_RESET");
  await page.goto(`/auth/action?mode=resetPassword&oobCode=${resetCode}`);
  await page.getByLabel("New password").fill(resetPassword);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(resetPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Create a business" })).toBeVisible();
});

test("google sign-in completes through the auth emulator", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The emulator provider runs once on desktop.");
  const email = `google.${Date.now()}@example.test`;
  await page.goto("/login");
  const google = page.getByRole("button", { name: "Continue with Google" });
  await expect(google).toBeVisible();
  await google.click();
  await page.waitForURL(/127\.0\.0\.1:9099/, { timeout: 20_000 });
  await page.getByRole("button", { name: "Add new account" }).click();
  await page.locator("#email-input").fill(email);
  await page.locator("#sign-in").click();
  await page.waitForURL(/127\.0\.0\.1:5173/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Create a business" })).toBeVisible({
    timeout: 20_000,
  });
});
