import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 120000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "e2e/results.json" }]],
  use: {
    baseURL: "http://localhost:8081",
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        },
      },
    },
  ],
});
