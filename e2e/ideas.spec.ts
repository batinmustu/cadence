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

test("filters combine, live in the URL and can be cleared; groups collapse", async ({ page }) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  for (const title of ["Alpha plan", "Beta plan", "Gamma note"]) {
    await box.fill(title);
    await box.press("Enter");
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  }
  await page.getByRole("textbox", { name: "Search ideas" }).fill("plan");
  await expect(page).toHaveURL(/q=plan/);
  await expect(page.getByRole("link", { name: "Gamma note" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /^All 2$/ })).toBeVisible();

  await page.getByRole("combobox", { name: "Sort" }).click();
  await page.getByRole("option", { name: "Oldest" }).click();
  await expect(page).toHaveURL(/sort=oldest/);
  const titles = await page.getByTestId("group-today").getByRole("link").allTextContents();
  expect(titles).toEqual(["Alpha plan", "Beta plan"]);

  // Leaving and coming back through history keeps the filters (the browser DB is in memory).
  await page.getByRole("complementary").getByRole("link", { name: "Calendar" }).click();
  await page.goBack();
  await expect(page.getByRole("textbox", { name: "Search ideas" })).toHaveValue("plan");

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByRole("link", { name: "Gamma note" })).toBeVisible();

  const header = page.getByTestId("group-today").getByRole("button", { name: /Today/ });
  await header.click();
  await expect(page.getByRole("link", { name: "Gamma note" })).toBeHidden();
  await header.click();
  await expect(page.getByRole("link", { name: "Gamma note" })).toBeVisible();
});
