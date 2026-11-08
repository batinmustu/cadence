import { expect, test } from "@playwright/test";
import { closeSettings, openSettings } from "./helpers";

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
  await page.getByLabel("Choose an idea").click();
  await page.getByRole("option", { name: "Calendar idea" }).click();
  await page.getByRole("button", { name: "Choose date…" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Calendar idea" })).toBeVisible();
});

test("Fill with AI lists empty slots and creates nothing until confirmed", async ({ page }) => {
  await page.goto("/ideas");
  await openSettings(page, "AI");
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByRole("button", { name: "Remove key" })).toBeVisible();
  await closeSettings(page);

  const nav = page.getByRole("complementary");
  await nav.getByRole("button", { name: "New series" }).click();
  const dialog = page.getByRole("dialog", { name: "New series" });
  await dialog.getByLabel("Name").fill("Fill series");
  for (const day of ["Mon", "Wed", "Fri", "Sun"]) {
    await dialog.getByRole("button", { name: day, exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Create series" }).click();
  await nav.getByRole("link", { name: "Calendar" }).click();

  await page.getByRole("button", { name: "Fill with AI" }).click();
  const fill = page.getByRole("dialog", { name: "Fill empty slots with AI" });
  await fill.getByRole("checkbox").nth(1).uncheck();
  await fill.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Mock AI response.")).toHaveCount(0);

  await page.getByRole("button", { name: "Fill with AI" }).click();
  const again = page.getByRole("dialog", { name: "Fill empty slots with AI" });
  const total = await again.getByRole("checkbox").count();
  for (let i = 1; i < total; i++) await again.getByRole("checkbox").nth(i).uncheck();
  await again.getByRole("button", { name: "Create 1 draft" }).click();
  await expect(again).toBeHidden();
  await expect(page.getByText("Mock AI response.").first()).toBeVisible();
});

test("general settings: week start moves Sunday to the first column", async ({ page }) => {
  await page.goto("/ideas");
  await openSettings(page, "General");
  await page.getByLabel("Week starts on").click();
  await page.getByRole("option", { name: "Sunday" }).click();
  await closeSettings(page);
  await page.getByRole("complementary").getByRole("link", { name: "Calendar" }).click();
  const days = page.getByTestId("calendar-day");
  await expect(days).toHaveCount(42);
  const first = await days.first().getAttribute("data-date");
  expect(new Date(`${first}T00:00:00Z`).getUTCDay()).toBe(0);
});

test("schedule an idea from a day, move it by drag and by dialog, then unschedule it", async ({
  page,
}) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Dated idea");
  await box.press("Enter");
  await page.getByRole("link", { name: "Calendar", exact: true }).click();

  const days = page.getByTestId("calendar-day");
  const first = days.nth(10);
  const firstDate = (await first.getAttribute("data-date")) ?? "";
  // (b) click a day, pick an existing idea.
  await first.getByRole("button", { name: `Open ${firstDate}` }).click();
  await page.getByRole("dialog").getByLabel("Choose an idea").click();
  await page.getByRole("option", { name: "Dated idea" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Schedule" }).click();
  await expect(first.getByRole("link", { name: /Dated idea/ })).toBeVisible();

  // Drag the chip to another day.
  const second = days.nth(12);
  await first.getByRole("link", { name: /Dated idea/ }).dragTo(second);
  await expect(second.getByRole("link", { name: /Dated idea/ })).toBeVisible();
  await expect(first.getByRole("link", { name: /Dated idea/ })).toHaveCount(0);

  // Keyboard-friendly alternative: move with the date field in the day dialog.
  const secondDate = (await second.getAttribute("data-date")) ?? "";
  const third = days.nth(14);
  const thirdDate = (await third.getAttribute("data-date")) ?? "";
  await second.getByRole("button", { name: `Open ${secondDate}` }).click();
  await page
    .getByRole("dialog")
    .getByLabel(/Move Dated idea to/)
    .fill(thirdDate);
  await page.getByRole("dialog").getByRole("button", { name: "Move", exact: true }).click();
  await expect(third.getByRole("link", { name: /Dated idea/ })).toBeVisible();

  // Unschedule: back in the unscheduled list.
  await third.getByRole("button", { name: `Open ${thirdDate}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Unschedule" }).click();
  await expect(
    page.getByTestId("calendar-day").getByRole("link", { name: /Dated idea/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("complementary").getByText("Dated idea")).toBeVisible();
});
