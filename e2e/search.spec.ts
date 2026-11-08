import { expect, test } from "@playwright/test";

test("⌘K opens search, finds an idea and opens it", async ({ page }) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Ten tips for calmer planning");
  await box.press("Enter");
  await expect(page.getByTestId("group-today").getByText("Ten tips")).toBeVisible();

  await page.keyboard.press("Control+k");
  const search = page.getByRole("combobox", { name: "Search" });
  await expect(search).toBeFocused();
  await search.fill("calmer");
  await page.getByRole("option", { name: "Ten tips for calmer planning" }).click();
  await expect(page).toHaveURL(/\/ideas\/.+/);

  await page.getByRole("button", { name: /Search/ }).click();
  await page.keyboard.press("Escape");
  await expect(search).toHaveCount(0);
});

test("shows an empty state when nothing matches", async ({ page }) => {
  await page.goto("/ideas");
  await page.getByRole("button", { name: /Search/ }).click();
  await page.getByRole("combobox", { name: "Search" }).fill("zzzzqqq");
  await expect(page.getByText("Nothing found")).toBeVisible();
});
