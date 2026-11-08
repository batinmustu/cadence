import { expect, test } from "@playwright/test";

const cursorOf = (el: import("@playwright/test").Locator) =>
  el.evaluate((n) => getComputedStyle(n).cursor);

test("clickable elements show a pointer cursor, text fields keep the text cursor", async ({
  page,
}) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Cursor check idea");
  await box.press("Enter");
  await expect(page.getByText("Cursor check idea")).toBeVisible();

  expect(await cursorOf(page.getByRole("link", { name: "Calendar" }).first())).toBe("pointer");
  expect(await cursorOf(page.getByRole("radio", { name: "Draft" }))).toBe("pointer");
  expect(await cursorOf(page.getByRole("button", { name: "Save idea" }))).not.toBe("default");
  expect(await cursorOf(page.getByText("Cursor check idea"))).toBe("pointer");
  expect(await cursorOf(box)).toBe("text");
});
