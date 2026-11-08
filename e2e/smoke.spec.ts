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
