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

test("schedule an idea from the calendar panel", async ({ page }) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Calendar idea");
  await box.press("Enter");
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await page.getByLabel("Choose an idea").selectOption({ label: "Calendar idea" });
  await page.getByRole("button", { name: "Choose date…" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Calendar idea" })).toBeVisible();
});
