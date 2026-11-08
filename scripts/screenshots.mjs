// Generates README screenshots from browser mode with demo data.
// Usage: pnpm screenshots  (starts its own dev server on port 1421)
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const PORT = 1421;
const base = `http://localhost:${PORT}`;
const server = spawn("pnpm", ["exec", "vite", "--port", String(PORT), "--strictPort"], {
  env: { ...process.env, VITE_SKIP_ONBOARDING: "1" },
  stdio: "ignore",
});

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("dev server did not start");
}

const ideas = [
  "Why I plan a week of posts in one sitting",
  "Thread: five habits of a calm content routine",
  "Video: my Sunday planning setup",
  "Behind the scenes of a small project",
];

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  await page.goto(`${base}/ideas`);
  const box = page.getByRole("textbox", { name: "New idea" });
  for (const title of ideas) {
    await box.fill(title);
    await box.press("Enter");
  }
  await page.getByRole("link", { name: ideas[0] }).waitFor();
  await page.screenshot({ path: "docs/screenshots/ideas.png" });

  await page.getByRole("link", { name: ideas[1] }).click();
  await page.getByRole("textbox", { name: "Title" }).waitFor();
  await page.screenshot({ path: "docs/screenshots/editor.png" });

  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await page.getByTestId("calendar-day").first().waitFor();
  await page.screenshot({ path: "docs/screenshots/calendar.png" });
  await browser.close();
} finally {
  server.kill();
}
