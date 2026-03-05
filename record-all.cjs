/**
 * Record all 3 How It Works demo videos using Puppeteer.
 *
 * Uses virtual time: overrides the page's clock so animations advance
 * in exact frame steps, regardless of how long screenshots take.
 *
 * Usage:
 *   1. Start the Next.js dev server: cd readee-app2.0 && npm run dev
 *   2. Run: cd readee-site && node record-all.cjs
 *
 * Outputs MP4 files into readee-site/assets/
 * Requires: puppeteer, ffmpeg (brew install ffmpeg)
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "assets");
const TEMP_DIR = path.join(__dirname, ".recording-tmp");

const VIEWPORT = { width: 1134, height: 736, deviceScaleFactor: 2 };

const DEMOS = [
  { path: "/demo/hero", output: "hero-demo.mp4", duration: 23 },
  { path: "/demo/lesson", output: "assessment-demo.mp4", duration: 14 },
  { path: "/demo/roadmap", output: "roadmap-demo.mp4", duration: 22 },
  { path: "/demo/analytics", output: "analytics-demo.mp4", duration: 18 },
];

const FPS = 30;
const FRAME_MS = 1000 / FPS; // ~33.33ms per frame

/**
 * Inject virtual time control into the page.
 * This overrides Date.now, performance.now, setTimeout, setInterval,
 * and requestAnimationFrame so we can advance time in controlled steps.
 */
const VIRTUAL_TIME_SCRIPT = `
(function() {
  const _origSetTimeout = window.setTimeout;
  const _origClearTimeout = window.clearTimeout;
  const _origSetInterval = window.setInterval;
  const _origClearInterval = window.clearInterval;
  const _origRAF = window.requestAnimationFrame;
  const _origCAF = window.cancelAnimationFrame;
  const _origDateNow = Date.now;
  const _origPerfNow = performance.now.bind(performance);

  let virtualTime = _origPerfNow();
  let nextTimerId = 1;
  const timers = new Map();   // id -> { callback, fireAt, interval }
  const rafCallbacks = new Map(); // id -> callback
  let nextRafId = 1;

  // Override time sources
  Date.now = () => Math.floor(virtualTime);
  performance.now = () => virtualTime;

  window.setTimeout = function(cb, delay, ...args) {
    const id = nextTimerId++;
    timers.set(id, { callback: cb, fireAt: virtualTime + (delay || 0), interval: 0, args });
    return id;
  };

  window.clearTimeout = function(id) {
    timers.delete(id);
  };

  window.setInterval = function(cb, delay, ...args) {
    const id = nextTimerId++;
    timers.set(id, { callback: cb, fireAt: virtualTime + (delay || 0), interval: delay || 0, args });
    return id;
  };

  window.clearInterval = function(id) {
    timers.delete(id);
  };

  window.requestAnimationFrame = function(cb) {
    const id = nextRafId++;
    rafCallbacks.set(id, cb);
    return id;
  };

  window.cancelAnimationFrame = function(id) {
    rafCallbacks.delete(id);
  };

  // Advance virtual time by deltaMs and fire all due callbacks
  window.__advanceTime = function(deltaMs) {
    virtualTime += deltaMs;

    // Fire rAF callbacks
    const rafs = Array.from(rafCallbacks.entries());
    rafCallbacks.clear();
    for (const [, cb] of rafs) {
      try { cb(virtualTime); } catch(e) { console.error(e); }
    }

    // Fire due timers (may add new timers, so iterate carefully)
    let safety = 0;
    while (safety++ < 500) {
      let fired = false;
      for (const [id, t] of timers) {
        if (t.fireAt <= virtualTime) {
          timers.delete(id);
          if (t.interval > 0) {
            // Re-schedule interval
            timers.set(id, { ...t, fireAt: virtualTime + t.interval });
          }
          try { t.callback(...(t.args || [])); } catch(e) { console.error(e); }
          fired = true;
          break; // restart iteration since map may have changed
        }
      }
      if (!fired) break;
    }
  };
})();
`;

async function recordDemo(browser, demo) {
  const framesDir = path.join(TEMP_DIR, demo.output.replace(".mp4", ""));
  fs.mkdirSync(framesDir, { recursive: true });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Inject virtual time BEFORE the page loads
  await page.evaluateOnNewDocument(VIRTUAL_TIME_SCRIPT);

  // Navigate and wait for load
  await page.goto(`${BASE_URL}${demo.path}`, { waitUntil: "networkidle0", timeout: 30000 });

  // Inject CSS to hide Next.js dev badge
  await page.addStyleTag({
    content: `
      [data-nextjs-dialog-overlay],
      [data-nextjs-toast],
      nextjs-portal,
      #__next-build-indicator,
      [class*="nextjs-toast"],
      body > nextjs-portal,
      [data-next-mark] { display: none !important; }
    `,
  });

  // Advance a few frames to let the page settle (500ms virtual)
  for (let i = 0; i < 15; i++) {
    await page.evaluate((ms) => window.__advanceTime(ms), FRAME_MS);
  }

  // Capture frames
  const totalFrames = demo.duration * FPS;
  console.log(`  Recording ${totalFrames} frames at ${FPS}fps (virtual time)...`);

  for (let i = 0; i < totalFrames; i++) {
    // Advance virtual time by one frame
    await page.evaluate((ms) => window.__advanceTime(ms), FRAME_MS);

    // Small real-time delay for rendering to settle
    await new Promise((r) => setTimeout(r, 16));

    // Capture frame
    const framePath = path.join(framesDir, `frame-${String(i).padStart(5, "0")}.png`);
    await page.screenshot({ path: framePath, type: "png" });

    // Progress indicator every 2 seconds
    if (i > 0 && i % (FPS * 2) === 0) {
      const sec = Math.round(i / FPS);
      console.log(`    ${sec}s / ${demo.duration}s`);
    }
  }

  await page.close();

  // Encode with ffmpeg
  const outputPath = path.join(OUTPUT_DIR, demo.output);
  console.log(`  Encoding ${demo.output}...`);

  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame-%05d.png" ` +
    `-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p ` +
    `-vf "scale=2268:1472" ` +
    `"${outputPath}"`,
    { stdio: "pipe" }
  );

  console.log(`  Done: ${outputPath} (${demo.duration}s)`);

  // Clean up frames
  fs.rmSync(framesDir, { recursive: true });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  try {
    execSync("ffmpeg -version", { stdio: "pipe" });
  } catch {
    console.error("Error: ffmpeg not found. Install with: brew install ffmpeg");
    process.exit(1);
  }

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const demo of DEMOS) {
    console.log(`\nRecording: ${demo.path} → ${demo.output} (${demo.duration}s)`);
    await recordDemo(browser, demo);
  }

  await browser.close();
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  console.log("\nAll recordings complete!");
  console.log("Output files:");
  for (const demo of DEMOS) {
    const p = path.join(OUTPUT_DIR, demo.output);
    if (fs.existsSync(p)) {
      const size = (fs.statSync(p).size / 1024 / 1024).toFixed(1);
      console.log(`  ${demo.output} (${size} MB)`);
    }
  }
}

main().catch((err) => {
  console.error("Recording failed:", err);
  process.exit(1);
});
