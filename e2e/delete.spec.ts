import { expect, test } from "@playwright/test";

test("delete an idea from its row, with confirmation", async ({ page }) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Throwaway");
  await box.press("Enter");
  await expect(page.getByRole("link", { name: "Throwaway" })).toBeVisible();
  await page.getByRole("button", { name: "Delete idea Throwaway" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("link", { name: "Throwaway" })).toBeVisible();
  await page.getByRole("button", { name: "Delete idea Throwaway" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("link", { name: "Throwaway" })).toHaveCount(0);
});

test("Delete key on a focused idea asks to delete it; the editor can delete too", async ({
  page,
}) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Keyboard idea");
  await box.press("Enter");
  await page.getByRole("link", { name: "Keyboard idea" }).focus();
  await page.keyboard.press("Delete");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Keyboard idea" }).click();
  await page.getByRole("button", { name: "Delete idea", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/ideas$/);
  await expect(page.getByRole("link", { name: "Keyboard idea" })).toHaveCount(0);
});

test("delete a series from its settings panel", async ({ page }) => {
  await page.goto("/ideas");
  const nav = page.getByRole("complementary");
  await nav.getByRole("button", { name: "New series" }).click();
  await page.getByLabel("Name").fill("Short lived");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Short lived" })).toBeVisible();
  await page.getByRole("button", { name: "Delete series" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/ideas$/);
  await expect(nav.getByRole("link", { name: /Short lived/ })).toHaveCount(0);
});
