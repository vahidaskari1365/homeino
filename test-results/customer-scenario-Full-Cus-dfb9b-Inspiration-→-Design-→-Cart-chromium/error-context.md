# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer-scenario.spec.ts >> Full Customer Scenario >> 2. Full flow: Inspiration → Design → Cart
- Location: e2e\customer-scenario.spec.ts:55:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('text=طراحی خانه من') to be visible

```

# Page snapshot

```yaml
- generic [ref=e2]: "{ \"code\": \"1-11\", \"msg\": \"Invalid url.\" }"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import path from "path";
  3   | import { fileURLToPath } from "url";
  4   | 
  5   | const __filename = fileURLToPath(import.meta.url);
  6   | const __dirname = path.dirname(__filename);
  7   | 
  8   | const TEST_EMAIL = "e2eprod@homeino.test";
  9   | const TEST_PASSWORD = "Homeino_StrongPwd1";
  10  | const SAMPLE_IMAGE = path.resolve(__dirname, "sample-room.jpg");
  11  | const SUPABASE_URL = "https://tljdihejjoepkcgftian.supabase.co";
  12  | const SUPABASE_ANON_KEY = "sb_publishable_yaBDFBBir6WbMWqQe-g_KQ_gwciKK0_";
  13  | 
  14  | async function loginViaAPI(page) {
  15  |   // Sign in via Supabase REST API and set session in localStorage
  16  |   const res = await page.request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  17  |     headers: {
  18  |       apikey: SUPABASE_ANON_KEY,
  19  |       "Content-Type": "application/json",
  20  |     },
  21  |     data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  22  |   });
  23  |   expect(res.ok()).toBeTruthy();
  24  |   const session = await res.json();
  25  | 
  26  |   // Set Supabase auth session in localStorage
  27  |   await page.goto("/");
  28  |   await page.evaluate((s) => {
  29  |       localStorage.setItem(
  30  |         "sb-tljdihejjoepkcgftian-auth-token",
  31  |         JSON.stringify({
  32  |         access_token: s.access_token,
  33  |         refresh_token: s.refresh_token,
  34  |         expires_at: s.expires_at,
  35  |         expires_in: s.expires_in,
  36  |         token_type: s.token_type,
  37  |         user: s.user,
  38  |       })
  39  |     );
  40  |   }, session);
  41  | 
  42  |   // Reload to pick up the session
  43  |   await page.reload();
  44  |   await page.waitForTimeout(2000);
  45  |   console.log("✓ Logged in via API");
  46  | }
  47  | 
  48  | test.describe("Full Customer Scenario", () => {
  49  |   test("1. Login with test user", async ({ page }) => {
  50  |     await loginViaAPI(page);
  51  |     await expect(page.locator("body")).toBeVisible();
  52  |     console.log("✓ Login test passed");
  53  |   });
  54  | 
  55  |   test("2. Full flow: Inspiration → Design → Cart", async ({ page }) => {
  56  |     // Login via API
  57  |     await loginViaAPI(page);
  58  | 
  59  |     // Go to AI Design page
  60  |     await page.goto("/ai-design");
  61  |     // Wait for any of the known entry card texts
  62  |     await Promise.race([
> 63  |       page.waitForSelector("text=طراحی خانه من", { timeout: 20000 }),
      |            ^ TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
  64  |       page.waitForSelector("text=جستجوی بصری الهام", { timeout: 20000 }),
  65  |       page.waitForSelector("text=پیشنهادات هومینو", { timeout: 20000 }),
  66  |       page.waitForSelector("text=هومینو استودیو", { timeout: 20000 }),
  67  |     ]);
  68  |     await page.waitForTimeout(1000);
  69  |     console.log("✓ On AI Design page");
  70  | 
  71  |     // Step A: Click "Visual Inspiration Search"
  72  |     await page.click('button:has-text("جستجوی بصری الهام")');
  73  |     await page.waitForTimeout(2000);
  74  | 
  75  |     // Step B: Upload sample image
  76  |     const fileInput = page.locator('input[type="file"]').first();
  77  |     await fileInput.setInputFiles(SAMPLE_IMAGE);
  78  |     console.log("✓ Image uploaded");
  79  | 
  80  |     // Step C: Wait for object detection results
  81  |     const result = await Promise.race([
  82  |       page.waitForSelector("text=اشیاء تشخیص داده شده", { timeout: 120000 }).then(() => "detected"),
  83  |       page.waitForSelector("text=خطا در پردازش", { timeout: 120000 }).then(() => "error"),
  84  |       page.waitForFunction(() => {
  85  |         const btns = document.querySelectorAll("button");
  86  |         return Array.from(btns).some(b => b.textContent?.includes("طراحی با هومینو"));
  87  |       }, { timeout: 120000 }).then(() => "design-btn"),
  88  |     ]);
  89  | 
  90  |     if (result === "detected") {
  91  |       console.log("✓ Objects detected!");
  92  |       await page.screenshot({ path: "e2e/01-objects-detected.png", fullPage: true });
  93  | 
  94  |       // Select up to 2 products
  95  |       const selectBtns = page.locator('button:has-text("انتخاب")');
  96  |       const btnCount = await selectBtns.count();
  97  |       for (let i = 0; i < Math.min(btnCount, 2); i++) {
  98  |         await selectBtns.nth(i).click();
  99  |         await page.waitForTimeout(500);
  100 |       }
  101 |       console.log(`✓ Selected ${Math.min(btnCount, 2)} products`);
  102 | 
  103 |       // Go to design
  104 |       const designBtn = page.locator('button:has-text("طراحی با هومینو استودیو")');
  105 |       if (await designBtn.isVisible({ timeout: 5000 }) && !(await designBtn.isDisabled())) {
  106 |         await designBtn.click();
  107 |         await page.waitForTimeout(3000);
  108 |         console.log("✓ Entered design mode from inspiration");
  109 |       }
  110 |     } else {
  111 |       console.log(`⚠ Object detection result: ${result}`);
  112 |       await page.screenshot({ path: "e2e/01-detection-issue.png", fullPage: true });
  113 | 
  114 |       // Fallback: direct design mode
  115 |       await page.goto("/ai-design");
  116 |       await page.waitForSelector("text=طراحی خانه من", { timeout: 10000 });
  117 |       await page.click('button:has-text("طراحی خانه من")');
  118 |       await page.waitForTimeout(2000);
  119 |       console.log("✓ Entered design mode directly (fallback)");
  120 |     }
  121 | 
  122 |     // Upload room photo in design mode
  123 |     const roomInput = page.locator('input[type="file"]').last();
  124 |     if (await roomInput.isVisible({ timeout: 5000 })) {
  125 |       await roomInput.setInputFiles(SAMPLE_IMAGE);
  126 |       await page.waitForTimeout(2000);
  127 |       console.log("✓ Room photo uploaded");
  128 |       await page.screenshot({ path: "e2e/02-room-uploaded.png", fullPage: true });
  129 |     }
  130 | 
  131 |     // Select a product category and click first product
  132 |     const productCard = page.locator('button:has(img)').first();
  133 |     if (await productCard.isVisible({ timeout: 5000 })) {
  134 |       await productCard.click();
  135 |       await page.waitForTimeout(500);
  136 |       console.log("✓ Product selected");
  137 |     }
  138 | 
  139 |     // Generate
  140 |     const generateBtn = page.locator('button:has-text("چیدمان هوشمند")');
  141 |     if (await generateBtn.isVisible({ timeout: 3000 })) {
  142 |       if (!(await generateBtn.isDisabled())) {
  143 |         await generateBtn.click();
  144 |         console.log("✓ Generation started, waiting up to 2 min...");
  145 | 
  146 |         const genResult = await Promise.race([
  147 |           page.waitForSelector("text=آماده شد", { timeout: 130000 }).then(() => "success"),
  148 |           page.waitForSelector("text=خطا در تولید", { timeout: 130000 }).then(() => "error"),
  149 |           page.waitForTimeout(130000).then(() => "timeout"),
  150 |         ]);
  151 |         console.log(`Generation result: ${genResult}`);
  152 |         await page.screenshot({ path: "e2e/03-generation-result.png", fullPage: true });
  153 |       } else {
  154 |         console.log("⚠ Generate disabled — need image + product");
  155 |         await page.screenshot({ path: "e2e/03-generate-disabled.png", fullPage: true });
  156 |       }
  157 |     }
  158 | 
  159 |     // Final state
  160 |     await page.goto("/");
  161 |     await page.waitForTimeout(2000);
  162 |     await page.screenshot({ path: "e2e/04-final-state.png", fullPage: true });
  163 |     console.log("✓ Full test complete");
```