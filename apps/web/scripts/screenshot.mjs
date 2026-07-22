// Captures screenshots of the running Researo web app for the README.
// Usage (from apps/web, with the dev server running on :3000):
//   node scripts/screenshot.mjs
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.SHOT_BASE_URL || "http://localhost:3000";
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../../../docs/screenshots");
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { path: "/", name: "dashboard" },
  { path: "/research", name: "research" },
  { path: "/documents", name: "documents" },
  { path: "/reports", name: "reports" },
  { path: "/analytics", name: "analytics" },
  { path: "/graph", name: "graph" },
  { path: "/citations", name: "citations" },
  { path: "/workspaces", name: "workspaces" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
const page = await context.newPage();

for (const p of PAGES) {
  try {
    // "load" (not networkidle) — Next dev keeps an HMR websocket open so the
    // network never goes idle.
    await page.goto(`${BASE}${p.path}`, {
      waitUntil: "load",
      timeout: 90000,
    });
    // Let route compilation, data fetch, charts and entrance animations settle.
    await sleep(4000);
    const file = path.join(OUT, `${p.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`saved ${file}`);
  } catch (e) {
    console.error(`failed ${p.path}: ${e.message}`);
  }
}

// A mobile capture of the dashboard to showcase responsiveness.
try {
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    isMobile: true,
  });
  const mp = await mobile.newPage();
  await mp.goto(`${BASE}/`, { waitUntil: "load", timeout: 90000 });
  await sleep(4000);
  await mp.screenshot({ path: path.join(OUT, "mobile-dashboard.png") });
  console.log("saved mobile-dashboard.png");
  await mobile.close();
} catch (e) {
  console.error(`mobile failed: ${e.message}`);
}

await browser.close();
console.log("done");
