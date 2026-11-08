import { expect, test } from "@playwright/test";

test("component gallery renders all components", async ({ page }) => {
  await page.goto("/__components");
  await expect(page.getByRole("heading", { name: "Components" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Primary" })).toBeVisible();
  await page.getByRole("button", { name: "Draft" }).click();
  await expect(page.getByRole("button", { name: "Draft" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/components.png" });
});
