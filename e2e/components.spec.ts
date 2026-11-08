import { expect, test } from "@playwright/test";

test("component gallery renders all components", async ({ page }) => {
  await page.goto("/__components");
  await expect(page.getByRole("heading", { name: "Components" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Primary" })).toBeVisible();
  await page.getByRole("radio", { name: "Draft" }).click();
  await expect(page.getByRole("radio", { name: "Draft" })).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: "test-results/components.png" });
});
