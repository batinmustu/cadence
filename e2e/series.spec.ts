import { expect, test } from "@playwright/test";

test("create a series, see it in the sidebar, assign a captured idea", async ({ page }) => {
  await page.goto("/ideas");
  await page.getByRole("button", { name: "New series" }).click();
  const dialog = page.getByRole("dialog", { name: "New series" });
  await dialog.getByLabel("Name").fill("Sunday tips");
  await dialog.getByRole("button", { name: "Sun" }).click();
  await dialog.getByRole("button", { name: "Create series" }).click();

  const nav = page.getByRole("complementary");
  await expect(nav.getByRole("link", { name: /Sunday tips/ })).toContainText("Sun");

  // The browser database is in memory, so navigate inside the app instead of reloading.
  await nav.getByRole("link", { name: "Ideas" }).click();
  await page.getByLabel("Series", { exact: true }).click();
  await page.getByRole("option", { name: "Sunday tips" }).click();
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Plan the Sunday post");
  await box.press("Enter");
  await expect(page.getByTestId("group-today").getByText("Plan the Sunday post")).toBeVisible();
  await page.screenshot({ path: "test-results/series.png" });
});

test("AI draft fills an empty slot and opens the editor", async ({ page }) => {
  await page.goto("/settings/ai");
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByRole("button", { name: "Remove key" })).toBeVisible();

  const nav = page.getByRole("complementary");
  await nav.getByRole("button", { name: "New series" }).click();
  const dialog = page.getByRole("dialog", { name: "New series" });
  await dialog.getByLabel("Name").fill("Draft series");
  await dialog.getByRole("button", { name: "Sun" }).click();
  await dialog.getByRole("button", { name: "Create series" }).click();
  await nav.getByRole("link", { name: /Draft series/ }).click();

  await page.getByRole("button", { name: "AI draft" }).first().click();
  await expect(page).toHaveURL(/\/ideas\/.+/);
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue("Mock AI response.");
  await expect(page.getByText("#AI draft")).toBeVisible();
});
