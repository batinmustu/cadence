import { expect, test } from "@playwright/test";

test("calendar shows a month grid and navigates", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.getByTestId("calendar-day")).toHaveCount(42);
  const heading = page.getByRole("heading", { level: 1 });
  const before = await heading.textContent();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(heading).not.toHaveText(before ?? "");
  await page.getByRole("button", { name: "Today" }).click();
  await expect(heading).toHaveText(before ?? "");
  await page.screenshot({ path: "test-results/calendar.png" });
});
