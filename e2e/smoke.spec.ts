import { expect, test } from "@playwright/test";

test("placeholder screen renders in the browser", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cadence" })).toBeVisible();
  await expect(page.getByTestId("platform")).toHaveText("web");
});
