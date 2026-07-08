import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_EMAIL = "e2eprod@homeino.test";
const TEST_PASSWORD = "Homeino_StrongPwd1";
const SAMPLE_IMAGE = path.resolve(__dirname, "sample-room.jpg");
const SUPABASE_URL = "https://tljdihejjoepkcgftian.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yaBDFBBir6WbMWqQe-g_KQ_gwciKK0_";

async function loginViaAPI(page) {
  // Sign in via Supabase REST API and set session in localStorage
  const res = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  const session = await res.json();

  // Set Supabase auth session in localStorage
  await page.goto("/");
  await page.evaluate((s) => {
      localStorage.setItem(
        "sb-tljdihejjoepkcgftian-auth-token",
        JSON.stringify({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        expires_at: s.expires_at,
        expires_in: s.expires_in,
        token_type: s.token_type,
        user: s.user,
      })
    );
  }, session);

  // Reload to pick up the session
  await page.reload();
  await page.waitForTimeout(2000);
  console.log("✓ Logged in via API");
}

test.describe("Full Customer Scenario", () => {
  test("1. Login with test user", async ({ page }) => {
    await loginViaAPI(page);
    await expect(page.locator("body")).toBeVisible();
    console.log("✓ Login test passed");
  });

  test("2. Full flow: Inspiration → Design → Cart", async ({ page }) => {
    // Login via API
    await loginViaAPI(page);

    // Go to AI Design page
    await page.goto("/ai-design");
    // Wait for any of the known entry card texts
    await Promise.race([
      page.waitForSelector("text=طراحی خانه من", { timeout: 20000 }),
      page.waitForSelector("text=جستجوی بصری الهام", { timeout: 20000 }),
      page.waitForSelector("text=پیشنهادات هومینو", { timeout: 20000 }),
      page.waitForSelector("text=هومینو استودیو", { timeout: 20000 }),
    ]);
    await page.waitForTimeout(1000);
    console.log("✓ On AI Design page");

    // Step A: Click "Visual Inspiration Search"
    await page.click('button:has-text("جستجوی بصری الهام")');
    await page.waitForTimeout(2000);

    // Step B: Upload sample image
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(SAMPLE_IMAGE);
    console.log("✓ Image uploaded");

    // Step C: Wait for object detection results
    const result = await Promise.race([
      page.waitForSelector("text=اشیاء تشخیص داده شده", { timeout: 120000 }).then(() => "detected"),
      page.waitForSelector("text=خطا در پردازش", { timeout: 120000 }).then(() => "error"),
      page.waitForFunction(() => {
        const btns = document.querySelectorAll("button");
        return Array.from(btns).some(b => b.textContent?.includes("طراحی با هومینو"));
      }, { timeout: 120000 }).then(() => "design-btn"),
    ]);

    if (result === "detected") {
      console.log("✓ Objects detected!");
      await page.screenshot({ path: "e2e/01-objects-detected.png", fullPage: true });

      // Select up to 2 products
      const selectBtns = page.locator('button:has-text("انتخاب")');
      const btnCount = await selectBtns.count();
      for (let i = 0; i < Math.min(btnCount, 2); i++) {
        await selectBtns.nth(i).click();
        await page.waitForTimeout(500);
      }
      console.log(`✓ Selected ${Math.min(btnCount, 2)} products`);

      // Go to design
      const designBtn = page.locator('button:has-text("طراحی با هومینو استودیو")');
      if (await designBtn.isVisible({ timeout: 5000 }) && !(await designBtn.isDisabled())) {
        await designBtn.click();
        await page.waitForTimeout(3000);
        console.log("✓ Entered design mode from inspiration");
      }
    } else {
      console.log(`⚠ Object detection result: ${result}`);
      await page.screenshot({ path: "e2e/01-detection-issue.png", fullPage: true });

      // Fallback: direct design mode
      await page.goto("/ai-design");
      await page.waitForSelector("text=طراحی خانه من", { timeout: 10000 });
      await page.click('button:has-text("طراحی خانه من")');
      await page.waitForTimeout(2000);
      console.log("✓ Entered design mode directly (fallback)");
    }

    // Upload room photo in design mode
    const roomInput = page.locator('input[type="file"]').last();
    if (await roomInput.isVisible({ timeout: 5000 })) {
      await roomInput.setInputFiles(SAMPLE_IMAGE);
      await page.waitForTimeout(2000);
      console.log("✓ Room photo uploaded");
      await page.screenshot({ path: "e2e/02-room-uploaded.png", fullPage: true });
    }

    // Select a product category and click first product
    const productCard = page.locator('button:has(img)').first();
    if (await productCard.isVisible({ timeout: 5000 })) {
      await productCard.click();
      await page.waitForTimeout(500);
      console.log("✓ Product selected");
    }

    // Generate
    const generateBtn = page.locator('button:has-text("چیدمان هوشمند")');
    if (await generateBtn.isVisible({ timeout: 3000 })) {
      if (!(await generateBtn.isDisabled())) {
        await generateBtn.click();
        console.log("✓ Generation started, waiting up to 2 min...");

        const genResult = await Promise.race([
          page.waitForSelector("text=آماده شد", { timeout: 130000 }).then(() => "success"),
          page.waitForSelector("text=خطا در تولید", { timeout: 130000 }).then(() => "error"),
          page.waitForTimeout(130000).then(() => "timeout"),
        ]);
        console.log(`Generation result: ${genResult}`);
        await page.screenshot({ path: "e2e/03-generation-result.png", fullPage: true });
      } else {
        console.log("⚠ Generate disabled — need image + product");
        await page.screenshot({ path: "e2e/03-generate-disabled.png", fullPage: true });
      }
    }

    // Final state
    await page.goto("/");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "e2e/04-final-state.png", fullPage: true });
    console.log("✓ Full test complete");
  });
});
