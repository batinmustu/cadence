import { expect, test } from "@playwright/test";
import { closeSettings, openSettings } from "./helpers";

test("app shell renders sidebar and routes", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ideas$/);
  await expect(page.getByRole("heading", { name: "Ideas" })).toBeVisible();
  await page.getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(page.getByTestId("calendar-day")).toHaveCount(42);
  await page.screenshot({ path: "test-results/shell.png" });
});

test("settings open as a dialog over the current screen", async ({ page }) => {
  await page.goto("/calendar");
  await openSettings(page, "Platforms");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("New platform")).toBeVisible();
  await dialog.getByRole("button", { name: "Data", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Export all data" })).toBeVisible();
  await expect(page.getByTestId("calendar-day")).toHaveCount(42);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/calendar$/);
  // The last section is remembered.
  await page.getByRole("complementary").getByRole("button", { name: "Settings" }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Data", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("settings: add a platform with a content type and use it in the editor", async ({ page }) => {
  await page.goto("/ideas");
  await openSettings(page, "Platforms");
  await page.getByLabel("New platform").fill("Blog");
  await page.getByLabel("New platform").press("Enter");
  await page.getByRole("button", { name: "Add content type" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Article");
  await page.getByLabel("Kind of new field").click();
  await page.getByRole("option", { name: "Long text" }).click();
  await page.getByRole("button", { name: "Add field" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Article", { exact: true })).toBeVisible();
  await closeSettings(page);

  await page.getByRole("complementary").getByRole("link", { name: "Ideas" }).click();
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Blog idea");
  await box.press("Enter");
  await page.getByRole("link", { name: "Blog idea" }).click();
  await page.getByRole("button", { name: "Add variant" }).click();
  await expect(page.getByRole("menuitem", { name: "Blog · Article" })).toBeVisible();
});
