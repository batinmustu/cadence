import { expect, test } from "@playwright/test";

test("every screen uses the same content width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const widths: number[] = [];
  for (const path of ["/ideas", "/calendar"]) {
    await page.goto(path);
    const box = await page.locator("[data-slot=page-container]").boundingBox();
    widths.push(Math.round(box?.width ?? 0));
  }
  expect(new Set(widths).size).toBe(1);
  expect(widths[0]).toBeGreaterThan(0);
});
