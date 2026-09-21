/**
 * Rebuilds the hidden /see product film from source.
 *
 * The public output keeps the stable path used by outreach:
 *   public/video/casdey-promo.mp4
 *   public/video/casdey-promo-poster.webp
 *
 * A larger 1080p master is also rendered to .promo-render/, which is ignored.
 * Both versions are H.264 + AAC MP4 files encoded frame by frame with explicit
 * timestamps. That avoids the stutter caused by real-time canvas recording.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const publicVideo = path.join(webRoot, "public", "video");
const masterDir = path.join(webRoot, ".promo-render");

async function fontCss() {
  const cacheDir = path.join(webRoot, "node_modules", ".cache");
  const cacheFile = path.join(cacheDir, "casdey-promo-fonts.css");
  if (fs.existsSync(cacheFile)) return fs.readFileSync(cacheFile, "utf8");

  const url =
    "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@500;600;700&display=block";
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
  let css = await fetch(url, { headers: { "user-agent": userAgent } }).then((response) => response.text());
  css = css
    .split("/* ")
    .filter((block, index) => index === 0 || /^latin(-ext)? \*\//.test(block))
    .map((block, index) => (index === 0 ? block : `/* ${block}`))
    .join("");
  for (const fontUrl of new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) ?? [])) {
    const bytes = Buffer.from(await fetch(fontUrl).then((response) => response.arrayBuffer()));
    css = css.split(fontUrl).join(`data:font/woff2;base64,${bytes.toString("base64")}`);
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cacheFile, css);
  return css;
}

async function launch() {
  const options = { headless: true, protocolTimeout: 1_800_000 };
  try {
    return await puppeteer.launch(options);
  } catch (error) {
    const chrome = [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome",
    ].find((candidate) => fs.existsSync(candidate));
    if (!chrome) throw error;
    return puppeteer.launch({ ...options, executablePath: chrome });
  }
}

fs.mkdirSync(publicVideo, { recursive: true });
fs.mkdirSync(masterDir, { recursive: true });

const browser = await launch();
const page = await browser.newPage();
page.on("pageerror", (error) => console.error("[promo renderer]", error.message));
await page.goto(pathToFileURL(path.join(here, "promo-video.html")).href);
await page.addStyleTag({ content: await fontCss() });
await page.addScriptTag({ path: path.join(webRoot, "node_modules", "mp4-muxer", "build", "mp4-muxer.js") });

let sink = null;
await page.exposeFunction("__chunk", (base64) => fs.appendFileSync(sink, Buffer.from(base64, "base64")));

if (process.argv.includes("--preview")) {
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  for (const time of [2.2, 8, 16, 24, 34, 44, 53, 61.5, 68, 72]) {
    await page.evaluate((frameTime) => window.renderFrame(frameTime), time);
    await page.screenshot({
      path: path.join(masterDir, `preview-${String(time).replace(".", "-")}s.png`),
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
  }
  await browser.close();
  console.log(`10 preview frames -> ${path.relative(webRoot, masterDir)}`);
  process.exit(0);
}

const renders = [
  {
    label: "1080p master",
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 74,
    bitrate: 5_500_000,
    codec: "avc1.640028",
    output: path.join(masterDir, "casdey-promo-v1.2-1080p.mp4"),
    poster: false,
  },
  {
    label: "720p web",
    width: 1280,
    height: 720,
    fps: 30,
    duration: 74,
    bitrate: 1_450_000,
    codec: "avc1.64001f",
    output: path.join(publicVideo, "casdey-promo.mp4"),
    poster: true,
  },
];

try {
  for (const spec of renders) {
    sink = `${spec.output}.part`;
    if (fs.existsSync(sink)) fs.unlinkSync(sink);
    const started = Date.now();
    const result = await page.evaluate((renderSpec) => window.renderPromo(renderSpec), spec);
    if (fs.existsSync(spec.output)) fs.unlinkSync(spec.output);
    fs.renameSync(sink, spec.output);
    if (spec.poster && result.poster) {
      fs.writeFileSync(
        path.join(publicVideo, "casdey-promo-poster.webp"),
        Buffer.from(result.poster.split(",")[1], "base64"),
      );
    }
    console.log(
      `${spec.label}: ${result.frames} frames, ${(result.bytes / 1_000_000).toFixed(1)} MB in ${Math.round((Date.now() - started) / 1000)}s`,
    );
  }
} finally {
  await browser.close();
}
