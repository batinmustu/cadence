import { expect, test } from "@playwright/test";

test("app shell renders sidebar and routes", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ideas$/);
  await expect(page.getByRole("heading", { name: "Ideas" })).toBeVisible();
  await page.getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.screenshot({ path: "test-results/shell.png" });
});

test("sidebar collapses and toggles with the shortcut", async ({ page }) => {
  await page.goto("/ideas");
  await page.getByRole("button", { name: "Hide sidebar" }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await page.getByRole("button", { name: "Show sidebar" }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await page.keyboard.press("Control+b");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
});
