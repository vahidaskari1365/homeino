/**
 * Gemini Edge Function Load Test
 *
 * Simulates 10 concurrent users sending requests to the gemini-decorator
 * edge function, measuring cache hits, rate limits, and response times.
 *
 * Usage: node e2e/load-test-gemini.mjs
 *
 * Environment variables:
 *   SUPABASE_URL     (default: https://nkxvkemsjajwvzxweucj.supabase.co)
 *   SUPABASE_ANON_KEY
 *   TEST_EMAIL       (default: e2etest@homeino.test)
 *   TEST_PASSWORD    (default: Homeino_n13oxvqj_1ze)
 *   IMAGE_PATH       (default: e2e/sample-room.jpg)
 */

import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tljdihejjoepkcgftian.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_yaBDFBBir6WbMWqQe-g_KQ_gwciKK0_";
const TEST_EMAIL = process.env.TEST_EMAIL || "e2eprod@homeino.test";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "Homeino_StrongPwd1";
const IMAGE_PATH = process.env.IMAGE_PATH || path.join(__dirname, "sample-room.jpg");

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/gemini-decorator`;

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ ok: false, status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function signIn() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Sign-in failed: ${res.body?.msg || res.status}`);
  console.log(`✓ Signed in as ${res.body.user.email}`);
  return res.body.access_token;
}

async function callGemini(token, imageBase64, label) {
  const body = {
    action: "analyze_inspiration",
    image_base64: imageBase64,
  };

  const start = Date.now();
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const elapsed = Date.now() - start;

  return {
    label,
    ok: res.ok,
    status: res.status,
    elapsed,
    cacheHit: res.headers["x-cache"] === "HIT" || (res.body?.cached === true),
    body: res.body,
    headers: res.headers,
  };
}

async function main() {
  console.log("=== Gemini Edge Function Load Test ===\n");

  // 1. Sign in
  let token;
  try {
    token = await signIn();
  } catch (e) {
    console.error("✗ Failed to sign in:", e.message);
    process.exit(1);
  }

  // 2. Load and encode test image
  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const imageBase64 = imageBuffer.toString("base64");
  console.log(`Image: ${IMAGE_PATH} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);

  // 3. Prepare test scenarios
  const identicalImage = imageBase64; // All same image to test cache

  // Generate a slightly different image for the "different" test
  const diffBuffer = Buffer.from(imageBase64.slice(0, -100) + "AAAA"); // Slight modification
  const differentImage = diffBuffer.toString("base64");

  // We'll send: 5 identical, 5 different (mix)
  const requests = [
    ...Array(5).fill({ label: "identical", image: identicalImage }),
    ...Array(5).fill({ label: "different", image: differentImage }),
  ];

  console.log(`\nSending ${requests.length} concurrent requests...`);

  // 4. Send all requests concurrently
  const results = await Promise.all(
    requests.map((r, i) => callGemini(token, r.image, `${r.label}-${i + 1}`))
  );

  // 5. Report
  console.log("\n=== RESULTS ===\n");

  const cacheHits = results.filter((r) => r.cacheHit).length;
  const rateLimited = results.filter((r) => r.status === 429).length;
  const successes = results.filter((r) => r.ok).length;
  const failures = results.filter((r) => !r.ok).length;
  const times = results.filter((r) => r.ok).map((r) => r.elapsed);
  const avgTime = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0) : "N/A";
  const maxTime = times.length ? Math.max(...times) : "N/A";
  const minTime = times.length ? Math.min(...times) : "N/A";

  console.log(`Total requests:     ${requests.length}`);
  console.log(`Successful:         ${successes}`);
  console.log(`Failed:             ${failures}`);
  console.log(`Rate limited (429): ${rateLimited}`);
  console.log(`Cache hits:         ${cacheHits}`);
  console.log(`Avg response time:  ${avgTime}ms`);
  console.log(`Min response time:  ${minTime}ms`);
  console.log(`Max response time:  ${maxTime}ms`);

  console.log("\n--- Per-request details ---");
  for (const r of results) {
    const icon = r.ok ? "✓" : r.status === 429 ? "⚠" : "✗";
    const cache = r.cacheHit ? " [CACHE HIT]" : "";
    console.log(`  ${icon} ${r.label} | ${r.status} | ${r.elapsed}ms${cache}`);
  }

  // Summary verdict
  console.log("\n=== VERDICT ===");
  const score = successes / requests.length;
  if (score >= 0.9) {
    console.log("✅ PASS — Gemini handles concurrent load well.");
  } else if (score >= 0.7) {
    console.log("⚠ WARNING — Partial failures. Investigate rate limits.");
  } else {
    console.log("❌ FAIL — Significant failures. Need optimization.");
  }
  if (cacheHits > 0) console.log(`✅ Cache working: ${cacheHits} requests served from cache.`);
  else console.log("⚠ No cache hits detected. Check AiAnalysisCache integration.");
  if (rateLimited > 0) console.log(`⚠ Rate limited: ${rateLimited} requests were rate-limited.`);

  process.exit(successes / requests.length >= 0.7 ? 0 : 1);
}

main().catch((e) => {
  console.error("Load test failed:", e);
  process.exit(1);
});
