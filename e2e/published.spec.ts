import { expect, test } from "@playwright/test";

test("publish an idea from the editor and see it on the Published screen", async ({ page }) => {
  await page.goto("/published");
  await expect(page.getByText("Nothing published yet.")).toBeVisible();

  await page.getByRole("complementary").getByRole("link", { name: "Ideas" }).click();
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Shipped idea");
  await box.press("Enter");
  await page.getByRole("link", { name: "Shipped idea" }).click();
  await page.getByRole("button", { name: "Add variant" }).click();
  await page.getByRole("menuitem", { name: "X · Thread" }).click();
  await page.getByRole("button", { name: "Mark as published" }).click();
  await page.getByRole("button", { name: "Mark as published" }).last().click();
  await expect(page.getByText(/^Published \d{4}-/)).toBeVisible();

  await page.getByRole("complementary").getByRole("link", { name: "Published" }).click();
  const row = page.getByRole("link", { name: "Shipped idea" });
  await expect(row).toBeVisible();
  await expect(page.getByText("X", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mark Shipped idea as not published" }).click();
  await expect(row).toHaveCount(0);
  await expect(page.getByText("Nothing published yet.")).toBeVisible();
});
