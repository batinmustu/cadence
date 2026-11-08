import { expect, test } from "@playwright/test";

test("open an idea, rename it, add a variant", async ({ page }) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Editor idea");
  await box.press("Enter");
  await page.getByRole("link", { name: "Editor idea" }).click();
  await expect(page).toHaveURL(/\/ideas\/.+/);

  const title = page.getByRole("textbox", { name: "Title" });
  await title.fill("Renamed idea");
  await expect(page.getByRole("status")).toHaveText("Saved");

  await page.getByRole("button", { name: "Add variant" }).click();
  await page.getByRole("menuitem", { name: "X · Thread" }).click();
  await expect(page.getByRole("button", { name: "X · Thread" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("link", { name: "Back to ideas" }).click();
  await expect(page.getByRole("link", { name: "Renamed idea" })).toBeVisible();
});
