import { expect, type Page, test } from "@playwright/test";
import { closeSettings, openSettings } from "./helpers";

// Walks the main screens in both languages and fails on console errors,
// unhandled rejections or raw translation keys showing up in the page.
function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  return problems;
}

const rawKey =
  /(^|\s)(nav|ideas|editor|series|calendar|settings|published|onboarding|search|delete|tags|assistant)\.[a-zA-Z.]+(\s|$)/;

for (const lang of ["English", "Türkçe"]) {
  test(`walkthrough has no console errors or raw keys (${lang})`, async ({ page }) => {
    const problems = watch(page);
    await page.goto("/ideas");
    if (lang !== "English") {
      await openSettings(page, "General");
      await page.getByLabel(/Language|Dil/).click();
      await page.getByRole("option", { name: lang }).click();
      await closeSettings(page);
    }
    const box = page.getByRole("textbox").first();
    await box.fill("Audit idea #audit");
    await box.press("Enter");
    await page.getByRole("link", { name: "Audit idea" }).click();
    await page
      .getByRole("main")
      .getByRole("button")
      .filter({ has: page.locator("svg.lucide-plus") })
      .first()
      .click();
    await page.getByRole("menuitem").first().click();
    for (const path of ["/ideas", "/calendar", "/published"]) {
      await page.goto(path);
      await page.waitForTimeout(150);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text.split("\n").filter((l) => rawKey.test(l))).toEqual([]);
    }
    // Every settings section, the search palette and the series dialog.
    await page.goto("/ideas");
    await page.getByRole("complementary").getByRole("button").last().click();
    const dialog = page.getByRole("dialog");
    for (const name of await dialog.getByRole("navigation").getByRole("button").allInnerTexts()) {
      await dialog.getByRole("navigation").getByRole("button", { name, exact: true }).click();
      await page.waitForTimeout(100);
      const text = await dialog.evaluate((el) => (el as HTMLElement).innerText);
      expect(text.split("\n").filter((l) => rawKey.test(l))).toEqual([]);
    }
    await closeSettings(page);
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    expect(problems).toEqual([]);
  });
}
