import type { Page } from "@playwright/test";

/** Opens the settings dialog from the sidebar and switches to a section. */
export async function openSettings(page: Page, section: string): Promise<void> {
  await page.getByRole("complementary").getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog").getByRole("button", { name: section, exact: true }).click();
}

export async function closeSettings(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
}
