import { expect, test } from "@playwright/test";

test("capture an idea, see it under Today, filter by status", async ({ page }) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Ten tips for calmer planning");
  await box.press("Enter");
  const today = page.getByTestId("group-today");
  await expect(today.getByText("Ten tips for calmer planning")).toBeVisible();

  await page.getByRole("button", { name: "Planned" }).click();
  await expect(page.getByText("Ten tips for calmer planning")).toHaveCount(0);
  await page.getByRole("button", { name: "Draft" }).click();
  await expect(today.getByText("Ten tips for calmer planning")).toBeVisible();
  await page.screenshot({ path: "test-results/ideas.png" });
});
