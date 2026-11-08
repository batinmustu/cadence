import { expect, test } from "@playwright/test";
import { closeSettings, openSettings } from "./helpers";

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

test("schedule a variant and mark it as published", async ({ page }) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Publish me");
  await box.press("Enter");
  await page.getByRole("link", { name: "Publish me" }).click();
  await page.getByRole("button", { name: "Add variant" }).click();
  await page.getByRole("menuitem", { name: "X · Post" }).click();

  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await page.getByLabel("Date").fill("2030-01-15");
  await page.getByLabel("Time").fill("09:30");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Planned for 2030-01-15 09:30")).toBeVisible();

  await page.getByRole("button", { name: "Mark as published" }).click();
  await page.getByLabel("Post URL").fill("https://example.com/p/1");
  await page.getByRole("button", { name: "Mark as published" }).last().click();
  await expect(page.getByText(/^Published \d{4}-/)).toBeVisible();
});

test("assistant panel is hidden until AI is connected, then appears without reload", async ({
  page,
}) => {
  await page.goto("/ideas");
  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Needs AI");
  await box.press("Enter");
  await page.getByRole("link", { name: "Needs AI" }).click();
  await page.getByRole("button", { name: "Add variant" }).click();
  await page.getByRole("menuitem", { name: "X · Thread" }).click();
  await expect(page.getByRole("region", { name: "Assistant" })).toHaveCount(0);
  await page
    .getByRole("complementary")
    .getByRole("button", { name: /AI not connected/ })
    .click();
  await expect(page.getByRole("dialog").getByLabel("API key")).toBeVisible();
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByRole("button", { name: "Remove key" })).toBeVisible();
  await closeSettings(page);
  await expect(page.getByRole("region", { name: "Assistant" })).toBeVisible();
});

test("assistant panel: run a command and use the result", async ({ page }) => {
  // Connect a (mock) provider first; the key is write-only.
  await page.goto("/ideas");
  await openSettings(page, "AI");
  await page.getByLabel("API key").fill("sk-test");
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByRole("button", { name: "Remove key" })).toBeVisible();
  await closeSettings(page);
  await page.getByRole("complementary").getByRole("link", { name: "Ideas" }).click();

  const box = page.getByRole("textbox", { name: "New idea" });
  await box.fill("Assist me");
  await box.press("Enter");
  await page.getByRole("link", { name: "Assist me" }).click();
  await page.getByRole("button", { name: "Add variant" }).click();
  await page.getByRole("menuitem", { name: "X · Post" }).click();

  const panel = page.getByRole("region", { name: "Assistant" });
  await panel.getByRole("button", { name: "Shorten" }).click();
  await expect(panel.getByText("Mock AI response.")).toBeVisible();
  await panel.getByRole("button", { name: "Replace" }).click();
  await expect(page.getByRole("textbox", { name: "text part 1" })).toHaveValue("Mock AI response.");
  await page.screenshot({ path: "test-results/assistant.png" });
});
