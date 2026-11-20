import { expect, test } from "@playwright/test";
import { ensureVerifiedUser, seedMembership } from "./emulator-user";

test("home names Magemai and the emulator project", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Home · Magemai");
  await expect(page.getByRole("heading", { name: "Magemai" })).toBeVisible();
  await expect(page.getByText("Your business. Your own space.").first()).toBeVisible();
  await expect(page.getByText("A Mavixas product").first()).toBeVisible();
  await expect(page.getByText("demo-magemai")).toBeVisible();
  await expect(page.getByText(/not yet implemented/i).first()).toBeVisible();
  await expect(page.getByText(/Auth emulator is reachable at 127\.0\.0\.1:9099/)).toBeVisible();
});

test("sign-in and registration forms are available", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle("Sign in · Magemai");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeVisible();
});

test("admin shell marks future sections coming soon", async ({ page }, testInfo) => {
  const email = `shell.${testInfo.project.name}@example.test`;
  const uid = await ensureVerifiedUser(email, "emupass-not-for-live", "Shell User");
  await seedMembership({
    uid,
    email,
    businessId: `shell-${testInfo.project.name}`,
    name: `Shell ${testInfo.project.name}`,
    slug: `shell-${testInfo.project.name}`,
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("emupass-not-for-live");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page).toHaveTitle("Dashboard · Magemai");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const open = page.getByTestId("open-sidebar");
  if (testInfo.project.name === "desktop") {
    await expect(open).toBeHidden();
  } else {
    await expect(open).toBeVisible();
    await open.click();
  }
  const sidebar = page.getByTestId("app-sidebar");
  await expect(sidebar.getByRole("button", { name: /Services/ })).toBeDisabled();
  await expect(sidebar.getByRole("link", { name: "Services" })).toHaveCount(0);
  await expect(sidebar.getByRole("button", { name: /Reports/ })).toBeDisabled();
  await expect(page.getByTestId("active-business-name")).toHaveText(
    `Shell ${testInfo.project.name}`,
  );
  await expect(page.getByText("No activity yet")).toBeVisible();
  if (testInfo.project.name === "desktop" || testInfo.project.name === "mobile") {
    await page.screenshot({
      path: testInfo.outputPath(`app-shell-${testInfo.project.name}.png`),
      fullPage: true,
    });
  }
});

test("design system preview shows the shared components", async ({ page }, testInfo) => {
  await page.goto("/design-system");
  await expect(page).toHaveTitle("Design system · Magemai");
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Services/ })).toBeDisabled();
  await expect(page.getByRole("status")).toBeVisible();
  if (testInfo.project.name === "desktop" || testInfo.project.name === "mobile") {
    await page.screenshot({
      path: testInfo.outputPath(`design-system-${testInfo.project.name}.png`),
      fullPage: true,
    });
  }
});
