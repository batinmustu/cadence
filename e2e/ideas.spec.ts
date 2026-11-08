import { expect, test } from "@playwright/test";

test("capture an idea, see it under Today, filter by status", async ({ page }) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Ten tips for calmer planning");
  await box.press("Enter");
  const today = page.getByTestId("group-today");
  await expect(today.getByText("Ten tips for calmer planning")).toBeVisible();

  await page.getByRole("radio", { name: "Planned" }).click();
  await expect(page.getByText("Ten tips for calmer planning")).toHaveCount(0);
  await page.getByRole("radio", { name: "Draft" }).click();
  await expect(today.getByText("Ten tips for calmer planning")).toBeVisible();
  await page.screenshot({ path: "test-results/ideas.png" });
});

test("capture footer keeps its layout when a platform is toggled", async ({ page }) => {
  await page.goto("/ideas");
  const footer = page.getByTestId("capture-footer");
  const measure = async () =>
    footer.locator("button, [role=combobox]").evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      }),
    );
  await expect(footer.getByRole("button", { name: "X", exact: true })).toBeVisible();
  const before = await measure();
  expect(before.length).toBeGreaterThan(2);
  // Toggles sit on one row, the submit button is the right-most element.
  expect(new Set(before.map((b) => b[1])).size).toBeLessThanOrEqual(2);
  await footer.getByRole("button", { name: "X", exact: true }).click();
  expect(await measure()).toEqual(before);
  await page.getByRole("textbox", { name: "New idea" }).focus();
  expect(await measure()).toEqual(before);
});
