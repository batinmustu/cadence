import { expect, test } from "@playwright/test";

test("app shell renders sidebar and routes", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ideas$/);
  await expect(page.getByRole("heading", { name: "Ideas" })).toBeVisible();
  await page.getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(page.getByTestId("calendar-day")).toHaveCount(42);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings\/ai$/);
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

test("settings: add a platform with a content type and use it in the editor", async ({ page }) => {
  await page.goto("/settings/platforms");
  await page.getByLabel("New platform").fill("Blog");
  await page.getByLabel("New platform").press("Enter");
  await page.getByRole("button", { name: "Add content type" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Article");
  await page.getByLabel("Kind of new field").selectOption("longtext");
  await page.getByRole("button", { name: "Add field" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Article", { exact: true })).toBeVisible();

  await page.getByRole("complementary").getByRole("link", { name: "Ideas" }).click();
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Blog idea");
  await box.press("Enter");
  await page.getByRole("link", { name: "Blog idea" }).click();
  await page.getByRole("button", { name: "Add variant" }).click();
  await expect(page.getByRole("menuitem", { name: "Blog · Article" })).toBeVisible();
});
