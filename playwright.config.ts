import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  webServer: {
    // The browser database is in-memory, so onboarding would cover every test page.
    command: "VITE_SKIP_ONBOARDING=1 pnpm dev",
    url: "http://localhost:1420",
    reuseExistingServer: true,
  },
  use: { baseURL: "http://localhost:1420" },
});
